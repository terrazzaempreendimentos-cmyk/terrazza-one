"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  AccessPermissionRequiredError,
  AccessProfileRequiredError,
  requirePermission,
} from "../../../../lib/auth/access-profile";
import {
  isLeadEntryChannel,
  isLeadFunnelStage,
  isLeadHandoffState,
  isLeadObjective,
  isLeadOperationalStatus,
  isLeadRelationshipType,
  isLeadTemperature,
  mapCanonicalLeadStageToLegacy,
} from "../../../../lib/crm/leads/catalogs";
import { hasPapel } from "../../../../lib/crm/pessoas/papeis";
import { createClient } from "../../../../lib/supabase/server";

export type LeadFormState =
  | { status: "idle"; mensagem: null }
  | { status: "erro"; mensagem: string };

type SaveMode = "create" | "edit";

type ResponsiblePerson = {
  id: string;
  nome: string;
  ativo: boolean;
  papeis: string[] | null;
};

type ExistingLead = {
  id: string;
  responsavel_id: string | null;
  atribuido_em: string | null;
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function errorState(mensagem: string): LeadFormState {
  return { status: "erro", mensagem };
}

function logLeadError(etapa: string, codigo: unknown) {
  console.error({
    modulo: "crm_leads",
    etapa,
    codigo: typeof codigo === "string" ? codigo : "unexpected_error",
  });
}

function textValue(formData: FormData, field: string) {
  return String(formData.get(field) ?? "").trim();
}

function optionalText(formData: FormData, field: string, maxLength: number) {
  const value = textValue(formData, field);
  if (value.length > maxLength) return { valid: false as const, value: null };
  return { valid: true as const, value: value || null };
}

async function authorize(permission: "leads.criar" | "leads.editar") {
  try {
    await requirePermission(permission);
    return null;
  } catch (error) {
    logLeadError(
      "authorization",
      error instanceof AccessPermissionRequiredError ||
        error instanceof AccessProfileRequiredError
        ? error.name
        : "authorization_error",
    );
    return errorState("Operacao nao autorizada.");
  }
}

async function saveLead(mode: SaveMode, formData: FormData): Promise<LeadFormState> {
  const id = textValue(formData, "id");
  if ((mode === "create" && id) || (mode === "edit" && !UUID_PATTERN.test(id))) {
    return errorState(mode === "edit" ? "Lead nao encontrado." : "Cadastro invalido.");
  }

  const nome = textValue(formData, "nome");
  if (!nome) return errorState("Informe o nome do lead.");
  if (nome.length > 160) return errorState("O nome deve possuir no maximo 160 caracteres.");

  const telefone = optionalText(formData, "telefone", 40);
  const cidade = optionalText(formData, "cidade", 120);
  const bairro = optionalText(formData, "bairro_interesse", 120);
  const origemDetalhe = optionalText(formData, "origem_detalhe", 240);
  const observacao = optionalText(formData, "observacao", 4000);
  if (!telefone.valid || !cidade.valid || !bairro.valid || !origemDetalhe.valid || !observacao.valid) {
    return errorState("Um ou mais campos excedem o limite permitido.");
  }

  const tipoRelacionamentoRaw = textValue(formData, "tipo_relacionamento");
  const objetivoRaw = textValue(formData, "objetivo_imobiliario");
  const temperaturaRaw = textValue(formData, "temperatura");
  const etapaFunil = textValue(formData, "etapa_funil");
  const statusOperacional = textValue(formData, "status_operacional");
  const canal = textValue(formData, "canal");
  const handoffStatus = textValue(formData, "handoff_status");

  const tipoRelacionamento = tipoRelacionamentoRaw || null;
  const objetivoImobiliario = objetivoRaw || null;
  const temperatura = temperaturaRaw || null;

  if (
    (tipoRelacionamento !== null && !isLeadRelationshipType(tipoRelacionamento)) ||
    (objetivoImobiliario !== null && !isLeadObjective(objetivoImobiliario)) ||
    (temperatura !== null && !isLeadTemperature(temperatura)) ||
    !isLeadFunnelStage(etapaFunil) ||
    !isLeadOperationalStatus(statusOperacional) ||
    !isLeadEntryChannel(canal) ||
    !isLeadHandoffState(handoffStatus)
  ) {
    return errorState("A classificacao informada e invalida.");
  }

  const responsavelIdRaw = textValue(formData, "responsavel_id");
  if (responsavelIdRaw && !UUID_PATTERN.test(responsavelIdRaw)) {
    return errorState("O responsavel informado e invalido.");
  }

  const supabase = await createClient();
  let existingLead: ExistingLead | null = null;
  if (mode === "edit") {
    const existingResult = await supabase
      .from("leads")
      .select("id, responsavel_id, atribuido_em")
      .eq("id", id)
      .maybeSingle();

    if (existingResult.error) {
      logLeadError("load_existing", existingResult.error.code);
      return errorState("Nao foi possivel validar o Lead.");
    }
    if (!existingResult.data) return errorState("Lead nao encontrado.");
    existingLead = existingResult.data as unknown as ExistingLead;
  }

  let responsible: ResponsiblePerson | null = null;
  if (responsavelIdRaw) {
    const responsibleResult = await supabase
      .from("pessoas")
      .select("id, nome, ativo, papeis")
      .eq("id", responsavelIdRaw)
      .eq("ativo", true)
      .maybeSingle();

    if (responsibleResult.error) {
      logLeadError("validate_responsible", responsibleResult.error.code);
      return errorState("Nao foi possivel validar o responsavel.");
    }

    const person = responsibleResult.data as unknown as ResponsiblePerson | null;
    if (!person || !person.nome?.trim() || !hasPapel(person, "corretor")) {
      return errorState("O responsavel informado e invalido.");
    }
    responsible = person;
  }

  const responsibleChanged = existingLead?.responsavel_id !== (responsible?.id ?? null);
  const atribuidoEm = responsible
    ? responsibleChanged
      ? new Date().toISOString()
      : existingLead?.atribuido_em ?? new Date().toISOString()
    : null;
  const legacyStatus = mapCanonicalLeadStageToLegacy(etapaFunil);
  if (!legacyStatus) return errorState("A etapa informada e invalida.");

  const payload = {
    nome,
    telefone: telefone.value,
    cidade: cidade.value,
    bairro_interesse: bairro.value,
    tipo_relacionamento: tipoRelacionamento,
    objetivo_imobiliario: objetivoImobiliario,
    canal,
    origem_detalhe: origemDetalhe.value,
    etapa_funil: etapaFunil,
    status_operacional: statusOperacional,
    temperatura,
    handoff_status: handoffStatus,
    responsavel_id: responsible?.id ?? null,
    atribuido_em: atribuidoEm,
    observacao: observacao.value,
    status: legacyStatus,
    tipo_lead: tipoRelacionamento,
    objetivo: objetivoImobiliario,
    origem: canal,
    responsavel: responsible?.nome.trim() ?? null,
  };

  const result =
    mode === "create"
      ? await supabase.from("leads").insert(payload).select("id").single()
      : await supabase.from("leads").update(payload).eq("id", id).select("id").maybeSingle();

  if (result.error) {
    logLeadError(mode === "create" ? "insert" : "update", result.error.code);
    return errorState("Nao foi possivel salvar o lead. Tente novamente.");
  }

  const savedId = (result.data as unknown as { id?: unknown } | null)?.id;
  if (typeof savedId !== "string" || !UUID_PATTERN.test(savedId) || (mode === "edit" && savedId !== id)) {
    logLeadError(mode === "create" ? "insert_return" : "update_return", "invalid_return");
    return errorState(mode === "edit" ? "Lead nao encontrado." : "Nao foi possivel confirmar o cadastro.");
  }

  return { status: "idle", mensagem: null };
}

async function executeSave(mode: SaveMode, formData: FormData): Promise<LeadFormState> {
  let result: LeadFormState;
  try {
    result = await saveLead(mode, formData);
  } catch {
    logLeadError(mode === "create" ? "create_unexpected" : "edit_unexpected", "unexpected_error");
    return errorState("Nao foi possivel salvar o lead. Tente novamente.");
  }

  if (result.status === "erro") return result;
  revalidatePath("/dashboard/crm/leads");
  redirect("/dashboard/crm/leads");
}

export async function createLead(_: LeadFormState, formData: FormData) {
  const authorizationError = await authorize("leads.criar");
  if (authorizationError) return authorizationError;
  return executeSave("create", formData);
}

export async function updateLead(_: LeadFormState, formData: FormData) {
  const authorizationError = await authorize("leads.editar");
  if (authorizationError) return authorizationError;
  return executeSave("edit", formData);
}

export async function archiveLead(formData: FormData) {
  await requirePermission("leads.arquivar");
  const id = textValue(formData, "id");
  if (!UUID_PATTERN.test(id)) throw new Error("Lead nao informado.");

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("leads")
    .update({ status_operacional: "arquivado", status: "perdido" })
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (error) {
    logLeadError("archive", error.code);
    throw new Error("Nao foi possivel arquivar o lead.");
  }
  if (!data) throw new Error("Lead nao encontrado.");

  revalidatePath("/dashboard/crm/leads");
}
