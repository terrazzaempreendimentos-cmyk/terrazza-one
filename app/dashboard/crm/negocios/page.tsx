import Link from "next/link";
import { connection } from "next/server";
import { BriefcaseBusiness, CalendarClock, FileSignature, Handshake, Landmark, LineChart } from "lucide-react";

import { hasPermission } from "../../../../lib/auth/permissions";
import { requirePagePermission } from "../../../../lib/auth/page-permission";
import {
  NEGOCIO_STAGES,
  NEGOCIO_TYPES,
  getNegocioStageLabel,
  getNegocioStatusLabel,
  getNegocioTypeLabel,
  isNegocioStage,
  isNegocioStatus,
  isNegocioType,
  isNegocioPartRole,
  type NegocioStage,
  type NegocioStatus,
  type NegocioType,
} from "../../../../lib/crm/negocios/catalogs";
import { createClient } from "../../../../lib/supabase/server";
import { FinalOperationControls } from "./final-operation-forms";
import type { KanbanNegocio } from "./kanban-types";
import { NegociosKanbanBoard } from "./negocios-kanban-board";
import { NegocioForm, type AtendimentoOption, type NegocioFormValues, type Option, type ParteDraft } from "./operation-forms";

type Relation = { id: string; nome?: string | null; assunto?: string | null; codigo?: string | null; titulo?: string | null; complemento?: string | null };
type Negocio = {
  id:string; negocio_anterior_id:string|null; lead_id:string; atendimento_id:string|null; imovel_id:string|null; responsavel_id:string|null;
  tipo:NegocioType; etapa:NegocioStage; status_operacional:NegocioStatus; ativo:boolean; titulo:string; descricao:string|null;
  observacoes_internas:string|null; moeda:string; valor_anunciado:number|null; valor_proposto:number|null; valor_negociado:number|null;
  valor_fechado:number|null; comissao_percentual:number|null; comissao_prevista:number|null; comissao_efetiva:number|null;
  sinal:number|null; valor_financiado:number|null; condicoes_comerciais:string|null; observacao_financeira:string|null;
  proposta_em:string|null; previsao_fechamento:string|null; contrato_enviado_em:string|null; contrato_assinado_em:string|null;
  inicio_vigencia:string|null; fim_vigencia:string|null; etapa_alterada_em:string; created_at:string; updated_at:string;
  lead:unknown; atendimento:unknown; imovel:unknown; responsavel:unknown;
};
type Parte = ParteDraft & { id:string; negocio_id:string; ativo:boolean; pessoa:unknown };
type Raw = Record<string,unknown>;

const NEGOCIO_SELECT = "id, negocio_anterior_id, lead_id, atendimento_id, imovel_id, responsavel_id, tipo, etapa, status_operacional, ativo, titulo, descricao, observacoes_internas, moeda, valor_anunciado, valor_proposto, valor_negociado, valor_fechado, comissao_percentual, comissao_prevista, comissao_efetiva, sinal, valor_financiado, condicoes_comerciais, observacao_financeira, proposta_em, previsao_fechamento, contrato_enviado_em, contrato_assinado_em, inicio_vigencia, fim_vigencia, etapa_alterada_em, created_at, updated_at, lead:leads!negocios_lead_id_fkey(id, nome), atendimento:atendimentos!negocios_atendimento_id_fkey(id, assunto), imovel:imoveis!negocios_imovel_id_fkey(id, codigo, titulo, complemento), responsavel:pessoas!negocios_responsavel_id_fkey(id, nome)";
const PARTES_SELECT = "id, negocio_id, pessoa_id, papel, principal, participacao_percentual, observacoes, ativo, pessoa:pessoas!negocios_partes_pessoa_id_fkey(id, nome)";
const EMPTY_UUID = "00000000-0000-0000-0000-000000000000";
type NegocioView = "meus" | "todos";

