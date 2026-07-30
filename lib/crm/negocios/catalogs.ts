export type NegocioCatalogDecision = "aprovado" | "provisorio" | "pendente_aprovacao";
export type NegocioVisualVariant = "neutral" | "primary" | "info" | "warning" | "success" | "danger" | "muted";

export const NEGOCIO_TITLE_MAX_LENGTH = 160;
export const NEGOCIO_DESCRIPTION_MAX_LENGTH = 4000;
export const NEGOCIO_CLOSURE_REASON_MAX_LENGTH = 1000;
export const NEGOCIO_INTERNAL_NOTES_MAX_LENGTH = 4000;
export const NEGOCIO_COMMERCIAL_TERMS_MAX_LENGTH = 4000;
export const NEGOCIO_FINANCIAL_NOTE_MAX_LENGTH = 2000;
export const NEGOCIO_PART_NOTES_MAX_LENGTH = 2000;

type CatalogItem<Id extends string> = Readonly<{
  id: Id;
  label: string;
  description: string;
  order: number;
  decision: NegocioCatalogDecision;
  variant: NegocioVisualVariant;
}>;

function hasId<const T extends readonly CatalogItem<string>[]>(catalog: T, value: unknown): value is T[number]["id"] {
  return typeof value === "string" && catalog.some((item) => item.id === value);
}

function findItem<const T extends readonly CatalogItem<string>[]>(catalog: T, value: unknown): T[number] | null {
  return hasId(catalog, value) ? catalog.find((item) => item.id === value) ?? null : null;
}

export const NEGOCIO_TYPES = [
  { id: "venda", label: "Venda", description: "Alienacao imobiliaria concreta.", order: 0, decision: "aprovado", variant: "primary" },
  { id: "locacao", label: "Locacao", description: "Formalizacao de locacao de imovel.", order: 1, decision: "aprovado", variant: "primary" },
  { id: "administracao", label: "Administracao", description: "Contratacao de administracao imobiliaria.", order: 2, decision: "aprovado", variant: "info" },
  { id: "outro", label: "Outro", description: "Tipo excepcional sujeito a detalhamento controlado.", order: 3, decision: "aprovado", variant: "muted" },
] as const satisfies readonly CatalogItem<string>[];

export type NegocioType = (typeof NEGOCIO_TYPES)[number]["id"];
export const isNegocioType = (value: unknown): value is NegocioType => hasId(NEGOCIO_TYPES, value);
export const getNegocioType = (value: unknown) => findItem(NEGOCIO_TYPES, value);
export const getNegocioTypeLabel = (value: unknown) => getNegocioType(value)?.label ?? null;

// Estados finais pertencem ao status, nao ao catalogo de etapas.
export const NEGOCIO_STAGES = [
  { id: "estruturacao", label: "Estruturacao", description: "Definicao das partes, imovel, escopo e premissas.", order: 0, decision: "aprovado", variant: "neutral" },
  { id: "proposta", label: "Proposta", description: "Preparacao ou apresentacao da proposta comercial.", order: 1, decision: "aprovado", variant: "info" },
  { id: "negociacao", label: "Negociacao", description: "Ajuste de valores, condicoes e responsabilidades.", order: 2, decision: "aprovado", variant: "primary" },
  { id: "documentacao", label: "Documentacao", description: "Coleta e validacao documental da operacao.", order: 3, decision: "aprovado", variant: "warning" },
  { id: "contrato", label: "Contrato", description: "Elaboracao, revisao ou envio do instrumento.", order: 4, decision: "aprovado", variant: "warning" },
  { id: "assinatura", label: "Assinatura", description: "Formalizacao final separada da preparacao contratual.", order: 5, decision: "provisorio", variant: "success" },
] as const satisfies readonly CatalogItem<string>[];

export type NegocioStage = (typeof NEGOCIO_STAGES)[number]["id"];
export const isNegocioStage = (value: unknown): value is NegocioStage => hasId(NEGOCIO_STAGES, value);
export const getNegocioStage = (value: unknown) => findItem(NEGOCIO_STAGES, value);
export const getNegocioStageLabel = (value: unknown) => getNegocioStage(value)?.label ?? null;

