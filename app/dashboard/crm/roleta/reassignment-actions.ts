"use server";

import { revalidatePath } from "next/cache";

import { AccessPermissionRequiredError, AccessProfileRequiredError, requirePermission } from "../../../../lib/auth/access-profile";
import { isLeadReassignmentRpcResult, REASSIGNMENT_ELIGIBLE_STAGES, validateReassignmentReason } from "../../../../lib/crm/roleta/reatribuicao";
import { createClient } from "../../../../lib/supabase/server";

export type ReassignmentState =
  | { status: "idle"; mensagem: null }
  | { status: "erro"; mensagem: string }
  | { status: "sucesso"; mensagem: string };

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function errorState(mensagem: string): ReassignmentState {
  return { status: "erro", mensagem };
}

function logReassignmentError(etapa: string, codigo: unknown) {
  console.error({ modulo: "crm_reatribuicao", etapa, codigo: typeof codigo === "string" ? codigo : "unexpected_error" });
}

function mapRpcError(message: string) {
  const allowedMessages: ReadonlyArray<readonly [string, string]> = [
    ["Operacao nao autorizada.", "Operacao nao autorizada."],
    ["Lead nao informado.", "Lead nao encontrado."],
    ["Responsavel esperado nao informado.", "Lead sem responsavel."],
    ["Nova Pessoa-corretora nao informada.", "Selecione o novo responsavel."],
    ["Motivo obrigatorio.", "Informe o motivo da transferencia."],
    ["Motivo muito curto.", "O motivo deve possuir pelo menos 3 caracteres."],
    ["Motivo excede o limite permitido.", "O motivo excede o limite de 500 caracteres."],
    ["Lead nao encontrado.", "Lead nao encontrado."],
    ["Lead sem responsavel.", "Este Lead nao possui responsavel atual."],
    ["Lead inelegivel para reatribuicao.", "Este Lead nao esta elegivel para transferencia."],
    ["Estado atual do Lead inconsistente.", "O estado atual do Lead e inconsistente."],
    ["Responsavel alterado por outra operacao.", "O responsavel deste Lead foi alterado por outra operacao. Atualize a pagina antes de tentar novamente."],
    ["Pessoa-corretora nao encontrada.", "Pessoa-corretora nao encontrada."],
    ["Pessoa-corretora inativa.", "A Pessoa-corretora selecionada esta inativa."],
    ["Pessoa sem papel corretor.", "A Pessoa selecionada nao possui papel corretor."],
    ["Pessoa-corretora invalida.", "Pessoa-corretora invalida."],
    ["O novo responsavel deve ser diferente do atual.", "Selecione uma Pessoa-corretora diferente do responsavel atual."],
    ["Falha ao registrar historico da reatribuicao.", "Nao foi possivel registrar o historico da transferencia."],
    ["Falha ao registrar Timeline da reatribuicao.", "Nao foi possivel registrar a Timeline da transferencia."],
    ["Nao foi possivel reatribuir o Lead.", "Nao foi possivel transferir o atendimento."],
  ];
  return allowedMessages.find(([technical]) => message.includes(technical))?.[1] ?? null;
}

