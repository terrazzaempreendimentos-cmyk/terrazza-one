"use client";

import { useActionState, useState } from "react";

import {
  NEGOCIO_CANCELLATION_RESULTS,
  NEGOCIO_CONCLUSION_RESULTS,
  NEGOCIO_LOSS_RESULTS,
  type NegocioPartRole,
  type NegocioStatus,
  type NegocioType,
} from "../../../../lib/crm/negocios/catalogs";
import { hasMinimumClosingParts, NEGOCIO_RPC_LIMITS } from "../../../../lib/crm/negocios/rpc-contracts";
import {
  arquivarNegocio,
  cancelarNegocio,
  concluirNegocio,
  perderNegocio,
  reabrirNegocio,
  type NegocioActionState,
} from "./actions";

const INITIAL_STATE: NegocioActionState = { status: "idle", mensagem: null };
const INPUT = "rounded-xl border border-[#E8DDCB] bg-white px-3 py-2 text-sm text-[#071E36] outline-none focus:border-[#C89B3C]";

type Operation = "conclude" | "lose" | "cancel" | "reopen" | "archive";
type Props = Readonly<{
  negocioId: string;
  leadId: string;
  updatedAt: string;
  tipo: NegocioType;
  status: NegocioStatus;
  valorFechado: number | null;
  comissaoEfetiva: number | null;
  partes: readonly NegocioPartRole[];
  hasSuccessor: boolean;
  permissions: Readonly<{ conclude: boolean; lose: boolean; cancel: boolean; reopen: boolean; archive: boolean }>;
}>;

export function FinalOperationControls(props: Props) {
  const [operation, setOperation] = useState<Operation | null>(null);
  const active = props.status === "ativo";
  const final = props.status === "concluido" || props.status === "perdido" || props.status === "cancelado";
  const choices: Array<Readonly<{ id: Operation; label: string; className: string }>> = [];
  if (active && props.permissions.conclude) choices.push({ id: "conclude", label: "Concluir", className: "bg-emerald-700 text-white" });
  if (active && props.permissions.lose) choices.push({ id: "lose", label: "Registrar perda", className: "bg-amber-100 text-amber-900" });
  if (active && props.permissions.cancel) choices.push({ id: "cancel", label: "Cancelar", className: "bg-red-700 text-white" });
  if (final && !props.hasSuccessor && props.permissions.reopen) choices.push({ id: "reopen", label: "Reabrir", className: "bg-[#071E36] text-white" });
  if (final && props.permissions.archive) choices.push({ id: "archive", label: "Arquivar", className: "border border-red-200 bg-white text-red-700" });
  if (!choices.length) return null;

  return <section className="mt-4 border-t border-[#E8DDCB] pt-4">
    <div className="flex flex-wrap gap-2">{choices.map((choice) => <button key={choice.id} type="button" aria-expanded={operation === choice.id} onClick={() => setOperation((current) => current === choice.id ? null : choice.id)} className={`rounded-full px-3 py-1.5 text-xs font-semibold ${choice.className}`}>{choice.label}</button>)}</div>
    {operation === "conclude" ? <ConclusionForm {...props} /> : null}
    {operation === "lose" ? <LossForm {...props} /> : null}
    {operation === "cancel" ? <CancellationForm {...props} /> : null}
    {operation === "reopen" ? <ReopenForm {...props} /> : null}
    {operation === "archive" ? <ArchiveForm {...props} /> : null}
  </section>;
}

