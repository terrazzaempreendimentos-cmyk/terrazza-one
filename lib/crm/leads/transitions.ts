import {
  isLeadFunnelStage,
  type LeadFunnelStage,
} from "./catalogs";

const NORMAL_FLOW = [
  "novo",
  "qualificacao",
  "atendimento",
  "visita_avaliacao",
  "proposta",
  "negociacao",
  "documentacao",
  "fechado",
] as const satisfies readonly LeadFunnelStage[];

export type LeadTransitionKind =
  | "advance"
  | "return"
  | "lose"
  | "reopen_lost"
  | "blocked";

export type LeadTransitionAuthorization =
  | "standard"
  | "requires_manager_or_admin"
  | "not_applicable";

export type LeadTransitionAssessment = Readonly<{
  structurallyValid: boolean;
  kind: LeadTransitionKind;
  authorization: LeadTransitionAuthorization;
  reason: string;
}>;

function blocked(reason: string): LeadTransitionAssessment {
  return {
    structurallyValid: false,
    kind: "blocked",
    authorization: "not_applicable",
    reason,
  };
}

export function assessLeadStageTransition(
  from: unknown,
  to: unknown,
): LeadTransitionAssessment {
  if (!isLeadFunnelStage(from) || !isLeadFunnelStage(to)) {
    return blocked("Etapa de origem ou destino desconhecida.");
  }

  if (from === to) return blocked("Origem e destino são a mesma etapa.");
  if (from === "fechado") return blocked("Um lead fechado não reabre automaticamente.");

  if (from === "perdido") {
    if (to === "fechado" || to === "perdido") {
      return blocked("A reabertura deve retornar a uma etapa operacional não final.");
    }

    return {
      structurallyValid: true,
      kind: "reopen_lost",
      authorization: "requires_manager_or_admin",
      reason: "Reabertura estruturalmente possível, sujeita à autorização futura.",
    };
  }

  if (to === "perdido") {
    return {
      structurallyValid: true,
      kind: "lose",
      authorization: "standard",
      reason: "Etapas não finais podem ser encerradas como perdidas.",
    };
  }

  const fromIndex = NORMAL_FLOW.indexOf(from as (typeof NORMAL_FLOW)[number]);
  const toIndex = NORMAL_FLOW.indexOf(to as (typeof NORMAL_FLOW)[number]);

  if (fromIndex < 0 || toIndex < 0) return blocked("Transição fora do fluxo normal.");

  if (toIndex === fromIndex + 1) {
    return {
      structurallyValid: true,
      kind: "advance",
      authorization: "standard",
      reason: "Avanço para a próxima etapa do fluxo.",
    };
  }

  if (toIndex === fromIndex - 1) {
    return {
      structurallyValid: true,
      kind: "return",
      authorization: "standard",
      reason: "Retorno controlado para a etapa imediatamente anterior.",
    };
  }

  return blocked("O fluxo não permite pular etapas nem retornar mais de uma etapa.");
}

export function isLeadStageTransitionStructurallyValid(from: unknown, to: unknown) {
  return assessLeadStageTransition(from, to).structurallyValid;
}