export async function transferLeadAssignment(_: ReassignmentState, formData: FormData): Promise<ReassignmentState> {
  try {
    const profile = await requirePermission("leads.distribuir");
    await requirePermission("leads.editar");
    if (profile.papel !== "administrador" && profile.papel !== "gestor") return errorState("Operacao nao autorizada.");
  } catch (error) {
    logReassignmentError("authorization", error instanceof AccessPermissionRequiredError || error instanceof AccessProfileRequiredError ? error.name : "authorization_error");
    return errorState("Operacao nao autorizada.");
  }

  const leadId = String(formData.get("lead_id") ?? "").trim();
  const expectedResponsibleId = String(formData.get("responsavel_esperado_id") ?? "").trim();
  const newResponsibleId = String(formData.get("novo_corretor_pessoa_id") ?? "").trim();
  const reasonValidation = validateReassignmentReason(formData.get("motivo"));

  if (!UUID_PATTERN.test(leadId)) return errorState("Lead nao encontrado.");
  if (!UUID_PATTERN.test(expectedResponsibleId)) return errorState("Lead sem responsavel.");
  if (!UUID_PATTERN.test(newResponsibleId)) return errorState("Selecione o novo responsavel.");
  if (!reasonValidation.valid) return errorState(mapRpcError(reasonValidation.error) ?? "Motivo invalido.");

  const supabase = await createClient();
  const { data: lead, error: leadError } = await supabase.from("leads").select("id, responsavel_id, etapa_funil, status_operacional").eq("id", leadId).maybeSingle();
  if (leadError) {
    logReassignmentError("lead_precheck", leadError.code);
    return errorState("Nao foi possivel validar o Lead.");
  }
  if (!lead) return errorState("Lead nao encontrado.");
  if (!lead.responsavel_id) return errorState("Este Lead nao possui responsavel atual.");
  if (lead.responsavel_id !== expectedResponsibleId) return errorState("O responsavel deste Lead foi alterado por outra operacao. Atualize a pagina antes de tentar novamente.");
  if (lead.status_operacional !== "ativo" || !REASSIGNMENT_ELIGIBLE_STAGES.some((stage) => stage === lead.etapa_funil)) return errorState("Este Lead nao esta elegivel para transferencia.");
  if (newResponsibleId === expectedResponsibleId) return errorState("Selecione uma Pessoa-corretora diferente do responsavel atual.");

  const { data: newResponsible, error: personError } = await supabase.from("pessoas").select("id, nome, ativo, papeis").eq("id", newResponsibleId).maybeSingle();
  if (personError) {
    logReassignmentError("person_precheck", personError.code);
    return errorState("Nao foi possivel validar a Pessoa-corretora.");
  }
  const roles = Array.isArray(newResponsible?.papeis) ? newResponsible.papeis : [];
  if (!newResponsible) return errorState("Pessoa-corretora nao encontrada.");
  if (newResponsible.ativo !== true) return errorState("A Pessoa-corretora selecionada esta inativa.");
  if (!roles.includes("corretor")) return errorState("A Pessoa selecionada nao possui papel corretor.");
  if (typeof newResponsible.nome !== "string" || !newResponsible.nome.trim()) return errorState("Pessoa-corretora invalida.");

  const { data, error } = await supabase.rpc("reatribuir_lead_corretor", {
    p_lead_id: leadId,
    p_responsavel_esperado_id: expectedResponsibleId,
    p_novo_corretor_pessoa_id: newResponsibleId,
    p_motivo: reasonValidation.value,
  });

  if (error) {
    logReassignmentError("rpc", error.code);
    return errorState(mapRpcError(error.message ?? "") ?? "Nao foi possivel transferir o atendimento.");
  }

  const rows = Array.isArray(data) ? data : data ? [data] : [];
  const row = rows[0] as unknown;
  if (rows.length !== 1 || !isLeadReassignmentRpcResult(row, { leadId, previousPersonId: expectedResponsibleId, currentPersonId: newResponsibleId }) || (row as { etapa_atual?: unknown }).etapa_atual !== lead.etapa_funil) {
    logReassignmentError("rpc_return", "invalid_return");
    return errorState("A transferencia foi processada, mas o retorno nao pode ser confirmado.");
  }

  revalidatePath("/dashboard/crm/leads");
  revalidatePath(`/dashboard/crm/leads/${leadId}`);
  revalidatePath("/dashboard/crm/roleta");
  revalidatePath("/dashboard/crm/kanban");
  revalidatePath("/dashboard/crm/timeline");
  return { status: "sucesso", mensagem: `Atendimento transferido para ${newResponsible.nome.trim()}.` };
}
