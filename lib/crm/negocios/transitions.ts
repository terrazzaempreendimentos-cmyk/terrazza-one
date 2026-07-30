import {
  isNegocioCancellationResult,
  isNegocioConclusionResult,
  isNegocioLossResult,
  isNegocioStage,
  isNegocioStatus,
  type NegocioStage,
} from "./catalogs";

export const NEGOCIO_STAGE_TRANSITIONS = Object.freeze({
  estruturacao: Object.freeze(["proposta"]),
  proposta: Object.freeze(["estruturacao", "negociacao"]),
  negociacao: Object.freeze(["proposta", "documentacao"]),
  documentacao: Object.freeze(["negociacao", "contrato"]),
  contrato: Object.freeze(["documentacao", "assinatura"]),
  assinatura: Object.freeze(["contrato"]),
} as const satisfies Readonly<Record<NegocioStage, readonly NegocioStage[]>>);

export type NegocioTransitionError =
  | "etapa_invalida"
  | "status_invalido"
  | "mesmo_estado"
  | "transicao_nao_permitida"
  | "negocio_arquivado"
  | "reabertura_administrativa_obrigatoria"
  | "resultado_conclusao_obrigatorio"
  | "resultado_conclusao_invalido"
  | "resultado_perda_obrigatorio"
  | "resultado_perda_invalido"
  | "resultado_cancelamento_obrigatorio"
  | "resultado_cancelamento_invalido"
  | "motivo_obrigatorio";

export type NegocioTransitionValidation =
  | Readonly<{ valid: true; kind: "etapa" | "conclusao" | "perda" | "cancelamento" | "arquivamento" }>
  | Readonly<{ valid: false; error: NegocioTransitionError }>;

export function canChangeNegocioStage(currentStage: unknown, nextStage: unknown): boolean {
  if (!isNegocioStage(currentStage) || !isNegocioStage(nextStage) || currentStage === nextStage) return false;
  return (NEGOCIO_STAGE_TRANSITIONS[currentStage] as readonly NegocioStage[]).includes(nextStage);
}

export function validateNegocioTransition(input: Readonly<{
  currentStage: unknown;
  currentStatus: unknown;
  active: unknown;
  nextStage?: unknown;
  nextStatus: unknown;
  result?: unknown;
  reason?: unknown;
}>): NegocioTransitionValidation {
  if (!isNegocioStage(input.currentStage) || (input.nextStage !== undefined && !isNegocioStage(input.nextStage))) {
    return { valid: false, error: "etapa_invalida" };
  }
  if (!isNegocioStatus(input.currentStatus) || !isNegocioStatus(input.nextStatus)) {
    return { valid: false, error: "status_invalido" };
  }
  if (input.active !== true) return { valid: false, error: "negocio_arquivado" };
  if (input.currentStatus !== "ativo") return { valid: false, error: "reabertura_administrativa_obrigatoria" };

  if (input.nextStatus === "ativo") {
    if (input.nextStage === undefined || input.nextStage === input.currentStage) return { valid: false, error: "mesmo_estado" };
    return canChangeNegocioStage(input.currentStage, input.nextStage)
      ? { valid: true, kind: "etapa" }
      : { valid: false, error: "transicao_nao_permitida" };
  }

  if (input.nextStatus === "concluido") {
    if (input.currentStage !== "assinatura") return { valid: false, error: "transicao_nao_permitida" };
    if (input.result === undefined || input.result === null || input.result === "") return { valid: false, error: "resultado_conclusao_obrigatorio" };
    return isNegocioConclusionResult(input.result)
      ? { valid: true, kind: "conclusao" }
      : { valid: false, error: "resultado_conclusao_invalido" };
  }

  if (input.nextStatus === "perdido") {
    if (!hasReason(input.reason)) return { valid: false, error: "motivo_obrigatorio" };
    if (input.result === undefined || input.result === null || input.result === "") return { valid: false, error: "resultado_perda_obrigatorio" };
    return isNegocioLossResult(input.result)
      ? { valid: true, kind: "perda" }
      : { valid: false, error: "resultado_perda_invalido" };
  }

  if (input.nextStatus === "cancelado") {
    if (!hasReason(input.reason)) return { valid: false, error: "motivo_obrigatorio" };
    if (input.result === undefined || input.result === null || input.result === "") return { valid: false, error: "resultado_cancelamento_obrigatorio" };
    return isNegocioCancellationResult(input.result)
      ? { valid: true, kind: "cancelamento" }
      : { valid: false, error: "resultado_cancelamento_invalido" };
  }

  return { valid: false, error: "status_invalido" };
}

function hasReason(value: unknown) {
  return typeof value === "string" && value.trim().length > 0;
}
