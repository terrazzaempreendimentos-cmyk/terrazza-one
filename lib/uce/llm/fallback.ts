import type { UCEProcessResult } from "../core";

export type UCELLMFallbackSituation =
  | "collecting"
  | "handoff_pronto"
  | "encerrado"
  | "erro_openai"
  | "guardrail_reprovado";

function statusSituation(uceResult: UCEProcessResult): UCELLMFallbackSituation {
  if (uceResult.conversationStatus === "encerrado") return "encerrado";
  if (uceResult.conversationStatus === "handoff_pronto") return "handoff_pronto";

  return "collecting";
}

export function generateFallbackResponse(
  uceResult: UCEProcessResult,
  situation: UCELLMFallbackSituation = statusSituation(uceResult),
) {
  if (situation === "erro_openai") {
    return (
      uceResult.decision.nextQuestion?.text ??
      uceResult.closingMessage ??
      "Perfeito. Vou seguir com a resposta segura da UCE para manter o atendimento consistente."
    );
  }

  if (situation === "guardrail_reprovado") {
    return (
      uceResult.decision.nextQuestion?.text ??
      uceResult.closingMessage ??
      "Perfeito. Vou manter a resposta segura com base nas informacoes ja validadas pela UCE."
    );
  }

  if (situation === "handoff_pronto") {
    return (
      uceResult.closingMessage ??
      "Perfeito. Esse atendimento ja esta qualificado e pronto para ser encaminhado ao especialista da Terrazza."
    );
  }

  if (situation === "encerrado") {
    return (
      uceResult.closingMessage ??
      "Combinado. O atendimento ja esta encerrado e pronto para continuidade com o especialista da Terrazza."
    );
  }

  if (situation === "collecting" && uceResult.decision.nextQuestion) {
    return uceResult.decision.nextQuestion.text;
  }

  return (
    uceResult.closingMessage ??
    "Perfeito. Vou manter o atendimento organizado com base nas informacoes ja coletadas pela UCE."
  );
}
