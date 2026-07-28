"use client";

import { useActionState } from "react";

import { LEAD_ENTRY_CHANNELS, LEAD_OBJECTIVES } from "../../../../lib/crm/leads/catalogs";
import { saveBrokerConfiguration, type ConfigurationState } from "./actions";

export type BrokerConfigurationFormValue = {
  id: string | null;
  updatedAt: string | null;
  participates: boolean;
  available: boolean;
  weight: number;
  capacity: number | null;
  cities: string[];
  objectives: string[];
  channels: string[];
  notes: string | null;
};

const INITIAL_STATE: ConfigurationState = { status: "idle", mensagem: null };

export function BrokerConfigurationForm({
  personId,
  personName,
  configuration,
}: {
  personId: string;
  personName: string;
  configuration: BrokerConfigurationFormValue;
}) {
  const [state, formAction, pending] = useActionState(saveBrokerConfiguration, INITIAL_STATE);

  return (
    <form action={formAction} className="rounded-3xl border border-[#E8DDCB] bg-[#fffdfa] p-5 shadow-sm">
      <input type="hidden" name="pessoa_id" value={personId} />
      <input type="hidden" name="expected_updated_at" value={configuration.updatedAt ?? ""} />
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><h3 className="text-lg font-semibold text-[#071E36]">{personName}</h3><p className="mt-1 text-xs font-semibold uppercase tracking-[0.12em] text-[#8B6827]">{configuration.id ? "Configurada" : "Nao configurada"}</p></div>
        <div className="flex flex-wrap gap-4 text-sm text-[#071E36]">
          <Checkbox name="participa_roleta" label="Participa da Roleta" defaultChecked={configuration.participates} disabled={pending} />
          <Checkbox name="disponivel" label="Disponivel" defaultChecked={configuration.available} disabled={pending} />
        </div>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <Field label="Peso"><input name="peso" type="number" min={1} max={10} step={1} required defaultValue={configuration.weight} disabled={pending} className={inputClass} /></Field>
        <Field label="Capacidade de atendimentos"><input name="capacidade_atendimentos" type="number" min={1} max={100} step={1} defaultValue={configuration.capacity ?? ""} disabled={pending} placeholder="Sem limite" className={inputClass} /></Field>
      </div>
      <p className="mt-2 text-xs text-[#64736D]">Peso maior aumenta a participacao proporcional. Capacidade vazia significa sem limite configurado.</p>

      <Field label="Cidades — uma por linha" className="mt-5"><textarea name="cidades" rows={4} defaultValue={configuration.cities.join("\n")} disabled={pending} className={inputClass} /></Field>
      <p className="mt-2 text-xs text-[#64736D]">Lista vazia atende todas as cidades. A grafia e preservada, sem correcao automatica.</p>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <CheckboxGroup name="objetivos_imobiliarios" label="Objetivos imobiliarios" options={LEAD_OBJECTIVES} selected={configuration.objectives} disabled={pending} />
        <CheckboxGroup name="canais" label="Canais" options={LEAD_ENTRY_CHANNELS} selected={configuration.channels} disabled={pending} />
      </div>
      <p className="mt-2 text-xs text-[#64736D]">Nenhuma opcao selecionada significa todos os objetivos ou canais.</p>

      <Field label="Observacoes administrativas" className="mt-5"><textarea name="observacoes" rows={3} maxLength={1000} defaultValue={configuration.notes ?? ""} disabled={pending} className={inputClass} /></Field>

      <button type="submit" disabled={pending} className="mt-5 rounded-xl bg-[#071E36] px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60">{pending ? "Salvando..." : "Salvar configuracao"}</button>
      {state.status !== "idle" ? <p role={state.status === "erro" ? "alert" : "status"} className={`mt-4 rounded-xl px-3 py-2 text-sm font-medium ${state.status === "erro" ? "border border-red-100 bg-red-50 text-red-700" : "border border-emerald-100 bg-emerald-50 text-emerald-700"}`}>{state.mensagem}</p> : null}
    </form>
  );
}

const inputClass = "w-full rounded-xl border border-[#E8DDCB] bg-white px-3 py-2.5 text-sm text-[#071E36] outline-none focus:border-[#C89B3C] disabled:opacity-60";

function Checkbox({ name, label, defaultChecked, disabled }: { name: string; label: string; defaultChecked: boolean; disabled: boolean }) {
  return <label className="inline-flex items-center gap-2"><input type="checkbox" name={name} defaultChecked={defaultChecked} disabled={disabled} className="h-4 w-4 accent-[#C89B3C]" />{label}</label>;
}

function Field({ label, className = "", children }: { label: string; className?: string; children: React.ReactNode }) {
  return <label className={`grid gap-1.5 text-sm font-medium text-[#071E36] ${className}`}>{label}{children}</label>;
}

function CheckboxGroup({ name, label, options, selected, disabled }: { name: string; label: string; options: ReadonlyArray<{ id: string; label: string }>; selected: string[]; disabled: boolean }) {
  return <fieldset><legend className="text-sm font-medium text-[#071E36]">{label}</legend><div className="mt-2 grid gap-2 sm:grid-cols-2">{options.map((option) => <label key={option.id} className="flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-xs text-[#64736D]"><input type="checkbox" name={name} value={option.id} defaultChecked={selected.includes(option.id)} disabled={disabled} className="h-4 w-4 accent-[#C89B3C]" />{option.label}</label>)}</div></fieldset>;
}
