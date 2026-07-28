export type AtendimentoVisualVariant = "neutral" | "info" | "primary" | "warning" | "success" | "danger" | "muted";

type CatalogItem<Id extends string> = Readonly<{
  id: Id;
  label: string;
  description: string;
  order: number;
  variant: AtendimentoVisualVariant;
}>;

function catalogHasId<const T extends readonly CatalogItem<string>[]>(catalog: T, value: unknown): value is T[number]["id"] {
  return typeof value === "string" && catalog.some((item) => item.id === value);
}

function catalogItem<const T extends readonly CatalogItem<string>[]>(catalog: T, value: unknown): T[number] | null {
  if (!catalogHasId(catalog, value)) return null;
  return catalog.find((item) => item.id === value) ?? null;
}

export const ATENDIMENTO_STATUSES = [
  { id: "aguardando", label: "Aguardando", description: "Entrou na fila humana e ainda nao foi assumido.", order: 0, isFinal: false, variant: "neutral" },
  { id: "em_atendimento", label: "Em atendimento", description: "Existe uma Pessoa responsavel conduzindo o caso.", order: 1, isFinal: false, variant: "primary" },
  { id: "aguardando_cliente", label: "Aguardando cliente", description: "A equipe aguarda retorno ou documento do cliente.", order: 2, isFinal: false, variant: "warning" },
  { id: "aguardando_interno", label: "Aguardando interno", description: "O caso depende de uma providencia ou decisao interna.", order: 3, isFinal: false, variant: "info" },
  { id: "concluido", label: "Concluido", description: "Atendimento encerrado normalmente com resultado registrado.", order: 4, isFinal: true, variant: "success" },
  { id: "cancelado", label: "Cancelado", description: "Atendimento encerrado sem continuidade, com motivo e resultado.", order: 5, isFinal: true, variant: "danger" },
] as const satisfies readonly (CatalogItem<string> & { isFinal: boolean })[];

export type AtendimentoStatus = (typeof ATENDIMENTO_STATUSES)[number]["id"];
export const isAtendimentoStatus = (value: unknown): value is AtendimentoStatus => catalogHasId(ATENDIMENTO_STATUSES, value);
export const getAtendimentoStatus = (value: unknown) => catalogItem(ATENDIMENTO_STATUSES, value);
export const getAtendimentoStatusLabel = (value: unknown) => getAtendimentoStatus(value)?.label ?? null;
export const isAtendimentoFinalStatus = (value: unknown) => getAtendimentoStatus(value)?.isFinal === true;

export const ATENDIMENTO_PRIORITIES = [
  { id: "baixa", label: "Baixa", description: "Pode aguardar a fila operacional regular.", order: 0, variant: "muted" },
  { id: "normal", label: "Normal", description: "Prioridade padrao sugerida para novos Atendimentos.", order: 1, variant: "neutral" },
  { id: "alta", label: "Alta", description: "Exige acompanhamento prioritario.", order: 2, variant: "warning" },
  { id: "urgente", label: "Urgente", description: "Exige resposta operacional imediata.", order: 3, variant: "danger" },
] as const satisfies readonly CatalogItem<string>[];

export type AtendimentoPriority = (typeof ATENDIMENTO_PRIORITIES)[number]["id"];
export const isAtendimentoPriority = (value: unknown): value is AtendimentoPriority => catalogHasId(ATENDIMENTO_PRIORITIES, value);
export const getAtendimentoPriority = (value: unknown) => catalogItem(ATENDIMENTO_PRIORITIES, value);
export const getAtendimentoPriorityLabel = (value: unknown) => getAtendimentoPriority(value)?.label ?? null;

export const ATENDIMENTO_CHANNELS = [
  { id: "manual", label: "Manual", description: "Atendimento registrado manualmente.", order: 0, variant: "neutral" },
  { id: "whatsapp", label: "WhatsApp", description: "Contato conduzido pelo WhatsApp.", order: 1, variant: "success" },
  { id: "email", label: "E-mail", description: "Contato conduzido por e-mail.", order: 2, variant: "info" },
  { id: "site", label: "Site", description: "Contato originado no site.", order: 3, variant: "info" },
  { id: "instagram", label: "Instagram", description: "Contato originado no Instagram.", order: 4, variant: "primary" },
  { id: "facebook", label: "Facebook", description: "Contato originado no Facebook.", order: 5, variant: "primary" },
  { id: "portal", label: "Portal", description: "Contato originado em portal imobiliario.", order: 6, variant: "info" },
  { id: "telefone", label: "Telefone", description: "Contato realizado por ligacao telefonica.", order: 7, variant: "neutral" },
  { id: "indicacao", label: "Indicacao", description: "Contato decorrente de indicacao.", order: 8, variant: "warning" },
  { id: "outro", label: "Outro", description: "Canal ainda nao contemplado no catalogo.", order: 9, variant: "muted" },
] as const satisfies readonly CatalogItem<string>[];

