export type ActivityVisualVariant =
  | "neutral"
  | "info"
  | "primary"
  | "warning"
  | "success"
  | "danger"
  | "muted";

export type ActivityCatalogClassification =
  | "confirmed_current_use"
  | "recommended"
  | "provisional"
  | "pending_decision";

type CatalogItem<Id extends string> = Readonly<{
  id: Id;
  label: string;
  description: string;
  order: number;
  variant: ActivityVisualVariant;
}>;

type ClassifiedCatalogItem<Id extends string> = CatalogItem<Id> &
  Readonly<{ classification: ActivityCatalogClassification }>;

function hasCatalogId<const T extends readonly CatalogItem<string>[]>(
  catalog: T,
  value: unknown,
): value is T[number]["id"] {
  return typeof value === "string" && catalog.some((item) => item.id === value);
}

function getCatalogItem<const T extends readonly CatalogItem<string>[]>(
  catalog: T,
  value: unknown,
): T[number] | null {
  if (!hasCatalogId(catalog, value)) return null;
  return catalog.find((item) => item.id === value) ?? null;
}

export const ACTIVITY_TYPES = [
  { id: "tarefa_interna", label: "Tarefa interna", description: "Acao operacional generica; corresponde ao tipo legado tarefa.", order: 0, variant: "neutral", classification: "confirmed_current_use" },
  { id: "ligacao", label: "Ligacao", description: "Contato telefonico planejado.", order: 1, variant: "success", classification: "confirmed_current_use" },
  { id: "mensagem", label: "Mensagem", description: "Comunicacao individual por canal nao especificado.", order: 2, variant: "info", classification: "confirmed_current_use" },
  { id: "whatsapp", label: "WhatsApp", description: "Contato planejado especificamente pelo WhatsApp.", order: 3, variant: "success", classification: "recommended" },
  { id: "email", label: "E-mail", description: "Contato planejado por e-mail.", order: 4, variant: "info", classification: "recommended" },
  { id: "reuniao", label: "Reuniao", description: "Compromisso com horario e participantes.", order: 5, variant: "primary", classification: "confirmed_current_use" },
  { id: "visita", label: "Visita", description: "Visita operacional a imovel ou cliente.", order: 6, variant: "primary", classification: "confirmed_current_use" },
  { id: "avaliacao", label: "Avaliacao", description: "Avaliacao comercial de imovel; corresponde ao legado avaliacao_imovel.", order: 7, variant: "warning", classification: "confirmed_current_use" },
  { id: "retorno", label: "Retorno", description: "Retorno ou follow-up previamente combinado.", order: 8, variant: "warning", classification: "confirmed_current_use" },
  { id: "proposta", label: "Proposta", description: "Preparacao ou acompanhamento de proposta.", order: 9, variant: "primary", classification: "recommended" },
  { id: "documentacao", label: "Documentacao", description: "Pendencia ou conferencia documental.", order: 10, variant: "warning", classification: "confirmed_current_use" },
  { id: "assinatura", label: "Assinatura", description: "Compromisso de assinatura documental.", order: 11, variant: "success", classification: "confirmed_current_use" },
  { id: "entrega_chaves", label: "Entrega de chaves", description: "Entrega ou recebimento formal de chaves.", order: 12, variant: "success", classification: "confirmed_current_use" },
  { id: "vistoria", label: "Vistoria", description: "Vistoria planejada de imovel.", order: 13, variant: "warning", classification: "recommended" },
  { id: "outro", label: "Outro", description: "Tipo excepcional detalhado por titulo e descricao.", order: 14, variant: "muted", classification: "provisional" },
] as const satisfies readonly ClassifiedCatalogItem<string>[];

export type ActivityType = (typeof ACTIVITY_TYPES)[number]["id"];
export const isActivityType = (value: unknown): value is ActivityType => hasCatalogId(ACTIVITY_TYPES, value);
export const getActivityType = (value: unknown) => getCatalogItem(ACTIVITY_TYPES, value);

