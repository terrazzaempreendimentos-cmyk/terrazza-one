"use server";

import { revalidatePath } from "next/cache";

import {
  AccessPermissionRequiredError,
  AccessProfileRequiredError,
  requirePermission,
} from "../../../../lib/auth/access-profile";
import { createClient } from "../../../../lib/supabase/server";

export type DistributionState =
  | { status: "idle"; mensagem: null }
  | { status: "erro"; mensagem: string }
  | { status: "sucesso"; mensagem: string };

type EligiblePerson = { id: string; nome: string };
type CanonicalDistribution = { corretor_pessoa_id: string; created_at: string | null };
type RpcResult = { lead_id: unknown; corretor_pessoa_id: unknown; etapa_anterior: unknown; etapa_atual: unknown; distribuido_em: unknown };

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function errorState(mensagem: string): DistributionState {
  return { status: "erro", mensagem };
}

function logDistributionError(etapa: string, codigo: unknown) {
  console.error({ modulo: "crm_roleta", etapa, codigo: typeof codigo === "string" ? codigo : "unexpected_error" });
}

function normalizeName(value: string) {
  return value.trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR");
}

function selectPerson(people: EligiblePerson[], distributions: CanonicalDistribution[]) {
  const metrics = new Map<string, { count: number; latest: number | null }>();
  for (const distribution of distributions) {
    const current = metrics.get(distribution.corretor_pessoa_id) ?? { count: 0, latest: null };
    const timestamp = distribution.created_at ? Date.parse(distribution.created_at) : Number.NaN;
    metrics.set(distribution.corretor_pessoa_id, {
      count: current.count + 1,
      latest: Number.isNaN(timestamp) ? current.latest : Math.max(current.latest ?? timestamp, timestamp),
    });
  }

  return [...people].sort((left, right) => {
    const leftMetric = metrics.get(left.id) ?? { count: 0, latest: null };
    const rightMetric = metrics.get(right.id) ?? { count: 0, latest: null };
    if (leftMetric.count !== rightMetric.count) return leftMetric.count - rightMetric.count;
    const leftNeverReceived = leftMetric.count === 0;
    const rightNeverReceived = rightMetric.count === 0;
    if (leftNeverReceived !== rightNeverReceived) return leftNeverReceived ? -1 : 1;
    if (leftMetric.latest !== rightMetric.latest) {
      if (leftMetric.latest === null) return -1;
      if (rightMetric.latest === null) return 1;
      return leftMetric.latest - rightMetric.latest;
    }
    const nameOrder = normalizeName(left.nome).localeCompare(normalizeName(right.nome), "pt-BR");
    return nameOrder || left.id.localeCompare(right.id);
  })[0] ?? null;
}

function mapRpcError(message: string) {
  const allowedMessages: ReadonlyArray<readonly [string, string]> = [
    ["Operacao nao autorizada.", "Operacao nao autorizada."],
    ["Lead nao encontrado.", "Lead nao encontrado."],
    ["Lead inelegivel para distribuicao.", "Este Lead nao esta mais elegivel para distribuicao."],
    ["Lead ja distribuido.", "Este Lead ja foi distribuido por outra operacao."],
    ["Pessoa-corretora nao encontrada.", "A Pessoa-corretora selecionada pelo sistema nao foi encontrada."],
    ["Pessoa-corretora inativa.", "A Pessoa-corretora selecionada nao esta mais ativa."],
    ["Pessoa sem papel corretor.", "A Pessoa selecionada nao possui mais o papel corretor."],
    ["Motivo excede o limite permitido.", "O motivo excede o limite de 500 caracteres."],
    ["Falha ao registrar historico da Roleta.", "Nao foi possivel registrar o historico da distribuicao."],
    ["Falha ao registrar Timeline da distribuicao.", "Nao foi possivel registrar a Timeline da distribuicao."],
    ["Nao foi possivel distribuir o Lead.", "Nao foi possivel distribuir o Lead."],
  ];
  return allowedMessages.find(([technical]) => message.includes(technical))?.[1] ?? null;
}

function isConcurrencyError(message: string) {
  return message.includes("Lead ja distribuido.") || message.includes("Lead inelegivel para distribuicao.");
}

function revalidateDistributionPaths(leadId: string) {
  revalidatePath("/dashboard/crm/roleta");
  revalidatePath("/dashboard/crm/leads");
  revalidatePath("/dashboard/crm/kanban");
  revalidatePath(`/dashboard/crm/leads/${leadId}`);
}

