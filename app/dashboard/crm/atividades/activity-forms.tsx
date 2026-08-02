"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ACTIVITY_ORIGINS, ACTIVITY_PRIORITIES, ACTIVITY_TYPES } from "../../../../lib/crm/atividades/catalogs";
import { OPEN_ACTIVITY_TRANSITIONS } from "../../../../lib/crm/atividades/rpc-contracts";
import type { ActivityOptions, ActivityView } from "../../../../lib/crm/atividades/view-model";
import { cancelActivity, changeActivityState, concludeActivity, reopenActivity, saveActivity, type ActivityActionState } from "./actions";

const INITIAL: ActivityActionState = { status: "idle", mensagem: null };

function localDate(value: string | null) {
  if (!value) return "";
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Recife", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date(value));
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}

export function ActivityForm({ options, activity }: { options: ActivityOptions; activity?: ActivityView | null }) {
  const [state, action, pending] = useActionState(saveActivity, INITIAL);
  const router = useRouter(); const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.status !== "sucesso") return;
    if (activity) router.replace("/dashboard/crm/atividades"); else formRef.current?.reset();
  }, [state.status, activity, router]);
  return (
    <form ref={formRef} action={action} className="grid gap-4 rounded-3xl border border-[#E8DDCB] bg-white p-5 shadow-sm lg:grid-cols-2">
      {activity ? <><input type="hidden" name="atividade_id" value={activity.id} /><input type="hidden" name="updated_at" value={activity.updated_at} /></> : null}
      <h2 className="text-xl font-bold text-[#071E36] lg:col-span-2">{activity ? "Editar Atividade" : "Nova Atividade"}</h2>
      <fieldset disabled={pending} className="contents disabled:opacity-60">
        <Field label="Titulo"><input name="titulo" required maxLength={160} defaultValue={activity?.titulo ?? ""} className={inputClass} /></Field>
        <Field label="Tipo"><select name="tipo" defaultValue={activity?.tipo ?? "tarefa_interna"} className={inputClass}>{ACTIVITY_TYPES.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}</select></Field>
        <Field label="Prioridade"><select name="prioridade" defaultValue={activity?.prioridade ?? "normal"} className={inputClass}>{ACTIVITY_PRIORITIES.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}</select></Field>
        <Field label="Origem"><select name="origem" defaultValue={activity?.origem ?? "manual"} className={inputClass}>{ACTIVITY_ORIGINS.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}</select></Field>
        <Field label="Inicio (America/Recife)"><input type="datetime-local" name="inicio_planejado_em" defaultValue={localDate(activity?.inicio_planejado_em ?? null)} className={inputClass} /></Field>
        <Field label="Fim (America/Recife)"><input type="datetime-local" name="fim_planejado_em" defaultValue={localDate(activity?.fim_planejado_em ?? null)} className={inputClass} /></Field>
        <Relation name="lead_id" label="Lead" options={options.leads} value={activity?.lead_id} />
        <Relation name="atendimento_id" label="Atendimento" options={options.atendimentos} value={activity?.atendimento_id} />
        <Relation name="negocio_id" label="Negocio" options={options.negocios} value={activity?.negocio_id} />
        <Relation name="imovel_id" label="Imovel" options={options.imoveis} value={activity?.imovel_id} />
        <Relation name="pessoa_id" label="Pessoa" options={options.pessoas} value={activity?.pessoa_id} />
        <Relation name="responsavel_id" label="Responsavel" options={options.pessoas} value={activity?.responsavel_id} />
        <Field label="Local"><input name="local" maxLength={300} defaultValue={activity?.local ?? ""} className={inputClass} /></Field>
        <Field label="Link de reuniao"><input type="url" name="link_reuniao" maxLength={2048} defaultValue={activity?.link_reuniao ?? ""} className={inputClass} /></Field>
        <label className="flex items-center gap-2 text-sm text-[#64736D]"><input type="checkbox" name="dia_inteiro" defaultChecked={activity?.dia_inteiro} /> Dia inteiro</label>
        <Field label="Descricao" wide><textarea name="descricao" rows={3} maxLength={2000} defaultValue={activity?.descricao ?? ""} className={inputClass} /></Field>
        <Field label="Observacoes internas" wide><textarea name="observacoes_internas" rows={3} maxLength={4000} defaultValue={activity?.observacoes_internas ?? ""} className={inputClass} /></Field>
        <div className="flex gap-3 lg:col-span-2"><button className="rounded-xl bg-[#071E36] px-5 py-3 text-sm font-semibold text-white">{pending ? "Salvando..." : "Salvar Atividade"}</button>{activity ? <button type="button" onClick={() => router.replace("/dashboard/crm/atividades")} className="rounded-xl border border-[#E8DDCB] px-5 py-3 text-sm font-semibold">Cancelar</button> : null}</div>
      </fieldset>
      <Message state={state} />
    </form>
  );
}

