import type { UCECompatibility, UCEMatchEntity, UCERecommendationReason } from "./types";

function normalize(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function sameText(a?: string | null, b?: string | null) {
  return Boolean(a && b && normalize(a) === normalize(b));
}

function numberClose(a?: number | null, b?: number | null, tolerance = 0.15) {
  if (!a || !b) return false;

  const diff = Math.abs(a - b);
  return diff / Math.max(a, b) <= tolerance;
}

function addReason(
  reasons: UCERecommendationReason[],
  criterion: string,
  label: string,
  weight: number,
) {
  reasons.push({ criterion, label, weight });
}

export function calculateCompatibility(
  source: UCEMatchEntity,
  target: UCEMatchEntity,
): UCECompatibility {
  const reasons: UCERecommendationReason[] = [];

  if (sameText(source.cidade, target.cidade)) {
    addReason(reasons, "cidade", "Mesma cidade", 12);
  }

  if (sameText(source.bairro, target.bairro)) {
    addReason(reasons, "bairro", "Mesmo bairro", 18);
  }

  if (sameText(source.tipoImovel, target.tipoImovel)) {
    addReason(reasons, "tipoImovel", "Tipo de imovel compatível", 12);
  }

  if (numberClose(source.valor, target.valor, source.objetivo === "locacao" ? 0.18 : 0.12)) {
    addReason(reasons, "valor", "Valor compatível", 16);
  }

  if (numberClose(source.areaM2, target.areaM2, 0.2)) {
    addReason(reasons, "area", "Área compatível", 7);
  }

  if (source.quartos && target.quartos && source.quartos === target.quartos) {
    addReason(reasons, "quartos", `${source.quartos} quartos`, 10);
  }

  if (source.banheiros && target.banheiros && source.banheiros === target.banheiros) {
    addReason(reasons, "banheiros", "Banheiros compatíveis", 5);
  }

  if (source.vagas && target.vagas && source.vagas === target.vagas) {
    addReason(reasons, "vagas", "Vagas compatíveis", 5);
  }

  if (source.pet !== null && source.pet !== undefined && source.pet === target.pet) {
    addReason(reasons, "pet", source.pet ? "Aceita pet" : "Perfil sem pet", 5);
  }

  if (sameText(source.objetivo, target.objetivo)) {
    addReason(reasons, "objetivo", "Objetivo compatível", 8);
  }

  if (source.financiamento && target.financiamento) {
    addReason(reasons, "financiamento", "Aceita financiamento", 6);
  }

  if (source.fgts && target.fgts) {
    addReason(reasons, "fgts", "Compatível com FGTS", 4);
  }

  if (sameText(source.perfil, target.perfil)) {
    addReason(reasons, "perfil", `Perfil ${source.perfil}`, 7);
  }

  if (sameText(source.urgencia, target.urgencia)) {
    addReason(reasons, "urgencia", "Urgência alinhada", 3);
  }

  const score = Math.min(
    100,
    Math.round(reasons.reduce((total, reason) => total + reason.weight, 0)),
  );

  return {
    score,
    level: score >= 75 ? "alta" : score >= 45 ? "media" : "baixa",
    reasons,
  };
}