export const NEGOCIO_STATUSES = [
  { id: "ativo", label: "Ativo", description: "Negocio em etapa comercial operacional.", order: 0, decision: "aprovado", variant: "primary" },
  { id: "concluido", label: "Concluido", description: "Operacao formalmente fechada com resultado.", order: 1, decision: "aprovado", variant: "success" },
  { id: "perdido", label: "Perdido", description: "Operacao comercial nao concretizada.", order: 2, decision: "aprovado", variant: "danger" },
  { id: "cancelado", label: "Cancelado", description: "Registro encerrado administrativamente sem representar perda comercial.", order: 3, decision: "aprovado", variant: "warning" },
] as const satisfies readonly CatalogItem<string>[];

export type NegocioStatus = (typeof NEGOCIO_STATUSES)[number]["id"];
export const isNegocioStatus = (value: unknown): value is NegocioStatus => hasId(NEGOCIO_STATUSES, value);
export const getNegocioStatus = (value: unknown) => findItem(NEGOCIO_STATUSES, value);
export const getNegocioStatusLabel = (value: unknown) => getNegocioStatus(value)?.label ?? null;
export const isNegocioFinalStatus = (value: unknown) => value === "concluido" || value === "perdido" || value === "cancelado";

export const NEGOCIO_PART_ROLES = [
  { id: "proprietario", label: "Proprietario", description: "Pessoa proprietaria do Imovel.", order: 0, decision: "aprovado", variant: "neutral" },
  { id: "vendedor", label: "Vendedor", description: "Pessoa que figura como vendedora.", order: 1, decision: "aprovado", variant: "neutral" },
  { id: "comprador", label: "Comprador", description: "Pessoa que figura como compradora.", order: 2, decision: "aprovado", variant: "neutral" },
  { id: "locador", label: "Locador", description: "Pessoa que figura como locadora.", order: 3, decision: "aprovado", variant: "neutral" },
  { id: "locatario", label: "Locatario", description: "Pessoa que figura como locataria.", order: 4, decision: "aprovado", variant: "neutral" },
  { id: "contratante", label: "Contratante", description: "Pessoa contratante do servico.", order: 5, decision: "aprovado", variant: "neutral" },
  { id: "parceiro", label: "Parceiro", description: "Pessoa participante em parceria comercial.", order: 6, decision: "aprovado", variant: "info" },
  { id: "outro", label: "Outro", description: "Papel excepcional sujeito a detalhamento.", order: 7, decision: "aprovado", variant: "muted" },
] as const satisfies readonly CatalogItem<string>[];

export type NegocioPartRole = (typeof NEGOCIO_PART_ROLES)[number]["id"];
export const isNegocioPartRole = (value: unknown): value is NegocioPartRole => hasId(NEGOCIO_PART_ROLES, value);
export const getNegocioPartRole = (value: unknown) => findItem(NEGOCIO_PART_ROLES, value);
export const getNegocioPartRoleLabel = (value: unknown) => getNegocioPartRole(value)?.label ?? null;

export const NEGOCIO_CONCLUSION_RESULTS = [
  { id: "venda_fechada", label: "Venda fechada", description: "Venda formalmente concluida.", order: 0, decision: "provisorio", variant: "success" },
  { id: "locacao_fechada", label: "Locacao fechada", description: "Locacao formalmente concluida.", order: 1, decision: "provisorio", variant: "success" },
  { id: "administracao_contratada", label: "Administracao contratada", description: "Contrato de administracao formalizado.", order: 2, decision: "provisorio", variant: "success" },
  { id: "parceria_concluida", label: "Parceria concluida", description: "Operacao em parceria formalmente concluida.", order: 3, decision: "provisorio", variant: "success" },
  { id: "outro", label: "Outro", description: "Conclusao excepcional com detalhe obrigatorio futuro.", order: 4, decision: "provisorio", variant: "muted" },
] as const satisfies readonly CatalogItem<string>[];

