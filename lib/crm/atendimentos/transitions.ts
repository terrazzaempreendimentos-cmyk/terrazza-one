import { isAtendimentoResult, isAtendimentoStatus, type AtendimentoResult, type AtendimentoStatus } from "./catalogs";

const ALLOWED_TRANSITIONS = {
  aguardando: ["em_atendimento", "cancelado"],
  em_atendimento: ["aguardando_cliente", "aguardando_interno", "concluido", "cancelado"],
  aguardando_cliente: ["em_atendimento", "aguardando_interno", "concluido", "cancelado"],
  aguardando_interno: ["em_atendimento", "aguardando_cliente", "concluido", "cancelado"],
  concluido: [],
  cancelado: [],
} as const satisfies Readonly<Record<AtendimentoStatus, readonly AtendimentoStatus[]>>;

export const CANCELLATION_RESULTS = ["sem_interesse", "sem_contato", "atendimento_duplicado", "cancelado_solicitante", "outro"] as const satisfies readonly AtendimentoResult[];
export const CONCLUSION_RESULTS = ["qualificado", "visita_agendada", "proposta_iniciada", "encaminhado_negocio", "convertido", "sem_interesse", "sem_contato", "outro"] as const satisfies readonly AtendimentoResult[];

export type AtendimentoTransitionValidation =
  | Readonly<{ valid: true; requiresResult: boolean; requiresCancellationReason: boolean }>
  | Readonly<{ valid: false; error: "estado_invalido" | "mesmo_estado" | "transicao_nao_permitida" | "resultado_obrigatorio" | "resultado_invalido" | "resultado_conclusao_invalido" | "resultado_cancelamento_invalido" | "motivo_cancelamento_obrigatorio" }>;

export function getAllowedAtendimentoTransitions(status: unknown): readonly AtendimentoStatus[] {
  return isAtendimentoStatus(status) ? ALLOWED_TRANSITIONS[status] : [];
}

export function canTransitionAtendimento(currentStatus: unknown, nextStatus: unknown): boolean {
  if (!isAtendimentoStatus(currentStatus) || !isAtendimentoStatus(nextStatus) || currentStatus === nextStatus) return false;
  return (ALLOWED_TRANSITIONS[currentStatus] as readonly AtendimentoStatus[]).includes(nextStatus);
}

export function requiresAdministrativeReopening(status: unknown): boolean {
  return status === "concluido" || status === "cancelado";
}

export function isCancellationResult(value: unknown): value is (typeof CANCELLATION_RESULTS)[number] {
  return isAtendimentoResult(value) && (CANCELLATION_RESULTS as readonly AtendimentoResult[]).includes(value);
}

export function isConclusionResult(value: unknown): value is (typeof CONCLUSION_RESULTS)[number] {
  return isAtendimentoResult(value) && (CONCLUSION_RESULTS as readonly AtendimentoResult[]).includes(value);
}

export function validateAtendimentoTransition(input: Readonly<{ currentStatus: unknown; nextStatus: unknown; result?: unknown; cancellationReason?: unknown }>): AtendimentoTransitionValidation {
  if (!isAtendimentoStatus(input.currentStatus) || !isAtendimentoStatus(input.nextStatus)) return { valid: false, error: "estado_invalido" };
  if (input.currentStatus === input.nextStatus) return { valid: false, error: "mesmo_estado" };
  if (!canTransitionAtendimento(input.currentStatus, input.nextStatus)) return { valid: false, error: "transicao_nao_permitida" };

  const isFinal = input.nextStatus === "concluido" || input.nextStatus === "cancelado";
  if (!isFinal) return { valid: true, requiresResult: false, requiresCancellationReason: false };
  if (input.result === null || input.result === undefined || input.result === "") return { valid: false, error: "resultado_obrigatorio" };
  if (!isAtendimentoResult(input.result)) return { valid: false, error: "resultado_invalido" };

  if (input.nextStatus === "cancelado") {
    if (!isCancellationResult(input.result)) return { valid: false, error: "resultado_cancelamento_invalido" };
    if (typeof input.cancellationReason !== "string" || !input.cancellationReason.trim()) return { valid: false, error: "motivo_cancelamento_obrigatorio" };
    return { valid: true, requiresResult: true, requiresCancellationReason: true };
  }

  if (!isConclusionResult(input.result)) return { valid: false, error: "resultado_conclusao_invalido" };
  return { valid: true, requiresResult: true, requiresCancellationReason: false };
}
