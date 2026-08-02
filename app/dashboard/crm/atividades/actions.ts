"use server";

import { revalidatePath } from "next/cache";
import { AccessPermissionRequiredError, AccessProfileRequiredError, AccessRoleRequiredError, requirePermission, requireRole } from "../../../../lib/auth/access-profile";
import { ACTIVITY_LIMITS, isActivityOrigin, isActivityPriority, isActivityStatus, isActivityType } from "../../../../lib/crm/atividades/catalogs";
import { ACTIVITY_RPC_LIMITS, isActivityRpcMessage, isChangeActivityStateResult, isSaveActivityResult } from "../../../../lib/crm/atividades/rpc-contracts";
import { createClient } from "../../../../lib/supabase/server";

export type ActivityActionState = { status: "idle" | "erro" | "sucesso"; mensagem: string | null };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const errorState = (mensagem: string): ActivityActionState => ({ status: "erro", mensagem });
const field = (data: FormData, name: string) => String(data.get(name) ?? "").trim();
const optional = (data: FormData, name: string) => field(data, name) || null;
const optionalUuid = (data: FormData, name: string) => { const value = optional(data, name); return value && UUID.test(value) ? value : value ? undefined : null; };

function logError(operation: string, stage: string, code: unknown) {
  console.error({ modulo: "crm_atividades", operacao: operation, etapa: stage, codigo: typeof code === "string" ? code : "unexpected_error" });
}

async function authorize(permission: "atividades.criar" | "atividades.editar") {
  try { await requirePermission(permission); await requireRole("administrador", "gestor"); return true; }
  catch (error) {
    logError("authorize", "authorization", error instanceof AccessPermissionRequiredError || error instanceof AccessProfileRequiredError || error instanceof AccessRoleRequiredError ? error.name : "authorization_error");
    return false;
  }
}

async function authorizeOperator() {
  try { await requireRole("administrador", "gestor"); return true; }
  catch (error) {
    logError("authorize", "authorization", error instanceof AccessProfileRequiredError || error instanceof AccessRoleRequiredError ? error.name : "authorization_error");
    return false;
  }
}

function parseRecifeTimestamp(value: string) {
  if (!value) return null;
  const normalized = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value) ? `${value}:00-03:00` : value;
  return Number.isNaN(Date.parse(normalized)) ? undefined : new Date(normalized).toISOString();
}

function payload(data: FormData) {
  const titulo = field(data, "titulo"); const descricao = optional(data, "descricao");
  const tipo = field(data, "tipo"); const prioridade = field(data, "prioridade"); const origem = field(data, "origem");
  if (!titulo) return errorState("Informe o titulo da Atividade.");
  if (titulo.length > ACTIVITY_LIMITS.title || (descricao?.length ?? 0) > ACTIVITY_LIMITS.description) return errorState("Um texto excede o limite permitido.");
  if (!isActivityType(tipo) || !isActivityPriority(prioridade) || !isActivityOrigin(origem)) return errorState("Classificacao da Atividade invalida.");
  const ids = ["lead_id", "atendimento_id", "negocio_id", "imovel_id", "pessoa_id", "responsavel_id"] as const;
  const parsedIds = Object.fromEntries(ids.map((name) => [name, optionalUuid(data, name)]));
  if (Object.values(parsedIds).some((value) => value === undefined)) return errorState("Selecione relacionamentos validos.");
  const inicio = parseRecifeTimestamp(field(data, "inicio_planejado_em")); const fim = parseRecifeTimestamp(field(data, "fim_planejado_em"));
  if (inicio === undefined || fim === undefined || (inicio && fim && Date.parse(fim) < Date.parse(inicio))) return errorState("As datas da Atividade sao incoerentes.");
  return { titulo, descricao, tipo, prioridade, origem, ...parsedIds, inicio_planejado_em: inicio, fim_planejado_em: fim,
    dia_inteiro: data.get("dia_inteiro") === "on", local: optional(data, "local"), link_reuniao: optional(data, "link_reuniao"), observacoes_internas: optional(data, "observacoes_internas") };
}

