import type { LeadContext, LeadTemperature } from "./tipos";
import { possuiInformacao } from "./memoria";

function cidadePrioritaria(cidade: string | null) {
  return cidade?.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") ===
    "maceio";
}

function urgenciaAlta(urgencia: string | null) {
  if (!urgencia) return false;

  const valor = urgencia.toLowerCase();

  return (
    valor.includes("alta") ||
    valor.includes("urgente") ||
    valor.includes("imediat") ||
    valor.includes("30")
  );
}

export function temperaturaPorScoreMotor(score: number): LeadTemperature {
  if (score >= 75) return "quente";
  if (score >= 45) return "morno";

  return "frio";
}

export function calcularScore(contexto: LeadContext) {
  let score = 0;

  if (cidadePrioritaria(contexto.cidade)) score += 10;
  if (possuiInformacao(contexto, "valor")) score += 10;
  if (possuiInformacao(contexto, "objetivo")) score += 15;
  if (urgenciaAlta(contexto.urgencia)) score += 20;
  if (possuiInformacao(contexto, "tipoImovel")) score += 10;
  if (possuiInformacao(contexto, "financiamento")) score += 10;
  if (possuiInformacao(contexto, "prazoMudanca")) score += 10;
  if (possuiInformacao(contexto, "documentacao")) score += 15;

  const scoreFinal = Math.min(score, 100);

  return {
    score: scoreFinal,
    temperatura: temperaturaPorScoreMotor(scoreFinal),
  };
}
