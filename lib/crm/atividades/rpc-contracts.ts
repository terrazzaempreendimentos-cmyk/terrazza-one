import type {
  ActivityOrigin,
  ActivityPriority,
  ActivityStatus,
  ActivityType,
} from "./catalogs";

export type ActivityOperationalPayload = Readonly<{
  titulo: string;
  descricao?: string | null;
  tipo: ActivityType;
  prioridade: ActivityPriority;
  origem: ActivityOrigin;
  lead_id?: string | null;
  atendimento_id?: string | null;
  negocio_id?: string | null;
  imovel_id?: string | null;
  pessoa_id?: string | null;
  responsavel_id?: string | null;
  inicio_planejado_em?: string | null;
  fim_planejado_em?: string | null;
  dia_inteiro?: boolean;
  local?: string | null;
  link_reuniao?: string | null;
  observacoes_internas?: string | null;
}>;

export type CreateActivityPayload = ActivityOperationalPayload;
export type UpdateActivityPayload = Readonly<Partial<ActivityOperationalPayload>>;

export type SaveActivityResult = Readonly<{
  atividade_id: string;
  status: ActivityStatus;
  updated_at: string;
}>;

export type ChangeActivityStateResult = Readonly<{
  atividade_id: string;
  status_anterior: ActivityStatus;
  status_atual: ActivityStatus;
  iniciado_em: string | null;
  updated_at: string;
}>;

export const ACTIVITY_RPC_LIMITS = Object.freeze({
  movementObservation: 500,
} as const);

export const OPEN_ACTIVITY_TRANSITIONS = Object.freeze({
  pendente: ["aguardando"],
  em_andamento: ["aguardando"],
  aguardando: ["em_andamento"],
  concluida: [],
  cancelada: [],
} as const satisfies Readonly<Record<ActivityStatus, readonly ActivityStatus[]>>);

export const ACTIVITY_RPC_MESSAGES = Object.freeze([
  "Operacao nao autorizada.",
  "Payload invalido.",
  "Atividade nao encontrada.",
  "Atividade inativa.",
  "Estado da Atividade invalido.",
  "Transicao de estado nao permitida.",
  "Atividade atualizada por outra operacao.",
  "Titulo obrigatorio.",
  "Titulo excede o limite permitido.",
  "Texto excede o limite permitido.",
  "Tipo de Atividade invalido.",
  "Prioridade da Atividade invalida.",
  "Origem da Atividade invalida.",
  "UUID invalido.",
  "Relacionamento nao encontrado.",
  "Relacionamento incompativel.",
  "Responsavel invalido.",
  "Datas da Atividade incoerentes.",
  "Observacao excede o limite permitido.",
  "Falha ao registrar Timeline da Atividade.",
  "Retorno inesperado.",
  "Nao foi possivel criar a Atividade.",
  "Nao foi possivel atualizar a Atividade.",
  "Nao foi possivel iniciar a Atividade.",
  "Nao foi possivel alterar o estado da Atividade.",
] as const);

export type ActivityRpcMessage = (typeof ACTIVITY_RPC_MESSAGES)[number];
const MESSAGE_SET: ReadonlySet<string> = new Set(ACTIVITY_RPC_MESSAGES);
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isActivityRpcMessage(value: unknown): value is ActivityRpcMessage {
  return typeof value === "string" && MESSAGE_SET.has(value);
}

export function isActivityRpcUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value);
}

export function isActivityRpcTimestamp(value: unknown): value is string {
  return typeof value === "string"
    && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(value)
    && !Number.isNaN(Date.parse(value));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasExactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  return actual.length === expected.length && actual.every((key, index) => key === expected[index]);
}

function isActivityStatusValue(value: unknown): value is ActivityStatus {
  return value === "pendente" || value === "em_andamento" || value === "aguardando" || value === "concluida" || value === "cancelada";
}

export function isSaveActivityResult(value: unknown): value is SaveActivityResult {
  if (!isRecord(value) || !hasExactKeys(value, ["atividade_id", "status", "updated_at"])) return false;
  return isActivityRpcUuid(value.atividade_id)
    && isActivityStatusValue(value.status)
    && isActivityRpcTimestamp(value.updated_at);
}

export function isChangeActivityStateResult(value: unknown): value is ChangeActivityStateResult {
  if (!isRecord(value) || !hasExactKeys(value, ["atividade_id", "status_anterior", "status_atual", "iniciado_em", "updated_at"])) return false;
  return isActivityRpcUuid(value.atividade_id)
    && isActivityStatusValue(value.status_anterior)
    && isActivityStatusValue(value.status_atual)
    && (value.iniciado_em === null || isActivityRpcTimestamp(value.iniciado_em))
    && isActivityRpcTimestamp(value.updated_at);
}

export function canUseOpenActivityTransition(currentStatus: unknown, nextStatus: unknown): boolean {
  if (!isActivityStatusValue(currentStatus) || !isActivityStatusValue(nextStatus) || currentStatus === nextStatus) return false;
  return (OPEN_ACTIVITY_TRANSITIONS[currentStatus] as readonly ActivityStatus[]).includes(nextStatus);
}
