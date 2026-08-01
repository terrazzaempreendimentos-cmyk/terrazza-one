"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  AccessPermissionRequiredError,
  AccessProfileRequiredError,
  AccessRoleRequiredError,
  requirePermission,
  requireRole,
} from "../../../../lib/auth/access-profile";
import {
  isNegocioCancellationResult,
  isNegocioConclusionResult,
  isNegocioLossResult,
  isNegocioPartRole,
  isNegocioStage,
  isNegocioType,
  type NegocioPartRole,
} from "../../../../lib/crm/negocios/catalogs";
import {
  NEGOCIO_RPC_LIMITS,
  NEGOCIO_RPC_MESSAGES,
  hasMinimumClosingParts,
  isAtualizarNegocioResult,
  isArquivarNegocioResult,
  isCancelarNegocioResult,
  isConcluirNegocioResult,
  isCriarNegocioResult,
  isMovimentarNegocioResult,
  isPerderNegocioResult,
  isReabrirNegocioResult,
  isRpcDate,
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

type Operation = "create" | "update" | "move" | "conclude" | "lose" | "cancel" | "reopen" | "archive";
type Permission = "negocios.criar" | "negocios.editar" | "negocios.concluir" | "negocios.perder" | "negocios.cancelar" | "negocios.reabrir" | "negocios.arquivar";

const SAFE_MESSAGES = new Set<string>(NEGOCIO_RPC_MESSAGES);
const CREATE_RPC_FAILURES = Object.freeze([
  ["Operacao nao autorizada.", "operacao_nao_autorizada"],
  ["Payload invalido.", "payload_invalido"],
  ["Campo desconhecido no payload.", "campo_desconhecido"],
  ["Reabertura bloqueada.", "reabertura_bloqueada"],
  ["Payload de partes invalido.", "payload_partes_invalido"],
  ["Relacionamento invalido.", "relacionamento_invalido"],
  ["Imovel invalido.", "imovel_invalido"],
  ["Lead nao encontrado.", "lead_nao_encontrado"],
  ["Atendimento incompativel.", "atendimento_incompativel"],
  ["Responsavel invalido.", "responsavel_invalido"],
  ["Parte invalida.", "parte_invalida"],
  ["Participacao invalida.", "participacao_invalida"],
  ["Pessoa invalida.", "pessoa_invalida"],
  ["Parte duplicada.", "parte_duplicada"],
  ["Parte principal duplicada.", "parte_principal_duplicada"],
  ["Falha ao registrar Timeline do Negocio.", "timeline_invalida"],
  ["Retorno inesperado do Negocio.", "retorno_inesperado"],
  ["Relacionamento duplicado.", "relacionamento_duplicado"],
  ["Nao foi possivel salvar o Negocio.", "falha_interna_rpc"],
] as const);
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

function isPayloadActionState(value: NegocioPayload | NegocioActionState): value is NegocioActionState {
  return "status" in value;
}

function isPartesActionState(
  value: readonly NegocioPartePayload[] | NegocioActionState,
): value is NegocioActionState {
  return !Array.isArray(value);
}

function logError(operacao: Operation, etapa: string, codigo: unknown) {
  console.error({ modulo: "crm_negocios", operacao, etapa, codigo: typeof codigo === "string" ? codigo : "unexpected_error" });
}

function getCreateRpcFailure(message: string) {
  return CREATE_RPC_FAILURES.find(([safeMessage]) => safeMessage === message);
}

const FINAL_RPC_REASONS: Readonly<Record<string, string>> = Object.freeze({
  "Negocio nao encontrado.": "negocio_nao_encontrado",
  "Negocio atualizado por outra operacao.": "concorrencia",
  "Negocio arquivado.": "negocio_arquivado",
  "Negocio encerrado.": "negocio_encerrado",
  "Resultado invalido.": "resultado_invalido",
  "Resultado incompativel com o tipo.": "resultado_incompativel",
  "Partes insuficientes para conclusao.": "partes_insuficientes",
  "Valor final obrigatorio.": "valor_final_obrigatorio",
  "Valor final invalido.": "valor_final_invalido",
  "Comissao invalida.": "comissao_invalida",
  "Motivo invalido.": "motivo_invalido",
  "Titulo invalido.": "titulo_invalido",
  "Reabertura bloqueada.": "reabertura_bloqueada",
  "Este Negocio ja possui uma reabertura.": "sucessor_existente",
  "Pessoa participante invalida.": "pessoa_participante_invalida",
  "Arquivamento bloqueado.": "arquivamento_bloqueado",
  "Observacao excede o limite permitido.": "observacao_invalida",
  "Falha ao registrar Timeline do Negocio.": "timeline_invalida",
  "Retorno inesperado do Negocio.": "retorno_inesperado",
});

function logCreateRpcValidation(reason: string) {
  console.error({ modulo: "crm_negocios", operacao: "create", etapa: "rpc_validacao", codigo: "P0001", motivo: reason });
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

function parseClosingRoles(formData: FormData): readonly NegocioPartRole[] | null {
  let values: unknown;
  try { values = JSON.parse(field(formData, "partes_papeis_json") || "[]"); } catch { return null; }
  if (!Array.isArray(values) || values.some((value) => !isNegocioPartRole(value))) return null;
  return [...new Set(values)];
}

function conclusionResultMatchesType(result: string, tipo: string) {
  if (result === "outro" || result === "parceria_concluida") return true;
  if (result === "venda_fechada") return tipo === "venda";
  if (result === "locacao_fechada") return tipo === "locacao";
  return result === "administracao_contratada" && tipo === "administracao";
}

async function validateRelationships(payload: NegocioPayload, partes: readonly NegocioPartePayload[], operation: Operation) {
  const supabase = await createClient();
  const { data: lead, error: leadError } = await supabase.from("leads").select("id").eq("id", payload.lead_id!).maybeSingle();
  if (leadError || !lead) { logError(operation, "lead_validation", leadError?.code ?? "not_found"); return errorState("O Lead selecionado nao foi encontrado."); }
  if (payload.atendimento_id) {
    const { data, error } = await supabase.from("atendimentos").select("id, lead_id").eq("id", payload.atendimento_id).eq("lead_id", payload.lead_id!).maybeSingle();
    if (error || !data) { logError(operation, "attendance_validation", error?.code ?? "not_found"); return errorState("O Atendimento nao pertence ao Lead selecionado."); }
  }
  if (payload.imovel_id) {
    const { data, error } = await supabase.from("imoveis").select("id, ativo").eq("id", payload.imovel_id).eq("ativo", true).maybeSingle();
    if (error || !data) { logError(operation, "property_validation", error?.code ?? "not_found"); return errorState("O Imovel selecionado nao esta ativo."); }
  }
  if (payload.responsavel_id) {
    const { data, error } = await supabase.from("pessoas").select("id, ativo, papeis").eq("id", payload.responsavel_id).eq("ativo", true).contains("papeis", ["corretor"]).maybeSingle();
    if (error || !data) { logError(operation, "responsible_validation", error?.code ?? "invalid_person"); return errorState("O responsavel selecionado nao e uma Pessoa-corretora ativa."); }
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
  if (message === "Negocio atualizado por outra operacao.") return CONCURRENCY_MESSAGE;
  return SAFE_MESSAGES.has(message) ? message : fallback;
}

function finalRpcError(operation: Operation, error: { code?: string; message: string }, fallback: string, leadId?: string) {
  const safeMessage = safeRpcError(error.message, fallback);
  const reason = SAFE_MESSAGES.has(error.message) ? FINAL_RPC_REASONS[error.message] ?? "validacao_dominio" : "erro_nao_catalogado";
  console.error({ modulo: "crm_negocios", operacao: operation, etapa: "rpc", codigo: typeof error.code === "string" ? error.code : "rpc_error", motivo: reason });
  if (safeMessage === CONCURRENCY_MESSAGE) revalidateNegocioPaths(leadId);
  return errorState(safeMessage);
}

function revalidateNegocioPaths(leadId?: string) {
  revalidatePath("/dashboard/crm/negocios");
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/crm/leads");
  if (leadId && isRpcUuid(leadId)) revalidatePath(`/dashboard/crm/leads/${leadId}`);
}

export async function createNegocio(_: NegocioActionState, formData: FormData): Promise<NegocioActionState> {
  if (!(await authorize("negocios.criar", "create"))) return errorState("Operacao nao autorizada.");
  const payload = parsePayload(formData); if (isPayloadActionState(payload)) return payload;
  const partes = parsePartes(formData); if (isPartesActionState(partes)) return partes;
  const relationshipError = await validateRelationships(payload, partes, "create"); if (relationshipError) return relationshipError;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("criar_negocio", { p_payload: payload, p_partes: partes });
  if (error) {
    if (error.code === "P0001") {
      const failure = getCreateRpcFailure(error.message);
      if (failure) {
        logCreateRpcValidation(failure[1]);
        return errorState(failure[0]);
      }
    }
    logError("create", "rpc", error.code);
    return errorState("Nao foi possivel criar o Negocio.");
  }
  const row = rpcRow(data);
  if (!isCriarNegocioResult(row) || row.lead_id !== payload.lead_id || row.tipo !== payload.tipo) { logError("create", "return", "invalid_return"); return errorState("Nao foi possivel confirmar a criacao do Negocio."); }
  revalidateNegocioPaths(row.lead_id);
  return { status: "sucesso", mensagem: "Negocio criado com sucesso." };
}

export async function updateNegocio(_: NegocioActionState, formData: FormData): Promise<NegocioActionState> {
  if (!(await authorize("negocios.editar", "update"))) return errorState("Operacao nao autorizada.");
  const negocioId = field(formData, "negocio_id"); const updatedAt = field(formData, "updated_at_esperado"); const originalLeadId = field(formData, "lead_id_original");
  if (!isRpcUuid(negocioId) || !isRpcTimestamp(updatedAt) || !isRpcUuid(originalLeadId)) return errorState("A fotografia do Negocio e invalida. Recarregue a pagina.");
  const payload = parsePayload(formData); if (isPayloadActionState(payload)) return payload;
  if (payload.lead_id !== originalLeadId) return errorState("O Lead do Negocio nao pode ser alterado.");
  const partes = parsePartes(formData); if (isPartesActionState(partes)) return partes;
  const relationshipError = await validateRelationships(payload, partes, "update"); if (relationshipError) return relationshipError;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("atualizar_negocio", { p_negocio_id: negocioId, p_updated_at_esperado: updatedAt, p_payload: payload, p_partes: partes });
  if (error) { logError("update", "rpc", error.code); const message = safeRpcError(error.message, "Nao foi possivel atualizar o Negocio."); if (message === CONCURRENCY_MESSAGE) revalidateNegocioPaths(originalLeadId); return errorState(message); }
  const row = rpcRow(data);
  if (!isAtualizarNegocioResult(row) || row.negocio_id !== negocioId || row.lead_id !== originalLeadId) { logError("update", "return", "invalid_return"); return errorState("Nao foi possivel confirmar a atualizacao do Negocio."); }
  revalidateNegocioPaths(originalLeadId);
  redirect("/dashboard/crm/negocios");
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

export async function concluirNegocio(_: NegocioActionState, formData: FormData): Promise<NegocioActionState> {
  if (!(await authorize("negocios.concluir", "conclude"))) return errorState("Operacao nao autorizada.");
  const negocioId=field(formData,"negocio_id"),updatedAt=field(formData,"updated_at_esperado"),leadId=field(formData,"lead_id"),tipo=field(formData,"tipo"),resultado=field(formData,"resultado"),observacao=field(formData,"observacao");
  if(!isRpcUuid(negocioId)||!isRpcTimestamp(updatedAt)||!isRpcUuid(leadId))return errorState("A fotografia do Negocio e invalida. Recarregue a pagina.");
  if(!isNegocioConclusionResult(resultado))return errorState("Selecione um resultado de conclusao valido.");
  if(!isNegocioType(tipo)||!conclusionResultMatchesType(resultado,tipo))return errorState("O resultado nao e compativel com o tipo do Negocio.");
  const closingRoles=parseClosingRoles(formData);if(!closingRoles||!hasMinimumClosingParts(tipo,closingRoles))return errorState("Revise as partes obrigatorias antes de concluir este Negocio.");
  const valorFechado=optionalNumber(field(formData,"valor_fechado")),comissaoEfetiva=optionalNumber(field(formData,"comissao_efetiva"));
  if(valorFechado===undefined||valorFechado!==null&&valorFechado<0)return errorState("Informe um valor final valido.");
  if(comissaoEfetiva===undefined||comissaoEfetiva!==null&&comissaoEfetiva<0)return errorState("Informe uma comissao valida.");
  if(observacao.length>NEGOCIO_RPC_LIMITS.observacaoMovimentacao)return errorState("A observacao excede o limite permitido.");
  const supabase=await createClient();const{data,error}=await supabase.rpc("concluir_negocio",{p_negocio_id:negocioId,p_updated_at_esperado:updatedAt,p_resultado:resultado,p_valor_fechado:valorFechado,p_comissao_efetiva:comissaoEfetiva,p_observacao:observacao||null});
  if(error)return finalRpcError("conclude",error,"Nao foi possivel concluir o Negocio.",leadId);
  const row=rpcRow(data);if(!isConcluirNegocioResult(row)||row.negocio_id!==negocioId||row.resultado!==resultado){logError("conclude","return","invalid_return");return errorState("Nao foi possivel confirmar a conclusao do Negocio.");}
  revalidateNegocioPaths(row.lead_id);return{status:"sucesso",mensagem:"Negocio concluido com sucesso."};
}

export async function perderNegocio(_: NegocioActionState, formData: FormData): Promise<NegocioActionState> {
  if (!(await authorize("negocios.perder", "lose"))) return errorState("Operacao nao autorizada.");
  const negocioId=field(formData,"negocio_id"),updatedAt=field(formData,"updated_at_esperado"),leadId=field(formData,"lead_id"),resultado=field(formData,"resultado"),motivo=field(formData,"motivo"),observacao=field(formData,"observacao");
  if(!isRpcUuid(negocioId)||!isRpcTimestamp(updatedAt)||!isRpcUuid(leadId))return errorState("A fotografia do Negocio e invalida. Recarregue a pagina.");
  if(!isNegocioLossResult(resultado))return errorState("Selecione um resultado de perda valido.");
  if(motivo.length<3||motivo.length>NEGOCIO_RPC_LIMITS.motivoEncerramento)return errorState("Informe um motivo entre 3 e 1.000 caracteres.");
  if(observacao.length>NEGOCIO_RPC_LIMITS.observacaoMovimentacao)return errorState("A observacao excede o limite permitido.");
  const supabase=await createClient();const{data,error}=await supabase.rpc("perder_negocio",{p_negocio_id:negocioId,p_updated_at_esperado:updatedAt,p_resultado:resultado,p_motivo:motivo,p_observacao:observacao||null});
  if(error)return finalRpcError("lose",error,"Nao foi possivel registrar a perda do Negocio.",leadId);
  const row=rpcRow(data);if(!isPerderNegocioResult(row)||row.negocio_id!==negocioId||row.resultado!==resultado){logError("lose","return","invalid_return");return errorState("Nao foi possivel confirmar a perda do Negocio.");}
  revalidateNegocioPaths(row.lead_id);return{status:"sucesso",mensagem:"Perda registrada com sucesso."};
}

export async function cancelarNegocio(_: NegocioActionState, formData: FormData): Promise<NegocioActionState> {
  if (!(await authorize("negocios.cancelar", "cancel"))) return errorState("Operacao nao autorizada.");
  const negocioId=field(formData,"negocio_id"),updatedAt=field(formData,"updated_at_esperado"),leadId=field(formData,"lead_id"),resultado=field(formData,"resultado"),motivo=field(formData,"motivo"),observacao=field(formData,"observacao");
  if(!isRpcUuid(negocioId)||!isRpcTimestamp(updatedAt)||!isRpcUuid(leadId))return errorState("A fotografia do Negocio e invalida. Recarregue a pagina.");
  if(!isNegocioCancellationResult(resultado))return errorState("Selecione um resultado de cancelamento valido.");
  if(motivo.length<3||motivo.length>NEGOCIO_RPC_LIMITS.motivoEncerramento)return errorState("Informe um motivo entre 3 e 1.000 caracteres.");
  if(observacao.length>NEGOCIO_RPC_LIMITS.observacaoMovimentacao)return errorState("A observacao excede o limite permitido.");
  const supabase=await createClient();const{data,error}=await supabase.rpc("cancelar_negocio",{p_negocio_id:negocioId,p_updated_at_esperado:updatedAt,p_resultado:resultado,p_motivo:motivo,p_observacao:observacao||null});
  if(error)return finalRpcError("cancel",error,"Nao foi possivel cancelar o Negocio.",leadId);
  const row=rpcRow(data);if(!isCancelarNegocioResult(row)||row.negocio_id!==negocioId||row.resultado!==resultado){logError("cancel","return","invalid_return");return errorState("Nao foi possivel confirmar o cancelamento do Negocio.");}
  revalidateNegocioPaths(row.lead_id);return{status:"sucesso",mensagem:"Negocio cancelado com sucesso."};
}

export async function reabrirNegocio(_: NegocioActionState, formData: FormData): Promise<NegocioActionState> {
  if (!(await authorize("negocios.reabrir", "reopen"))) return errorState("Operacao nao autorizada.");
  const negocioId=field(formData,"negocio_id"),updatedAt=field(formData,"updated_at_esperado"),leadId=field(formData,"lead_id"),motivo=field(formData,"motivo"),titulo=field(formData,"titulo"),previsao=field(formData,"previsao_fechamento");
  if(!isRpcUuid(negocioId)||!isRpcTimestamp(updatedAt)||!isRpcUuid(leadId))return errorState("A fotografia do Negocio e invalida. Recarregue a pagina.");
  if(motivo.length<3||motivo.length>NEGOCIO_RPC_LIMITS.motivoReabertura)return errorState("Informe um motivo entre 3 e 500 caracteres.");
  if(titulo.length>NEGOCIO_RPC_LIMITS.titulo)return errorState("O novo titulo excede o limite permitido.");
  if(previsao&&!isRpcDate(previsao))return errorState("A previsao de fechamento e invalida.");
  const supabase=await createClient();const{data,error}=await supabase.rpc("reabrir_negocio",{p_negocio_id_anterior:negocioId,p_updated_at_esperado:updatedAt,p_motivo:motivo,p_titulo:titulo||null,p_previsao_fechamento:previsao||null});
  if(error)return finalRpcError("reopen",error,"Nao foi possivel reabrir o Negocio.",leadId);
  const row=rpcRow(data);if(!isReabrirNegocioResult(row)||row.negocio_anterior_id!==negocioId){logError("reopen","return","invalid_return");return errorState("Nao foi possivel confirmar a reabertura do Negocio.");}
  revalidateNegocioPaths(row.lead_id);return{status:"sucesso",mensagem:"Novo ciclo do Negocio criado com sucesso."};
}

export async function arquivarNegocio(_: NegocioActionState, formData: FormData): Promise<NegocioActionState> {
  if (!(await authorize("negocios.arquivar", "archive"))) return errorState("Operacao nao autorizada.");
  const negocioId=field(formData,"negocio_id"),updatedAt=field(formData,"updated_at_esperado"),leadId=field(formData,"lead_id"),status=field(formData,"status_operacional"),motivo=field(formData,"motivo");
  if(!isRpcUuid(negocioId)||!isRpcTimestamp(updatedAt)||!isRpcUuid(leadId)||!(["concluido","perdido","cancelado"] as const).includes(status as "concluido"|"perdido"|"cancelado"))return errorState("A fotografia do Negocio e invalida. Recarregue a pagina.");
  if(motivo.length<3||motivo.length>NEGOCIO_RPC_LIMITS.motivoArquivamento)return errorState("Informe um motivo entre 3 e 500 caracteres.");
  const supabase=await createClient();const{data,error}=await supabase.rpc("arquivar_negocio",{p_negocio_id:negocioId,p_updated_at_esperado:updatedAt,p_motivo:motivo});
  if(error)return finalRpcError("archive",error,"Nao foi possivel arquivar o Negocio.",leadId);
  const row=rpcRow(data);if(!isArquivarNegocioResult(row)||row.negocio_id!==negocioId||row.status_operacional!==status){logError("archive","return","invalid_return");return errorState("Nao foi possivel confirmar o arquivamento do Negocio.");}
  revalidateNegocioPaths(row.lead_id);return{status:"sucesso",mensagem:"Negocio arquivado com sucesso."};
}
