import type { UCEProcessResult } from "../core";
import { estimateTextTokens } from "./tokenBudget";

export const DEFAULT_LLM_TOKEN_BUDGET = 2500;

const ESSENTIAL_FIELDS = [
  "objetivo",
  "cidade",
  "bairro",
  "tipoImovel",
  "valor",
  "valorEsperado",
  "quartos",
  "areaM2",
  "vagas",
  "pet",
  "financiamento",
  "fgts",
  "documentacao",
  "ocupacao",
  "urgencia",
  "prazoMudanca",
];

function lastUserMessage(uceResult: UCEProcessResult) {
  return (
    [...uceResult.context.memory]
      .reverse()
      .find((message) => message.role === "user")?.content ?? ""
  );
}

function formatFields(fields: Record<string, unknown>) {
  const entries = ESSENTIAL_FIELDS.map((field) => [field, fields[field]] as const)
    .filter(([, value]) => {
      if (value === null || value === undefined) return false;
      if (typeof value === "string") return value.trim().length > 0;

      return true;
    })
    .slice(0, 18);

  if (entries.length === 0) return "Nenhum campo essencial preenchido.";

  return entries.map(([field, value]) => `- ${field}: ${String(value)}`).join("\n");
}

function summarizeBriefing(uceResult: UCEProcessResult) {
  return [
    `Resumo: ${uceResult.briefing.summary}`,
    `Pendencias: ${
      uceResult.briefing.pendingFields.length > 0
        ? uceResult.briefing.pendingFields.join(", ")
        : "sem pendencias"
    }`,
    `Score: ${uceResult.score}`,
    `Temperatura: ${uceResult.temperature}`,
  ].join("\n");
}

function formatPerfilComportamental(uceResult: UCEProcessResult) {
  const perfil = uceResult.perfilComportamental;

  if (!perfil) return "Perfil comportamental ainda nao calculado.";

  return [
    `Perfil principal: ${perfil.perfilPrincipal}`,
    `Estilo de decisao: ${perfil.estiloDecisao}`,
    `Urgencia: ${perfil.nivelUrgencia}`,
    `Risco de perda: ${perfil.riscoPerda}`,
    `Resumo: ${perfil.resumoPerfil}`,
  ].join("\n");
}

function trimPromptToBudget(prompt: string, budget: number) {
  if (estimateTextTokens(prompt) <= budget) return prompt;

  const maxChars = budget * 4;

  return `${prompt.slice(0, maxChars - 180)}\n\n[Prompt aparado automaticamente para respeitar o orcamento de tokens.]`;
}

export function buildLLMPrompt(
  uceResult: UCEProcessResult,
  promptBudget = DEFAULT_LLM_TOKEN_BUDGET,
  userMessage?: string,
) {
  const nextQuestion = uceResult.decision.nextQuestion;
  const specialist = uceResult.specialist;
  const currentUserMessage = userMessage?.trim() || lastUserMessage(uceResult);
  const prompt = [
    "# Papel",
    "Você é a camada de linguagem natural da UCE para a Terrazza.",
    "A UCE já decidiu o fluxo. Escreva apenas uma resposta natural, curta, profissional, humana e acolhedora.",
    "Não aja como formulário: contextualize em uma frase breve e siga exatamente a próxima decisão da UCE.",
    "",
    "# Especialista ativo",
    `${specialist.label} (${specialist.id})`,
    `Objetivo do especialista: ${specialist.objective}`,
    "",
    "# Status da conversa",
    uceResult.conversationStatus,
    "",
    "# Próxima decisão do UCE",
    nextQuestion
      ? `Campo: ${nextQuestion.field}\nPergunta: ${nextQuestion.text}\nMotivo: ${nextQuestion.reason}`
      : "Nenhuma. A UCE não autorizou nova pergunta.",
    "",
    "# Contexto essencial coletado",
    formatFields(uceResult.context.fields),
    "",
    "# Briefing resumido",
    summarizeBriefing(uceResult),
    "",
    "# Knowledge summary",
    uceResult.knowledgeSummary || "Nenhum resumo de conhecimento disponível.",
    "",
    "# Perfil comportamental",
    formatPerfilComportamental(uceResult),
    "",
    "# Tom da persona",
    uceResult.commercialStrategy.tone,
    "",
    "# Regras de segurança",
    "- O UCE decide especialista, fluxo, score, handoff e próxima pergunta.",
    "- A OpenAI apenas escreve melhor a decisão do UCE.",
    "- Se houver próxima pergunta, faça somente essa pergunta, sem adicionar outra.",
    "- Se não houver próxima pergunta, não faça pergunta.",
    "- Não inventar imóvel, disponibilidade, preço, condomínio, condição comercial ou agenda.",
    "- Não prometer aprovação de cadastro, crédito, financiamento, garantia ou proposta.",
    "- Não dar parecer jurídico definitivo.",
    "- Não contrariar handoff quando a UCE marcar atendimento pronto ou encerrado.",
    "- Evitar linguagem agressiva, pressionadora ou excessivamente informal.",
    "",
    "# Mensagem do usuário",
    currentUserMessage || "Mensagem não informada.",
  ].join("\n");

  return trimPromptToBudget(prompt, promptBudget);
}
