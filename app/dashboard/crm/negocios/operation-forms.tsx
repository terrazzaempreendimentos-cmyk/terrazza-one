"use client";

import { useActionState, useMemo, useState } from "react";

import { NEGOCIO_PART_ROLES, NEGOCIO_TYPES, type NegocioPartRole, type NegocioStage } from "../../../../lib/crm/negocios/catalogs";
import { NEGOCIO_RPC_LIMITS } from "../../../../lib/crm/negocios/rpc-contracts";
import { NEGOCIO_STAGE_TRANSITIONS } from "../../../../lib/crm/negocios/transitions";
import { createNegocio, moveNegocio, updateNegocio, type NegocioActionState } from "./actions";

const INITIAL_STATE: NegocioActionState = { status: "idle", mensagem: null };
const INPUT = "rounded-xl border border-[#E8DDCB] bg-white px-3 py-2 text-sm text-[#071E36] outline-none focus:border-[#C89B3C]";

export type Option = Readonly<{ id: string; label: string }>;
export type AtendimentoOption = Option & Readonly<{ leadId: string }>;
export type ParteDraft = Readonly<{ pessoa_id: string; papel: NegocioPartRole; principal: boolean; participacao_percentual: number | null; observacoes: string | null }>;
export type NegocioFormValues = Readonly<Record<string, string | null | undefined> & { id?: string; updated_at?: string; lead_id: string; tipo: string; titulo: string }>;

type Props = Readonly<{
  mode: "create" | "edit";
  values?: NegocioFormValues;
  initialPartes?: readonly ParteDraft[];
  leads: readonly Option[];
  atendimentos: readonly AtendimentoOption[];
  imoveis: readonly Option[];
  pessoas: readonly Option[];
  responsaveis: readonly Option[];
}>;

