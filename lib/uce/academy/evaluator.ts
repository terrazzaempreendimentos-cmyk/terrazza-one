import type { UCEAcademyEvaluation, UCEAcademyScenario, UCEProcessResult } from "../core/types";

function hasField(result: UCEProcessResult, field: string) {
  const value = result.context.fields[field];

  return value !== null && value !== undefined && String(value).trim() !== "";
}

export function evaluateSimulation(
  result: UCEProcessResult,
  scenario: UCEAcademyScenario,
): UCEAcademyEvaluation {
  const missingFields = scenario.expectedFields.filter((field) => !hasField(result, field));
  const wrongStrategy =
    result.commercialStrategy.id !== scenario.expectedStrategy;
  const score = Math.max(
    0,
    100 - missingFields.length * 15 - (wrongStrategy ? 25 : 0),
  );

  return {
    score,
    passed: score >= 75,
    missingFields,
    wrongStrategy,
    recommendations: [
      missingFields.length > 0
        ? `Coletar campos pendentes: ${missingFields.join(", ")}.`
        : "Campos esperados coletados.",
      wrongStrategy
        ? `Revisar estrategia: esperado ${scenario.expectedStrategy}, atual ${result.commercialStrategy.id}.`
        : "Estrategia alinhada ao cenario.",
    ],
  };
}
