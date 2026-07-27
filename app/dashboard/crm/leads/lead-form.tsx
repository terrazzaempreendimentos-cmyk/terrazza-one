"use client";

import { useActionState } from "react";

import {
  LEAD_ENTRY_CHANNELS,
  LEAD_FUNNEL_STAGES,
  LEAD_HANDOFF_STATES,
  LEAD_OBJECTIVES,
  LEAD_OPERATIONAL_STATUSES,
  LEAD_RELATIONSHIP_TYPES,
  LEAD_TEMPERATURES,
} from "../../../../lib/crm/leads/catalogs";
import type { LeadFormState } from "./actions";

export type LeadFormValue = {
  id: string;
  nome: string;
  telefone: string | null;
  cidade: string | null;
  bairro_interesse: string | null;
  tipo_relacionamento: string | null;
  objetivo_imobiliario: string | null;
  canal: string;
  origem_detalhe: string | null;
  etapa_funil: string;
  status_operacional: string;
  temperatura: string | null;
  handoff_status: string;
  responsavel_id: string | null;
  observacao: string | null;
};

type ResponsibleOption = { id: string; nome: string };
type LeadAction = (state: LeadFormState, formData: FormData) => Promise<LeadFormState>;

const initialState: LeadFormState = { status: "idle", mensagem: null };
const fieldClass = "rounded-xl border border-[#E8DDCB] bg-white px-4 py-3 text-[#071E36] outline-none transition placeholder:text-[#9a9d98] focus:border-[#C89B3C]";

export function LeadForm({
  action,
  lead,
  responsaveis,
}: {
  action: LeadAction;
  lead: LeadFormValue | null;
  responsaveis: ResponsibleOption[];
}) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="mt-6 grid gap-5 md:grid-cols-3">
      <input type="hidden" name="id" value={lead?.id ?? ""} />
      <label className="grid gap-2 text-sm font-medium text-[#102A27]">
        Nome
        <input name="nome" required maxLength={160} defaultValue={lead?.nome ?? ""} className={fieldClass} />
      </label>
      <label className="grid gap-2 text-sm font-medium text-[#102A27]">
        Telefone
        <input name="telefone" type="tel" maxLength={40} defaultValue={lead?.telefone ?? ""} className={fieldClass} />
      </label>
      <label className="grid gap-2 text-sm font-medium text-[#102A27]">
        Cidade
        <input name="cidade" maxLength={120} defaultValue={lead?.cidade ?? ""} className={fieldClass} />
      </label>
      <label className="grid gap-2 text-sm font-medium text-[#102A27]">
        Bairro de interesse
        <input name="bairro_interesse" maxLength={120} defaultValue={lead?.bairro_interesse ?? ""} className={fieldClass} />
      </label>
      <CatalogSelect name="tipo_relacionamento" label="Tipo de relacionamento" items={LEAD_RELATIONSHIP_TYPES} value={lead?.tipo_relacionamento ?? ""} nullable />
      <CatalogSelect name="objetivo_imobiliario" label="Objetivo imobiliario" items={LEAD_OBJECTIVES} value={lead?.objetivo_imobiliario ?? ""} nullable />
      <CatalogSelect name="canal" label="Canal" items={LEAD_ENTRY_CHANNELS} value={lead?.canal ?? "manual"} />
      <label className="grid gap-2 text-sm font-medium text-[#102A27] md:col-span-2">
        Detalhe da origem
        <input name="origem_detalhe" maxLength={240} defaultValue={lead?.origem_detalhe ?? ""} className={fieldClass} />
      </label>
      <CatalogSelect name="etapa_funil" label="Etapa do funil" items={LEAD_FUNNEL_STAGES} value={lead?.etapa_funil ?? "novo"} />
      <CatalogSelect name="status_operacional" label="Status operacional" items={LEAD_OPERATIONAL_STATUSES} value={lead?.status_operacional ?? "ativo"} />
      <CatalogSelect name="temperatura" label="Temperatura" items={LEAD_TEMPERATURES} value={lead?.temperatura ?? ""} nullable />
      <CatalogSelect name="handoff_status" label="Handoff" items={LEAD_HANDOFF_STATES} value={lead?.handoff_status ?? "humano"} />
      <label className="grid gap-2 text-sm font-medium text-[#102A27] md:col-span-2">
        Responsavel comercial
        <select name="responsavel_id" defaultValue={lead?.responsavel_id ?? ""} className={fieldClass}>
          <option value="">Sem responsavel</option>
          {responsaveis.map((responsavel) => <option key={responsavel.id} value={responsavel.id}>{responsavel.nome}</option>)}
        </select>
      </label>
      <label className="grid gap-2 text-sm font-medium text-[#102A27] md:col-span-3">
        Observacao
        <textarea name="observacao" rows={4} maxLength={4000} defaultValue={lead?.observacao ?? ""} className={fieldClass} />
      </label>
      {state.status === "erro" ? (
        <p role="alert" className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 md:col-span-3">{state.mensagem}</p>
      ) : null}
      <div className="md:col-span-3">
        <button type="submit" disabled={pending} aria-disabled={pending} className="rounded-xl bg-[#071E36] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#0A2A4A] disabled:cursor-not-allowed disabled:opacity-60">
          {pending ? "Salvando..." : lead ? "Salvar alteracoes" : "Salvar lead"}
        </button>
      </div>
    </form>
  );
}

function CatalogSelect({
  name,
  label,
  items,
  value,
  nullable = false,
}: {
  name: string;
  label: string;
  items: readonly { id: string; label: string }[];
  value: string;
  nullable?: boolean;
}) {
  return (
    <label className="grid gap-2 text-sm font-medium text-[#102A27]">
      {label}
      <select name={name} defaultValue={value} className={fieldClass}>
        {nullable ? <option value="">Nao informado</option> : null}
        {items.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
      </select>
    </label>
  );
}