function rpcMessage(error: { code?: string; message?: string }, fallback: string) {
  if (error.code === "P0001" && error.message === "Atividade atualizada por outra operacao.") return "Esta Atividade foi atualizada por outra operacao. Revise os dados atuais.";
  if (error.code === "P0001" && isActivityRpcMessage(error.message)) return error.message;
  return fallback;
}

function revalidate(leadId?: string | null, atendimentoId?: string | null, negocioId?: string | null) {
  ["/dashboard/crm/atividades", "/dashboard/crm/agenda", "/dashboard"].forEach((path) => revalidatePath(path));
  if (leadId && UUID.test(leadId)) revalidatePath(`/dashboard/crm/leads/${leadId}`);
  if (atendimentoId && UUID.test(atendimentoId)) revalidatePath("/dashboard/crm/atendimentos");
  if (negocioId && UUID.test(negocioId)) revalidatePath("/dashboard/crm/negocios");
}

export async function saveActivity(_: ActivityActionState, data: FormData): Promise<ActivityActionState> {
  if (!(await authorizeOperator())) return errorState("Operacao nao autorizada.");
  const id = field(data, "atividade_id"); const editing = Boolean(id);
  if (!(await authorize(editing ? "atividades.editar" : "atividades.criar"))) return errorState("Operacao nao autorizada.");
  if (editing && (!UUID.test(id) || Number.isNaN(Date.parse(field(data, "updated_at"))))) return errorState("Os dados atuais da Atividade sao invalidos. Recarregue a pagina.");
  const parsed = payload(data); if ("status" in parsed) return parsed;
  const supabase = await createClient();
  const result = editing
    ? await supabase.rpc("atualizar_atividade", { p_atividade_id: id, p_updated_at_esperado: field(data, "updated_at"), p_payload: parsed })
    : await supabase.rpc("criar_atividade", { p_payload: parsed });
  if (result.error) { logError(editing ? "update" : "create", "rpc", result.error.code); return errorState(rpcMessage(result.error, "Nao foi possivel salvar a Atividade.")); }
  const row = Array.isArray(result.data) ? result.data[0] : result.data;
  if (!isSaveActivityResult(row)) { logError(editing ? "update" : "create", "return", "invalid_return"); return errorState("Nao foi possivel confirmar a operacao."); }
  revalidate(parsed.lead_id, parsed.atendimento_id, parsed.negocio_id);
  return { status: "sucesso", mensagem: editing ? "Atividade atualizada." : "Atividade criada." };
}

export async function changeActivityState(_: ActivityActionState, data: FormData): Promise<ActivityActionState> {
  if (!(await authorizeOperator())) return errorState("Operacao nao autorizada.");
  if (!(await authorize("atividades.editar"))) return errorState("Operacao nao autorizada.");
  const id = field(data, "atividade_id"), updatedAt = field(data, "updated_at"), current = field(data, "status_atual"), destination = field(data, "status_destino"), observation = optional(data, "observacao");
  if (!UUID.test(id) || Number.isNaN(Date.parse(updatedAt)) || !isActivityStatus(current) || !isActivityStatus(destination)) return errorState("Os dados atuais da Atividade sao invalidos. Recarregue a pagina.");
  if ((observation?.length ?? 0) > ACTIVITY_RPC_LIMITS.movementObservation) return errorState("A observacao excede o limite permitido.");
  const supabase = await createClient();
  const result = current === "pendente" && destination === "em_andamento"
    ? await supabase.rpc("iniciar_atividade", { p_atividade_id: id, p_updated_at_esperado: updatedAt })
    : await supabase.rpc("alterar_estado_atividade", { p_atividade_id: id, p_status_destino: destination, p_updated_at_esperado: updatedAt, p_observacao: observation });
  if (result.error) { logError("change_state", "rpc", result.error.code); return errorState(rpcMessage(result.error, "Nao foi possivel atualizar a Atividade.")); }
  const row = Array.isArray(result.data) ? result.data[0] : result.data;
  if (!isChangeActivityStateResult(row) || row.atividade_id !== id || row.status_anterior !== current || row.status_atual !== destination) return errorState("Nao foi possivel confirmar a operacao.");
  revalidate(field(data, "lead_id"), field(data, "atendimento_id"), field(data, "negocio_id"));
  return { status: "sucesso", mensagem: "Estado da Atividade atualizado." };
}
