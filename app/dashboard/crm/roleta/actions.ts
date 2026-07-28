"use server";

import { revalidatePath } from "next/cache";

import { AccessPermissionRequiredError, AccessProfileRequiredError, requirePermission } from "../../../../lib/auth/access-profile";
import { isLeadEntryChannel, isLeadObjective } from "../../../../lib/crm/leads/catalogs";
import { isRouletteCapacity, isRouletteWeight, ROLETA_AUTOMATIC_CRITERION, ROLETA_NOTES_MAX_LENGTH } from "../../../../lib/crm/roleta/configuracoes";
import { createClient } from "../../../../lib/supabase/server";

export type DistributionState =
  | { status: "idle"; mensagem: null }
  | { status: "erro"; mensagem: string }
  | { status: "sucesso"; mensagem: string };

export type ConfigurationState = DistributionState;

type AutomaticRpcResult = {
  lead_id: unknown;
  corretor_pessoa_id: unknown;
  etapa_anterior: unknown;
  etapa_atual: unknown;
  distribuido_em: unknown;
  criterio: unknown;
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function errorState(mensagem: string): DistributionState {
  return { status: "erro", mensagem };
}

function logRouletteError(etapa: string, codigo: unknown) {
  console.error({ modulo: "crm_roleta", etapa, codigo: typeof codigo === "string" ? codigo : "unexpected_error" });
}

function revalidateDistributionPaths(leadId: string) {
  revalidatePath("/dashboard/crm/roleta");
  revalidatePath("/dashboard/crm/leads");
  revalidatePath("/dashboard/crm/kanban");
  revalidatePath(`/dashboard/crm/leads/${leadId}`);
  revalidatePath("/dashboard/crm/timeline");
}

function mapAutomaticRpcError(message: string) {
  const allowedMessages: ReadonlyArray<readonly [string, string]> = [
    ["Operacao nao autorizada.", "Operacao nao autorizada."],
    ["Lead nao informado.", "Lead nao encontrado."],
    ["Motivo excede o limite permitido.", "O motivo excede o limite de 500 caracteres."],
    ["Lead nao encontrado.", "Lead nao encontrado."],
    ["Estado atual do Lead inconsistente.", "O estado atual do Lead e inconsistente."],
    ["Lead ja distribuido.", "Este Lead ja foi distribuido por outra operacao."],
    ["Lead inelegivel para distribuicao.", "Este Lead nao esta mais elegivel para distribuicao."],
    ["Nenhuma Pessoa-corretora elegivel para distribuicao.", "Nenhuma Pessoa-corretora disponivel atende as regras deste Lead."],
    ["Retorno inesperado da distribuicao.", "Nao foi possivel confirmar o retorno da distribuicao."],
    ["Falha ao registrar criterio automatico.", "Nao foi possivel confirmar o criterio automatico."],
    ["Falha ao registrar historico da Roleta.", "Nao foi possivel registrar o historico da distribuicao."],
    ["Falha ao registrar Timeline da distribuicao.", "Nao foi possivel registrar a Timeline da distribuicao."],
    ["Nao foi possivel distribuir o Lead automaticamente.", "Nao foi possivel distribuir o Lead automaticamente."],
  ];
  return allowedMessages.find(([technical]) => message.includes(technical))?.[1] ?? null;
}

export async function distributeLead(_: DistributionState, formData: FormData): Promise<DistributionState> {
  try {
    await requirePermission("leads.distribuir");
    await requirePermission("leads.editar");
  } catch (error) {
    logRouletteError("distribution_authorization", error instanceof AccessPermissionRequiredError || error instanceof AccessProfileRequiredError ? error.name : "authorization_error");
    return errorState("Operacao nao autorizada.");
  }

  const leadId = String(formData.get("lead_id") ?? "").trim();
  const reason = String(formData.get("motivo") ?? "").trim();
  if (!UUID_PATTERN.test(leadId)) return errorState("Lead nao encontrado.");
  if (reason.length > 500) return errorState("O motivo excede o limite de 500 caracteres.");

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("distribuir_lead_roleta_automatica", {
    p_lead_id: leadId,
    p_motivo: reason || null,
  });

  if (error) {
    logRouletteError("automatic_rpc", error.code);
    return errorState(mapAutomaticRpcError(error.message ?? "") ?? "Nao foi possivel distribuir o Lead automaticamente.");
  }

  const rows = Array.isArray(data) ? data : data ? [data] : [];
  const row = rows[0] as unknown as AutomaticRpcResult | undefined;
  const validReturn = rows.length === 1 && row?.lead_id === leadId && typeof row.corretor_pessoa_id === "string" && UUID_PATTERN.test(row.corretor_pessoa_id) && (row.etapa_anterior === "novo" || row.etapa_anterior === "qualificacao") && row.etapa_atual === "atendimento" && typeof row.distribuido_em === "string" && !Number.isNaN(Date.parse(row.distribuido_em)) && row.criterio === ROLETA_AUTOMATIC_CRITERION;

  if (!validReturn || !row || typeof row.corretor_pessoa_id !== "string") {
    logRouletteError("automatic_rpc_return", "invalid_return");
    return errorState("A distribuicao foi processada, mas o retorno nao pode ser confirmado.");
  }

  revalidateDistributionPaths(leadId);
  const { data: selectedPerson, error: personError } = await supabase.from("pessoas").select("nome").eq("id", row.corretor_pessoa_id).maybeSingle();
  if (personError) logRouletteError("selected_person_name", personError.code);
  const selectedName = typeof selectedPerson?.nome === "string" ? selectedPerson.nome.trim() : "";
  return { status: "sucesso", mensagem: selectedName ? `Lead distribuido para ${selectedName}.` : "Lead distribuido com sucesso." };
}

function parseCheckbox(value: FormDataEntryValue | null) {
  if (value === null) return { valid: true as const, value: false };
  if (value === "on") return { valid: true as const, value: true };
  return { valid: false as const, value: false };
}

function parseInteger(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || !/^-?\d+$/.test(value.trim())) return null;
  return Number(value.trim());
}

