export type LeadSemanticVariant =
  | "neutral"
  | "info"
  | "warning"
  | "primary"
  | "success"
  | "danger"
  | "muted";

type CatalogItem<Id extends string> = Readonly<{
  id: Id;
  label: string;
  description: string;
}>;

function catalogHasId<const T extends readonly CatalogItem<string>[]>(
  catalog: T,
  value: unknown,
): value is T[number]["id"] {
  return (
    typeof value === "string" &&
    catalog.some((item) => item.id === value)
  );
}

function catalogLabel<const T extends readonly CatalogItem<string>[]>(
  catalog: T,
  value: unknown,
): string | null {
  if (!catalogHasId(catalog, value)) return null;
  return catalog.find((item) => item.id === value)?.label ?? null;
}

function normalizeLegacyValue(value: unknown): string | null {
  if (typeof value !== "string") return null;

  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\s-]+/g, "_");
}

export const LEAD_FUNNEL_STAGES = [
  {
    id: "novo",
    label: "Novo",
    order: 0,
    description: "Entrada comercial ainda não qualificada.",
    isFinal: false,
    variant: "neutral",
  },
  {
    id: "qualificacao",
    label: "Qualificação",
    order: 1,
    description: "Coleta e validação das necessidades do lead.",
    isFinal: false,
    variant: "info",
  },
  {
    id: "atendimento",
    label: "Atendimento",
    order: 2,
    description: "Atendimento humano ou comercial em andamento.",
    isFinal: false,
    variant: "primary",
  },
  {
    id: "visita_avaliacao",
    label: "Visita/Avaliação",
    order: 3,
    description: "Visita ou avaliação imobiliária em andamento.",
    isFinal: false,
    variant: "warning",
  },
  {
    id: "proposta",
    label: "Proposta",
    order: 4,
    description: "Proposta comercial apresentada ou em elaboração.",
    isFinal: false,
    variant: "warning",
  },
  {
    id: "negociacao",
    label: "Negociação",
    order: 5,
    description: "Condições comerciais em negociação.",
    isFinal: false,
    variant: "primary",
  },
  {
    id: "documentacao",
    label: "Documentação",
    order: 6,
    description: "Documentos, contrato e assinaturas em processamento.",
    isFinal: false,
    variant: "info",
  },
  {
    id: "fechado",
    label: "Fechado",
    order: 7,
    description: "Conversão comercial concluída.",
    isFinal: true,
    variant: "success",
  },
  {
    id: "perdido",
    label: "Perdido",
    order: 8,
    description: "Oportunidade encerrada sem conversão.",
    isFinal: true,
    variant: "danger",
  },
] as const;

export type LeadFunnelStage = (typeof LEAD_FUNNEL_STAGES)[number]["id"];

export function isLeadFunnelStage(value: unknown): value is LeadFunnelStage {
  return catalogHasId(LEAD_FUNNEL_STAGES, value);
}

export function getLeadFunnelStageLabel(value: unknown) {
  return catalogLabel(LEAD_FUNNEL_STAGES, value);
}

const LEGACY_STAGE_MAP = {
  "": "novo",
  novo: "novo",
  ia_qualificando: "qualificacao",
  corretor: "atendimento",
  em_atendimento: "atendimento",
  visita: "visita_avaliacao",
  avaliacao: "visita_avaliacao",
  avaliacao_imovel: "visita_avaliacao",
  proposta: "proposta",
  negociacao: "negociacao",
  contrato: "documentacao",
  documentacao: "documentacao",
  fechado: "fechado",
  perdido: "perdido",
} as const satisfies Readonly<Record<string, LeadFunnelStage>>;

export function mapLegacyLeadStage(value: unknown): LeadFunnelStage | null {
  const normalized = normalizeLegacyValue(value);
  if (normalized === null) return null;
  return LEGACY_STAGE_MAP[normalized as keyof typeof LEGACY_STAGE_MAP] ?? null;
}

export const LEAD_OPERATIONAL_STATUSES = [
  { id: "ativo", label: "Ativo", description: "Em operação comercial." },
  { id: "convertido", label: "Convertido", description: "Conversão concluída." },
  { id: "perdido", label: "Perdido", description: "Encerrado sem conversão." },
  { id: "arquivado", label: "Arquivado", description: "Retirado logicamente da operação." },
] as const;

