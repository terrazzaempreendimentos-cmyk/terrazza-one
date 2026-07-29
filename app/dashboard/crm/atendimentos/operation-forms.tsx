"use client";

import { useActionState } from "react";

import {
  ATENDIMENTO_CHANNELS,
  ATENDIMENTO_PRIORITIES,
} from "../../../../lib/crm/atendimentos/catalogs";
import {
  ATENDIMENTO_OPEN_TRANSITIONS,
  ATENDIMENTO_SUBJECT_MAX_LENGTH,
  ATENDIMENTO_SUMMARY_MAX_LENGTH,
  type AtendimentoOpenManagedStatus,
} from "../../../../lib/crm/atendimentos/rpc-contracts";
import {
  assumeAtendimento,
  changeAtendimentoState,
  createAtendimento,
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

function ActionError({ state }: { state: AtendimentoActionState }) {
  return state.status === "erro"
    ? <p role="alert" className="rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{state.mensagem}</p>
    : null;
}

function statusLabel(status: AtendimentoOpenManagedStatus) {
  const labels: Record<AtendimentoOpenManagedStatus, string> = {
    em_atendimento: "Em atendimento",
    aguardando_cliente: "Aguardando cliente",
    aguardando_interno: "Aguardando interno",
  };
  return labels[status];
}