export function NegocioForm(props: Props) {
  const action = props.mode === "create" ? createNegocio : updateNegocio;
  const [state, formAction, pending] = useActionState(action, INITIAL_STATE);
  const [leadId, setLeadId] = useState(props.values?.lead_id ?? "");
  const [tipo, setTipo] = useState(props.values?.tipo ?? "venda");
  const [partes, setPartes] = useState<readonly ParteDraft[]>(props.initialPartes ?? []);
  const atendimentos = useMemo(() => props.atendimentos.filter((item) => item.leadId === leadId), [props.atendimentos, leadId]);
  const edit = props.mode === "edit";
  const value = (name: string) => props.values?.[name] ?? "";

  function addParte() {
    const first = props.pessoas[0];
    if (!first) return;
    setPartes((current) => [...current, { pessoa_id: first.id, papel: "outro", principal: false, participacao_percentual: null, observacoes: null }]);
  }

  function updateParte(index: number, patch: Partial<ParteDraft>) {
    setPartes((current) => current.map((parte, currentIndex) => currentIndex === index ? { ...parte, ...patch } : parte));
  }

  return (
    <form action={formAction} className="mt-5">
      <fieldset disabled={pending} className="grid gap-4 disabled:opacity-65">
        {edit ? <><input type="hidden" name="negocio_id" value={props.values?.id ?? ""} /><input type="hidden" name="updated_at_esperado" value={props.values?.updated_at ?? ""} /><input type="hidden" name="lead_id_original" value={props.values?.lead_id ?? ""} /></> : null}
        <input type="hidden" name="partes_json" value={JSON.stringify(partes)} />
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <Field label="Lead">
            <select name="lead_id" required value={leadId} onChange={(event) => setLeadId(event.target.value)} disabled={edit} className={INPUT}><option value="">Selecione</option>{props.leads.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select>
            {edit ? <input type="hidden" name="lead_id" value={leadId} /> : null}
          </Field>
          <Field label="Atendimento">
            <select name="atendimento_id" defaultValue={value("atendimento_id")} className={INPUT}><option value="">Nenhum</option>{atendimentos.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select>
          </Field>
          <Field label="Tipo">
            <select name="tipo" value={tipo} onChange={(event) => setTipo(event.target.value)} className={INPUT}>{NEGOCIO_TYPES.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select>
          </Field>
          <Field label={`Imovel${tipo === "outro" ? " (opcional)" : ""}`}>
            <select name="imovel_id" required={tipo !== "outro"} defaultValue={value("imovel_id")} className={INPUT}><option value="">Selecione</option>{props.imoveis.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select>
          </Field>
          <Field label="Responsavel">
            <select name="responsavel_id" defaultValue={value("responsavel_id")} className={INPUT}><option value="">Nao atribuido</option>{props.responsaveis.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select>
          </Field>
          <Field label="Titulo"><input name="titulo" required maxLength={NEGOCIO_RPC_LIMITS.titulo} defaultValue={value("titulo")} className={INPUT} /></Field>
          <Field label="Moeda"><input name="moeda" required maxLength={3} defaultValue={value("moeda") || "BRL"} className={INPUT} /></Field>
          <Field label="Previsao de fechamento"><input type="date" name="previsao_fechamento" defaultValue={value("previsao_fechamento")} className={INPUT} /></Field>
        </div>
        <Field label="Descricao"><textarea name="descricao" maxLength={NEGOCIO_RPC_LIMITS.descricao} defaultValue={value("descricao")} rows={3} className={INPUT} /></Field>
        <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-5">
          {[["valor_anunciado","Valor anunciado"],["valor_proposto","Valor proposto"],["valor_negociado","Valor negociado"],["valor_fechado","Valor fechado"],["comissao_percentual","Comissao %"],["comissao_prevista","Comissao prevista"],["comissao_efetiva","Comissao efetiva"],["sinal","Sinal"],["valor_financiado","Valor financiado"]].map(([name,label]) => <Field key={name} label={label}><input type="number" min="0" step="0.01" name={name} defaultValue={value(name)} className={INPUT} /></Field>)}
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Condicoes comerciais"><textarea name="condicoes_comerciais" maxLength={NEGOCIO_RPC_LIMITS.condicoesComerciais} defaultValue={value("condicoes_comerciais")} rows={3} className={INPUT} /></Field>
          <Field label="Observacao financeira"><textarea name="observacao_financeira" maxLength={NEGOCIO_RPC_LIMITS.observacaoFinanceira} defaultValue={value("observacao_financeira")} rows={3} className={INPUT} /></Field>
          <Field label="Observacoes internas"><textarea name="observacoes_internas" maxLength={NEGOCIO_RPC_LIMITS.observacoesInternas} defaultValue={value("observacoes_internas")} rows={3} className={INPUT} /></Field>
          <div className="grid grid-cols-2 gap-3">
            {[["proposta_em","Proposta em","datetime-local"],["contrato_enviado_em","Contrato enviado","datetime-local"],["contrato_assinado_em","Contrato assinado","datetime-local"],["inicio_vigencia","Inicio vigencia","date"],["fim_vigencia","Fim vigencia","date"]].map(([name,label,inputType]) => <Field key={name} label={label}><input type={inputType} name={name} defaultValue={localDateValue(value(name),inputType)} className={INPUT} /></Field>)}
          </div>
        </div>

        <section className="rounded-2xl border border-[#E8DDCB] bg-[#F7F3ED] p-4">
          <div className="flex items-center justify-between gap-3"><div><h3 className="font-semibold text-[#071E36]">Partes</h3><p className="text-xs text-[#64736D]">Somente Pessoas ativas. Zero ou mais vínculos.</p></div><button type="button" onClick={addParte} disabled={!props.pessoas.length} className="rounded-xl bg-[#071E36] px-3 py-2 text-xs font-semibold text-white">Adicionar parte</button></div>
          <div className="mt-4 grid gap-3">
            {partes.map((parte,index) => <div key={`${index}-${parte.pessoa_id}-${parte.papel}`} className="grid gap-2 rounded-xl bg-white p-3 md:grid-cols-[1.3fr_1fr_.7fr_.7fr_1.5fr_auto]">
              <select aria-label="Pessoa" value={parte.pessoa_id} onChange={(event)=>updateParte(index,{pessoa_id:event.target.value})} className={INPUT}>{props.pessoas.map((item)=><option key={item.id} value={item.id}>{item.label}</option>)}</select>
              <select aria-label="Papel" value={parte.papel} onChange={(event)=>updateParte(index,{papel:event.target.value as NegocioPartRole})} className={INPUT}>{NEGOCIO_PART_ROLES.map((item)=><option key={item.id} value={item.id}>{item.label}</option>)}</select>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={parte.principal} onChange={(event)=>updateParte(index,{principal:event.target.checked})} /> Principal</label>
              <input aria-label="Participacao percentual" type="number" min="0" max="100" step="0.01" value={parte.participacao_percentual ?? ""} onChange={(event)=>updateParte(index,{participacao_percentual:event.target.value ? Number(event.target.value) : null})} className={INPUT} />
              <input aria-label="Observacoes da parte" maxLength={NEGOCIO_RPC_LIMITS.observacoesParte} value={parte.observacoes ?? ""} onChange={(event)=>updateParte(index,{observacoes:event.target.value||null})} className={INPUT} />
              <button type="button" onClick={()=>setPartes((current)=>current.filter((_,currentIndex)=>currentIndex!==index))} className="text-xs font-semibold text-red-700">Remover</button>
            </div>)}
            {!partes.length ? <p className="text-sm text-[#64736D]">Nenhuma parte adicionada.</p> : null}
          </div>
        </section>
        <ActionMessage state={state} />
        <button type="submit" disabled={pending} className="w-fit rounded-xl bg-[#C89B3C] px-5 py-3 text-sm font-semibold text-[#071E36] disabled:cursor-not-allowed">{pending ? "Salvando..." : edit ? "Salvar alteracoes" : "Criar Negocio"}</button>
      </fieldset>
    </form>
  );
}

export function MoveNegocioForm({ negocioId, leadId, currentStage, updatedAt }: { negocioId: string; leadId: string; currentStage: NegocioStage; updatedAt: string }) {
  const [state, formAction, pending] = useActionState(moveNegocio, INITIAL_STATE);
  const destinations = NEGOCIO_STAGE_TRANSITIONS[currentStage];
  return <form action={formAction} className="mt-4 rounded-2xl border border-[#E8DDCB] bg-white p-3"><fieldset disabled={pending} className="grid gap-2"><input type="hidden" name="negocio_id" value={negocioId}/><input type="hidden" name="lead_id" value={leadId}/><input type="hidden" name="etapa_atual" value={currentStage}/><input type="hidden" name="updated_at_esperado" value={updatedAt}/><select name="etapa_destino" required className={INPUT}><option value="">Mover para...</option>{destinations.map((stage)=><option key={stage} value={stage}>{stage}</option>)}</select><input name="observacao" maxLength={NEGOCIO_RPC_LIMITS.observacaoMovimentacao} placeholder="Observacao opcional" className={INPUT}/><ActionMessage state={state}/><button disabled={pending} className="rounded-xl bg-[#071E36] px-3 py-2 text-xs font-semibold text-white">{pending?"Movendo...":"Mover etapa"}</button></fieldset></form>;
}

function ActionMessage({state}:{state:NegocioActionState}) { return state.mensagem ? <p role="alert" className={`rounded-xl px-3 py-2 text-sm ${state.status==="erro"?"bg-red-50 text-red-700":"bg-emerald-50 text-emerald-700"}`}>{state.mensagem}</p> : null; }
function Field({label,children}:{label:string;children:React.ReactNode}) { return <label className="grid gap-1 text-xs font-semibold uppercase tracking-[0.08em] text-[#8B6827]">{label}{children}</label>; }
function localDateValue(value:string,inputType:string){if(!value)return "";if(inputType==="date")return value.slice(0,10);const date=new Date(value);if(Number.isNaN(date.getTime()))return "";const offset=date.getTimezoneOffset()*60000;return new Date(date.getTime()-offset).toISOString().slice(0,16);}
