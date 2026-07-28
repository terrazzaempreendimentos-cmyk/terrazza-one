"use client";

import { useActionState, type ReactNode } from "react";

import type { LeadFunnelStage } from "../../../../lib/crm/leads/catalogs";
import { moveLead, type KanbanMoveState } from "./actions";

type StageOption = { id: LeadFunnelStage; label: string };
const initialState: KanbanMoveState = { status: "idle", mensagem: null };

export function QuickMove({
  leadId,
  destination,
  label,
}: {
  leadId: string;
  destination: LeadFunnelStage;
  label: string;
}) {
  return (
    <MoveForm leadId={leadId} destination={destination}>
      {({ pending }) => (
        <button type="submit" disabled={pending} className="rounded-lg border border-[#E8DDCB] bg-white px-3 py-2 text-xs font-semibold text-[#071E36] disabled:opacity-60">
          {pending ? "Movendo..." : label}
        </button>
      )}
    </MoveForm>
  );
}

export function MarkLost({ leadId }: { leadId: string }) {
  return (
    <MoveForm leadId={leadId} destination="perdido">
      {({ pending }) => (
        <>
          <label className="grid gap-1 text-xs text-[#64736D]">
            Motivo da perda (opcional)
            <textarea name="motivo" maxLength={500} rows={2} className="rounded-lg border border-[#E8DDCB] px-3 py-2 text-sm text-[#071E36]" />
          </label>
          <button type="submit" disabled={pending} className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 disabled:opacity-60">
            {pending ? "Movendo..." : "Marcar como perdido"}
          </button>
        </>
      )}
    </MoveForm>
  );
}

export function ReopenLost({
  leadId,
  stages,
}: {
  leadId: string;
  stages: StageOption[];
}) {
  const [state, formAction, pending] = useActionState(moveLead, initialState);

  return (
    <form action={formAction} className="grid gap-2 border-t border-[#E8DDCB] pt-3">
      <input type="hidden" name="lead_id" value={leadId} />
      <label className="grid gap-1 text-xs text-[#64736D]">
        Etapa de reabertura
        <select name="etapa_destino" className="rounded-lg border border-[#E8DDCB] bg-white px-3 py-2 text-sm text-[#071E36]">
          {stages.map((stage) => <option key={stage.id} value={stage.id}>{stage.label}</option>)}
        </select>
      </label>
      <label className="grid gap-1 text-xs text-[#64736D]">
        Motivo (opcional)
        <textarea name="motivo" maxLength={500} rows={2} className="rounded-lg border border-[#E8DDCB] px-3 py-2 text-sm text-[#071E36]" />
      </label>
      <button type="submit" disabled={pending} className="rounded-lg bg-[#071E36] px-3 py-2 text-xs font-semibold text-white disabled:opacity-60">
        {pending ? "Movendo..." : "Reabrir Lead"}
      </button>
      {state.status === "erro" ? <ErrorMessage message={state.mensagem} /> : null}
    </form>
  );
}

function MoveForm({
  leadId,
  destination,
  children,
}: {
  leadId: string;
  destination: LeadFunnelStage;
  children: (state: { pending: boolean }) => ReactNode;
}) {
  const [state, formAction, pending] = useActionState(moveLead, initialState);

  return (
    <form action={formAction} className="grid gap-2">
      <input type="hidden" name="lead_id" value={leadId} />
      <input type="hidden" name="etapa_destino" value={destination} />
      {children({ pending })}
      {state.status === "erro" ? <ErrorMessage message={state.mensagem} /> : null}
    </form>
  );
}

function ErrorMessage({ message }: { message: string }) {
  return <p role="alert" className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">{message}</p>;
}
