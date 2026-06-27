import type {
  UCEBrokerMentorBriefing,
  UCECommercialAwareness,
  UCECommercialStrategy,
  UCEContext,
  UCEHypothesis,
} from "../core/types";

function hasHypothesis(hypotheses: UCEHypothesis[], key: string) {
  return hypotheses.some(
    (hypothesis) =>
      hypothesis.key.includes(key) ||
      hypothesis.title.toLowerCase().includes(key),
  );
}

export function generateBrokerMentorBriefing(
  context: UCEContext,
  hypotheses: UCEHypothesis[],
  strategy: UCECommercialStrategy,
  awareness: UCECommercialAwareness,
): UCEBrokerMentorBriefing {
  const isOwner = context.leadType === "proprietario";
  const urgent = awareness.urgencyLevel === "alta";
  const consultative = strategy.id === "modo_consultivo";

  const psychologicalProfile = urgent
    ? "Lead orientado a resolucao rapida; tende a valorizar clareza e velocidade."
    : consultative
      ? "Lead exploratorio; precisa sentir seguranca antes de avancar."
      : isOwner
        ? "Proprietario busca previsibilidade, protecao patrimonial e boa gestao."
        : "Lead com sinais mistos; conduzir com perguntas objetivas e acolhedoras.";

  const probableObjections = [
    awareness.commercialRisk !== "baixo" ? "Risco percebido na tomada de decisao" : null,
    hasHypothesis(hypotheses, "alto") ? "Expectativa elevada de curadoria" : null,
    isOwner ? "Inseguranca sobre inquilino, garantia ou administracao" : null,
    consultative ? "Ainda esta comparando opcoes" : null,
  ].filter(Boolean) as string[];

  return {
    summary: `${strategy.name}: ${strategy.description}`,
    psychologicalProfile,
    probableObjections:
      probableObjections.length > 0
        ? probableObjections
        : ["Nenhuma objecao forte prevista ate aqui."],
    bestApproach: urgent
      ? "Seja objetivo, ofereca 2 ou 3 opcoes e tente agendar visita rapidamente."
      : consultative
        ? "Nao pressione. Ofereca curadoria e crie confianca."
        : isOwner
          ? "Valorize seguranca, analise cadastral, garantia e acompanhamento profissional."
          : "Conduza com clareza, confirme criterios e proponha proximo passo simples.",
    phrasesToUse: [
      strategy.suggestedMessage,
      "Vou organizar isso de forma objetiva para facilitar sua decisao.",
      "Se fizer sentido, ja deixo o proximo passo encaminhado.",
    ],
    phrasesToAvoid: [
      "Garantimos aprovacao.",
      "Esse e o melhor imovel sem comparar alternativas.",
      "Voce precisa decidir agora.",
    ],
    nextBestAction: strategy.nextBestAction,
    riskAlerts: [
      awareness.shouldEscalateToHuman ? "Acionar corretor humano." : null,
      awareness.commercialRisk !== "baixo"
        ? `Risco comercial ${awareness.commercialRisk}.`
        : null,
      awareness.financialPotential === "alto" ? "Tratar como oportunidade premium." : null,
    ].filter(Boolean) as string[],
  };
}
