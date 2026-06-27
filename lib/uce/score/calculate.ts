import type { UCEContext, UCEHypothesis, UCETemperature } from "../core/types";

function hasValue(value: unknown) {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.trim().length > 0;

  return true;
}

function normalize(value: unknown) {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function temperatureFromScore(score: number): UCETemperature {
  if (score >= 75) return "quente";
  if (score >= 45) return "morno";

  return "frio";
}

export function calculateUCEScore(
  context: UCEContext,
  hypotheses: UCEHypothesis[] = [],
) {
  let score = 0;

  if (normalize(context.fields.cidade) === "maceio") score += 10;
  if (hasValue(context.fields.valor)) score += 10;
  if (hasValue(context.fields.objetivo)) score += 15;
  if (hasValue(context.fields.tipoImovel)) score += 10;
  if (hasValue(context.fields.financiamento)) score += 10;
  if (hasValue(context.fields.prazoMudanca)) score += 10;
  if (hasValue(context.fields.documentacao)) score += 15;
  if (normalize(context.fields.urgencia) === "alta") score += 20;

  score += hypotheses.filter((hypothesis) => hypothesis.confidence >= 85).length * 5;

  const finalScore = Math.min(score, 100);

  return {
    score: finalScore,
    temperature: temperatureFromScore(finalScore),
  };
}
