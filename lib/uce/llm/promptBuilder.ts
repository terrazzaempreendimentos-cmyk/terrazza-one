import type { UCEProcessResult } from "../core";
import { formatKnowledgeForPrompt } from "../knowledge";

function lastUserMessage(uceResult: UCEProcessResult) {
  return (
    [...uceResult.context.memory]
      .reverse()
      .find((message) => message.role === "user")?.content ?? ""
  );
}

function formatFields(fields: Record<string, unknown>) {
  const entries = Object.entries(fields).filter(([, value]) => {
    if (value === null || value === undefined) return false;
    if (typeof value === "string") return value.trim().length > 0;

    return true;
  });

  if (entries.length === 0) return "Nenhum campo preenchido.";

  return entries.map(([field, value]) => `- ${field}: ${String(value)}`).join("\n");
}

export function buildLLMPrompt(uceResult: UCEProcessResult) {
  const nextQuestion = uceResult.decision.nextQuestion;
  const specialist = uceResult.specialist;
  const userMessage = lastUserMessage(uceResult);

  return [
    "# Papel",
    "Voce e uma camada de linguagem natural da UCE para a Terrazza.",
    "A UCE ja decidiu o fluxo. Voce apenas reescreve a decisao em linguagem clara, curta e comercial.",
    "",
    "# Especialista ativo",
    `${specialist.label} (${specialist.id})`,
    `Objetivo do especialista: ${specialist.objective}`,
    "",
    "# Objetivo do lead",
    String(uceResult.context.fields.objetivo ?? "nao informado"),
    "",
    "# Contexto coletado",
    formatFields(uceResult.context.fields),
    "",
    "# Proxima pergunta decidida pelo UCE",
    nextQuestion
      ? `Campo: ${nextQuestion.field}\nPergunta: ${nextQuestion.text}\nMotivo: ${nextQuestion.reason}`
      : "Nenhuma. A UCE nao autorizou nova pergunta.",
    "",
    "# Conhecimento consultado",
    formatKnowledgeForPrompt(uceResult.knowledgeResults),
    "",
    "# Tom de voz",
    uceResult.commercialStrategy.tone,
    "",
    "# Restricoes",
    "- Nao decidir especialista, fluxo, score, handoff ou proxima pergunta.",
    "- Nao pedir campo diferente do campo definido pela UCE.",
    "- Nao inventar imovel, disponibilidade, preco, condicao comercial ou agenda.",
    "- Nao prometer aprovacao de cadastro, financiamento, garantia ou proposta.",
    "- Nao dar parecer juridico definitivo.",
    "- Nao contrariar handoff quando a UCE marcar atendimento pronto ou encerrado.",
    "",
    "# Mensagem do usuario",
    userMessage || "Mensagem nao informada.",
    "",
    "# Status da conversa",
    uceResult.conversationStatus,
  ].join("\n");
}
