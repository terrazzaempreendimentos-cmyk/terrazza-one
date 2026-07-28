"use client";

import { useActionState } from "react";
import { distributeLead, type DistributionState } from "./actions";

const INITIAL_STATE: DistributionState = { status: "idle", mensagem: null };

export function DistributionForm({ leadId, disabled }: { leadId: string; disabled: boolean }) {
  const [state, formAction, pending] = useActionState(distributeLead, INITIAL_STATE);
  return (
    <form action={formAction} className="grid gap-3 rounded-2xl border border-[#E8DDCB] bg-white p-4">
      <input type="hidden" name="lead_id" value={leadId} />
      <label className="grid gap-1.5 text-xs font-medium text-[#64736D]">Motivo (opcional)<textarea name="motivo" maxLength={500} rows={2} disabled={pending || disabled} className="rounded-xl border border-[#E8DDCB] px-3 py-2 text-sm text-[#071E36] outline-none focus:border-[#C89B3C] disabled:opacity-60" /></label>
      <button type="submit" disabled={pending || disabled} className="rounded-xl bg-[#071E36] px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60">{pending ? "Distribuindo..." : "Distribuir"}</button>
      {disabled ? <p className="text-xs text-amber-700">Nao ha Pessoa-corretora elegivel disponivel.</p> : null}
      {state.status !== "idle" ? <p role={state.status === "erro" ? "alert" : "status"} className={`rounded-lg px-3 py-2 text-xs font-medium ${state.status === "erro" ? "border border-red-100 bg-red-50 text-red-700" : "border border-emerald-100 bg-emerald-50 text-emerald-700"}`}>{state.mensagem}</p> : null}
    </form>
  );
}
