import type { UCEProcessResult } from "../core";
import { formatKnowledgeForPrompt } from "../knowledge";
import {
  estimateTextTokens,
  trimKnowledgeForBudget,
} from "./tokenBudget";

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

function formatHistory(uceResult: UCEProcessResult) {
  const history = uceResult.context.memory.slice(-4);

  if (history.length === 0) return "Sem historico recente.";

  return history
    .map((message) => `- ${message.role}: ${message.content.slice(0, 220)}`)
    .join("\n");
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

function trimPromptToBudget(prompt: string, budget: number) {
  if (estimateTextTokens(prompt) <= budget) return prompt;

  const maxChars = budget * 4;

  return `${prompt.slice(0, maxChars - 180)}\n\n[Prompt aparado automaticamente para respeitar o orcamento de tokens.]`;
}

export function buildLLMPrompt(
  uceResult: UCEProcessResult,
  promptBudget = DEFAULT_LLM_TOKEN_BUDGET,
) {
  const nextQuestion = uceResult.decision.nextQuestion;
  const specialist = uceResult.specialist;
  const userMessage = lastUserMessage(uceResult);
  const knowledgeBudget = Math.min(900, Math.floor(promptBudget * 0.35));
  const knowledgeResults = trimKnowledgeForBudget(
    uceResult.knowledgeResults,
    knowledgeBudget,
  );
  const prompt = [
    "# Papel",
    "Voce e a camada de linguagem natural da UCE para a Terrazza.",
    "A UCE ja decidiu o fluxo. Reescreva apenas a decisao em linguagem clara, curta e comercial.",
    "",
    "# Especialista ativo",
    `${specialist.label} (${specialist.id})`,
    `Objetivo do especialista: ${specialist.objective}`,
    "",
    "# Status da conversa",
    uceResult.conversationStatus,
    "",
    "# Proxima pergunta decidida pelo UCE",
    nextQuestion
      ? `Campo: ${nextQuestion.field}\nPergunta: ${nextQuestion.text}\nMotivo: ${nextQuestion.reason}`
      : "Nenhuma. A UCE nao autorizou nova pergunta.",
    "",
    "# Contexto essencial coletado",
    formatFields(uceResult.context.fields),
    "",
    "# Historico recente",
    formatHistory(uceResult),
    "",
    "# Briefing resumido",
    summarizeBriefing(uceResult),
    "",
    "# Knowledge consultado",
    formatKnowledgeForPrompt(knowledgeResults),
    "",
    "# Tom da persona",
    uceResult.commercialStrategy.tone,
    "",
    "# Restricoes",
    "- Nao decidir especialista, fluxo, score, handoff ou proxima pergunta.",
    "- Nao pedir campo diferente do campo definido pela UCE.",
    "- Nao inventar imovel, disponibilidade, preco, condominio, condicao comercial ou agenda.",
    "- Nao prometer aprovacao de cadastro, credito, financiamento, garantia ou proposta.",
    "- Nao dar parecer juridico definitivo.",
    "- Nao contrariar handoff quando a UCE marcar atendimento pronto ou encerrado.",
    "- Evitar linguagem agressiva, pressionadora ou excessivamente informal.",
    "",
    "# Mensagem do usuario",
    userMessage || "Mensagem nao informada.",
  ].join("\n");

  return trimPromptToBudget(prompt, promptBudget);
}