export default async function NegociosPage({ searchParams }: { searchParams: Promise<Record<string,string|string[]|undefined>> }) {
  const profile=await requirePagePermission("negocios.visualizar");
  const params=await searchParams;
  const canMutate=(profile.papel==="administrador"||profile.papel==="gestor");
  const canCreate=canMutate&&hasPermission(profile.papel,"negocios.criar");
  const canEdit=canMutate&&hasPermission(profile.papel,"negocios.editar");
  const finalPermissions={conclude:canMutate&&hasPermission(profile.papel,"negocios.concluir"),lose:canMutate&&hasPermission(profile.papel,"negocios.perder"),cancel:canMutate&&hasPermission(profile.papel,"negocios.cancelar"),reopen:canMutate&&hasPermission(profile.papel,"negocios.reabrir"),archive:canMutate&&hasPermission(profile.papel,"negocios.arquivar")};
  const isCorretor=profile.papel==="corretor";
  const view:NegocioView=isCorretor&&single(params.visao)!=="todos"?"meus":"todos";
  const missingCorretorLink=isCorretor&&view==="meus"&&!profile.pessoaId;
  const editId=single(params.editar); const validEditId=isUuid(editId)?editId:null;
  const supabase=await createClient();
  let negociosQuery=supabase.from("negocios").select(NEGOCIO_SELECT).order("updated_at",{ascending:false});
  if(isCorretor&&view==="meus")negociosQuery=negociosQuery.eq("responsavel_id",profile.pessoaId??EMPTY_UUID);
  const negociosPromise=negociosQuery;
  const partesPromise=supabase.from("negocios_partes").select(PARTES_SELECT).eq("ativo",true);
  const optionPromises=canCreate||canEdit?[
    supabase.from("leads").select("id, nome").order("nome"),
    supabase.from("atendimentos").select("id, lead_id, assunto").order("created_at",{ascending:false}),
    supabase.from("imoveis").select("id, codigo, titulo, complemento, ativo").eq("ativo",true).order("codigo"),
    supabase.from("pessoas").select("id, nome, papeis, ativo").eq("ativo",true).order("nome"),
  ] as const:[];
  const editPromise=validEditId&&canEdit?supabase.from("negocios").select(NEGOCIO_SELECT).eq("id",validEditId).eq("ativo",true).eq("status_operacional","ativo").maybeSingle():Promise.resolve({data:null,error:null});
  const [negociosResult,partesResult,options,editResult]=await Promise.all([negociosPromise,partesPromise,Promise.all(optionPromises),editPromise]);
  if(negociosResult.error)logQueryError("list",negociosResult.error.code);
  if(partesResult.error)logQueryError("parts",partesResult.error.code);
  if(editResult.error)logQueryError("edit",editResult.error.code);
  options.forEach((result,index)=>{if(result.error)logQueryError(`options_${index}`,result.error.code);});

  const rawNegocios=(negociosResult.data??[]) as unknown[];
  const negocios=rawNegocios.map(normalizeNegocio).filter((value):value is Negocio=>Boolean(value));
  if(negocios.length!==rawNegocios.length)logQueryError("normalize_list","invalid_row");
  const partes=((partesResult.data??[]) as unknown[]).map(normalizeParte).filter((value):value is Parte=>Boolean(value));
  const partesByNegocio=new Map<string,Parte[]>(); for(const parte of partes)partesByNegocio.set(parte.negocio_id,[...(partesByNegocio.get(parte.negocio_id)??[]),parte]);
  const leads=toOptions(options[0]?.data,"nome");
  const atendimentos=toAtendimentoOptions(options[1]?.data);
  const imoveis=toPropertyOptions(options[2]?.data);
  const pessoas=toOptions(options[3]?.data,"nome");
  const responsaveis=toResponsibleOptions(options[3]?.data);
  const editing=normalizeNegocio(editResult.data);

  const filtered=filterNegocios(negocios,params);
  const active=filtered.filter((item)=>item.ativo&&item.status_operacional==="ativo");
  const closed=filtered.filter((item)=>item.ativo&&item.status_operacional!=="ativo").slice(0,12);
  const predecessorIds=new Set(negocios.flatMap((item)=>item.negocio_anterior_id?[item.negocio_anterior_id]:[]));
  const forecastValues=active.map(commercialValue).filter((value):value is number=>value!==null);
  const now=await currentTimestamp();
  const indicators=[
    ["Negocios ativos",active.length,BriefcaseBusiness],
    ["Estruturacao",active.filter((item)=>item.etapa==="estruturacao").length,Landmark],
    ["Proposta",active.filter((item)=>item.etapa==="proposta").length,FileSignature],
    ["Negociacao",active.filter((item)=>item.etapa==="negociacao").length,Handshake],
    ["Documentos e contrato",active.filter((item)=>["documentacao","contrato","assinatura"].includes(item.etapa)).length,CalendarClock],
    ["Previsao comercial",forecastValues.length?formatMoney(forecastValues.reduce((total,value)=>total+value,0),"BRL"):"Nao informada",LineChart],
  ] as const;
  const kanbanItems:KanbanNegocio[]=active.map((item)=>{const lead=relation(item.lead),imovel=relation(item.imovel),responsavel=relation(item.responsavel);const itemPartes=partesByNegocio.get(item.id)??[];return{id:item.id,leadId:item.lead_id,titulo:item.titulo,tipo:item.tipo,tipoLabel:getNegocioTypeLabel(item.tipo)??item.tipo,etapa:item.etapa,status:item.status_operacional,updatedAt:item.updated_at,leadNome:lead?.nome||"Nao disponivel",imovelLabel:propertyLabel(imovel),responsavelNome:responsavel?.nome||"Nao atribuido",valor:commercialValue(item),moeda:item.moeda,previsaoLabel:formatDate(item.previsao_fechamento),partesAtivas:itemPartes.length,partesPapeis:itemPartes.map((parte)=>parte.papel),diasNaEtapa:daysInStage(item,now),reabertura:Boolean(item.negocio_anterior_id),hasSuccessor:predecessorIds.has(item.id),valorFechado:item.valor_fechado,comissaoEfetiva:item.comissao_efetiva};});

  return <main className="min-h-screen bg-[#F7F3ED] px-4 py-8 sm:px-8"><div className="mx-auto max-w-[1600px]">
    <header className="rounded-[2rem] border border-[#E8DDCB] bg-white p-6 shadow-sm sm:p-8"><Link href="/dashboard/crm" className="text-sm font-semibold text-[#8B6827]">Voltar ao CRM</Link><h1 className="mt-5 text-4xl font-bold text-[#071E36]">Negocios</h1><p className="mt-2 text-[#64736D]">Operacoes comerciais reais organizadas pelas etapas canonicas.</p></header>
    {negociosResult.error?<p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">Nao foi possivel carregar os Negocios.</p>:null}
    {partesResult.error?<p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">Os Negocios foram carregados, mas nao foi possivel carregar suas partes.</p>:null}
    {isCorretor?<ViewToggle params={params} view={view}/>:null}
    {missingCorretorLink?<p role="alert" className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">Seu usuario Corretor ainda nao possui uma Pessoa vinculada. A visao Meus negocios permanecera vazia ate que o vinculo seja configurado.</p>:null}
    <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-6">{indicators.map(([label,value,Icon])=><article key={label} className="rounded-3xl border border-[#E8DDCB] bg-white p-5 shadow-sm"><Icon size={20} className="text-[#C89B3C]"/><strong className="mt-3 block text-2xl text-[#071E36]">{value}</strong><h2 className="mt-1 text-xs font-semibold uppercase tracking-[.1em] text-[#64736D]">{label}</h2></article>)}</section>
    <FilterForm params={params} responsaveis={responsaveis} imoveis={imoveis} view={view} isCorretor={isCorretor}/>
    {canCreate?<details className="mt-6 rounded-[2rem] border border-[#E8DDCB] bg-white p-5 shadow-sm"><summary className="cursor-pointer text-xl font-semibold text-[#071E36]">Criar Negocio</summary><NegocioForm mode="create" leads={leads} atendimentos={atendimentos} imoveis={imoveis} pessoas={pessoas} responsaveis={responsaveis}/></details>:null}
    {validEditId&&canEdit?<section className="mt-6 rounded-[2rem] border border-[#C89B3C]/40 bg-white p-5 shadow-sm"><div className="flex justify-between"><h2 className="text-xl font-semibold text-[#071E36]">Editar Negocio</h2><Link href="/dashboard/crm/negocios" className="text-sm text-[#8B6827]">Fechar</Link></div>{editing?<NegocioForm key={editing.id} mode="edit" values={formValues(editing)} initialPartes={(partesByNegocio.get(editing.id)??[]).map(toDraft)} leads={leads} atendimentos={atendimentos} imoveis={imoveis} pessoas={pessoas} responsaveis={responsaveis}/>:<p role="alert" className="mt-4 text-sm text-red-700">Negocio ativo nao encontrado para edicao.</p>}</section>:null}
    <NegociosKanbanBoard key={kanbanItems.map((item)=>item.updatedAt).join("|")} initialItems={kanbanItems} canMove={canEdit} finalPermissions={finalPermissions} clearFiltersHref={isCorretor?`/dashboard/crm/negocios?visao=${view}`:"/dashboard/crm/negocios"}/>
    <section className="mt-8 rounded-[2rem] border border-[#E8DDCB] bg-white p-5 shadow-sm"><h2 className="text-xl font-semibold text-[#071E36]">Encerrados recentes</h2><div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">{closed.length?closed.map((item)=><ClosedNegocioCard key={item.id} item={item} partes={partesByNegocio.get(item.id)??[]} canEdit={false} finalPermissions={finalPermissions} hasSuccessor={predecessorIds.has(item.id)} now={now}/>):<p className="text-sm text-[#64736D]">Nenhum Negocio encerrado.</p>}</div></section>
  </div></main>;
}

function FilterForm({params,responsaveis,imoveis,view,isCorretor}:{params:Record<string,string|string[]|undefined>;responsaveis:readonly Option[];imoveis:readonly Option[];view:NegocioView;isCorretor:boolean}){return <form className="mt-6 grid gap-3 rounded-[2rem] border border-[#E8DDCB] bg-white p-5 shadow-sm md:grid-cols-3 xl:grid-cols-7">{isCorretor?<input type="hidden" name="visao" value={view}/>:null}<input name="busca" defaultValue={single(params.busca)} placeholder="Titulo, Lead, Imovel..." className={input()}/><select name="tipo" defaultValue={single(params.tipo)} className={input()}><option value="">Todos os tipos</option>{NEGOCIO_TYPES.map((item)=><option key={item.id} value={item.id}>{item.label}</option>)}</select><select name="etapa" defaultValue={single(params.etapa)} className={input()}><option value="">Todas as etapas</option>{NEGOCIO_STAGES.map((item)=><option key={item.id} value={item.id}>{item.label}</option>)}</select><select name="responsavel" defaultValue={single(params.responsavel)} className={input()}><option value="">Todos os responsaveis</option>{responsaveis.map((item)=><option key={item.id} value={item.id}>{item.label}</option>)}</select><select name="imovel" defaultValue={single(params.imovel)} className={input()}><option value="">Todos os Imoveis</option>{imoveis.map((item)=><option key={item.id} value={item.id}>{item.label}</option>)}</select><input type="date" name="previsao" defaultValue={single(params.previsao)} className={input()}/><button className="rounded-xl bg-[#071E36] px-4 py-2 text-sm font-semibold text-white">Filtrar</button></form>}
function ViewToggle({params,view}:{params:Record<string,string|string[]|undefined>;view:NegocioView}){return <nav aria-label="Visao da carteira" className="mt-6 inline-flex rounded-xl border border-[#E8DDCB] bg-white p-1 shadow-sm"><Link href={viewHref(params,"meus")} aria-current={view==="meus"?"page":undefined} className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${view==="meus"?"bg-[#071E36] text-white":"text-[#64736D] hover:text-[#071E36]"}`}>Meus negocios</Link><Link href={viewHref(params,"todos")} aria-current={view==="todos"?"page":undefined} className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${view==="todos"?"bg-[#071E36] text-white":"text-[#64736D] hover:text-[#071E36]"}`}>Todos</Link></nav>}
function ClosedNegocioCard({item,partes,canEdit,finalPermissions,hasSuccessor,now}:{item:Negocio;partes:readonly Parte[];canEdit:boolean;finalPermissions:Readonly<{conclude:boolean;lose:boolean;cancel:boolean;reopen:boolean;archive:boolean}>;hasSuccessor:boolean;now:number}){const lead=relation(item.lead),imovel=relation(item.imovel),responsavel=relation(item.responsavel);const value=commercialValue(item);const days=daysInStage(item,now);const stalled=item.ativo&&item.status_operacional==="ativo"&&days>7;return <article className="rounded-3xl border border-[#E8DDCB] bg-[#fffdfa] p-5"><div className="flex justify-between gap-3"><div><p className="text-xs font-semibold uppercase text-[#8B6827]">{getNegocioTypeLabel(item.tipo)}</p><h3 className="mt-1 text-lg font-semibold text-[#071E36]">{item.titulo}</h3><div className="mt-2 flex flex-wrap gap-1">{item.negocio_anterior_id?<><Badge>Reabertura</Badge><Badge>Originado de ciclo anterior</Badge></>:null}{hasSuccessor?<Badge>Possui ciclo posterior</Badge>:null}{stalled?<StalledBadge days={days}/>:null}</div></div><span className="h-fit rounded-full bg-[#071E36] px-3 py-1 text-xs font-semibold text-[#E1B866]">{getNegocioStageLabel(item.etapa)}</span></div><dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2"><Info label="Lead" value={lead?.nome||"Nao disponivel"}/><Info label="Imovel" value={propertyLabel(imovel)}/><Info label="Responsavel" value={responsavel?.nome||"Nao atribuido"}/><Info label="Valor" value={value===null?"Nao informado":formatMoney(value,item.moeda)}/><Info label="Previsao" value={formatDate(item.previsao_fechamento)}/><Info label="Partes ativas" value={String(partes.length)}/><Info label="Atualizado" value={formatDateTime(item.updated_at)}/><Info label="Status" value={getNegocioStatusLabel(item.status_operacional)||item.status_operacional}/></dl><div className="mt-4 flex flex-wrap gap-2"><Link href={`/dashboard/crm/negocios/${item.id}`} className="rounded-full border border-[#E8DDCB] bg-white px-3 py-1 text-xs font-semibold text-[#071E36]">Detalhes</Link>{canEdit&&item.ativo&&item.status_operacional==="ativo"?<Link href={`/dashboard/crm/negocios?editar=${item.id}`} className="rounded-full border border-[#E8DDCB] bg-white px-3 py-1 text-xs font-semibold text-[#071E36]">Editar</Link>:null}<Link href={`/dashboard/crm/leads/${item.lead_id}`} className="rounded-full border border-[#E8DDCB] bg-white px-3 py-1 text-xs font-semibold text-[#071E36]">Ver Lead</Link></div>{item.ativo?<FinalOperationControls negocioId={item.id} leadId={item.lead_id} updatedAt={item.updated_at} tipo={item.tipo} status={item.status_operacional} valorFechado={item.valor_fechado} comissaoEfetiva={item.comissao_efetiva} partes={partes.map((parte)=>parte.papel)} hasSuccessor={hasSuccessor} permissions={finalPermissions}/>:null}</article>}

function normalizeNegocio(value:unknown):Negocio|null{if(!value||typeof value!=="object")return null;const r=value as Raw;if(typeof r.id!=="string"||typeof r.lead_id!=="string"||typeof r.titulo!=="string"||typeof r.etapa_alterada_em!=="string"||typeof r.created_at!=="string"||typeof r.updated_at!=="string"||!isNegocioType(r.tipo)||!isNegocioStage(r.etapa)||!isNegocioStatus(r.status_operacional)||typeof r.ativo!=="boolean")return null;return {id:r.id,negocio_anterior_id:str(r.negocio_anterior_id),lead_id:r.lead_id,atendimento_id:str(r.atendimento_id),imovel_id:str(r.imovel_id),responsavel_id:str(r.responsavel_id),tipo:r.tipo,etapa:r.etapa,status_operacional:r.status_operacional,ativo:r.ativo,titulo:r.titulo,descricao:str(r.descricao),observacoes_internas:str(r.observacoes_internas),moeda:str(r.moeda)||"BRL",valor_anunciado:num(r.valor_anunciado),valor_proposto:num(r.valor_proposto),valor_negociado:num(r.valor_negociado),valor_fechado:num(r.valor_fechado),comissao_percentual:num(r.comissao_percentual),comissao_prevista:num(r.comissao_prevista),comissao_efetiva:num(r.comissao_efetiva),sinal:num(r.sinal),valor_financiado:num(r.valor_financiado),condicoes_comerciais:str(r.condicoes_comerciais),observacao_financeira:str(r.observacao_financeira),proposta_em:str(r.proposta_em),previsao_fechamento:str(r.previsao_fechamento),contrato_enviado_em:str(r.contrato_enviado_em),contrato_assinado_em:str(r.contrato_assinado_em),inicio_vigencia:str(r.inicio_vigencia),fim_vigencia:str(r.fim_vigencia),etapa_alterada_em:r.etapa_alterada_em,created_at:r.created_at,updated_at:r.updated_at,lead:r.lead,atendimento:r.atendimento,imovel:r.imovel,responsavel:r.responsavel};}
function normalizeParte(value:unknown):Parte|null{if(!value||typeof value!=="object")return null;const r=value as Raw;if(typeof r.id!=="string"||typeof r.negocio_id!=="string"||typeof r.pessoa_id!=="string"||!isNegocioPartRole(r.papel)||typeof r.principal!=="boolean"||typeof r.ativo!=="boolean")return null;return{id:r.id,negocio_id:r.negocio_id,pessoa_id:r.pessoa_id,papel:r.papel,principal:r.principal,participacao_percentual:num(r.participacao_percentual),observacoes:str(r.observacoes),ativo:r.ativo,pessoa:r.pessoa};}
function filterNegocios(items:readonly Negocio[],p:Record<string,string|string[]|undefined>){const q=single(p.busca).toLocaleLowerCase("pt-BR"),tipo=single(p.tipo),etapa=single(p.etapa),resp=single(p.responsavel),imovel=single(p.imovel),previsao=single(p.previsao);return items.filter((item)=>{const text=[item.titulo,relation(item.lead)?.nome,propertyLabel(relation(item.imovel)),relation(item.responsavel)?.nome].filter(Boolean).join(" ").toLocaleLowerCase("pt-BR");return(!q||text.includes(q))&&(!tipo||item.tipo===tipo)&&(!etapa||item.etapa===etapa)&&(!resp||item.responsavel_id===resp)&&(!imovel||item.imovel_id===imovel)&&(!previsao||item.previsao_fechamento===previsao);});}
function formValues(item:Negocio):NegocioFormValues{return{...item,valor_anunciado:textNum(item.valor_anunciado),valor_proposto:textNum(item.valor_proposto),valor_negociado:textNum(item.valor_negociado),valor_fechado:textNum(item.valor_fechado),comissao_percentual:textNum(item.comissao_percentual),comissao_prevista:textNum(item.comissao_prevista),comissao_efetiva:textNum(item.comissao_efetiva),sinal:textNum(item.sinal),valor_financiado:textNum(item.valor_financiado)} as unknown as NegocioFormValues;}
function toDraft(p:Parte):ParteDraft{return{pessoa_id:p.pessoa_id,papel:p.papel,principal:p.principal,participacao_percentual:p.participacao_percentual,observacoes:p.observacoes};}
function relation(value:unknown):Relation|null{const v=Array.isArray(value)?value[0]:value;if(!v||typeof v!=="object")return null;const r=v as Raw;return typeof r.id==="string"?{id:r.id,nome:str(r.nome),assunto:str(r.assunto),codigo:str(r.codigo),titulo:str(r.titulo),complemento:str(r.complemento)}:null;}
function toOptions(data:unknown,key:string):Option[]{return(Array.isArray(data)?data:[]).flatMap((value)=>{if(!value||typeof value!=="object")return[];const r=value as Raw;return typeof r.id==="string"&&typeof r[key]==="string"?[{id:r.id,label:String(r[key]).trim()}]:[];});}
function toAtendimentoOptions(data:unknown):AtendimentoOption[]{return(Array.isArray(data)?data:[]).flatMap((value)=>{if(!value||typeof value!=="object")return[];const r=value as Raw;return typeof r.id==="string"&&typeof r.lead_id==="string"?[{id:r.id,leadId:r.lead_id,label:str(r.assunto)||"Atendimento sem assunto"}]:[];});}
function toPropertyOptions(data:unknown):Option[]{return(Array.isArray(data)?data:[]).flatMap((value)=>{if(!value||typeof value!=="object")return[];const r=value as Raw;return typeof r.id==="string"?[{id:r.id,label:[str(r.codigo),str(r.titulo),str(r.complemento)].filter(Boolean).join(" - ")||"Imovel sem identificacao"}]:[];});}
function toResponsibleOptions(data:unknown):Option[]{return(Array.isArray(data)?data:[]).flatMap((value)=>{if(!value||typeof value!=="object")return[];const r=value as Raw;return typeof r.id==="string"&&typeof r.nome==="string"&&Array.isArray(r.papeis)&&r.papeis.includes("corretor")?[{id:r.id,label:r.nome.trim()}]:[];});}
function commercialValue(n:Negocio){return n.valor_negociado??n.valor_proposto??n.valor_anunciado;}
async function currentTimestamp(){await connection();return Date.now();}
function daysInStage(n:Negocio,now:number){const changedAt=Date.parse(n.etapa_alterada_em);return Number.isNaN(changedAt)?0:Math.max(0,Math.floor((now-changedAt)/86_400_000));}
function StalledBadge({days}:{days:number}){return <span className={`rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-wide ${days>=14?"bg-red-100 text-red-700":"bg-amber-100 text-amber-800"}`}>Parado há {days} dias</span>;}
function viewHref(params:Record<string,string|string[]|undefined>,view:NegocioView){const query=new URLSearchParams();for(const[key,value]of Object.entries(params)){if(key==="visao"||key==="editar"||typeof value!=="string"||!value)continue;query.set(key,value);}query.set("visao",view);return `/dashboard/crm/negocios?${query.toString()}`;}
function propertyLabel(r:Relation|null){return r?[r.codigo,r.titulo,r.complemento].filter(Boolean).join(" - ")||"Imovel sem identificacao":"Nao informado";}
function str(v:unknown){return typeof v==="string"?v:null;} function num(v:unknown){if(typeof v==="number"&&Number.isFinite(v))return v;if(typeof v==="string"&&v.trim()&&Number.isFinite(Number(v)))return Number(v);return null;} function textNum(v:number|null){return v===null?null:String(v);} function single(v:string|string[]|undefined){return typeof v==="string"?v:"";} function isUuid(v:string){return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);} function input(){return"rounded-xl border border-[#E8DDCB] bg-white px-3 py-2 text-sm text-[#071E36]";} function formatMoney(v:number,c:string){try{return new Intl.NumberFormat("pt-BR",{style:"currency",currency:/^[A-Z]{3}$/.test(c)?c:"BRL"}).format(v);}catch{return String(v);}} function formatDate(v:string|null){if(!v)return"Nao informada";return new Intl.DateTimeFormat("pt-BR",{dateStyle:"short",timeZone:"UTC"}).format(new Date(`${v.slice(0,10)}T00:00:00Z`));} function formatDateTime(v:string){return Number.isNaN(Date.parse(v))?"Nao informada":new Intl.DateTimeFormat("pt-BR",{dateStyle:"short",timeStyle:"short",timeZone:"America/Sao_Paulo"}).format(new Date(v));}
function Info({label,value}:{label:string;value:string}){return<div className="rounded-xl bg-white px-3 py-2"><dt className="text-xs font-semibold uppercase text-[#8B6827]">{label}</dt><dd className="mt-1 text-[#071E36]">{value}</dd></div>;} function logQueryError(etapa:string,codigo:unknown){console.error({modulo:"crm_negocios",etapa,codigo:typeof codigo==="string"?codigo:"query_error"});}
function Badge({children}:{children:React.ReactNode}){return<span className="rounded-full bg-[#C89B3C]/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-[#8B6827]">{children}</span>;}
