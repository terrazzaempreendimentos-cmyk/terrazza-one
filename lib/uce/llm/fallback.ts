import type { UCEProcessResult } from "../core";

export function generateFallbackResponse(uceResult: UCEProcessResult) {
  if (
    uceResult.conversationStatus === "handoff_pronto" ||
    uceResult.conversationStatus === "encerrado"
  ) {
    return (
      uceResult.closingMessage ??
      "Perfeito. Esse atendimento ja esta qualificado e pronto para ser encaminhado ao especialista da Terrazza."
    );
  }

  if (uceResult.decision.nextQuestion) {
    return uceResult.decision.nextQuestion.text;
  }

  if (uceResult.closingMessage) {
    return uceResult.closingMessage;
  }

  return "Perfeito. Vou manter o atendimento organizado com base nas informacoes ja coletadas pela UCE.";
}