export const NEGOCIO_LOSS_RESULTS = [
  { id: "preco", label: "Preco", description: "Condicao de preco impediu o acordo.", order: 0, decision: "provisorio", variant: "danger" },
  { id: "documentacao", label: "Documentacao", description: "Restricao documental impediu a operacao.", order: 1, decision: "provisorio", variant: "danger" },
  { id: "imovel_indisponivel", label: "Imovel indisponivel", description: "O ativo deixou de estar disponivel.", order: 2, decision: "provisorio", variant: "danger" },
  { id: "proprietario_desistiu", label: "Proprietario desistiu", description: "A parte proprietaria desistiu da operacao.", order: 3, decision: "provisorio", variant: "danger" },
  { id: "cliente_desistiu", label: "Cliente desistiu", description: "A parte interessada desistiu da operacao.", order: 4, decision: "provisorio", variant: "danger" },
  { id: "concorrencia", label: "Concorrencia", description: "A oportunidade foi perdida para concorrente.", order: 5, decision: "provisorio", variant: "danger" },
  { id: "financiamento_reprovado", label: "Financiamento reprovado", description: "Credito necessario nao foi aprovado.", order: 6, decision: "provisorio", variant: "danger" },
  { id: "sem_acordo", label: "Sem acordo", description: "As partes nao chegaram a condicoes comuns.", order: 7, decision: "provisorio", variant: "danger" },
  { id: "outro", label: "Outro", description: "Perda excepcional com detalhe obrigatorio futuro.", order: 8, decision: "provisorio", variant: "muted" },
] as const satisfies readonly CatalogItem<string>[];

export const NEGOCIO_CANCELLATION_RESULTS = [
  { id: "duplicidade", label: "Duplicidade", description: "Registro duplicado do mesmo processo comercial.", order: 0, decision: "provisorio", variant: "warning" },
  { id: "cadastro_incorreto", label: "Cadastro incorreto", description: "Registro criado com enquadramento incorreto.", order: 1, decision: "provisorio", variant: "warning" },
  { id: "operacao_invalida", label: "Operacao invalida", description: "Processo nao constitui Negocio valido.", order: 2, decision: "provisorio", variant: "warning" },
  { id: "solicitacao_administrativa", label: "Solicitacao administrativa", description: "Cancelamento administrativo justificado.", order: 3, decision: "provisorio", variant: "warning" },
  { id: "outro", label: "Outro", description: "Cancelamento excepcional com detalhe obrigatorio futuro.", order: 4, decision: "provisorio", variant: "muted" },
] as const satisfies readonly CatalogItem<string>[];

export type NegocioConclusionResult = (typeof NEGOCIO_CONCLUSION_RESULTS)[number]["id"];
export type NegocioLossResult = (typeof NEGOCIO_LOSS_RESULTS)[number]["id"];
export type NegocioCancellationResult = (typeof NEGOCIO_CANCELLATION_RESULTS)[number]["id"];
export type NegocioResult = NegocioConclusionResult | NegocioLossResult | NegocioCancellationResult;

export const isNegocioConclusionResult = (value: unknown): value is NegocioConclusionResult => hasId(NEGOCIO_CONCLUSION_RESULTS, value);
export const isNegocioLossResult = (value: unknown): value is NegocioLossResult => hasId(NEGOCIO_LOSS_RESULTS, value);
export const isNegocioCancellationResult = (value: unknown): value is NegocioCancellationResult => hasId(NEGOCIO_CANCELLATION_RESULTS, value);

export function getNegocioResultLabel(value: unknown): string | null {
  return findItem(NEGOCIO_CONCLUSION_RESULTS, value)?.label
    ?? findItem(NEGOCIO_LOSS_RESULTS, value)?.label
    ?? findItem(NEGOCIO_CANCELLATION_RESULTS, value)?.label
    ?? null;
}