export type LeadOperationalStatus = (typeof LEAD_OPERATIONAL_STATUSES)[number]["id"];
export const isLeadOperationalStatus = (value: unknown): value is LeadOperationalStatus =>
  catalogHasId(LEAD_OPERATIONAL_STATUSES, value);
export const getLeadOperationalStatusLabel = (value: unknown) =>
  catalogLabel(LEAD_OPERATIONAL_STATUSES, value);

export const LEAD_TEMPERATURES = [
  { id: "frio", label: "Frio", description: "Baixa urgência ou engajamento." },
  { id: "morno", label: "Morno", description: "Interesse e engajamento intermediários." },
  { id: "quente", label: "Quente", description: "Alta intenção ou urgência comercial." },
] as const;

export type LeadTemperature = (typeof LEAD_TEMPERATURES)[number]["id"];
export const isLeadTemperature = (value: unknown): value is LeadTemperature =>
  catalogHasId(LEAD_TEMPERATURES, value);
export const getLeadTemperatureLabel = (value: unknown) =>
  catalogLabel(LEAD_TEMPERATURES, value);

export const LEAD_RELATIONSHIP_TYPES = [
  { id: "interessado_imovel", label: "Interessado em imóvel", description: "Busca comprar ou alugar um imóvel." },
  { id: "proprietario_anunciante", label: "Proprietário anunciante", description: "Pretende vender ou anunciar para locação." },
  { id: "proprietario_administracao", label: "Proprietário para administração", description: "Busca administração imobiliária." },
  { id: "avaliacao_imovel", label: "Avaliação de imóvel", description: "Busca avaliação imobiliária." },
  { id: "investidor", label: "Investidor", description: "Busca oportunidade de investimento." },
  { id: "parceiro", label: "Parceiro", description: "Relacionamento de parceria comercial." },
  { id: "outro", label: "Outro", description: "Relacionamento não contemplado pelo catálogo inicial." },
] as const;

export type LeadRelationshipType = (typeof LEAD_RELATIONSHIP_TYPES)[number]["id"];
export const isLeadRelationshipType = (value: unknown): value is LeadRelationshipType =>
  catalogHasId(LEAD_RELATIONSHIP_TYPES, value);
export const getLeadRelationshipTypeLabel = (value: unknown) =>
  catalogLabel(LEAD_RELATIONSHIP_TYPES, value);

const LEGACY_RELATIONSHIP_TYPE_MAP = {
  proprietario: "proprietario_anunciante",
  inquilino: "interessado_imovel",
  comprador: "interessado_imovel",
  vendedor: "proprietario_anunciante",
  corretor_parceiro: "parceiro",
} as const satisfies Readonly<Record<string, LeadRelationshipType>>;

export function mapLegacyLeadRelationshipType(value: unknown): LeadRelationshipType | null {
  const normalized = normalizeLegacyValue(value);
  if (normalized === null) return null;
  return LEGACY_RELATIONSHIP_TYPE_MAP[
    normalized as keyof typeof LEGACY_RELATIONSHIP_TYPE_MAP
  ] ?? null;
}

export const LEAD_OBJECTIVES = [
  { id: "comprar", label: "Comprar", description: "Comprar um imóvel." },
  { id: "alugar", label: "Alugar", description: "Alugar um imóvel." },
  { id: "vender", label: "Vender", description: "Vender um imóvel." },
  { id: "anunciar_locacao", label: "Anunciar para locação", description: "Anunciar imóvel para locação." },
  { id: "administrar_imovel", label: "Administrar imóvel", description: "Contratar administração imobiliária." },
  { id: "avaliar_imovel", label: "Avaliar imóvel", description: "Solicitar avaliação imobiliária." },
  { id: "investir", label: "Investir", description: "Investir no mercado imobiliário." },
  { id: "outro", label: "Outro", description: "Objetivo não contemplado pelo catálogo inicial." },
] as const;

export type LeadObjective = (typeof LEAD_OBJECTIVES)[number]["id"];
export const isLeadObjective = (value: unknown): value is LeadObjective =>
  catalogHasId(LEAD_OBJECTIVES, value);
export const getLeadObjectiveLabel = (value: unknown) => catalogLabel(LEAD_OBJECTIVES, value);

