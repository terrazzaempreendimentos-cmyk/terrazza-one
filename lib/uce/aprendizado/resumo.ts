import type { UCEAprendizadoResult } from "./types";

export function gerarResumoAprendizado(
  result: Omit<UCEAprendizadoResult, "resumoAprendizado">,
) {
  const principaisPadroes = result.padroesDetectados
    .slice(0, 3)
    .map((pattern) => pattern.titulo)
    .join(", ");
  const principaisInsights = result.insights
    .slice(0, 2)
    .map((insight) => insight.titulo)
    .join(", ");

  return [
    principaisPadroes
      ? `Padroes percebidos: ${principaisPadroes}.`
      : "Nenhum padrao forte identificado ainda.",
    principaisInsights
      ? `Insights principais: ${principaisInsights}.`
      : "Ainda sem insights relevantes.",
    `Prioridade operacional: ${result.metricas.prioridadeOperacional}.`,
    `Necessidade humana: ${result.metricas.necessidadeHumano}.`,
  ].join(" ");
}