export type AtendimentoChannel = (typeof ATENDIMENTO_CHANNELS)[number]["id"];
export const isAtendimentoChannel = (value: unknown): value is AtendimentoChannel => catalogHasId(ATENDIMENTO_CHANNELS, value);
export const getAtendimentoChannel = (value: unknown) => catalogItem(ATENDIMENTO_CHANNELS, value);
export const getAtendimentoChannelLabel = (value: unknown) => getAtendimentoChannel(value)?.label ?? null;

export const ATENDIMENTO_ORIGINS = [
  { id: "distribuicao_manual", label: "Distribuicao manual", description: "Criado a partir de uma distribuicao manual do Lead.", order: 0, variant: "neutral" },
  { id: "roleta_automatica", label: "Roleta automatica", description: "Criado a partir da distribuicao automatica da Roleta.", order: 1, variant: "primary" },
  { id: "handoff_ia", label: "Handoff da IA", description: "Criado para encaminhamento da IA a uma Pessoa.", order: 2, variant: "info" },
  { id: "criacao_manual", label: "Criacao manual", description: "Criado conscientemente por usuario autorizado.", order: 3, variant: "neutral" },
  { id: "reabertura", label: "Reabertura", description: "Novo Atendimento relacionado a um Atendimento finalizado.", order: 4, variant: "warning" },
  { id: "integracao", label: "Integracao", description: "Criado por integracao externa autorizada e idempotente.", order: 5, variant: "info" },
] as const satisfies readonly CatalogItem<string>[];

export type AtendimentoOrigin = (typeof ATENDIMENTO_ORIGINS)[number]["id"];
export const isAtendimentoOrigin = (value: unknown): value is AtendimentoOrigin => catalogHasId(ATENDIMENTO_ORIGINS, value);
export const getAtendimentoOrigin = (value: unknown) => catalogItem(ATENDIMENTO_ORIGINS, value);
export const getAtendimentoOriginLabel = (value: unknown) => getAtendimentoOrigin(value)?.label ?? null;

export const ATENDIMENTO_RESULTS = [
  { id: "qualificado", label: "Qualificado", description: "Caso qualificado para continuidade comercial.", order: 0, variant: "success" },
  { id: "visita_agendada", label: "Visita agendada", description: "Atendimento resultou em intencao de visita; a Atividade deve ser criada separadamente.", order: 1, variant: "success" },
  { id: "proposta_iniciada", label: "Proposta iniciada", description: "Atendimento encaminhou a preparacao de proposta, sem substituir o Lead.", order: 2, variant: "primary" },
  { id: "encaminhado_negocio", label: "Encaminhado para Negocio", description: "Atendimento indicou evolucao comercial, sem criar Negocio automaticamente.", order: 3, variant: "primary" },
  { id: "convertido", label: "Convertido", description: "Resultado declarado do Atendimento; nao altera Lead ou Negocio automaticamente.", order: 4, variant: "success" },
  { id: "sem_interesse", label: "Sem interesse", description: "Solicitante nao deseja continuar neste Atendimento.", order: 5, variant: "danger" },
  { id: "sem_contato", label: "Sem contato", description: "Nao foi possivel estabelecer contato apos o processo aprovado.", order: 6, variant: "warning" },
  { id: "atendimento_duplicado", label: "Atendimento duplicado", description: "Caso encerrado por duplicidade operacional.", order: 7, variant: "warning" },
  { id: "cancelado_solicitante", label: "Cancelado pelo solicitante", description: "Solicitante pediu o cancelamento do Atendimento.", order: 8, variant: "danger" },
  { id: "outro", label: "Outro", description: "Resultado detalhado em campo complementar controlado.", order: 9, variant: "muted" },
] as const satisfies readonly CatalogItem<string>[];

export type AtendimentoResult = (typeof ATENDIMENTO_RESULTS)[number]["id"];
export const isAtendimentoResult = (value: unknown): value is AtendimentoResult => catalogHasId(ATENDIMENTO_RESULTS, value);
export const getAtendimentoResult = (value: unknown) => catalogItem(ATENDIMENTO_RESULTS, value);
export const getAtendimentoResultLabel = (value: unknown) => getAtendimentoResult(value)?.label ?? null;
