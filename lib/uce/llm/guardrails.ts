import type { UCEProcessResult } from "../core";
import { generateFallbackResponse } from "./fallback";
import type {
  UCELLMGuardrailResult,
  UCELLMGuardrailSeverity,
  UCELLMOutput,
} from "./types";

function normalize(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function asksQuestion(text: string) {
  return text.includes("?");
}

function questionSentences(text: string) {
  return text
    .split(/(?<=\?)/)
    .map((part) => part.trim())
    .filter((part) => part.includes("?"));
}

function hasAny(text: string, terms: string[]) {
  return terms.some((term) => text.includes(term));
}

function contextMoneyValues(uceResult: UCEProcessResult) {
  return [
    uceResult.context.fields.valor,
    uceResult.context.fields.valorEsperado,
    uceResult.context.fields.valorAluguelAtual,
    uceResult.context.fields.condominioValor,
    uceResult.context.fields.iptu,
  ]
    .filter((value): value is number => typeof value === "number" && value > 0)
    .map((value) => String(value));
}

function outputMoneyValues(text: string) {
  return Array.from(
    text.matchAll(/(?:r\$\s*)?(\d{1,3}(?:\.\d{3})+|\d{4,7})(?:,\d{2})?/gi),
  ).map((match) => match[1].replace(/\./g, ""));
}

function severityFromReasons(reasons: string[]): UCELLMGuardrailSeverity {
  if (
    reasons.some((reason) =>
      [
        "Promessa de aprovacao.",
        "Parecer juridico definitivo.",
        "Contradicao de handoff.",
        "Imovel especifico ou disponibilidade inventada.",
        "Preco, condominio ou condicao sem base no contexto.",
      ].includes(reason),
    )
  ) {
    return "high";
  }

  if (reasons.length > 0) return "medium";

  return "low";
}

function questionMatchesUCE(text: string, expectedField: string, expectedQuestion: string) {
  const normalized = normalize(text);
  const field = normalize(expectedField);
  const words = normalize(expectedQuestion)
    .split(/\s+/)
    .filter((word) => word.length > 4 && !["perfeito", "alguma", "algum"].includes(word));
  const fieldAliases: Record<string, string[]> = {
    bairro: ["bairro", "regiao", "local"],
    cidade: ["cidade"],
    tipoimovel: ["tipo", "imovel", "apartamento", "casa"],
    valor: ["valor", "orcamento", "faixa", "preco"],
    valoresperado: ["valor", "espera", "venda", "preco"],
    valoraluguelatual: ["aluguel", "valor", "imagina"],
    condominiovalor: ["condominio", "valor"],
    iptu: ["iptu"],
    quartos: ["quartos", "dormitorios"],
    vagas: ["vaga", "garagem"],
    pet: ["pet", "animal"],
    moradores: ["pessoas", "moradores", "morar"],
    urgencia: ["urgencia", "prazo", "quando"],
    prazomudanca: ["prazo", "mudanca", "quando"],
    prazocompra: ["prazo", "comprar", "quando"],
    financiamento: ["financiar", "financiamento"],
    fgts: ["fgts"],
    entradadisponivel: ["entrada", "reservado", "valor"],
    documentacao: ["documentacao", "documentos"],
    ocupacao: ["ocupado", "desocupado", "ocupacao"],
    finalidadeanuncio: ["venda", "locacao", "administracao", "anuncio"],
  };
  const aliases = fieldAliases[field] ?? [field];
  const aliasMatches = aliases.some((alias) => normalized.includes(alias));
  const wordMatches = words.filter((word) => normalized.includes(word)).length;

  return aliasMatches || wordMatches >= Math.min(2, words.length || 2);
}

export function validateLLMOutput(
  output: Pick<UCELLMOutput, "text">,
  uceResult: UCEProcessResult,
): UCELLMGuardrailResult {
  const normalized = normalize(output.text);
  const reasons: string[] = [];
  const nextQuestion = uceResult.decision.nextQuestion;

  if (
    hasAny(normalized, [
      "tenho um imovel",
      "temos um imovel",
      "opcao disponivel",
      "imovel disponivel",
      "apartamento disponivel",
      "casa disponivel",
      "unidade disponivel",
      "imovel perfeito para voce",
    ])
  ) {
    reasons.push("Imovel especifico ou disponibilidade inventada.");
  }

  if (
    hasAny(normalized, [
      "aprovacao garantida",
      "cadastro aprovado",
      "credito aprovado",
      "financiamento aprovado",
      "garanto a aprovacao",
      "com certeza aprova",
    ])
  ) {
    reasons.push("Promessa de aprovacao.");
  }

  if (
    hasAny(normalized, [
      "parecer juridico definitivo",
      "juridicamente garantido",
      "posso garantir juridicamente",
      "nao ha risco juridico",
      "esta juridicamente resolvido",
    ])
  ) {
    reasons.push("Parecer juridico definitivo.");
  }

  if (
    hasAny(normalized, [
      "vou trocar para outro especialista",
      "mudar para outro especialista",
      "especialista diferente",
      "vou mudar o especialista",
    ])
  ) {
    reasons.push("Mudanca indevida de especialista.");
  }

  if (!nextQuestion && asksQuestion(output.text)) {
    reasons.push("Pergunta nao autorizada pela UCE.");
  }

  if (nextQuestion && asksQuestion(output.text)) {
    const questions = questionSentences(output.text);
    const mismatchedQuestion = questions.some(
      (question) =>
        !questionMatchesUCE(question, nextQuestion.field, nextQuestion.text),
    );

    if (mismatchedQuestion) {
      reasons.push("Pergunta diferente da definida pela UCE.");
    }
  }

  if (
    uceResult.conversationStatus === "handoff_pronto" &&
    (asksQuestion(output.text) ||
      hasAny(normalized, ["preciso confirmar", "so preciso", "mais um ponto"]))
  ) {
    reasons.push("Contradicao de handoff.");
  }

  if (
    hasAny(normalized, [
      "disponibilidade garantida",
      "agenda garantida",
      "visita garantida",
      "imovel reservado",
      "ja esta reservado para voce",
    ])
  ) {
    reasons.push("Promessa de disponibilidade.");
  }

  const allowedMoney = contextMoneyValues(uceResult);
  const outputMoney = outputMoneyValues(output.text);

  if (
    outputMoney.some((value) => !allowedMoney.includes(value)) ||
    (normalized.includes("condominio") &&
      normalized.match(/\d/) &&
      typeof uceResult.context.fields.condominioValor !== "number")
  ) {
    reasons.push("Preco, condominio ou condicao sem base no contexto.");
  }

  if (
    hasAny(normalized, [
      "voce precisa decidir agora",
      "nao perca tempo",
      "ultima chance",
      "se nao fechar agora",
      "bora fechar",
      "top demais",
      "mano",
      "meu querido",
    ])
  ) {
    reasons.push("Linguagem agressiva, pressionadora ou informal demais.");
  }

  const approved = reasons.length === 0;

  return {
    approved,
    reasons,
    severity: severityFromReasons(reasons),
    safeText: approved
      ? null
      : generateFallbackResponse(uceResult, "guardrail_reprovado"),
  };
}
