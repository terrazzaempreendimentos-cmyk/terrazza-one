"use client";

import { useActionState, useState } from "react";

import {
  ATENDIMENTO_CHANNELS,
  ATENDIMENTO_PRIORITIES,
  getAtendimentoResultLabel,
  type AtendimentoStatus,
} from "../../../../lib/crm/atendimentos/catalogs";
import {
  ATENDIMENTO_CANCELLATION_REASON_MAX_LENGTH,
  ATENDIMENTO_CANCELLATION_REASON_MIN_LENGTH,
  ATENDIMENTO_OPEN_TRANSITIONS,
  ATENDIMENTO_REOPEN_REASON_MAX_LENGTH,
  ATENDIMENTO_REOPEN_REASON_MIN_LENGTH,
  ATENDIMENTO_RESULT_DETAIL_MAX_LENGTH,
  ATENDIMENTO_SUBJECT_MAX_LENGTH,
  ATENDIMENTO_SUMMARY_MAX_LENGTH,
  type AtendimentoOpenManagedStatus,
} from "../../../../lib/crm/atendimentos/rpc-contracts";
import { CANCELLATION_RESULTS, CONCLUSION_RESULTS } from "../../../../lib/crm/atendimentos/transitions";
import {
  assumeAtendimento,
  cancelAtendimento,
  changeAtendimentoState,
  concludeAtendimento,
  createAtendimento,
  reopenAtendimento,
  type AtendimentoActionState,
} from "./actions";

const INITIAL_STATE: AtendimentoActionState = { status: "idle", mensagem: null };

export type EligibleLeadOption = Readonly<{ id: string; nome: string }>;

