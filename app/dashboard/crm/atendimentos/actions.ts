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
  isAtendimentoResult,
  isAtendimentoChannel,
  isAtendimentoPriority,
} from "../../../../lib/crm/atendimentos/catalogs";
import {
  ATENDIMENTO_CANCELLATION_REASON_MAX_LENGTH,
  ATENDIMENTO_CANCELLATION_REASON_MIN_LENGTH,
  ATENDIMENTO_REOPEN_REASON_MAX_LENGTH,
  ATENDIMENTO_REOPEN_REASON_MIN_LENGTH,
  ATENDIMENTO_RESULT_DETAIL_MAX_LENGTH,
  ATENDIMENTO_SUBJECT_MAX_LENGTH,
  ATENDIMENTO_SUMMARY_MAX_LENGTH,
  canChangeAtendimentoOpenState,
  isCancellationResult,
  isCancellationSourceStatus,
  isCancelAtendimentoRpcResult,
  isConclusionResult,
  isConclusionSourceStatus,
  isConcludeAtendimentoRpcResult,
  isAssumeAtendimentoRpcResult,
  isChangeAtendimentoOpenStateRpcResult,
  isCreateAtendimentoRpcResult,
  isAtendimentoOpenManagedStatus,
  isReopenAtendimentoRpcResult,
} from "../../../../lib/crm/atendimentos/rpc-contracts";
import { createClient } from "../../../../lib/supabase/server";

export type AtendimentoActionState =
  | { status: "idle"; mensagem: null }
  | { status: "erro"; mensagem: string }
  | { status: "sucesso"; mensagem: string };

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const CONCURRENCY_MESSAGE =
  "Este Atendimento foi atualizado por outra operacao. Revise os dados atuais.";

function errorState(mensagem: string): AtendimentoActionState {
  return { status: "erro", mensagem };
}

function logError(etapa: string, codigo: unknown) {
  console.error({
    modulo: "crm_atendimentos",
    etapa,
    codigo: typeof codigo === "string" ? codigo : "unexpected_error",
  });
}

async function authorize(permission: "atendimentos.criar" | "atendimentos.assumir" | "atendimentos.editar" | "atendimentos.concluir" | "atendimentos.cancelar" | "atendimentos.reabrir") {
  try {
    await requirePermission(permission);
    await requireRole("administrador", "gestor");
    return true;
  } catch (error) {
    logError(
      "authorization",
      error instanceof AccessPermissionRequiredError
        || error instanceof AccessProfileRequiredError
        || error instanceof AccessRoleRequiredError
        ? error.name
        : "authorization_error",
    );
    return false;
  }
}

function rpcRow(data: unknown): unknown {
  return Array.isArray(data) ? data[0] : data;
}

function safeRpcMessage(message: string, fallback: string) {
  if (message.includes("Atendimento atualizado por outra operacao.")) return CONCURRENCY_MESSAGE;
  const messages: ReadonlyArray<readonly [string, string]> = [
    ["Operacao nao autorizada.", "Operacao nao autorizada."],
    ["Lead nao encontrado.", "Lead nao encontrado."],
    ["Lead inelegivel para Atendimento.", "Lead inelegivel para Atendimento."],
    ["Estado atual do Lead inconsistente.", "O estado atual do Lead e inconsistente."],
    ["Este Lead ja possui um Atendimento aberto.", "Este Lead ja possui um Atendimento aberto."],
    ["Atendimento nao encontrado.", "Atendimento nao encontrado."],
    ["Atendimento sem responsavel.", "O Atendimento ainda nao possui responsavel valido."],
    ["Atendimento ja assumido.", "Este Atendimento nao esta mais aguardando assuncao."],
    ["Responsavel do Lead invalido.", "O responsavel atual do Lead e invalido."],
    ["Pessoa responsavel inativa.", "A Pessoa responsavel esta inativa."],
    ["Pessoa sem papel corretor.", "A Pessoa responsavel nao possui papel corretor."],
    ["Transicao de Atendimento bloqueada.", "A transicao solicitada nao e permitida."],
    ["Conclusao de Atendimento bloqueada.", "A conclusao deste Atendimento nao e permitida."],
    ["Cancelamento de Atendimento bloqueado.", "O cancelamento deste Atendimento nao e permitido."],
    ["Atendimento nao finalizado para reabertura.", "Este Atendimento nao esta finalizado para reabertura."],
    ["Resultado obrigatorio.", "Selecione um resultado."],
    ["Resultado invalido.", "O resultado informado e invalido."],
    ["Motivo obrigatorio.", "Informe o motivo da operacao."],
    ["Motivo muito curto.", "O motivo informado e muito curto."],
    ["Motivo excede o limite permitido.", "O motivo excede o limite permitido."],
    ["O Atendimento ja esta nesta situacao.", "O Atendimento ja esta nesta situacao."],
    ["Falha ao registrar Timeline do Atendimento.", "Nao foi possivel registrar o historico do Atendimento."],
    ["Retorno inesperado do Atendimento.", "Nao foi possivel confirmar a operacao."],
  ];
  return messages.find(([technical]) => message.includes(technical))?.[1] ?? fallback;
}

