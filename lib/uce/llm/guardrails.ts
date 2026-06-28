import type { UCEProcessResult } from "../core";
import { generateFallbackResponse } from "./fallback";
import type { UCELLMGuardrailResult, UCELLMOutput } from "./types";

function normalize(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function asksQuestion(text: string) {
  return text.includes("?");
}

export function validateLLMOutput(
  output: Pick<UCELLMOutput, "text">,
  uceResult: UCEProcessResult,
): UCELLMGuardrailResult {
  const normalized = normalize(output.text);
  const violations: string[] = [];
  const nextQuestion = uceResult.decision.nextQuestion;

  if (
    normalized.includes("tenho um imovel") ||
    normalized.includes("temos um imovel") ||
    normalized.includes("opcao disponivel") ||
    normalized.includes("imovel disponivel") ||
    normalized.includes("apartamento disponivel")
  ) {
    violations.push("Nao inventar imovel ou disponibilidade.");
  }

  if (
    normalized.includes("aprovacao garantida") ||
    normalized.includes("cadastro aprovado") ||
    normalized.includes("financiamento aprovado") ||
    normalized.includes("garanto a aprovacao")
  ) {
    violations.push("Nao prometer aprovacao.");
  }

  if (
    normalized.includes("parecer juridico definitivo") ||
    normalized.includes("juridicamente garantido") ||
    normalized.includes("posso garantir juridicamente")
  ) {
    violations.push("Nao dar parecer juridico definitivo.");
  }

  if (
    normalized.includes("vou trocar para outro especialista") ||
    normalized.includes("mudar para outro especialista") ||
    normalized.includes("especialista diferente")
  ) {
    violations.push("Nao mudar especialista sozinho.");
  }

  if (!nextQuestion && asksQuestion(output.text)) {
    violations.push("Nao pedir campo que a UCE nao pediu.");
  }

  if (nextQuestion && asksQuestion(output.text)) {
    const expectedQuestion = normalize(nextQuestion.text);
    const expectedField = normalize(nextQuestion.field);

    if (
      !normalized.includes(expectedField) &&
      expectedQuestion.length > 0 &&
      !expectedQuestion
        .split(/\s+/)
        .filter((word) => word.length > 4)
        .some((word) => normalized.includes(word))
    ) {
      violations.push("Nao pedir campo diferente do definido pela UCE.");
    }
  }

  if (
    (uceResult.conversationStatus === "handoff_pronto" ||
      uceResult.conversationStatus === "encerrado") &&
    asksQuestion(output.text)
  ) {
    violations.push("Nao contrariar handoff com nova pergunta.");
  }

  return {
    valid: violations.length === 0,
    violations,
    safeText: violations.length > 0 ? generateFallbackResponse(uceResult) : null,
  };
}