export function CreateAtendimentoForm({ leads }: { leads: readonly EligibleLeadOption[] }) {
  const [state, formAction, pending] = useActionState(createAtendimento, INITIAL_STATE);

  return (
    <details className="mt-6 rounded-3xl border border-[#E8DDCB] bg-white p-5 shadow-sm">
      <summary className="cursor-pointer font-semibold text-[#071E36]">Criar Atendimento</summary>
      <form action={formAction} className="mt-5 grid gap-4 lg:grid-cols-2">
        <label className="grid gap-1 text-sm text-[#64736D] lg:col-span-2">
          Lead
          <select name="lead_id" required defaultValue="" className="rounded-xl border border-[#E8DDCB] bg-white px-3 py-3 text-[#071E36]">
            <option value="" disabled>Selecione um Lead elegivel</option>
            {leads.map((lead) => <option key={lead.id} value={lead.id}>{lead.nome}</option>)}
          </select>
        </label>
        <label className="grid gap-1 text-sm text-[#64736D]">
          Prioridade
          <select name="prioridade" defaultValue="normal" className="rounded-xl border border-[#E8DDCB] bg-white px-3 py-3 text-[#071E36]">
            {ATENDIMENTO_PRIORITIES.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
          </select>
        </label>
        <label className="grid gap-1 text-sm text-[#64736D]">
          Canal (opcional)
          <select name="canal" defaultValue="" className="rounded-xl border border-[#E8DDCB] bg-white px-3 py-3 text-[#071E36]">
            <option value="">Usar canal compativel do Lead</option>
            {ATENDIMENTO_CHANNELS.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
          </select>
        </label>
        <label className="grid gap-1 text-sm text-[#64736D] lg:col-span-2">
          Assunto
          <input name="assunto" maxLength={ATENDIMENTO_SUBJECT_MAX_LENGTH} className="rounded-xl border border-[#E8DDCB] px-3 py-3 text-[#071E36]" />
        </label>
        <label className="grid gap-1 text-sm text-[#64736D] lg:col-span-2">
          Resumo
          <textarea name="resumo" maxLength={ATENDIMENTO_SUMMARY_MAX_LENGTH} rows={4} className="rounded-xl border border-[#E8DDCB] px-3 py-3 text-[#071E36]" />
        </label>
        <div className="flex flex-wrap items-center gap-3 lg:col-span-2">
          <button type="submit" disabled={pending || leads.length === 0} className="rounded-xl bg-[#071E36] px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60">
            {pending ? "Criando..." : "Criar Atendimento"}
          </button>
          {leads.length === 0 ? <span className="text-sm text-[#64736D]">Nenhum Lead elegivel disponivel.</span> : null}
        </div>
        <ActionError state={state} />
      </form>
    </details>
  );
}

export function AssumeAtendimentoForm({ atendimentoId, leadId, updatedAt }: { atendimentoId: string; leadId: string; updatedAt: string }) {
  const [state, formAction, pending] = useActionState(assumeAtendimento, INITIAL_STATE);
  return (
    <form action={formAction} className="grid gap-2">
      <input type="hidden" name="atendimento_id" value={atendimentoId} />
      <input type="hidden" name="lead_id" value={leadId} />
      <input type="hidden" name="updated_at" value={updatedAt} />
      <button type="submit" disabled={pending} className="rounded-xl bg-[#071E36] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
        {pending ? "Assumindo..." : "Assumir Atendimento"}
      </button>
      <ActionError state={state} />
    </form>
  );
}

export function ChangeAtendimentoStateForm({ atendimentoId, leadId, currentStatus, updatedAt }: { atendimentoId: string; leadId: string; currentStatus: AtendimentoOpenManagedStatus; updatedAt: string }) {
  const [state, formAction, pending] = useActionState(changeAtendimentoState, INITIAL_STATE);
  const destinations = ATENDIMENTO_OPEN_TRANSITIONS[currentStatus];
  return (
    <form action={formAction} className="grid gap-3 rounded-2xl border border-[#E8DDCB] bg-white p-4">
      <input type="hidden" name="atendimento_id" value={atendimentoId} />
      <input type="hidden" name="lead_id" value={leadId} />
      <input type="hidden" name="status_esperado" value={currentStatus} />
      <input type="hidden" name="updated_at" value={updatedAt} />
      <label className="grid gap-1 text-xs text-[#64736D]">
        Novo estado
        <select name="status_destino" className="rounded-lg border border-[#E8DDCB] bg-white px-3 py-2 text-sm text-[#071E36]">
          {destinations.map((status) => <option key={status} value={status}>{statusLabel(status)}</option>)}
        </select>
      </label>
      <label className="grid gap-1 text-xs text-[#64736D]">
        Resumo opcional
        <textarea name="resumo" maxLength={ATENDIMENTO_SUMMARY_MAX_LENGTH} rows={2} className="rounded-lg border border-[#E8DDCB] px-3 py-2 text-sm text-[#071E36]" />
      </label>
      <label className="grid gap-1 text-xs text-[#64736D]">
        Proxima acao (opcional)
        <input type="datetime-local" name="proxima_acao_em" className="rounded-lg border border-[#E8DDCB] px-3 py-2 text-sm text-[#071E36]" />
      </label>
      <button type="submit" disabled={pending} className="rounded-xl bg-[#071E36] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
        {pending ? "Atualizando..." : "Atualizar estado"}
      </button>
      <ActionError state={state} />
    </form>
  );
}

export function FinalAtendimentoControls({
  atendimentoId,
  leadId,
  responsavelId,
  currentStatus,
  updatedAt,
  canConclude,
  canCancel,
  canReopen,
}: {
  atendimentoId: string;
  leadId: string;
  responsavelId: string | null;
  currentStatus: AtendimentoStatus;
  updatedAt: string;
  canConclude: boolean;
  canCancel: boolean;
  canReopen: boolean;
}) {
  const [active, setActive] = useState<"conclude" | "cancel" | "reopen" | null>(null);
  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap gap-2">
        {canConclude ? <ToggleButton active={active === "conclude"} onClick={() => setActive(active === "conclude" ? null : "conclude")} kind="success">Concluir</ToggleButton> : null}
        {canCancel ? <ToggleButton active={active === "cancel"} onClick={() => setActive(active === "cancel" ? null : "cancel")} kind="danger">Cancelar</ToggleButton> : null}
        {canReopen ? <ToggleButton active={active === "reopen"} onClick={() => setActive(active === "reopen" ? null : "reopen")} kind="neutral">Reabrir</ToggleButton> : null}
      </div>
      {active === "conclude" ? <ConcludeForm atendimentoId={atendimentoId} leadId={leadId} responsavelId={responsavelId} currentStatus={currentStatus} updatedAt={updatedAt} /> : null}
      {active === "cancel" ? <CancelForm atendimentoId={atendimentoId} leadId={leadId} responsavelId={responsavelId} currentStatus={currentStatus} updatedAt={updatedAt} /> : null}
      {active === "reopen" ? <ReopenForm atendimentoId={atendimentoId} leadId={leadId} updatedAt={updatedAt} /> : null}
    </div>
  );
}

function ConcludeForm({ atendimentoId, leadId, responsavelId, currentStatus, updatedAt }: { atendimentoId: string; leadId: string; responsavelId: string | null; currentStatus: AtendimentoStatus; updatedAt: string }) {
  const [state, formAction, pending] = useActionState(concludeAtendimento, INITIAL_STATE);
  return (
    <form action={formAction} className="grid gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4">
      <PhotographFields atendimentoId={atendimentoId} leadId={leadId} responsavelId={responsavelId} currentStatus={currentStatus} updatedAt={updatedAt} />
      <fieldset disabled={pending} className="grid gap-3 disabled:opacity-60">
        <label className="grid gap-1 text-xs text-[#64736D]">Resultado
          <select name="resultado" required defaultValue="" className="rounded-lg border border-emerald-200 bg-white px-3 py-2 text-sm text-[#071E36]"><option value="" disabled>Selecione</option>{CONCLUSION_RESULTS.map((result) => <option key={result} value={result}>{getAtendimentoResultLabel(result)}</option>)}</select>
        </label>
        <label className="grid gap-1 text-xs text-[#64736D]">Detalhe opcional
          <textarea name="resultado_detalhe" maxLength={ATENDIMENTO_RESULT_DETAIL_MAX_LENGTH} rows={2} className="rounded-lg border border-emerald-200 bg-white px-3 py-2 text-sm text-[#071E36]" />
        </label>
        <label className="grid gap-1 text-xs text-[#64736D]">Atualizacao opcional do resumo
          <textarea name="resumo" maxLength={ATENDIMENTO_SUMMARY_MAX_LENGTH} rows={3} className="rounded-lg border border-emerald-200 bg-white px-3 py-2 text-sm text-[#071E36]" />
        </label>
        <button type="submit" className="rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{pending ? "Concluindo..." : "Confirmar conclusao"}</button>
      </fieldset>
      <ActionMessage state={state} />
    </form>
  );
}

function CancelForm({ atendimentoId, leadId, responsavelId, currentStatus, updatedAt }: { atendimentoId: string; leadId: string; responsavelId: string | null; currentStatus: AtendimentoStatus; updatedAt: string }) {
  const [state, formAction, pending] = useActionState(cancelAtendimento, INITIAL_STATE);
  return (
    <form action={formAction} className="grid gap-3 rounded-2xl border border-red-200 bg-red-50/50 p-4">
      <PhotographFields atendimentoId={atendimentoId} leadId={leadId} responsavelId={responsavelId} currentStatus={currentStatus} updatedAt={updatedAt} />
      <fieldset disabled={pending} className="grid gap-3 disabled:opacity-60">
        <label className="grid gap-1 text-xs text-[#64736D]">Resultado
          <select name="resultado" required defaultValue="" className="rounded-lg border border-red-200 bg-white px-3 py-2 text-sm text-[#071E36]"><option value="" disabled>Selecione</option>{CANCELLATION_RESULTS.map((result) => <option key={result} value={result}>{getAtendimentoResultLabel(result)}</option>)}</select>
        </label>
        <label className="grid gap-1 text-xs text-[#64736D]">Motivo
          <textarea name="motivo" required minLength={ATENDIMENTO_CANCELLATION_REASON_MIN_LENGTH} maxLength={ATENDIMENTO_CANCELLATION_REASON_MAX_LENGTH} rows={3} className="rounded-lg border border-red-200 bg-white px-3 py-2 text-sm text-[#071E36]" />
        </label>
        <label className="grid gap-1 text-xs text-[#64736D]">Detalhe opcional
          <textarea name="resultado_detalhe" maxLength={ATENDIMENTO_RESULT_DETAIL_MAX_LENGTH} rows={2} className="rounded-lg border border-red-200 bg-white px-3 py-2 text-sm text-[#071E36]" />
        </label>
        <button type="submit" className="rounded-xl bg-red-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{pending ? "Cancelando..." : "Confirmar cancelamento"}</button>
      </fieldset>
      <ActionMessage state={state} />
    </form>
  );
}

function ReopenForm({ atendimentoId, leadId, updatedAt }: { atendimentoId: string; leadId: string; updatedAt: string }) {
  const [state, formAction, pending] = useActionState(reopenAtendimento, INITIAL_STATE);
  return (
    <form action={formAction} className="grid gap-3 rounded-2xl border border-[#E8DDCB] bg-[#F7F3ED] p-4">
      <PhotographFields atendimentoId={atendimentoId} leadId={leadId} responsavelId={null} currentStatus={null} updatedAt={updatedAt} />
      <p className="text-sm font-medium text-[#071E36]">Sera criado um novo Atendimento. O registro anterior permanecera encerrado no historico.</p>
      <fieldset disabled={pending} className="grid gap-3 disabled:opacity-60">
        <label className="grid gap-1 text-xs text-[#64736D]">Motivo
          <textarea name="motivo" required minLength={ATENDIMENTO_REOPEN_REASON_MIN_LENGTH} maxLength={ATENDIMENTO_REOPEN_REASON_MAX_LENGTH} rows={3} className="rounded-lg border border-[#E8DDCB] bg-white px-3 py-2 text-sm text-[#071E36]" />
        </label>
        <label className="grid gap-1 text-xs text-[#64736D]">Prioridade opcional
          <select name="prioridade" defaultValue="" className="rounded-lg border border-[#E8DDCB] bg-white px-3 py-2 text-sm text-[#071E36]"><option value="">Preservar prioridade anterior</option>{ATENDIMENTO_PRIORITIES.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select>
        </label>
        <label className="grid gap-1 text-xs text-[#64736D]">Assunto opcional
          <input name="assunto" maxLength={ATENDIMENTO_SUBJECT_MAX_LENGTH} className="rounded-lg border border-[#E8DDCB] bg-white px-3 py-2 text-sm text-[#071E36]" />
        </label>
        <label className="grid gap-1 text-xs text-[#64736D]">Novo resumo opcional
          <textarea name="resumo" maxLength={ATENDIMENTO_SUMMARY_MAX_LENGTH} rows={3} className="rounded-lg border border-[#E8DDCB] bg-white px-3 py-2 text-sm text-[#071E36]" />
        </label>
        <button type="submit" className="rounded-xl bg-[#071E36] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{pending ? "Reabrindo..." : "Criar novo Atendimento"}</button>
      </fieldset>
      <ActionMessage state={state} />
    </form>
  );
}

function PhotographFields({ atendimentoId, leadId, responsavelId, currentStatus, updatedAt }: { atendimentoId: string; leadId: string; responsavelId: string | null; currentStatus: AtendimentoStatus | null; updatedAt: string }) {
  return <><input type="hidden" name="atendimento_id" value={atendimentoId} /><input type="hidden" name="lead_id" value={leadId} /><input type="hidden" name="responsavel_id" value={responsavelId ?? ""} />{currentStatus ? <input type="hidden" name="status_esperado" value={currentStatus} /> : null}<input type="hidden" name="updated_at" value={updatedAt} /></>;
}

function ToggleButton({ active, onClick, kind, children }: { active: boolean; onClick: () => void; kind: "success" | "danger" | "neutral"; children: string }) {
  const style = kind === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : kind === "danger" ? "border-red-200 bg-red-50 text-red-700" : "border-[#E8DDCB] bg-white text-[#071E36]";
  return <button type="button" aria-expanded={active} onClick={onClick} className={`rounded-xl border px-4 py-2 text-sm font-semibold ${style}`}>{children}</button>;
}

function ActionError({ state }: { state: AtendimentoActionState }) {
  return state.status === "erro"
    ? <p role="alert" className="rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{state.mensagem}</p>
    : null;
}

function ActionMessage({ state }: { state: AtendimentoActionState }) {
  if (state.status === "idle") return null;
  return <p role={state.status === "erro" ? "alert" : "status"} className={`rounded-xl border px-3 py-2 text-sm font-medium ${state.status === "erro" ? "border-red-100 bg-red-50 text-red-700" : "border-emerald-100 bg-emerald-50 text-emerald-700"}`}>{state.mensagem}</p>;
}

function statusLabel(status: AtendimentoOpenManagedStatus) {
  const labels: Record<AtendimentoOpenManagedStatus, string> = {
    em_atendimento: "Em atendimento",
    aguardando_cliente: "Aguardando cliente",
    aguardando_interno: "Aguardando interno",
  };
  return labels[status];
}
