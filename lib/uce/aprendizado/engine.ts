import { gerarInsightsAprendizado } from "./insights";
import { calcularMetricasAprendizado } from "./metrics";
import { detectarPadroesAprendizado } from "./patterns";
import { gerarRecomendacoesAprendizado } from "./recomendacoes";
import { gerarResumoAprendizado } from "./resumo";
import type { UCEAprendizadoInput, UCEAprendizadoResult } from "./types";

export function analisarAprendizado(
  input: UCEAprendizadoInput,
): UCEAprendizadoResult {
  const padroesDetectados = detectarPadroesAprendizado(input);
  const insights = gerarInsightsAprendizado(input, padroesDetectados);
  const metricas = calcularMetricasAprendizado(input, padroesDetectados);
  const recomendacoes = gerarRecomendacoesAprendizado(
    padroesDetectados,
    metricas,
  );
  const result = {
    padroesDetectados,
    insights,
    recomendacoes,
    metricas,
  };

  return {
    ...result,
    resumoAprendizado: gerarResumoAprendizado(result),
  };
}
