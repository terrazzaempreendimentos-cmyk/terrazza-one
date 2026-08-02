import Link from "next/link";
import { AlertTriangle, CalendarClock, CalendarDays, CheckCircle2, ClipboardList, ListChecks, PauseCircle } from "lucide-react";
import { requirePagePermission } from "../../../../lib/auth/page-permission";
import { ACTIVITY_PRIORITIES, ACTIVITY_STATUSES, ACTIVITY_TYPES, getActivityPriority, getActivityStatus, getActivityType, isFinalActivityStatus } from "../../../../lib/crm/atividades/catalogs";
import { ACTIVITY_SELECT, formatRecife, normalizeActivity, type ActivityOptions, type ActivityRelation, type ActivityView } from "../../../../lib/crm/atividades/view-model";
import { createClient } from "../../../../lib/supabase/server";
import { ActivityFinalActions, ActivityForm, ActivityStateForm } from "./activity-forms";

type Search = { q?: string; tipo?: string; status?: string; prioridade?: string; responsavel?: string; modulo?: string; periodo?: string; edit?: string };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const OPEN = new Set(["pendente", "em_andamento", "aguardando"]);

function optionRows(value: unknown, key: string): ActivityRelation[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => item && typeof item === "object" && typeof (item as Record<string, unknown>).id === "string" && typeof (item as Record<string, unknown>)[key] === "string" ? [{ id: (item as { id: string }).id, label: String((item as Record<string, unknown>)[key]) }] : []);
}

function matches(activity: ActivityView, search: Search, now: Date) {
  const q = search.q?.trim().toLocaleLowerCase("pt-BR");
  if (q && ![activity.titulo, activity.descricao, activity.lead?.label, activity.pessoa?.label, activity.negocio?.label, activity.imovel?.label].some((value) => value?.toLocaleLowerCase("pt-BR").includes(q))) return false;
  if (search.tipo && activity.tipo !== search.tipo) return false;
  if (search.status && activity.status !== search.status) return false;
  if (search.prioridade && activity.prioridade !== search.prioridade) return false;
  if (search.responsavel && activity.responsavel_id !== search.responsavel) return false;
  if (search.modulo && !activity[`${search.modulo}_id` as "lead_id"] ) return false;
  const due = activity.fim_planejado_em ?? activity.inicio_planejado_em;
  if (search.periodo === "sem_planejamento" && due) return false;
  if (search.periodo === "atrasadas" && (!due || Date.parse(due) >= now.getTime() || !OPEN.has(activity.status))) return false;
  return true;
}