function revalidateAtendimentoPaths(leadId?: string) {
  revalidatePath("/dashboard/crm/atendimentos");
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/crm/leads");
  if (leadId && UUID_PATTERN.test(leadId)) {
    revalidatePath(`/dashboard/crm/leads/${leadId}`);
  }
}

export async function createAtendimento(
  _: AtendimentoActionState,
  formData: FormData,
): Promise<AtendimentoActionState> {
  if (!(await authorize("atendimentos.criar"))) return errorState("Operacao nao autorizada.");

  const leadId = String(formData.get("lead_id") ?? "").trim();
  const prioridade = String(formData.get("prioridade") ?? "").trim();
  const canalValue = String(formData.get("canal") ?? "").trim();
  const assunto = String(formData.get("assunto") ?? "").trim();
  const resumo = String(formData.get("resumo") ?? "").trim();

  if (!UUID_PATTERN.test(leadId)) return errorState("Selecione um Lead valido.");
  if (!isAtendimentoPriority(prioridade)) return errorState("Prioridade invalida.");
  if (canalValue && !isAtendimentoChannel(canalValue)) return errorState("Canal invalido.");
  if (assunto.length > ATENDIMENTO_SUBJECT_MAX_LENGTH) return errorState("O assunto excede o limite permitido.");
  if (resumo.length > ATENDIMENTO_SUMMARY_MAX_LENGTH) return errorState("O resumo excede o limite permitido.");

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("criar_atendimento_lead", {
    p_lead_id: leadId,
    p_prioridade: prioridade,
    p_canal: canalValue || null,
    p_assunto: assunto || null,
    p_resumo: resumo || null,
  });

  if (error) {
    logError("create_rpc", error.code);
    return errorState(safeRpcMessage(error.message ?? "", "Nao foi possivel criar o Atendimento."));
  }
  const row = rpcRow(data);
  if (!isCreateAtendimentoRpcResult(row)
    || row.lead_id !== leadId
    || row.prioridade !== prioridade
    || (canalValue && row.canal !== canalValue)) {
    logError("create_return", "invalid_return");
    return errorState("Nao foi possivel confirmar a criacao do Atendimento.");
  }

  revalidateAtendimentoPaths(leadId);
  return { status: "idle", mensagem: null };
}

