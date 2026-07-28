import type { LeadFunnelStage } from "../leads/catalogs";

export const ROLETA_MANUAL_REASSIGNMENT_CRITERION = "reatribuicao_manual" as const;
export const REASSIGNMENT_REASON_MIN_LENGTH = 3;
export const REASSIGNMENT_REASON_MAX_LENGTH = 500;

export const REASSIGNMENT_ELIGIBLE_STAGES = Object.freeze([
  "atendimento",
  "visita_avaliacao",
  "proposta",
  "negociacao",
  "documentacao",
] as const satisfies readonly LeadFunnelStage[]);

export type ReassignmentEligibleStage = (typeof REASSIGNMENT_ELIGIBLE_STAGES)[number];

export type LeadReassignmentRpcResult = Readonly<{
  lead_id: string;
  corretor_anterior_pessoa_id: string;
  corretor_atual_pessoa_id: string;
  etapa_atual: ReassignmentEligibleStage;
  status_operacional: "ativo";
  reatribuido_em: string;
}>;

export const REASSIGNMENT_DOMAIN_MESSAGES = Object.freeze([
  "Operacao nao autorizada.",
  "Lead nao informado.",
  "Responsavel esperado nao informado.",
  "Nova Pessoa-corretora nao informada.",
  "Motivo obrigatorio.",
  "Motivo muito curto.",
  "Motivo excede o limite permitido.",
  "Lead nao encontrado.",
  "Lead sem responsavel.",
  "Lead inelegivel para reatribuicao.",
  "Estado atual do Lead inconsistente.",
  "Responsavel alterado por outra operacao.",
  "Pessoa-corretora nao encontrada.",
  "Pessoa-corretora inativa.",
  "Pessoa sem papel corretor.",
  "Pessoa-corretora invalida.",
  "O novo responsavel deve ser diferente do atual.",
  "Falha ao registrar historico da reatribuicao.",
  "Falha ao registrar Timeline da reatribuicao.",
  "Nao foi possivel reatribuir o Lead.",
] as const);

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function validateReassignmentReason(value: unknown) {
  if (typeof value !== "string") return { valid: false as const, error: "Motivo obrigatorio." };
  const reason = value.trim();
  if (!reason) return { valid: false as const, error: "Motivo obrigatorio." };
  if (reason.length < REASSIGNMENT_REASON_MIN_LENGTH) return { valid: false as const, error: "Motivo muito curto." };
  if (reason.length > REASSIGNMENT_REASON_MAX_LENGTH) return { valid: false as const, error: "Motivo excede o limite permitido." };
  return { valid: true as const, value: reason };
}

export function isLeadReassignmentRpcResult(
  value: unknown,
  expected: Readonly<{ leadId: string; previousPersonId: string; currentPersonId: string }>,
): value is LeadReassignmentRpcResult {
  if (!value || typeof value !== "object") return false;
  const result = value as Record<string, unknown>;
  return result.lead_id === expected.leadId
    && result.corretor_anterior_pessoa_id === expected.previousPersonId
    && result.corretor_atual_pessoa_id === expected.currentPersonId
    && typeof result.lead_id === "string" && UUID_PATTERN.test(result.lead_id)
    && typeof result.corretor_anterior_pessoa_id === "string" && UUID_PATTERN.test(result.corretor_anterior_pessoa_id)
    && typeof result.corretor_atual_pessoa_id === "string" && UUID_PATTERN.test(result.corretor_atual_pessoa_id)
    && REASSIGNMENT_ELIGIBLE_STAGES.includes(result.etapa_atual as ReassignmentEligibleStage)
    && result.status_operacional === "ativo"
    && typeof result.reatribuido_em === "string"
    && !Number.isNaN(Date.parse(result.reatribuido_em));
}