export default async function AtividadesPage({ searchParams }: { searchParams: Promise<Search> }) {
  const profile = await requirePagePermission("atividades.visualizar");
  const canOperate = profile.papel === "administrador" || profile.papel === "gestor";
  const search = await searchParams; const supabase = await createClient();
  const [tasks, leads, atendimentos, negocios, imoveis, pessoas] = await Promise.all([
    supabase.from("tarefas").select(ACTIVITY_SELECT).eq("ativo", true).order("inicio_planejado_em", { ascending: true, nullsFirst: false }).order("created_at", { ascending: false }),
    supabase.from("leads").select("id, nome").eq("status_operacional", "ativo").order("nome"),
    supabase.from("atendimentos").select("id, assunto").order("created_at", { ascending: false }),
    supabase.from("negocios").select("id, titulo").eq("ativo", true).order("created_at", { ascending: false }),
    supabase.from("imoveis").select("id, codigo").eq("ativo", true).order("created_at", { ascending: false }),
    supabase.from("pessoas").select("id, nome").eq("ativo", true).order("nome"),
  ]);
  const queryError = tasks.error; if (queryError) console.error({ modulo: "crm_atividades", etapa: "list", codigo: queryError.code });
  const activities = ((tasks.data ?? []) as unknown[]).map(normalizeActivity).filter((x): x is ActivityView => x !== null);
  const options: ActivityOptions = { leads: optionRows(leads.data, "nome"), atendimentos: optionRows(atendimentos.data, "assunto"), negocios: optionRows(negocios.data, "titulo"), imoveis: optionRows(imoveis.data, "codigo"), pessoas: optionRows(pessoas.data, "nome") };
  const now = new Date(); const filtered = activities.filter((item) => matches(item, search, now));
  const editing = search.edit && UUID.test(search.edit) ? activities.find((item) => item.id === search.edit && OPEN.has(item.status)) ?? null : null;
  const cards = [
    ["Abertas", activities.filter((x) => OPEN.has(x.status)).length, ListChecks],
    ["Pendentes", activities.filter((x) => x.status === "pendente").length, ClipboardList],
    ["Em andamento", activities.filter((x) => x.status === "em_andamento").length, CalendarClock],
    ["Aguardando", activities.filter((x) => x.status === "aguardando").length, PauseCircle],
    ["Atrasadas", activities.filter((x) => OPEN.has(x.status) && Boolean((x.fim_planejado_em ?? x.inicio_planejado_em) && Date.parse((x.fim_planejado_em ?? x.inicio_planejado_em)!) < now.getTime())).length, AlertTriangle],
    ["Hoje", activities.filter((x) => (x.inicio_planejado_em || x.fim_planejado_em) && new Intl.DateTimeFormat("en-CA", { timeZone: "America/Recife" }).format(new Date((x.inicio_planejado_em ?? x.fim_planejado_em)!)) === new Intl.DateTimeFormat("en-CA", { timeZone: "America/Recife" }).format(now)).length, CalendarDays],
    ["Concluidas", activities.filter((x) => x.status === "concluida").length, CheckCircle2],
  ] as const;
  return <main className="min-h-screen bg-[#F7F3ED] px-6 py-10 sm:px-8"><div className="mx-auto max-w-7xl">
    <div className="flex flex-wrap gap-3"><Link href="/dashboard/crm" className={linkClass}>Voltar ao CRM</Link><Link href="/dashboard/crm/agenda" className={linkClass}>Ver Agenda</Link></div>
    <header className="mt-8 rounded-[2rem] border border-[#E8DDCB] bg-white p-6 shadow-sm sm:p-8"><p className="text-xs font-semibold uppercase tracking-[.18em] text-[#8B6827]">CRM Comercial</p><h1 className="mt-3 text-4xl font-bold text-[#071E36]">Atividades</h1><p className="mt-2 text-[#64736D]">Central operacional canônica de tarefas, compromissos e próximos passos.</p></header>
    <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">{cards.map(([title, count, Icon]) => <article key={title} className="rounded-3xl border border-[#E8DDCB] bg-white p-5"><Icon className="text-[#8B6827]" /><strong className="mt-4 block text-3xl text-[#071E36]">{count}</strong><span className="text-sm text-[#64736D]">{title}</span></article>)}</section>
    {canOperate ? <section className="mt-6"><ActivityForm key={editing?.id ?? "create"} options={options} activity={editing} /></section> : null}
    <form className="mt-6 grid gap-3 rounded-3xl border border-[#E8DDCB] bg-white p-5 md:grid-cols-3 xl:grid-cols-7"><input name="q" defaultValue={search.q} placeholder="Buscar" className={inputClass} /><Select name="tipo" value={search.tipo} label="Todos os tipos" options={ACTIVITY_TYPES} /><Select name="status" value={search.status} label="Todos os estados" options={ACTIVITY_STATUSES} /><Select name="prioridade" value={search.prioridade} label="Todas as prioridades" options={ACTIVITY_PRIORITIES} /><select name="responsavel" defaultValue={search.responsavel ?? ""} className={inputClass}><option value="">Todos os responsaveis</option>{options.pessoas.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}</select><select name="modulo" defaultValue={search.modulo ?? ""} className={inputClass}><option value="">Todos os modulos</option>{["lead","atendimento","negocio","imovel","pessoa"].map((x) => <option key={x} value={x}>{x}</option>)}</select><select name="periodo" defaultValue={search.periodo ?? ""} className={inputClass}><option value="">Qualquer periodo</option><option value="atrasadas">Atrasadas</option><option value="sem_planejamento">Sem planejamento</option></select><button className="rounded-xl bg-[#071E36] px-4 py-2 text-sm font-semibold text-white">Filtrar</button></form>
    {queryError ? <p role="alert" className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">Nao foi possivel carregar as Atividades.</p> : null}
    {!queryError && filtered.length === 0 ? <p className="mt-6 rounded-3xl border border-[#E8DDCB] bg-white p-8 text-center text-[#64736D]">Nenhuma Atividade encontrada.</p> : null}
    <section className="mt-6 grid gap-4">{filtered.map((activity) => <article key={activity.id} className="rounded-3xl border border-[#E8DDCB] bg-white p-5"><div className="grid gap-5 xl:grid-cols-[1.2fr_1fr_240px]"><div><p className="text-xs font-semibold uppercase text-[#8B6827]">{getActivityType(activity.tipo)?.label ?? activity.tipo}</p><h2 className="mt-2 text-xl font-bold text-[#071E36]">{activity.titulo}</h2><p className="mt-2 text-sm text-[#64736D]">{activity.descricao ?? "Sem descricao."}</p><p className="mt-3 text-sm font-medium text-[#071E36]">{formatRecife(activity.inicio_planejado_em)}{activity.fim_planejado_em ? ` ate ${formatRecife(activity.fim_planejado_em)}` : ""}</p></div><div className="grid content-start gap-2 text-sm text-[#64736D]">{[["Lead", activity.lead?.label],["Atendimento", activity.atendimento?.label],["Negocio", activity.negocio?.label],["Imovel", activity.imovel?.label],["Pessoa", activity.pessoa?.label],["Responsavel", activity.responsavel?.label]].filter(([,v]) => v).map(([k,v]) => <p key={k}><strong className="text-[#071E36]">{k}:</strong> {v}</p>)}</div><div className="grid content-start gap-3"><span className="text-sm font-semibold text-[#071E36]">{getActivityStatus(activity.status)?.label} · {getActivityPriority(activity.prioridade)?.label}</span>{canOperate && !isFinalActivityStatus(activity.status) ? <><Link href={`/dashboard/crm/atividades?edit=${activity.id}`} className={linkClass}>Editar</Link><ActivityStateForm activity={activity} /></> : <p className="text-xs text-[#64736D]">{isFinalActivityStatus(activity.status) ? "Estado final: somente leitura." : "Acesso somente para leitura."}</p>}</div></div></article>)}</section>
    {canOperate ? <section className="mt-6 grid gap-4"><h2 className="text-xl font-bold text-[#071E36]">Ações de encerramento</h2>{filtered.map((activity) => <div key={`final-${activity.id}`} className="rounded-2xl border border-[#E8DDCB] bg-white p-4"><p className="font-semibold text-[#071E36]">{activity.titulo}</p><ActivityFinalActions activity={activity} /></div>)}</section> : null}
  </div></main>;
}

function Select({ name, value, label, options }: { name: string; value?: string; label: string; options: readonly { id: string; label: string }[] }) { return <select name={name} defaultValue={value ?? ""} className={inputClass}><option value="">{label}</option>{options.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}</select>; }
const inputClass = "rounded-xl border border-[#E8DDCB] bg-white px-3 py-2.5 text-sm text-[#071E36]";
const linkClass = "inline-flex rounded-xl border border-[#E8DDCB] bg-white px-4 py-2 text-sm font-semibold text-[#071E36]";
