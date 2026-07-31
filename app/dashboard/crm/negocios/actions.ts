"use server";

import { revalidatePath } from "next/cache";

import {
  AccessPermissionRequiredError,
  AccessProfileRequiredError,
  AccessRoleRequiredError,
  requirePermission,
  requireRole,
} from "../../../../lib/auth/access-profile";
import {
  isNegocioPartRole,
  isNegocioStage,
  isNegocioType,
  type NegocioPartRole,
} from "../../../../lib/crm/negocios/catalogs";
import {
  NEGOCIO_RPC_LIMITS,
  NEGOCIO_RPC_MESSAGES,
  isAtualizarNegocioResult,
  isCriarNegocioResult,
  isMovimentarNegocioResult,
  isRpcTimestamp,
  isRpcUuid,
  type NegocioPartePayload,
  type NegocioPayload,
} from "../../../../lib/crm/negocios/rpc-contracts";
import { canChangeNegocioStage } from "../../../../lib/crm/negocios/transitions";
import { createClient } from "../../../../lib/supabase/server";

export type NegocioActionState =
  | { status: "idle"; mensagem: null }
  | { status: "erro"; mensagem: string }
  | { status: "sucesso"; mensagem: string };

type Operation = "create" | "update" | "move";
type Permission = "negocios.criar" | "negocios.editar";

const SAFE_MESSAGES = new Set<string>(NEGOCIO_RPC_MESSAGES);
const CONCURRENCY_MESSAGE = "Este Negocio foi atualizado por outra operacao. Revise os dados atuais.";
const PAYLOAD_FIELDS = [
  "lead_id", "atendimento_id", "imovel_id", "responsavel_id", "tipo", "titulo",
  "descricao", "observacoes_internas", "moeda", "valor_anunciado", "valor_proposto",
  "valor_negociado", "valor_fechado", "comissao_percentual", "comissao_prevista",
  "comissao_efetiva", "sinal", "valor_financiado", "condicoes_comerciais",
  "observacao_financeira", "proposta_em", "previsao_fechamento", "contrato_enviado_em",
  "contrato_assinado_em", "inicio_vigencia", "fim_vigencia",
] as const;
const UUID_FIELDS = new Set(["lead_id", "atendimento_id", "imovel_id", "responsavel_id"]);
const NUMERIC_FIELDS = new Set(["valor_anunciado", "valor_proposto", "valor_negociado", "valor_fechado", "comissao_percentual", "comissao_prevista", "comissao_efetiva", "sinal", "valor_financiado"]);
const TIMESTAMP_FIELDS = new Set(["proposta_em", "contrato_enviado_em", "contrato_assinado_em"]);
const DATE_FIELDS = new Set(["previsao_fechamento", "inicio_vigencia", "fim_vigencia"]);

function errorState(mensagem: string): NegocioActionState {
  return { status: "erro", mensagem };
}

function logError(operacao: Operation, etapa: string, codigo: unknown) {
  console.error({ modulo: "crm_negocios", operacao, etapa, codigo: typeof codigo === "string" ? codigo : "unexpected_error" });
}

async function authorize(permission: Permission, operation: Operation) {
  try {
    await requirePermission(permission);
    await requireRole("administrador", "gestor");
    return true;
  } catch (error) {
    logError(operation, "authorization", error instanceof AccessPermissionRequiredError || error instanceof AccessProfileRequiredError || error instanceof AccessRoleRequiredError ? error.name : "authorization_error");
    return false;
  }
}

