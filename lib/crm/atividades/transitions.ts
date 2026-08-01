import { ACTIVITY_LIMITS, isActivityStatus, type ActivityStatus } from "./catalogs";

const ALLOWED_TRANSITIONS = {
  pendente: ["em_andamento", "aguardando", "concluida", "cancelada"],
  em_andamento: ["aguardando", "concluida", "cancelada"],
  aguardando: ["em_andamento", "concluida", "cancelada"],
  concluida: [],
  cancelada: [],
} as const satisfies Readonly<Record<ActivityStatus, readonly ActivityStatus[]>>;

export type ActivityTransitionError =
  | "estado_invalido"
  | "mesmo_estado"
  | "transicao_nao_permitida"
  | "autor_obrigatorio"
  | "timestamp_obrigatorio"
  | "motivo_cancelamento_obrigatorio"
  | "motivo_cancelamento_invalido";

export type ActivityTransitionValidation =
  | Readonly<{ valid: true; final: boolean }>
  | Readonly<{ valid: false; error: ActivityTransitionError }>;

export function getAllowedActivityTransitions(status: unknown): readonly ActivityStatus[] {
  return isActivityStatus(status) ? ALLOWED_TRANSITIONS[status] : [];
}

export function canTransitionActivity(currentStatus: unknown, nextStatus: unknown): boolean {
  if (!isActivityStatus(currentStatus) || !isActivityStatus(nextStatus) || currentStatus === nextStatus) return false;
  return (ALLOWED_TRANSITIONS[currentStatus] as readonly ActivityStatus[]).includes(nextStatus);
}

export function requiresAdministrativeActivityReopening(status: unknown): boolean {
  return status === "concluida" || status === "cancelada";
}

function hasNonEmptyString(value: unknown): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

export function validateActivityTransition(input: Readonly<{
  currentStatus: unknown;
  nextStatus: unknown;
  authorUserId?: unknown;
  occurredAt?: unknown;
  cancellationReason?: unknown;
}>): ActivityTransitionValidation {
  if (!isActivityStatus(input.currentStatus) || !isActivityStatus(input.nextStatus)) return { valid: false, error: "estado_invalido" };
  if (input.currentStatus === input.nextStatus) return { valid: false, error: "mesmo_estado" };
  if (!canTransitionActivity(input.currentStatus, input.nextStatus)) return { valid: false, error: "transicao_nao_permitida" };

  const final = input.nextStatus === "concluida" || input.nextStatus === "cancelada";
  if (!final) return { valid: true, final: false };
  if (!hasNonEmptyString(input.authorUserId)) return { valid: false, error: "autor_obrigatorio" };
  if (!hasNonEmptyString(input.occurredAt)) return { valid: false, error: "timestamp_obrigatorio" };
  if (input.nextStatus === "cancelada") {
    if (!hasNonEmptyString(input.cancellationReason)) return { valid: false, error: "motivo_cancelamento_obrigatorio" };
    const reasonLength = (input.cancellationReason as string).trim().length;
    if (reasonLength < 3 || reasonLength > ACTIVITY_LIMITS.cancellationReason) {
      return { valid: false, error: "motivo_cancelamento_invalido" };
    }
  }
  return { valid: true, final: true };
}