export const ACTIVITY_STATUSES = [
  { id: "pendente", label: "Pendente", description: "Ainda nao iniciada.", order: 0, isFinal: false, variant: "neutral" },
  { id: "em_andamento", label: "Em andamento", description: "Execucao iniciada.", order: 1, isFinal: false, variant: "primary" },
  { id: "aguardando", label: "Aguardando", description: "Depende de retorno ou providencia externa.", order: 2, isFinal: false, variant: "warning" },
  { id: "concluida", label: "Concluida", description: "Acao realizada e encerrada.", order: 3, isFinal: true, variant: "success" },
  { id: "cancelada", label: "Cancelada", description: "Acao encerrada sem execucao completa.", order: 4, isFinal: true, variant: "danger" },
] as const satisfies readonly (CatalogItem<string> & { isFinal: boolean })[];

export type ActivityStatus = (typeof ACTIVITY_STATUSES)[number]["id"];
export const isActivityStatus = (value: unknown): value is ActivityStatus => hasCatalogId(ACTIVITY_STATUSES, value);
export const getActivityStatus = (value: unknown) => getCatalogItem(ACTIVITY_STATUSES, value);
export const isFinalActivityStatus = (value: unknown) => getActivityStatus(value)?.isFinal === true;

export const ACTIVITY_PRIORITIES = [
  { id: "baixa", label: "Baixa", description: "Pode aguardar a fila operacional regular.", order: 0, variant: "muted" },
  { id: "normal", label: "Normal", description: "Prioridade padrao, em paridade nominal com Atendimentos.", order: 1, variant: "neutral" },
  { id: "alta", label: "Alta", description: "Exige acompanhamento prioritario.", order: 2, variant: "warning" },
  { id: "urgente", label: "Urgente", description: "Exige resposta operacional imediata.", order: 3, variant: "danger" },
] as const satisfies readonly CatalogItem<string>[];

export type ActivityPriority = (typeof ACTIVITY_PRIORITIES)[number]["id"];
export const isActivityPriority = (value: unknown): value is ActivityPriority => hasCatalogId(ACTIVITY_PRIORITIES, value);
export const getActivityPriority = (value: unknown) => getCatalogItem(ACTIVITY_PRIORITIES, value);

export const ACTIVITY_ORIGINS = [
  { id: "manual", label: "Manual", description: "Criada conscientemente por usuario autorizado.", order: 0, variant: "neutral" },
  { id: "lead", label: "Lead", description: "Criada no contexto operacional de um Lead.", order: 1, variant: "primary" },
  { id: "atendimento", label: "Atendimento", description: "Criada no contexto de um Atendimento.", order: 2, variant: "info" },
  { id: "negocio", label: "Negocio", description: "Criada no contexto de um Negocio.", order: 3, variant: "success" },
  { id: "agenda", label: "Agenda", description: "Criada pela interface da Agenda; nao representa fonte de dados paralela.", order: 4, variant: "warning" },
  { id: "integracao", label: "Integracao", description: "Criada por integracao futura autorizada e idempotente.", order: 5, variant: "muted" },
] as const satisfies readonly CatalogItem<string>[];

export type ActivityOrigin = (typeof ACTIVITY_ORIGINS)[number]["id"];
export const isActivityOrigin = (value: unknown): value is ActivityOrigin => hasCatalogId(ACTIVITY_ORIGINS, value);
export const getActivityOrigin = (value: unknown) => getCatalogItem(ACTIVITY_ORIGINS, value);

export const ACTIVITY_LIMITS = Object.freeze({
  title: 160,
  description: 2_000,
  completionSummary: 1_000,
  cancellationReason: 1_000,
  location: 300,
  meetingLink: 2_048,
  internalNotes: 4_000,
} as const);

export type ActivityDateState = "sem_prazo" | "futura" | "hoje" | "atrasada" | "finalizada" | "invalida";

export function getActivityDateState(input: Readonly<{ dueAt: unknown; status: unknown; now: Date }>): ActivityDateState {
  if (!isActivityStatus(input.status)) return "invalida";
  if (isFinalActivityStatus(input.status)) return "finalizada";
  if (input.dueAt === null || input.dueAt === undefined || input.dueAt === "") return "sem_prazo";
  if (typeof input.dueAt !== "string") return "invalida";
  const dueAt = new Date(input.dueAt);
  if (Number.isNaN(dueAt.getTime()) || Number.isNaN(input.now.getTime())) return "invalida";
  const dueDay = dueAt.toISOString().slice(0, 10);
  const nowDay = input.now.toISOString().slice(0, 10);
  if (dueAt.getTime() < input.now.getTime()) return "atrasada";
  if (dueDay === nowDay) return "hoje";
  return "futura";
}