function parseCities(value: FormDataEntryValue | null) {
  if (typeof value !== "string") return { valid: false as const, duplicate: false, values: [] as string[] };
  const values = value.split(/\r?\n/).map((city) => city.trim()).filter(Boolean);
  const normalized = values.map((city) => city.toLocaleLowerCase("pt-BR"));
  return { valid: true as const, duplicate: new Set(normalized).size !== normalized.length, values };
}

function parseCanonicalList(formData: FormData, field: string, validator: (value: unknown) => boolean) {
  const raw = formData.getAll(field);
  if (!raw.every((value) => typeof value === "string" && validator(value))) return null;
  const values = raw as string[];
  return new Set(values).size === values.length ? values : null;
}

export async function saveBrokerConfiguration(_: ConfigurationState, formData: FormData): Promise<ConfigurationState> {
  let profile;
  try {
    profile = await requirePermission("configuracoes.administrar");
    if (profile.papel !== "administrador") return errorState("Operacao nao autorizada.");
  } catch (error) {
    logRouletteError("configuration_authorization", error instanceof AccessPermissionRequiredError || error instanceof AccessProfileRequiredError ? error.name : "authorization_error");
    return errorState("Operacao nao autorizada.");
  }

  const personId = String(formData.get("pessoa_id") ?? "").trim();
  const expectedUpdatedAt = String(formData.get("expected_updated_at") ?? "").trim();
  const participation = parseCheckbox(formData.get("participa_roleta"));
  const availability = parseCheckbox(formData.get("disponivel"));
  const weight = parseInteger(formData.get("peso"));
  const capacityRaw = String(formData.get("capacidade_atendimentos") ?? "").trim();
  const capacity = capacityRaw === "" ? null : parseInteger(capacityRaw);
  const cities = parseCities(formData.get("cidades"));
  const objectives = parseCanonicalList(formData, "objetivos_imobiliarios", isLeadObjective);
  const channels = parseCanonicalList(formData, "canais", isLeadEntryChannel);
  const notes = String(formData.get("observacoes") ?? "").trim();

  if (!UUID_PATTERN.test(personId)) return errorState("Pessoa-corretora invalida.");
  if (!participation.valid || !availability.valid) return errorState("Configuracao invalida.");
  if (!isRouletteWeight(weight)) return errorState("Peso invalido. Use um inteiro entre 1 e 10.");
  if (capacityRaw !== "" && capacity === null) return errorState("Capacidade invalida. Use vazio ou um inteiro entre 1 e 100.");
  if (!isRouletteCapacity(capacity)) return errorState("Capacidade invalida. Use vazio ou um inteiro entre 1 e 100.");
  if (!cities.valid) return errorState("Lista de cidades invalida.");
  if (cities.duplicate) return errorState("Cidade repetida. Informe cada cidade somente uma vez.");
  if (objectives === null) return errorState("Objetivo imobiliario invalido ou repetido.");
  if (channels === null) return errorState("Canal invalido ou repetido.");
  if (notes.length > ROLETA_NOTES_MAX_LENGTH) return errorState("As observacoes excedem o limite de 1.000 caracteres.");

  const supabase = await createClient();
  const { data: person, error: personError } = await supabase.from("pessoas").select("id, nome, ativo, papeis").eq("id", personId).maybeSingle();
  if (personError) {
    logRouletteError("configuration_person", personError.code);
    return errorState("Pessoa-corretora invalida.");
  }
  const roles = Array.isArray(person?.papeis) ? person.papeis : [];
  if (!person || person.ativo !== true || !roles.includes("corretor") || typeof person.nome !== "string" || !person.nome.trim()) return errorState("Pessoa-corretora invalida.");

  const { data: existing, error: existingError } = await supabase.from("corretores_configuracoes").select("id, pessoa_id, updated_at").eq("pessoa_id", personId).maybeSingle();
  if (existingError) {
    logRouletteError("configuration_lookup", existingError.code);
    return errorState("Nao foi possivel carregar a configuracao atual.");
  }

  const payload = { participa_roleta: participation.value, disponivel: availability.value, peso: weight, capacidade_atendimentos: capacity, cidades: cities.values, objetivos_imobiliarios: objectives, canais: channels, observacoes: notes || null };

  if (existing) {
    if (!expectedUpdatedAt || existing.updated_at !== expectedUpdatedAt) return errorState("Configuracao atualizada por outra operacao. Recarregue a pagina.");
    const { data: updated, error: updateError } = await supabase.from("corretores_configuracoes").update(payload).eq("id", existing.id).eq("pessoa_id", personId).eq("updated_at", expectedUpdatedAt).select("id").maybeSingle();
    if (updateError) {
      logRouletteError("configuration_update", updateError.code);
      return errorState("Falha inesperada ao atualizar a configuracao.");
    }
    if (!updated) return errorState("Configuracao atualizada por outra operacao. Recarregue a pagina.");
  } else {
    if (expectedUpdatedAt) return errorState("Configuracao atualizada por outra operacao. Recarregue a pagina.");
    const { data: inserted, error: insertError } = await supabase.from("corretores_configuracoes").insert({ pessoa_id: personId, ...payload }).select("id").maybeSingle();
    if (insertError) {
      logRouletteError("configuration_insert", insertError.code);
      return errorState(insertError.code === "23505" ? "Configuracao atualizada por outra operacao. Recarregue a pagina." : "Falha inesperada ao criar a configuracao.");
    }
    if (!inserted) return errorState("Falha inesperada ao criar a configuracao.");
  }

  revalidatePath("/dashboard/crm/roleta");
  revalidatePath("/dashboard/corretores");
  return { status: "sucesso", mensagem: "Configuracao salva com sucesso." };
}