export function ActivityStateForm({ activity }: { activity: ActivityView }) {
  const [state, action, pending] = useActionState(changeActivityState, INITIAL);
  const destinations = activity.status === "pendente" ? ["em_andamento", ...OPEN_ACTIVITY_TRANSITIONS.pendente] : OPEN_ACTIVITY_TRANSITIONS[activity.status];
  if (destinations.length === 0) return <p className="text-xs text-[#64736D]">Estado final: somente leitura.</p>;
  return <form action={action} className="grid gap-2">
    <input type="hidden" name="atividade_id" value={activity.id} /><input type="hidden" name="updated_at" value={activity.updated_at} /><input type="hidden" name="status_atual" value={activity.status} />
    <input type="hidden" name="lead_id" value={activity.lead_id ?? ""} /><input type="hidden" name="atendimento_id" value={activity.atendimento_id ?? ""} /><input type="hidden" name="negocio_id" value={activity.negocio_id ?? ""} />
    <fieldset disabled={pending} className="grid gap-2 disabled:opacity-60"><select name="status_destino" className={inputClass}>{destinations.map((status) => <option key={status} value={status}>{status.replaceAll("_", " ")}</option>)}</select><input name="observacao" maxLength={500} placeholder="Observacao opcional" className={inputClass} /><button className="rounded-xl bg-[#071E36] px-4 py-2 text-sm font-semibold text-white">{pending ? "Atualizando..." : "Atualizar estado"}</button></fieldset><Message state={state} />
  </form>;
}

export function ActivityFinalActions({ activity }: { activity: ActivityView }) {
  const [concludeState, conclude, concluding] = useActionState(concludeActivity, INITIAL);
  const [cancelState, cancel, cancelling] = useActionState(cancelActivity, INITIAL);
  const [reopenState, reopen, reopening] = useActionState(reopenActivity, INITIAL);
  const [open, setOpen] = useState<"conclude" | "cancel" | "reopen" | null>(null);
  const isOpen = activity.status === "pendente" || activity.status === "em_andamento" || activity.status === "aguardando";
  const isFinal = activity.status === "concluida" || activity.status === "cancelada";
  return <div className="grid gap-2">
    {isOpen ? <div className="flex flex-wrap gap-2"><button type="button" onClick={() => setOpen(open === "conclude" ? null : "conclude")} className="rounded-xl bg-emerald-700 px-3 py-2 text-xs font-semibold text-white">Concluir</button><button type="button" onClick={() => setOpen(open === "cancel" ? null : "cancel")} className="rounded-xl bg-red-700 px-3 py-2 text-xs font-semibold text-white">Cancelar</button></div> : null}
    {isFinal ? <button type="button" onClick={() => setOpen(open === "reopen" ? null : "reopen")} className="rounded-xl border border-[#8B6827] px-3 py-2 text-xs font-semibold text-[#071E36]">Reabrir</button> : null}
    {open === "conclude" ? <form action={conclude} className="grid gap-2 rounded-xl bg-emerald-50 p-3"><input type="hidden" name="atividade_id" value={activity.id} /><input type="hidden" name="status_esperado" value={activity.status} /><input type="hidden" name="updated_at_esperado" value={activity.updated_at} /><textarea name="resultado" maxLength={1000} placeholder="Resultado opcional" className={inputClass} /><textarea name="observacao" maxLength={500} placeholder="Observacao opcional" className={inputClass} /><fieldset disabled={concluding}><button className="rounded-xl bg-emerald-700 px-3 py-2 text-xs font-semibold text-white">{concluding ? "Concluindo..." : "Confirmar conclusao"}</button></fieldset><Message state={concludeState} /></form> : null}
    {open === "cancel" ? <form action={cancel} className="grid gap-2 rounded-xl bg-red-50 p-3"><input type="hidden" name="atividade_id" value={activity.id} /><input type="hidden" name="status_esperado" value={activity.status} /><input type="hidden" name="updated_at_esperado" value={activity.updated_at} /><textarea name="motivo" required minLength={3} maxLength={1000} placeholder="Motivo obrigatorio" className={inputClass} /><textarea name="resultado" maxLength={1000} placeholder="Resultado opcional" className={inputClass} /><textarea name="observacao" maxLength={500} placeholder="Observacao opcional" className={inputClass} /><fieldset disabled={cancelling}><button className="rounded-xl bg-red-700 px-3 py-2 text-xs font-semibold text-white">{cancelling ? "Cancelando..." : "Confirmar cancelamento"}</button></fieldset><Message state={cancelState} /></form> : null}
    {open === "reopen" ? <form action={reopen} className="grid gap-2 rounded-xl bg-amber-50 p-3"><input type="hidden" name="atividade_id" value={activity.id} /><input type="hidden" name="updated_at_esperado" value={activity.updated_at} /><textarea name="motivo" required minLength={3} maxLength={500} placeholder="Motivo da reabertura" className={inputClass} /><input name="titulo" maxLength={160} placeholder="Novo titulo (opcional)" className={inputClass} /><input type="datetime-local" name="inicio_planejado_em" className={inputClass} /><input type="datetime-local" name="fim_planejado_em" className={inputClass} /><fieldset disabled={reopening}><button className="rounded-xl bg-[#8B6827] px-3 py-2 text-xs font-semibold text-white">{reopening ? "Reabrindo..." : "Confirmar reabertura"}</button></fieldset><Message state={reopenState} /></form> : null}
  </div>;
}

function Relation({ name, label, options, value }: { name: string; label: string; options: readonly { id: string; label: string }[]; value?: string | null }) { return <Field label={label}><select name={name} defaultValue={value ?? ""} className={inputClass}><option value="">Nao vincular</option>{options.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></Field>; }
function Field({ label, wide, children }: { label: string; wide?: boolean; children: React.ReactNode }) { return <label className={`grid gap-1 text-sm text-[#64736D] ${wide ? "lg:col-span-2" : ""}`}>{label}{children}</label>; }
function Message({ state }: { state: ActivityActionState }) { return state.mensagem ? <p role="alert" className={`text-sm font-medium lg:col-span-2 ${state.status === "erro" ? "text-red-700" : "text-emerald-700"}`}>{state.mensagem}</p> : null; }
const inputClass = "rounded-xl border border-[#E8DDCB] bg-white px-3 py-2.5 text-sm text-[#071E36]";