export async function distributeLead(_: DistributionState, formData: FormData): Promise<DistributionState> {
  try {
    await requirePermission("leads.distribuir");
    await requirePermission("leads.editar");
  } catch (error) {
    logDistributionError("authorization", error instanceof AccessPermissionRequiredError || error instanceof AccessProfileRequiredError ? error.name : "authorization_error");
    return errorState("Operacao nao autorizada.");
  }

  const leadId = String(formData.get("lead_id") ?? "").trim();
  const reason = String(formData.get("motivo") ?? "").trim();
  if (!UUID_PATTERN.test(leadId)) return errorState("Lead nao encontrado.");
  if (reason.length > 500) return errorState("O motivo excede o limite de 500 caracteres.");

  const supabase = await createClient();
  const { data: lead, error: leadError } = await supabase.from("leads").select("id, etapa_funil, status_operacional, responsavel_id").eq("id", leadId).maybeSingle();
  if (leadError) {
    logDistributionError("lead_eligibility", leadError.code);
    return errorState("Nao foi possivel validar o Lead.");
  }
  if (!lead) return errorState("Lead nao encontrado.");
  if (lead.status_operacional !== "ativo" || !["novo", "qualificacao"].includes(lead.etapa_funil) || lead.responsavel_id !== null) {
    revalidateDistributionPaths(leadId);
    return errorState("Este Lead foi atualizado por outra operacao e nao esta mais elegivel.");
  }

  const [peopleResult, historyResult] = await Promise.all([
    supabase.from("pessoas").select("id, nome").eq("ativo", true).contains("papeis", ["corretor"]).order("nome", { ascending: true }),
    supabase.from("roleta_distribuicoes").select("corretor_pessoa_id, created_at").eq("status", "distribuido").not("corretor_pessoa_id", "is", null),
  ]);
  if (peopleResult.error) {
    logDistributionError("eligible_people", peopleResult.error.code);
    return errorState("Nao foi possivel carregar as Pessoas-corretoras elegiveis.");
  }
  if (historyResult.error) {
    logDistributionError("canonical_history", historyResult.error.code);
    return errorState("Nao foi possivel calcular a distribuicao com seguranca.");
  }

  const people = (peopleResult.data ?? []).filter((person): person is EligiblePerson => typeof person.id === "string" && typeof person.nome === "string" && person.nome.trim().length > 0);
  if (people.length === 0) return errorState("Nao ha Pessoa-corretora elegivel disponivel.");
  const history = (historyResult.data ?? []).filter((row): row is CanonicalDistribution => typeof row.corretor_pessoa_id === "string" && (row.created_at === null || typeof row.created_at === "string"));
  const selectedPerson = selectPerson(people, history);
  if (!selectedPerson) return errorState("Nao ha Pessoa-corretora elegivel disponivel.");

  const { data, error } = await supabase.rpc("distribuir_lead_para_corretor", { p_lead_id: leadId, p_corretor_pessoa_id: selectedPerson.id, p_motivo: reason || null });
  if (error) {
    logDistributionError("rpc", error.code);
    if (isConcurrencyError(error.message ?? "")) {
      revalidateDistributionPaths(leadId);
      return errorState("Este Lead foi atualizado por outra operacao. A distribuicao nao foi repetida.");
    }
    return errorState(mapRpcError(error.message ?? "") ?? "Nao foi possivel distribuir o Lead.");
  }

  const rows = Array.isArray(data) ? data : data ? [data] : [];
  const row = rows[0] as unknown as RpcResult | undefined;
  const validReturn = rows.length === 1 && row?.lead_id === leadId && row.corretor_pessoa_id === selectedPerson.id && (row.etapa_anterior === "novo" || row.etapa_anterior === "qualificacao") && row.etapa_atual === "atendimento" && typeof row.distribuido_em === "string" && !Number.isNaN(Date.parse(row.distribuido_em));
  if (!validReturn) {
    logDistributionError("rpc_return", "invalid_return");
    revalidateDistributionPaths(leadId);
    return errorState("A distribuicao foi processada, mas o retorno nao pode ser confirmado.");
  }

  revalidateDistributionPaths(leadId);
  return { status: "sucesso", mensagem: `Lead distribuido para ${selectedPerson.nome.trim()}.` };
}
