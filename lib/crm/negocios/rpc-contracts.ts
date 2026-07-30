import type { NegocioPartRole, NegocioStage, NegocioType } from "./catalogs";

export { NEGOCIO_STAGE_TRANSITIONS } from "./transitions";

export const NEGOCIO_RPC_LIMITS = Object.freeze({
  titulo: 160,
  descricao: 4000,
  observacoesInternas: 4000,
  condicoesComerciais: 4000,
  observacaoFinanceira: 2000,
  observacoesParte: 2000,
  observacaoMovimentacao: 500,
});

export const NEGOCIO_RPC_MESSAGES = Object.freeze([
  "Operacao nao autorizada.",
  "Payload invalido.",
  "Payload de partes invalido.",
  "Campo desconhecido no payload.",
  "Relacionamento invalido.",
  "Relacionamento duplicado.",
  "Lead nao encontrado.",
  "Atendimento incompativel.",
  "Imovel invalido.",
  "Responsavel invalido.",
  "Pessoa invalida.",
  "Parte invalida.",
  "Parte duplicada.",
  "Parte principal duplicada.",
  "Participacao invalida.",
  "Negocio nao encontrado.",
  "Negocio encerrado.",
  "Negocio arquivado.",
  "Negocio atualizado por outra operacao.",
  "Transicao de etapa nao permitida.",
  "Observacao excede o limite permitido.",
  "Falha ao registrar Timeline do Negocio.",
  "Retorno inesperado do Negocio.",
  "Nao foi possivel salvar o Negocio.",
  "Nao foi possivel movimentar o Negocio.",
] as const);

export type NegocioRpcMessage = (typeof NEGOCIO_RPC_MESSAGES)[number];

export type NegocioPayload = Readonly<{
  negocio_anterior_id?: string | null;
  lead_id?: string;
  atendimento_id?: string | null;
  imovel_id?: string | null;
  responsavel_id?: string | null;
  tipo?: NegocioType;
  titulo?: string;
  descricao?: string | null;
  observacoes_internas?: string | null;
  moeda?: string;
  valor_anunciado?: number | null;
  valor_proposto?: number | null;
  valor_negociado?: number | null;
  valor_fechado?: number | null;
  comissao_percentual?: number | null;
  comissao_prevista?: number | null;
  comissao_efetiva?: number | null;
  sinal?: number | null;
  valor_financiado?: number | null;
  condicoes_comerciais?: string | null;
  observacao_financeira?: string | null;
  proposta_em?: string | null;
  previsao_fechamento?: string | null;
  contrato_enviado_em?: string | null;
  contrato_assinado_em?: string | null;
  inicio_vigencia?: string | null;
  fim_vigencia?: string | null;
}>;

export type CriarNegocioPayload = NegocioPayload & Readonly<Required<Pick<NegocioPayload, "lead_id" | "tipo" | "titulo">>>;

// Na edicao, lead_id pode ser reenviado somente com o UUID original do Negocio.
export type AtualizarNegocioPayload = NegocioPayload;

export type MovimentarNegocioInput = Readonly<{
  negocio_id: string;
  etapa_destino: NegocioStage;
  updated_at_esperado: string;
  /** Conteudo operacional opcional, aparado e persistido na Timeline; maximo de 500 caracteres. */
  observacao?: string | null;
}>;

export type NegocioPartePayload = Readonly<{
  pessoa_id: string;
  papel: NegocioPartRole;
  principal: boolean;
  participacao_percentual?: number | null;
  observacoes?: string | null;
}>;

export type CriarNegocioResult = Readonly<{
  negocio_id: string;
  lead_id: string;
  tipo: NegocioType;
  etapa: "estruturacao";
  status_operacional: "ativo";
  ativo: true;
  partes_ativas: number;
  created_at: string;
  updated_at: string;
}>;

export type AtualizarNegocioResult = Readonly<{
  negocio_id: string;
  lead_id: string;
  tipo: NegocioType;
  etapa: NegocioStage;
  status_operacional: "ativo";
  ativo: true;
  partes_ativas: number;
  updated_at: string;
}>;

export type MovimentarNegocioResult = Readonly<{
  negocio_id: string;
  etapa_anterior: NegocioStage;
  etapa_atual: NegocioStage;
  status_operacional: "ativo";
  ativo: true;
  updated_at: string;
}>;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isRpcUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value);
}

export function isRpcTimestamp(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && Number.isFinite(Date.parse(value));
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasExactKeys(value: Record<string, unknown>, keys: readonly string[]) {
  return Object.keys(value).length === keys.length && keys.every((key) => key in value);
}

export function isCriarNegocioResult(value: unknown): value is CriarNegocioResult {
  if (!isObject(value) || !hasExactKeys(value, ["negocio_id", "lead_id", "tipo", "etapa", "status_operacional", "ativo", "partes_ativas", "created_at", "updated_at"])) return false;
  return isRpcUuid(value.negocio_id) && isRpcUuid(value.lead_id)
    && ["venda", "locacao", "administracao", "outro"].includes(String(value.tipo))
    && value.etapa === "estruturacao" && value.status_operacional === "ativo" && value.ativo === true
    && Number.isInteger(value.partes_ativas) && Number(value.partes_ativas) >= 0
    && isRpcTimestamp(value.created_at) && isRpcTimestamp(value.updated_at);
}

export function isAtualizarNegocioResult(value: unknown): value is AtualizarNegocioResult {
  if (!isObject(value) || !hasExactKeys(value, ["negocio_id", "lead_id", "tipo", "etapa", "status_operacional", "ativo", "partes_ativas", "updated_at"])) return false;
  return isRpcUuid(value.negocio_id) && isRpcUuid(value.lead_id)
    && ["venda", "locacao", "administracao", "outro"].includes(String(value.tipo))
    && ["estruturacao", "proposta", "negociacao", "documentacao", "contrato", "assinatura"].includes(String(value.etapa))
    && value.status_operacional === "ativo" && value.ativo === true
    && Number.isInteger(value.partes_ativas) && Number(value.partes_ativas) >= 0
    && isRpcTimestamp(value.updated_at);
}

export function isMovimentarNegocioResult(value: unknown): value is MovimentarNegocioResult {
  if (!isObject(value) || !hasExactKeys(value, ["negocio_id", "etapa_anterior", "etapa_atual", "status_operacional", "ativo", "updated_at"])) return false;
  const stages = ["estruturacao", "proposta", "negociacao", "documentacao", "contrato", "assinatura"];
  return isRpcUuid(value.negocio_id) && stages.includes(String(value.etapa_anterior))
    && stages.includes(String(value.etapa_atual)) && value.etapa_anterior !== value.etapa_atual
    && value.status_operacional === "ativo" && value.ativo === true && isRpcTimestamp(value.updated_at);
}
