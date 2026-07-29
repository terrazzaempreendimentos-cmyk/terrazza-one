import {
  isAtendimentoChannel,
  isAtendimentoPriority,
  isAtendimentoResult,
  isAtendimentoStatus,
  type AtendimentoChannel,
  type AtendimentoPriority,
  type AtendimentoResult,
  type AtendimentoStatus,
} from "./catalogs";
import { CANCELLATION_RESULTS, CONCLUSION_RESULTS } from "./transitions";

export const ATENDIMENTO_SUBJECT_MAX_LENGTH = 160;
export const ATENDIMENTO_SUMMARY_MAX_LENGTH = 2000;
export const ATENDIMENTO_RESULT_DETAIL_MAX_LENGTH = 2000;
export const ATENDIMENTO_CANCELLATION_REASON_MIN_LENGTH = 3;
export const ATENDIMENTO_CANCELLATION_REASON_MAX_LENGTH = 1000;
export const ATENDIMENTO_REOPEN_REASON_MIN_LENGTH = 3;
export const ATENDIMENTO_REOPEN_REASON_MAX_LENGTH = 500;

export const ATENDIMENTO_OPEN_MANAGED_STATUSES = [
  "em_atendimento",
  "aguardando_cliente",
  "aguardando_interno",
] as const satisfies readonly AtendimentoStatus[];

export type AtendimentoOpenManagedStatus = (typeof ATENDIMENTO_OPEN_MANAGED_STATUSES)[number];
export type AtendimentoConclusionResult = (typeof CONCLUSION_RESULTS)[number];
export type AtendimentoCancellationResult = (typeof CANCELLATION_RESULTS)[number];

export const ATENDIMENTO_OPEN_TRANSITIONS = Object.freeze({
  em_atendimento: Object.freeze(["aguardando_cliente", "aguardando_interno"]),
  aguardando_cliente: Object.freeze(["em_atendimento", "aguardando_interno"]),
  aguardando_interno: Object.freeze(["em_atendimento", "aguardando_cliente"]),
} as const satisfies Readonly<Record<AtendimentoOpenManagedStatus, readonly AtendimentoOpenManagedStatus[]>>);

export type CreateAtendimentoRpcResult = Readonly<{
  atendimento_id: string;
  lead_id: string;
  responsavel_id: string | null;
  status: "aguardando";
  prioridade: AtendimentoPriority;
  canal: AtendimentoChannel;
  origem: "criacao_manual";
  created_at: string;
}>;

export type AssumeAtendimentoRpcResult = Readonly<{
  atendimento_id: string;
  lead_id: string;
  responsavel_id: string;
  status: "em_atendimento";
  assumido_em: string;
  updated_at: string;
}>;

export type ChangeAtendimentoOpenStateRpcResult = Readonly<{
  atendimento_id: string;
  lead_id: string;
  responsavel_id: string;
  status_anterior: AtendimentoOpenManagedStatus;
  status_atual: AtendimentoOpenManagedStatus;
  updated_at: string;
}>;

export type ConcludeAtendimentoRpcResult = Readonly<{
  atendimento_id: string;
  lead_id: string;
  responsavel_id: string;
  status_anterior: AtendimentoOpenManagedStatus;
  status_atual: "concluido";
  resultado: AtendimentoConclusionResult;
  concluido_em: string;
  updated_at: string;
}>;

export type CancelAtendimentoRpcResult = Readonly<{
  atendimento_id: string;
  lead_id: string;
  responsavel_id: string | null;
  status_anterior: "aguardando" | AtendimentoOpenManagedStatus;
  status_atual: "cancelado";
  resultado: AtendimentoCancellationResult;
  cancelado_em: string;
  updated_at: string;
}>;

export type ReopenAtendimentoRpcResult = Readonly<{
  atendimento_id: string;
  atendimento_anterior_id: string;
  lead_id: string;
  responsavel_id: string | null;
  status: "aguardando";
  prioridade: AtendimentoPriority;
  canal: AtendimentoChannel;
  origem: "reabertura";
  created_at: string;
}>;

export const ATENDIMENTO_RPC_MESSAGES = Object.freeze([
  "Operacao nao autorizada.",
  "Lead nao informado.",
  "Atendimento nao informado.",
  "Prioridade invalida.",
  "Canal invalido.",
  "Assunto excede o limite permitido.",
  "Resumo excede o limite permitido.",
  "Lead nao encontrado.",
  "Lead inelegivel para Atendimento.",
  "Estado atual do Lead inconsistente.",
  "Responsavel do Lead invalido.",
  "Pessoa responsavel inativa.",
  "Pessoa sem papel corretor.",
  "Este Lead ja possui um Atendimento aberto.",
  "Atendimento nao encontrado.",
  "Atendimento atualizado por outra operacao.",
  "Atendimento sem responsavel.",
  "Atendimento ja assumido.",
  "Status esperado invalido.",
  "Status de destino invalido.",
  "O Atendimento ja esta nesta situacao.",
  "Transicao de Atendimento bloqueada.",
  "Conclusao de Atendimento bloqueada.",
  "Cancelamento de Atendimento bloqueado.",
  "Atendimento nao finalizado para reabertura.",
  "Resultado obrigatorio.",
  "Resultado invalido.",
  "Motivo obrigatorio.",
  "Motivo muito curto.",
  "Motivo excede o limite permitido.",
  "Detalhe do resultado excede o limite permitido.",
  "Falha ao registrar Timeline do Atendimento.",
  "Retorno inesperado do Atendimento.",
  "Nao foi possivel criar o Atendimento.",
  "Nao foi possivel assumir o Atendimento.",
  "Nao foi possivel alterar o estado do Atendimento.",
  "Nao foi possivel concluir o Atendimento.",
  "Nao foi possivel cancelar o Atendimento.",
  "Nao foi possivel reabrir o Atendimento.",
] as const);

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isAtendimentoRpcMessage(value: unknown): value is (typeof ATENDIMENTO_RPC_MESSAGES)[number] {
  return typeof value === "string" && ATENDIMENTO_RPC_MESSAGES.some((message) => message === value);
}

