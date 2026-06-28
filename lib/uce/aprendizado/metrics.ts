import type {
  UCEAprendizadoInput,
  UCEAprendizadoMetricas,
  UCEPadraoDetectado,
} from "./types";

function nivelPorQuantidade(count: number): "baixo" | "medio" | "alto" {
  if (count >= 4) return "alto";
  if (count >= 2) return "medio";

  return "baixo";
}

export function calcularMetricasAprendizado(
  input: UCEAprendizadoInput,
  padroes: UCEPadraoDetectado[],
): UCEAprendizadoMetricas {
  const highMatches = (input.correspondencias ?? []).filter(
    (match) => match.compatibility.score >= 75,
  ).length;
  const highConfidencePatterns = padroes.filter((pattern) => pattern.confianca >= 85).length;
  const risco = input.perfilComportamental?.riscoPerda ?? "baixo";
  const urgency = input.perfilComportamental?.nivelUrgencia;

  return {
    nivelConfianca: highConfidencePatterns >= 2 ? "alto" : padroes.length > 0 ? "medio" : "baixo",
    complexidadeAtendimento:
      risco === "alto" || (input.knowledgeResults ?? []).length >= 5 ? "alto" : "medio",
    prioridadeOperacional:
      urgency === "alta" || highMatches > 0 ? "alto" : nivelPorQuantidade(padroes.length),
    necessidadeHumano:
      risco === "alto" || urgency === "alta" ? "alto" : risco === "medio" ? "medio" : "baixo",
    potencialRelacionamento:
      highMatches >= 2 || input.perfilComportamental?.perfilPrincipal === "investidor"
        ? "alto"
        : highMatches === 1
          ? "medio"
          : "baixo",
  };
}
