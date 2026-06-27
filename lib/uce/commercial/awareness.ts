import type {
  UCECommercialAwareness,
  UCECommercialStrategy,
  UCEContext,
  UCEHypothesis,
} from "../core/types";

function text(value: unknown) {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function evaluateCommercialAwareness(
  context: UCEContext,
  score: number,
  hypotheses: UCEHypothesis[],
  strategy: UCECommercialStrategy,
): UCECommercialAwareness {
  const objective = text(context.fields.objetivo);
  const urgency = text(context.fields.urgencia);
  const value = Number(context.fields.valor ?? 0);
  const lastMessage = text(context.memory.at(-1)?.content);
  const highStandard = hypotheses.some(
    (hypothesis) =>
      hypothesis.key.includes("alto") ||
      hypothesis.title.toLowerCase().includes("alto"),
  );
  const legalSignal =
    strategy.id === "modo_juridico_cauteloso" ||
    lastMessage.includes("juridic") ||
    lastMessage.includes("contrato") ||
    lastMessage.includes("fiador");
  const priceObjection =
    lastMessage.includes("caro") ||
    lastMessage.includes("condominio alto") ||
    lastMessage.includes("preco");

  const financialPotential =
    objective.includes("administracao") || highStandard || value > 5000
      ? "alto"
      : value >= 3000
        ? "medio"
        : "baixo";
  const conversionChance =
    !context.fields.valor && !context.fields.urgencia
      ? 25
      : Math.min(100, score + (urgency === "alta" ? 10 : 0));
  const commercialRisk = legalSignal ? "alto" : priceObjection ? "medio" : strategy.risk;
  const shouldEscalateToHuman =
    legalSignal || (score > 75 && urgency === "alta") || commercialRisk === "alto";
  const leadEffort =
    commercialRisk === "alto" || conversionChance < 40
      ? "alto"
      : conversionChance >= 70
        ? "baixo"
        : "medio";

  return {
    conversionChance,
    financialPotential,
    leadEffort,
    urgencyLevel: urgency || "indefinida",
    commercialRisk,
    shouldEscalateToHuman,
    reason: shouldEscalateToHuman
      ? "Momento comercial pede acompanhamento humano para reduzir risco e acelerar resposta."
      : "UCE pode seguir qualificando e preparando briefing sem escalar imediatamente.",
  };
}
