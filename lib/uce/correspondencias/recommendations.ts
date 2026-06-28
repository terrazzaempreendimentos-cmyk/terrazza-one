import type { UCEMatch, UCERecommendation } from "./types";

function entityLabel(type: string) {
  switch (type) {
    case "imovel":
      return "imóveis";
    case "comprador":
      return "compradores";
    case "inquilino":
      return "inquilinos";
    case "proprietario":
      return "proprietários";
    default:
      return "oportunidades";
  }
}

export function generateRecommendations(matches: UCEMatch[]): UCERecommendation[] {
  const highMatches = matches.filter((match) => match.compatibility.score >= 75);
  const mediumMatches = matches.filter(
    (match) => match.compatibility.score >= 45 && match.compatibility.score < 75,
  );

  const recommendations: UCERecommendation[] = [];

  if (highMatches.length > 0) {
    const targetType = highMatches[0]?.target.type ?? "imovel";
    recommendations.push({
      id: "matches-alta-compatibilidade",
      message: `Existem ${highMatches.length} ${entityLabel(targetType)} altamente compatíveis.`,
      priority: "alta",
      matches: highMatches,
    });
  }

  if (mediumMatches.length > 0) {
    recommendations.push({
      id: "matches-media-compatibilidade",
      message: `Existem ${mediumMatches.length} oportunidades com compatibilidade intermediária para revisar.`,
      priority: "media",
      matches: mediumMatches,
    });
  }

  const buyerMatches = matches.filter((match) => match.target.type === "comprador");
  if (buyerMatches.length > 0) {
    recommendations.push({
      id: "compradores-aguardando",
      message: `Existe comprador aguardando imóvel semelhante.`,
      priority: "alta",
      matches: buyerMatches,
    });
  }

  const propertyMatches = matches.filter((match) => match.target.type === "imovel");
  if (propertyMatches.length >= 2) {
    recommendations.push({
      id: "imoveis-compativeis",
      message: `Existem ${propertyMatches.length} imóveis compatíveis para apresentar ou revisar.`,
      priority: "alta",
      matches: propertyMatches,
    });
  }

  return recommendations;
}