export function isAtendimentoOpenManagedStatus(value: unknown): value is AtendimentoOpenManagedStatus {
  return isAtendimentoStatus(value) && ATENDIMENTO_OPEN_MANAGED_STATUSES.some((status) => status === value);
}

export function canChangeAtendimentoOpenState(currentStatus: unknown, nextStatus: unknown): boolean {
  if (!isAtendimentoOpenManagedStatus(currentStatus) || !isAtendimentoOpenManagedStatus(nextStatus) || currentStatus === nextStatus) return false;
  return (ATENDIMENTO_OPEN_TRANSITIONS[currentStatus] as readonly AtendimentoOpenManagedStatus[]).includes(nextStatus);
}

export function isConclusionSourceStatus(value: unknown): value is AtendimentoOpenManagedStatus {
  return isAtendimentoOpenManagedStatus(value);
}

export function isCancellationSourceStatus(value: unknown): value is "aguardando" | AtendimentoOpenManagedStatus {
  return value === "aguardando" || isAtendimentoOpenManagedStatus(value);
}

export function isConclusionResult(value: unknown): value is AtendimentoConclusionResult {
  return isAtendimentoResult(value) && (CONCLUSION_RESULTS as readonly AtendimentoResult[]).includes(value);
}

export function isCancellationResult(value: unknown): value is AtendimentoCancellationResult {
  return isAtendimentoResult(value) && (CANCELLATION_RESULTS as readonly AtendimentoResult[]).includes(value);
}

export function isCreateAtendimentoRpcResult(value: unknown): value is CreateAtendimentoRpcResult {
  if (!isRecord(value)) return false;
  return isUuid(value.atendimento_id)
    && isUuid(value.lead_id)
    && (value.responsavel_id === null || isUuid(value.responsavel_id))
    && value.status === "aguardando"
    && isAtendimentoPriority(value.prioridade)
    && isAtendimentoChannel(value.canal)
    && value.origem === "criacao_manual"
    && isTimestamp(value.created_at);
}

export function isAssumeAtendimentoRpcResult(value: unknown): value is AssumeAtendimentoRpcResult {
  if (!isRecord(value)) return false;
  return isUuid(value.atendimento_id)
    && isUuid(value.lead_id)
    && isUuid(value.responsavel_id)
    && value.status === "em_atendimento"
    && isTimestamp(value.assumido_em)
    && isTimestamp(value.updated_at);
}

export function isChangeAtendimentoOpenStateRpcResult(value: unknown): value is ChangeAtendimentoOpenStateRpcResult {
  if (!isRecord(value)) return false;
  return isUuid(value.atendimento_id)
    && isUuid(value.lead_id)
    && isUuid(value.responsavel_id)
    && isAtendimentoOpenManagedStatus(value.status_anterior)
    && isAtendimentoOpenManagedStatus(value.status_atual)
    && canChangeAtendimentoOpenState(value.status_anterior, value.status_atual)
    && isTimestamp(value.updated_at);
}

export function isConcludeAtendimentoRpcResult(value: unknown): value is ConcludeAtendimentoRpcResult {
  if (!isRecord(value)) return false;
  return isUuid(value.atendimento_id)
    && isUuid(value.lead_id)
    && isUuid(value.responsavel_id)
    && isConclusionSourceStatus(value.status_anterior)
    && value.status_atual === "concluido"
    && isConclusionResult(value.resultado)
    && isTimestamp(value.concluido_em)
    && isTimestamp(value.updated_at);
}

export function isCancelAtendimentoRpcResult(value: unknown): value is CancelAtendimentoRpcResult {
  if (!isRecord(value)) return false;
  return isUuid(value.atendimento_id)
    && isUuid(value.lead_id)
    && (value.responsavel_id === null || isUuid(value.responsavel_id))
    && isCancellationSourceStatus(value.status_anterior)
    && value.status_atual === "cancelado"
    && isCancellationResult(value.resultado)
    && isTimestamp(value.cancelado_em)
    && isTimestamp(value.updated_at);
}

export function isReopenAtendimentoRpcResult(value: unknown): value is ReopenAtendimentoRpcResult {
  if (!isRecord(value)) return false;
  return isUuid(value.atendimento_id)
    && isUuid(value.atendimento_anterior_id)
    && value.atendimento_id !== value.atendimento_anterior_id
    && isUuid(value.lead_id)
    && (value.responsavel_id === null || isUuid(value.responsavel_id))
    && value.status === "aguardando"
    && isAtendimentoPriority(value.prioridade)
    && isAtendimentoChannel(value.canal)
    && value.origem === "reabertura"
    && isTimestamp(value.created_at);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value);
}

function isTimestamp(value: unknown): value is string {
  return typeof value === "string" && !Number.isNaN(Date.parse(value));
}