export async function assumeAtendimento(
  _: AtendimentoActionState,
  formData: FormData,
): Promise<AtendimentoActionState> {
  if (!(await authorize("atendimentos.assumir"))) return errorState("Operacao nao autorizada.");

  const atendimentoId = String(formData.get("atendimento_id") ?? "").trim();
  const leadId = String(formData.get("lead_id") ?? "").trim();
  const updatedAt = String(formData.get("updated_at") ?? "").trim();
  if (!UUID_PATTERN.test(atendimentoId) || !UUID_PATTERN.test(leadId) || !isTimestamp(updatedAt)) {
    return errorState("Os dados atuais do Atendimento sao invalidos. Recarregue a pagina.");
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("assumir_atendimento", {
    p_atendimento_id: atendimentoId,
    p_updated_at_esperado: updatedAt,
  });

  if (error) {
    logError("assume_rpc", error.code);
    const message = safeRpcMessage(error.message ?? "", "Nao foi possivel assumir o Atendimento.");
    if (message === CONCURRENCY_MESSAGE) revalidateAtendimentoPaths(leadId);
    return errorState(message);
  }
  const row = rpcRow(data);
  if (!isAssumeAtendimentoRpcResult(row)
    || row.atendimento_id !== atendimentoId
    || row.lead_id !== leadId) {
    logError("assume_return", "invalid_return");
    return errorState("Nao foi possivel confirmar a assuncao do Atendimento.");
  }

  revalidateAtendimentoPaths(leadId);
  return { status: "idle", mensagem: null };
}

export async function changeAtendimentoState(
  _: AtendimentoActionState,
  formData: FormData,
): Promise<AtendimentoActionState> {
  if (!(await authorize("atendimentos.editar"))) return errorState("Operacao nao autorizada.");

  const atendimentoId = String(formData.get("atendimento_id") ?? "").trim();
  const leadId = String(formData.get("lead_id") ?? "").trim();
  const currentStatus = String(formData.get("status_esperado") ?? "").trim();
  const destination = String(formData.get("status_destino") ?? "").trim();
  const updatedAt = String(formData.get("updated_at") ?? "").trim();
  const resumo = String(formData.get("resumo") ?? "").trim();
  const nextActionValue = String(formData.get("proxima_acao_em") ?? "").trim();

  if (!UUID_PATTERN.test(atendimentoId) || !UUID_PATTERN.test(leadId) || !isTimestamp(updatedAt)) {
    return errorState("Os dados atuais do Atendimento sao invalidos. Recarregue a pagina.");
  }
  if (!isAtendimentoOpenManagedStatus(currentStatus)
    || !isAtendimentoOpenManagedStatus(destination)
    || !canChangeAtendimentoOpenState(currentStatus, destination)) {
    return errorState("A transicao solicitada nao e permitida.");
  }
  if (resumo.length > ATENDIMENTO_SUMMARY_MAX_LENGTH) return errorState("O resumo excede o limite permitido.");

  const nextAction = parseOptionalLocalTimestamp(nextActionValue);
  if (nextActionValue && !nextAction) return errorState("A data da proxima acao e invalida.");

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("alterar_estado_atendimento", {
    p_atendimento_id: atendimentoId,
    p_status_esperado: currentStatus,
    p_status_destino: destination,
    p_updated_at_esperado: updatedAt,
    p_resumo: resumo || null,
    p_proxima_acao_em: nextAction,
  });

  if (error) {
    logError("state_rpc", error.code);
    const message = safeRpcMessage(error.message ?? "", "Nao foi possivel atualizar o Atendimento.");
    if (message === CONCURRENCY_MESSAGE) revalidateAtendimentoPaths(leadId);
    return errorState(message);
  }
  const row = rpcRow(data);
  if (!isChangeAtendimentoOpenStateRpcResult(row)
    || row.atendimento_id !== atendimentoId
    || row.lead_id !== leadId
    || row.status_anterior !== currentStatus
    || row.status_atual !== destination) {
    logError("state_return", "invalid_return");
    return errorState("Nao foi possivel confirmar a atualizacao do Atendimento.");
  }

  revalidateAtendimentoPaths(leadId);
  return { status: "idle", mensagem: null };
}

export async function concludeAtendimento(
  _: AtendimentoActionState,
  formData: FormData,
): Promise<AtendimentoActionState> {
  if (!(await authorize("atendimentos.concluir"))) return errorState("Operacao nao autorizada.");

  const atendimentoId = field(formData, "atendimento_id");
  const leadId = field(formData, "lead_id");
  const responsavelId = field(formData, "responsavel_id");
  const currentStatus = field(formData, "status_esperado");
  const updatedAt = field(formData, "updated_at");
  const resultado = field(formData, "resultado");
  const detalhe = field(formData, "resultado_detalhe");
  const resumo = field(formData, "resumo");

  if (!validPhotograph(atendimentoId, leadId, updatedAt) || !UUID_PATTERN.test(responsavelId)) return invalidPhotograph();
  if (!isConclusionSourceStatus(currentStatus)) return errorState("A conclusao deste Atendimento nao e permitida.");
  if (!isAtendimentoResult(resultado) || !isConclusionResult(resultado)) return errorState("O resultado informado e invalido.");
  if (detalhe.length > ATENDIMENTO_RESULT_DETAIL_MAX_LENGTH) return errorState("O detalhe do resultado excede o limite permitido.");
  if (resumo.length > ATENDIMENTO_SUMMARY_MAX_LENGTH) return errorState("O resumo excede o limite permitido.");

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("concluir_atendimento", {
    p_atendimento_id: atendimentoId,
    p_status_esperado: currentStatus,
    p_updated_at_esperado: updatedAt,
    p_resultado: resultado,
    p_resultado_detalhe: detalhe || null,
    p_resumo: resumo || null,
  });
  if (error) return finalRpcError("conclude_rpc", error.code, error.message, leadId, "Nao foi possivel concluir o Atendimento.");

  const row = rpcRow(data);
  if (!isConcludeAtendimentoRpcResult(row)
    || row.atendimento_id !== atendimentoId
    || row.lead_id !== leadId
    || row.responsavel_id !== responsavelId
    || row.status_anterior !== currentStatus
    || row.resultado !== resultado) {
    logError("conclude_return", "invalid_return");
    return errorState("Nao foi possivel confirmar a conclusao do Atendimento.");
  }
  revalidateAtendimentoPaths(leadId);
  return { status: "sucesso", mensagem: "Atendimento concluido com sucesso." };
}

export async function cancelAtendimento(
  _: AtendimentoActionState,
  formData: FormData,
): Promise<AtendimentoActionState> {
  if (!(await authorize("atendimentos.cancelar"))) return errorState("Operacao nao autorizada.");

  const atendimentoId = field(formData, "atendimento_id");
  const leadId = field(formData, "lead_id");
  const responsavelId = field(formData, "responsavel_id");
  const currentStatus = field(formData, "status_esperado");
  const updatedAt = field(formData, "updated_at");
  const resultado = field(formData, "resultado");
  const motivo = field(formData, "motivo");
  const detalhe = field(formData, "resultado_detalhe");

  if (!validPhotograph(atendimentoId, leadId, updatedAt) || (responsavelId && !UUID_PATTERN.test(responsavelId))) return invalidPhotograph();
  if (!isCancellationSourceStatus(currentStatus)) return errorState("O cancelamento deste Atendimento nao e permitido.");
  if (!isAtendimentoResult(resultado) || !isCancellationResult(resultado)) return errorState("O resultado informado e invalido.");
  if (motivo.length < ATENDIMENTO_CANCELLATION_REASON_MIN_LENGTH) return errorState("O motivo deve ter pelo menos 3 caracteres.");
  if (motivo.length > ATENDIMENTO_CANCELLATION_REASON_MAX_LENGTH) return errorState("O motivo excede o limite permitido.");
  if (detalhe.length > ATENDIMENTO_RESULT_DETAIL_MAX_LENGTH) return errorState("O detalhe do resultado excede o limite permitido.");

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("cancelar_atendimento", {
    p_atendimento_id: atendimentoId,
    p_status_esperado: currentStatus,
    p_updated_at_esperado: updatedAt,
    p_resultado: resultado,
    p_motivo: motivo,
    p_resultado_detalhe: detalhe || null,
  });
  if (error) return finalRpcError("cancel_rpc", error.code, error.message, leadId, "Nao foi possivel cancelar o Atendimento.");

  const row = rpcRow(data);
  if (!isCancelAtendimentoRpcResult(row)
    || row.atendimento_id !== atendimentoId
    || row.lead_id !== leadId
    || row.responsavel_id !== (responsavelId || null)
    || row.status_anterior !== currentStatus
    || row.resultado !== resultado) {
    logError("cancel_return", "invalid_return");
    return errorState("Nao foi possivel confirmar o cancelamento do Atendimento.");
  }
  revalidateAtendimentoPaths(leadId);
  return { status: "sucesso", mensagem: "Atendimento cancelado com sucesso." };
}

export async function reopenAtendimento(
  _: AtendimentoActionState,
  formData: FormData,
): Promise<AtendimentoActionState> {
  if (!(await authorize("atendimentos.reabrir"))) return errorState("Operacao nao autorizada.");

  const atendimentoId = field(formData, "atendimento_id");
  const leadId = field(formData, "lead_id");
  const updatedAt = field(formData, "updated_at");
  const motivo = field(formData, "motivo");
  const prioridade = field(formData, "prioridade");
  const assunto = field(formData, "assunto");
  const resumo = field(formData, "resumo");

  if (!validPhotograph(atendimentoId, leadId, updatedAt)) return invalidPhotograph();
  if (motivo.length < ATENDIMENTO_REOPEN_REASON_MIN_LENGTH) return errorState("O motivo deve ter pelo menos 3 caracteres.");
  if (motivo.length > ATENDIMENTO_REOPEN_REASON_MAX_LENGTH) return errorState("O motivo excede o limite permitido.");
  if (prioridade && !isAtendimentoPriority(prioridade)) return errorState("Prioridade invalida.");
  if (assunto.length > ATENDIMENTO_SUBJECT_MAX_LENGTH) return errorState("O assunto excede o limite permitido.");
  if (resumo.length > ATENDIMENTO_SUMMARY_MAX_LENGTH) return errorState("O resumo excede o limite permitido.");

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("reabrir_atendimento", {
    p_atendimento_id_anterior: atendimentoId,
    p_updated_at_esperado: updatedAt,
    p_motivo: motivo,
    p_prioridade: prioridade || null,
    p_assunto: assunto || null,
    p_resumo: resumo || null,
  });
  if (error) return finalRpcError("reopen_rpc", error.code, error.message, leadId, "Nao foi possivel reabrir o Atendimento.");

  const row = rpcRow(data);
  if (!isReopenAtendimentoRpcResult(row)
    || row.atendimento_anterior_id !== atendimentoId
    || row.lead_id !== leadId
    || (prioridade && row.prioridade !== prioridade)) {
    logError("reopen_return", "invalid_return");
    return errorState("Nao foi possivel confirmar a reabertura do Atendimento.");
  }
  revalidateAtendimentoPaths(leadId);
  return { status: "sucesso", mensagem: "Novo Atendimento criado com sucesso." };
}

function isTimestamp(value: string) {
  return Boolean(value) && !Number.isNaN(Date.parse(value));
}

function parseOptionalLocalTimestamp(value: string): string | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function field(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

function validPhotograph(atendimentoId: string, leadId: string, updatedAt: string) {
  return UUID_PATTERN.test(atendimentoId) && UUID_PATTERN.test(leadId) && isTimestamp(updatedAt);
}

function invalidPhotograph() {
  return errorState("Os dados atuais do Atendimento sao invalidos. Recarregue a pagina.");
}

function finalRpcError(operation: string, code: unknown, message: string, leadId: string, fallback: string) {
  logError(operation, code);
  const safeMessage = safeRpcMessage(message, fallback);
  if (safeMessage === CONCURRENCY_MESSAGE) revalidateAtendimentoPaths(leadId);
  return errorState(safeMessage);
}
