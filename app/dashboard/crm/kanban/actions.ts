"use server";

import { revalidatePath } from "next/cache";

import {
  AccessPermissionRequiredError,
  AccessProfileRequiredError,
  requirePermission,
} from "../../../../lib/auth/access-profile";
import {
  isLeadFunnelStage,
  isLeadOperationalStatus,
} from "../../../../lib/crm/leads/catalogs";
import { createClient } from "../../../../lib/supabase/server";

export type KanbanMoveState =
  | { status: "idle"; mensagem: null }
  | { status: "erro"; mensagem: string };

type RpcResult = {
  lead_id: unknown;
  etapa_anterior: unknown;
  etapa_atual: unknown;
  status_operacional: unknown;
  updated_at: unknown;
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function errorState(mensagem: string): KanbanMoveState {
  return { status: "erro", mensagem };
}

function logKanbanError(etapa: string, codigo: unknown) {
  console.error({
    modulo: "crm_kanban",
    etapa,
    codigo: typeof codigo === "string" ? codigo : "unexpected_error",
  });
}

function mapRpcError(message: string) {
  const allowedMessages: ReadonlyArray<readonly [string, string]> = [
    ["Operacao nao autorizada.", "Operacao nao autorizada."],
    ["Lead nao encontrado.", "Lead nao encontrado."],
    ["Lead arquivado nao pode ser movimentado.", "Lead arquivado nao pode ser movimentado."],
    ["Estado atual do Lead inconsistente.", "Estado atual do Lead inconsistente."],
    ["Etapa de destino invalida.", "Etapa invalida."],
    ["Etapa atual invalida.", "Etapa invalida."],
    ["Motivo excede o limite permitido.", "O motivo excede o limite de 500 caracteres."],
    ["Falha ao registrar historico da movimentacao.", "Nao foi possivel registrar o historico da movimentacao."],
  ];

  return allowedMessages.find(([technical]) => message.includes(technical))?.[1] ?? null;
}

function isConcurrencyError(message: string) {
  return (
    message.includes("Origem e destino devem ser diferentes.") ||
    message.includes("Transicao de etapa nao permitida.")
  );
}

export async function moveLead(
  _: KanbanMoveState,
  formData: FormData,
): Promise<KanbanMoveState> {
  try {
    await requirePermission("kanban.usar");
    await requirePermission("leads.editar");
  } catch (error) {
    logKanbanError(
      "authorization",
      error instanceof AccessPermissionRequiredError ||
        error instanceof AccessProfileRequiredError
        ? error.name
        : "authorization_error",
    );
    return errorState("Operacao nao autorizada.");
  }

  const leadId = String(formData.get("lead_id") ?? "").trim();
  const destination = String(formData.get("etapa_destino") ?? "").trim();
  const reasonValue = String(formData.get("motivo") ?? "").trim();

  if (!UUID_PATTERN.test(leadId)) return errorState("Lead nao encontrado.");
  if (!isLeadFunnelStage(destination)) return errorState("Etapa invalida.");
  if (reasonValue.length > 500) {
    return errorState("O motivo excede o limite de 500 caracteres.");
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("movimentar_lead_funil", {
    p_lead_id: leadId,
    p_etapa_destino: destination,
    p_motivo: reasonValue || null,
  });

  if (error) {
    logKanbanError("rpc", error.code);
    if (isConcurrencyError(error.message ?? "")) {
      revalidatePath("/dashboard/crm/kanban");
      revalidatePath("/dashboard/crm/leads");
      return errorState("Este Lead foi atualizado. Recarregue o Kanban antes de tentar novamente.");
    }
    return errorState(
      mapRpcError(error.message ?? "") ?? "Nao foi possivel movimentar o Lead.",
    );
  }

  const rawRow = Array.isArray(data) ? data[0] : data;
  const row = rawRow as unknown as RpcResult | null;
  const hasValidResult =
    row !== null &&
    row.lead_id === leadId &&
    row.etapa_atual === destination &&
    isLeadFunnelStage(row.etapa_anterior) &&
    isLeadOperationalStatus(row.status_operacional) &&
    typeof row.updated_at === "string" &&
    !Number.isNaN(Date.parse(row.updated_at));

  if (!hasValidResult) {
    logKanbanError("rpc_return", "invalid_return");
    return errorState("Nao foi possivel confirmar a movimentacao do Lead.");
  }

  revalidatePath("/dashboard/crm/kanban");
  revalidatePath("/dashboard/crm/leads");
  revalidatePath(`/dashboard/crm/leads/${leadId}`);
  return { status: "idle", mensagem: null };
}
