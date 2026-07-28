"use client";

import { useActionState, useState } from "react";

import { REASSIGNMENT_REASON_MAX_LENGTH, REASSIGNMENT_REASON_MIN_LENGTH } from "../../../../lib/crm/roleta/reatribuicao";
import { transferLeadAssignment, type ReassignmentState } from "./reassignment-actions";

export type TransferPersonOption = Readonly<{ id: string; nome: string }>;

const INITIAL_STATE: ReassignmentState = { status: "idle", mensagem: null };

export function TransferAssignmentForm({ leadId, currentResponsibleId, currentResponsibleName, people, disabledMessage }: { leadId: string; currentResponsibleId: string; currentResponsibleName: string; people: readonly TransferPersonOption[]; disabledMessage?: string | null }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [state, formAction, pending] = useActionState(transferLeadAssignment, INITIAL_STATE);
  const options = people.filter((person) => person.id !== currentResponsibleId && person.nome.trim());

  if (!open) {
    return <div><button type="button" onClick={() => setOpen(true)} disabled={Boolean(disabledMessage) || options.length === 0} className="rounded-xl border border-[#C89B3C]/40 bg-[#C89B3C]/10 px-4 py-2.5 text-sm font-semibold text-[#8B6827] disabled:cursor-not-allowed disabled:opacity-50">Transferir atendimento</button>{disabledMessage ? <p className="mt-2 text-xs text-red-700">{disabledMessage}</p> : options.length === 0 ? <p className="mt-2 text-xs text-[#64736D]">Nenhuma outra Pessoa-corretora disponivel.</p> : null}</div>;
  }

  return (
    <form action={formAction} className="grid gap-3 rounded-2xl border border-[#E8DDCB] bg-white p-4">
      <input type="hidden" name="lead_id" value={leadId} />
      <input type="hidden" name="responsavel_esperado_id" value={currentResponsibleId} />
      <div><h3 className="font-semibold text-[#071E36]">Transferir atendimento</h3><p className="mt-1 text-xs text-[#64736D]">Responsavel atual: {currentResponsibleName}</p></div>
      <label className="grid gap-1.5 text-sm font-medium text-[#071E36]">Novo responsavel<select name="novo_corretor_pessoa_id" required defaultValue="" disabled={pending} className="rounded-xl border border-[#E8DDCB] bg-white px-3 py-2.5 text-sm"><option value="">Selecionar Pessoa-corretora</option>{options.map((person) => <option key={person.id} value={person.id}>{person.nome}</option>)}</select></label>
      <label className="grid gap-1.5 text-sm font-medium text-[#071E36]">Motivo da transferencia<textarea name="motivo" required minLength={REASSIGNMENT_REASON_MIN_LENGTH} maxLength={REASSIGNMENT_REASON_MAX_LENGTH} rows={3} value={reason} onChange={(event) => setReason(event.target.value)} disabled={pending} className="rounded-xl border border-[#E8DDCB] px-3 py-2.5 text-sm" /><span className="text-right text-xs text-[#64736D]">{reason.length}/{REASSIGNMENT_REASON_MAX_LENGTH}</span></label>
      <p className="text-xs text-[#64736D]">A transferencia ficara registrada no historico operacional e na Timeline.</p>
      <div className="flex flex-wrap gap-2"><button type="submit" disabled={pending} className="rounded-xl bg-[#071E36] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60">{pending ? "Transferindo..." : "Transferir atendimento"}</button><button type="button" onClick={() => setOpen(false)} disabled={pending} className="rounded-xl border border-[#E8DDCB] px-4 py-2.5 text-sm font-semibold text-[#071E36]">Cancelar</button></div>
      {state.status !== "idle" ? <p role={state.status === "erro" ? "alert" : "status"} className={`rounded-xl px-3 py-2 text-sm font-medium ${state.status === "erro" ? "border border-red-100 bg-red-50 text-red-700" : "border border-emerald-100 bg-emerald-50 text-emerald-700"}`}>{state.mensagem}</p> : null}
    </form>
  );
}