const LEGACY_OBJECTIVE_MAP = {
  comprar: "comprar",
  compra: "comprar",
  alugar: "alugar",
  aluguel: "alugar",
  locacao: "alugar",
  vender: "vender",
  venda: "vender",
  anunciar_locacao: "anunciar_locacao",
  administrar: "administrar_imovel",
  administracao: "administrar_imovel",
  administrar_imovel: "administrar_imovel",
  avaliar: "avaliar_imovel",
  avaliacao: "avaliar_imovel",
  avaliar_imovel: "avaliar_imovel",
  investir: "investir",
  investimento: "investir",
  outro: "outro",
} as const satisfies Readonly<Record<string, LeadObjective>>;

export function mapLegacyLeadObjective(value: unknown): LeadObjective | null {
  const normalized = normalizeLegacyValue(value);
  if (normalized === null) return null;
  return LEGACY_OBJECTIVE_MAP[normalized as keyof typeof LEGACY_OBJECTIVE_MAP] ?? null;
}

export const LEAD_ENTRY_CHANNELS = [
  { id: "manual", label: "Manual", description: "Cadastro manual pela equipe." },
  { id: "whatsapp", label: "WhatsApp", description: "Entrada por conversa no WhatsApp." },
  { id: "site", label: "Site", description: "Entrada por formulário ou evento do site." },
  { id: "instagram", label: "Instagram", description: "Entrada originada no Instagram." },
  { id: "facebook", label: "Facebook", description: "Entrada originada no Facebook." },
  { id: "portal", label: "Portal", description: "Entrada por portal imobiliário." },
  { id: "telefone", label: "Telefone", description: "Entrada por ligação telefônica." },
  { id: "indicacao", label: "Indicação", description: "Entrada por indicação." },
  { id: "outro", label: "Outro", description: "Canal não contemplado pelo catálogo inicial." },
] as const;

export type LeadEntryChannel = (typeof LEAD_ENTRY_CHANNELS)[number]["id"];
export const isLeadEntryChannel = (value: unknown): value is LeadEntryChannel =>
  catalogHasId(LEAD_ENTRY_CHANNELS, value);
export const getLeadEntryChannelLabel = (value: unknown) =>
  catalogLabel(LEAD_ENTRY_CHANNELS, value);

export const LEAD_COMMERCIAL_ORIGINS = [
  { id: "campanha", label: "Campanha", description: "Campanha comercial identificável." },
  { id: "placa_qr_code", label: "Placa ou QR Code", description: "Material físico ou QR Code rastreável." },
  { id: "portal_especifico", label: "Portal específico", description: "Portal imobiliário identificado." },
  { id: "indicacao", label: "Indicação", description: "Pessoa ou parceiro que realizou a indicação." },
  { id: "imovel_especifico", label: "Imóvel específico", description: "Interesse originado por um imóvel identificável." },
  { id: "outro", label: "Outro", description: "Origem ainda não categorizada." },
] as const;

export type LeadCommercialOrigin = (typeof LEAD_COMMERCIAL_ORIGINS)[number]["id"];
export const isLeadCommercialOrigin = (value: unknown): value is LeadCommercialOrigin =>
  catalogHasId(LEAD_COMMERCIAL_ORIGINS, value);
export const getLeadCommercialOriginLabel = (value: unknown) =>
  catalogLabel(LEAD_COMMERCIAL_ORIGINS, value);

export const LEAD_HANDOFF_STATES = [
  { id: "ia", label: "IA", description: "Condução automatizada pela IA." },
  { id: "aguardando_humano", label: "Aguardando humano", description: "Encaminhado e aguardando assunção humana." },
  { id: "humano", label: "Humano", description: "Atendimento assumido por uma pessoa." },
  { id: "devolvido_ia", label: "Devolvido à IA", description: "Atendimento retornado à automação." },
  { id: "encerrado", label: "Encerrado", description: "Ciclo de handoff encerrado." },
] as const;

export type LeadHandoffState = (typeof LEAD_HANDOFF_STATES)[number]["id"];
export const isLeadHandoffState = (value: unknown): value is LeadHandoffState =>
  catalogHasId(LEAD_HANDOFF_STATES, value);
export const getLeadHandoffStateLabel = (value: unknown) =>
  catalogLabel(LEAD_HANDOFF_STATES, value);