function field(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

function optionalNumber(value: string): number | null | undefined {
  if (!value) return null;
  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : undefined;
}

function optionalTimestamp(value: string): string | null | undefined {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
}

function optionalDate(value: string): string | null | undefined {
  if (!value) return null;
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`)) ? value : undefined;
}

function parsePayload(formData: FormData): NegocioPayload | NegocioActionState {
  const payload: Record<string, string | number | null> = {};
  for (const name of PAYLOAD_FIELDS) {
    const value = field(formData, name);
    if (NUMERIC_FIELDS.has(name)) {
      const parsed = optionalNumber(value);
      if (parsed === undefined || (parsed !== null && parsed < 0)) return errorState("Informe valores numericos validos e nao negativos.");
      payload[name] = parsed;
    } else if (TIMESTAMP_FIELDS.has(name)) {
      const parsed = optionalTimestamp(value);
      if (parsed === undefined) return errorState("Uma das datas informadas e invalida.");
      payload[name] = parsed;
    } else if (DATE_FIELDS.has(name)) {
      const parsed = optionalDate(value);
      if (parsed === undefined) return errorState("Uma das datas informadas e invalida.");
      payload[name] = parsed;
    } else if (UUID_FIELDS.has(name)) {
      if (value && !isRpcUuid(value)) return errorState("Um dos relacionamentos informados e invalido.");
      payload[name] = value || null;
    } else {
      payload[name] = value || null;
    }
  }
  if (!isRpcUuid(payload.lead_id)) return errorState("Selecione um Lead valido.");
  if (!isNegocioType(payload.tipo)) return errorState("Selecione um tipo valido.");
  if (typeof payload.titulo !== "string" || !payload.titulo || payload.titulo.length > NEGOCIO_RPC_LIMITS.titulo) return errorState("Informe um titulo valido.");
  if (payload.tipo !== "outro" && !isRpcUuid(payload.imovel_id)) return errorState("Selecione um Imovel ativo para este tipo.");
  if (typeof payload.moeda !== "string" || !/^[A-Z]{3}$/.test(payload.moeda)) payload.moeda = "BRL";
  if (typeof payload.comissao_percentual === "number" && payload.comissao_percentual > 100) return errorState("A comissao percentual deve ficar entre 0 e 100.");
  if (typeof payload.descricao === "string" && payload.descricao.length > NEGOCIO_RPC_LIMITS.descricao) return errorState("A descricao excede o limite permitido.");
  if (typeof payload.observacoes_internas === "string" && payload.observacoes_internas.length > NEGOCIO_RPC_LIMITS.observacoesInternas) return errorState("As observacoes internas excedem o limite permitido.");
  return payload as NegocioPayload;
}

function parsePartes(formData: FormData): readonly NegocioPartePayload[] | NegocioActionState {
  const raw = field(formData, "partes_json");
  let values: unknown;
  try { values = raw ? JSON.parse(raw) : []; } catch { return errorState("As partes informadas sao invalidas."); }
  if (!Array.isArray(values)) return errorState("As partes informadas sao invalidas.");
  const seen = new Set<string>();
  const principals = new Set<NegocioPartRole>();
  const result: NegocioPartePayload[] = [];
  for (const value of values) {
    if (!value || typeof value !== "object" || Array.isArray(value)) return errorState("Uma das partes e invalida.");
    const row = value as Record<string, unknown>;
    if (Object.keys(row).some((key) => !["pessoa_id", "papel", "principal", "participacao_percentual", "observacoes"].includes(key))) return errorState("Uma das partes possui campo invalido.");
    const pessoaId = typeof row.pessoa_id === "string" ? row.pessoa_id.trim() : "";
    const papel = row.papel;
    const principal = row.principal === true;
    const observacoes = typeof row.observacoes === "string" ? row.observacoes.trim() : "";
    const participacao = row.participacao_percentual === null || row.participacao_percentual === "" || row.participacao_percentual === undefined ? null : Number(row.participacao_percentual);
    if (!isRpcUuid(pessoaId) || !isNegocioPartRole(papel)) return errorState("Uma das partes e invalida.");
    if (participacao !== null && (!Number.isFinite(participacao) || participacao < 0 || participacao > 100)) return errorState("A participacao deve ficar entre 0 e 100.");
    if (observacoes.length > NEGOCIO_RPC_LIMITS.observacoesParte) return errorState("A observacao de uma parte excede o limite permitido.");
    const key = `${pessoaId}:${papel}`;
    if (seen.has(key)) return errorState("Nao repita a mesma Pessoa e papel.");
    if (principal && principals.has(papel)) return errorState("Existe mais de uma parte principal para o mesmo papel.");
    seen.add(key); if (principal) principals.add(papel);
    result.push({ pessoa_id: pessoaId, papel, principal, participacao_percentual: participacao, observacoes: observacoes || null });
  }
  return result;
}

async function validateRelationships(payload: NegocioPayload, partes: readonly NegocioPartePayload[], operation: Operation) {
  const supabase = await createClient();
  if (payload.atendimento_id) {
    const { data, error } = await supabase.from("atendimentos").select("id, lead_id").eq("id", payload.atendimento_id).eq("lead_id", payload.lead_id!).maybeSingle();
    if (error || !data) { logError(operation, "attendance_validation", error?.code ?? "not_found"); return errorState("O Atendimento nao pertence ao Lead selecionado."); }
  }
  if (payload.imovel_id) {
    const { data, error } = await supabase.from("imoveis").select("id, ativo").eq("id", payload.imovel_id).eq("ativo", true).maybeSingle();
    if (error || !data) { logError(operation, "property_validation", error?.code ?? "not_found"); return errorState("O Imovel selecionado nao esta ativo."); }
  }
  const ids = [...new Set(partes.map((parte) => parte.pessoa_id))];
  if (ids.length) {
    const { data, error } = await supabase.from("pessoas").select("id, ativo").in("id", ids).eq("ativo", true);
    if (error || !data || data.length !== ids.length) { logError(operation, "party_validation", error?.code ?? "invalid_people"); return errorState("Uma das Pessoas participantes nao esta ativa."); }
  }
  return null;
}

function rpcRow(data: unknown) { return Array.isArray(data) ? data[0] : data; }

function safeRpcError(message: string, fallback: string) {
  if (message.includes("Negocio atualizado por outra operacao.")) return CONCURRENCY_MESSAGE;
  return [...SAFE_MESSAGES].find((allowed) => message.includes(allowed)) ?? fallback;
}

function revalidateNegocioPaths(leadId?: string) {
  revalidatePath("/dashboard/crm/negocios");
  revalidatePath("/dashboard");
  if (leadId && isRpcUuid(leadId)) revalidatePath(`/dashboard/crm/leads/${leadId}`);
}

export async function createNegocio(_: NegocioActionState, formData: FormData): Promise<NegocioActionState> {
  if (!(await authorize("negocios.criar", "create"))) return errorState("Operacao nao autorizada.");
  const payload = parsePayload(formData); if ("status" in payload) return payload;
  const partes = parsePartes(formData); if (!Array.isArray(partes)) return partes;
  const relationshipError = await validateRelationships(payload, partes, "create"); if (relationshipError) return relationshipError;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("criar_negocio", { p_payload: payload, p_partes: partes });
  if (error) { logError("create", "rpc", error.code); return errorState(safeRpcError(error.message, "Nao foi possivel criar o Negocio.")); }
  const row = rpcRow(data);
  if (!isCriarNegocioResult(row) || row.lead_id !== payload.lead_id || row.tipo !== payload.tipo) { logError("create", "return", "invalid_return"); return errorState("Nao foi possivel confirmar a criacao do Negocio."); }
  revalidateNegocioPaths(row.lead_id);
  return { status: "sucesso", mensagem: "Negocio criado com sucesso." };
}

export async function updateNegocio(_: NegocioActionState, formData: FormData): Promise<NegocioActionState> {
  if (!(await authorize("negocios.editar", "update"))) return errorState("Operacao nao autorizada.");
  const negocioId = field(formData, "negocio_id"); const updatedAt = field(formData, "updated_at_esperado"); const originalLeadId = field(formData, "lead_id_original");
  if (!isRpcUuid(negocioId) || !isRpcTimestamp(updatedAt) || !isRpcUuid(originalLeadId)) return errorState("A fotografia do Negocio e invalida. Recarregue a pagina.");
  const payload = parsePayload(formData); if ("status" in payload) return payload;
  if (payload.lead_id !== originalLeadId) return errorState("O Lead do Negocio nao pode ser alterado.");
  const partes = parsePartes(formData); if (!Array.isArray(partes)) return partes;
  const relationshipError = await validateRelationships(payload, partes, "update"); if (relationshipError) return relationshipError;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("atualizar_negocio", { p_negocio_id: negocioId, p_updated_at_esperado: updatedAt, p_payload: payload, p_partes: partes });
  if (error) { logError("update", "rpc", error.code); const message = safeRpcError(error.message, "Nao foi possivel atualizar o Negocio."); if (message === CONCURRENCY_MESSAGE) revalidateNegocioPaths(originalLeadId); return errorState(message); }
  const row = rpcRow(data);
  if (!isAtualizarNegocioResult(row) || row.negocio_id !== negocioId || row.lead_id !== originalLeadId) { logError("update", "return", "invalid_return"); return errorState("Nao foi possivel confirmar a atualizacao do Negocio."); }
  revalidateNegocioPaths(originalLeadId);
  return { status: "sucesso", mensagem: "Negocio atualizado com sucesso." };
}

export async function moveNegocio(_: NegocioActionState, formData: FormData): Promise<NegocioActionState> {
  if (!(await authorize("negocios.editar", "move"))) return errorState("Operacao nao autorizada.");
  const negocioId=field(formData,"negocio_id"); const leadId=field(formData,"lead_id"); const current=field(formData,"etapa_atual"); const destination=field(formData,"etapa_destino"); const updatedAt=field(formData,"updated_at_esperado"); const observacao=field(formData,"observacao");
  if (!isRpcUuid(negocioId)||!isRpcUuid(leadId)||!isRpcTimestamp(updatedAt)||!isNegocioStage(current)||!isNegocioStage(destination)||!canChangeNegocioStage(current,destination)) return errorState("A movimentacao solicitada nao e permitida.");
  if (observacao.length>NEGOCIO_RPC_LIMITS.observacaoMovimentacao) return errorState("A observacao excede o limite permitido.");
  const supabase=await createClient(); const {data,error}=await supabase.rpc("movimentar_negocio",{p_negocio_id:negocioId,p_etapa_destino:destination,p_updated_at_esperado:updatedAt,p_observacao:observacao||null});
  if(error){logError("move","rpc",error.code);const message=safeRpcError(error.message,"Nao foi possivel movimentar o Negocio.");if(message===CONCURRENCY_MESSAGE)revalidateNegocioPaths(leadId);return errorState(message);}
  const row=rpcRow(data); if(!isMovimentarNegocioResult(row)||row.negocio_id!==negocioId||row.etapa_anterior!==current||row.etapa_atual!==destination){logError("move","return","invalid_return");return errorState("Nao foi possivel confirmar a movimentacao do Negocio.");}
  revalidateNegocioPaths(leadId); return {status:"sucesso",mensagem:"Negocio movimentado com sucesso."};
}