function ConclusionForm(props: Props) {
  const [state, action, pending] = useActionState(concluirNegocio, INITIAL_STATE);
  const results = NEGOCIO_CONCLUSION_RESULTS.filter((item) => resultMatchesType(item.id, props.tipo));
  const hasParts = hasMinimumClosingParts(props.tipo, props.partes);
  const requiresValue = props.tipo === "venda" || props.tipo === "locacao";
  return <OperationForm action={action} pending={pending} submitLabel="Concluir Negocio" pendingLabel="Concluindo..." state={state} tone="emerald">
    <HiddenFields {...props} />
    {!hasParts ? <p role="alert" className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">Revise as partes obrigatorias antes de concluir este Negocio.</p> : null}
    <Field label="Resultado"><select name="resultado" required defaultValue="" className={INPUT}><option value="" disabled>Selecione</option>{results.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></Field>
    <div className="grid gap-3 sm:grid-cols-2"><Field label="Valor fechado"><input type="number" name="valor_fechado" min="0" step="0.01" required={requiresValue} defaultValue={props.valorFechado ?? ""} className={INPUT} /></Field><Field label="Comissao efetiva"><input type="number" name="comissao_efetiva" min="0" step="0.01" defaultValue={props.comissaoEfetiva ?? ""} className={INPUT} /></Field></div>
    <Field label="Observacao opcional"><textarea name="observacao" maxLength={NEGOCIO_RPC_LIMITS.observacaoMovimentacao} rows={2} className={INPUT} /></Field>
  </OperationForm>;
}

function LossForm(props: Props) {
  const [state, action, pending] = useActionState(perderNegocio, INITIAL_STATE);
  return <OperationForm action={action} pending={pending} submitLabel="Registrar perda" pendingLabel="Registrando perda..." state={state} tone="amber"><HiddenFields {...props} /><Field label="Resultado da perda"><select name="resultado" required defaultValue="" className={INPUT}><option value="" disabled>Selecione</option>{NEGOCIO_LOSS_RESULTS.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></Field><ReasonFields max={NEGOCIO_RPC_LIMITS.motivoEncerramento} /></OperationForm>;
}

function CancellationForm(props: Props) {
  const [state, action, pending] = useActionState(cancelarNegocio, INITIAL_STATE);
  return <OperationForm action={action} pending={pending} submitLabel="Cancelar Negocio" pendingLabel="Cancelando..." state={state} tone="red"><HiddenFields {...props} /><Field label="Resultado do cancelamento"><select name="resultado" required defaultValue="" className={INPUT}><option value="" disabled>Selecione</option>{NEGOCIO_CANCELLATION_RESULTS.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></Field><ReasonFields max={NEGOCIO_RPC_LIMITS.motivoEncerramento} /></OperationForm>;
}

function ReopenForm(props: Props) {
  const [state, action, pending] = useActionState(reabrirNegocio, INITIAL_STATE);
  return <OperationForm action={action} pending={pending} submitLabel="Criar novo ciclo" pendingLabel="Reabrindo..." state={state} tone="navy"><HiddenFields {...props} /><p className="rounded-xl bg-[#F7F3ED] p-3 text-sm text-[#64736D]">Sera criado um novo Negocio. O registro anterior permanecera preservado.</p><Field label="Motivo"><textarea name="motivo" required minLength={3} maxLength={NEGOCIO_RPC_LIMITS.motivoReabertura} rows={3} className={INPUT} /></Field><Field label="Novo titulo opcional"><input name="titulo" maxLength={NEGOCIO_RPC_LIMITS.titulo} className={INPUT} /></Field><Field label="Nova previsao opcional"><input type="date" name="previsao_fechamento" className={INPUT} /></Field></OperationForm>;
}

function ArchiveForm(props: Props) {
  const [state, action, pending] = useActionState(arquivarNegocio, INITIAL_STATE);
  return <OperationForm action={action} pending={pending} submitLabel="Arquivar Negocio" pendingLabel="Arquivando..." state={state} tone="red"><HiddenFields {...props} /><input type="hidden" name="status_operacional" value={props.status} /><p className="text-sm text-[#64736D]">O registro sera ocultado das visoes operacionais, sem excluir seu historico.</p><Field label="Motivo"><textarea name="motivo" required minLength={3} maxLength={NEGOCIO_RPC_LIMITS.motivoArquivamento} rows={3} className={INPUT} /></Field></OperationForm>;
}

function HiddenFields(props: Props) { return <><input type="hidden" name="negocio_id" value={props.negocioId} /><input type="hidden" name="lead_id" value={props.leadId} /><input type="hidden" name="updated_at_esperado" value={props.updatedAt} /><input type="hidden" name="tipo" value={props.tipo} /><input type="hidden" name="partes_papeis_json" value={JSON.stringify(props.partes)} /></>; }
function ReasonFields({ max }: { max: number }) { return <><Field label="Motivo"><textarea name="motivo" required minLength={3} maxLength={max} rows={3} className={INPUT} /></Field><Field label="Observacao opcional"><textarea name="observacao" maxLength={NEGOCIO_RPC_LIMITS.observacaoMovimentacao} rows={2} className={INPUT} /></Field></>; }
function OperationForm({ action, pending, submitLabel, pendingLabel, state, tone, children }: { action: (payload: FormData) => void; pending: boolean; submitLabel: string; pendingLabel: string; state: NegocioActionState; tone: "emerald" | "amber" | "red" | "navy"; children: React.ReactNode }) { const colors={emerald:"bg-emerald-700 text-white",amber:"bg-amber-600 text-white",red:"bg-red-700 text-white",navy:"bg-[#071E36] text-white"};return <form action={action} className="mt-3 rounded-2xl border border-[#E8DDCB] bg-white p-4"><fieldset disabled={pending} className="grid gap-3 disabled:opacity-65">{children}<ActionMessage state={state}/><button type="submit" disabled={pending} className={`w-fit rounded-xl px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed ${colors[tone]}`}>{pending?pendingLabel:submitLabel}</button></fieldset></form>; }
function ActionMessage({ state }: { state: NegocioActionState }) { return state.mensagem ? <p role="alert" className={`rounded-xl px-3 py-2 text-sm ${state.status === "erro" ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}>{state.mensagem}</p> : null; }
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="grid gap-1 text-xs font-semibold uppercase tracking-[0.08em] text-[#8B6827]">{label}{children}</label>; }
function resultMatchesType(result: string, tipo: NegocioType) { if (result === "outro" || result === "parceria_concluida") return true; if (result === "venda_fechada") return tipo === "venda"; if (result === "locacao_fechada") return tipo === "locacao"; return tipo === "administracao"; }
