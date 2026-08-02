import Link from "next/link";
import { AlertTriangle, CalendarDays, CheckCircle2, Clock3 } from "lucide-react";
import { requirePagePermission } from "../../../../lib/auth/page-permission";
import { getActivityPriority, getActivityStatus } from "../../../../lib/crm/atividades/catalogs";
import { ACTIVITY_SELECT, formatRecife, normalizeActivity, type ActivityView } from "../../../../lib/crm/atividades/view-model";
import { createClient } from "../../../../lib/supabase/server";
import { ActivityFinalActions, ActivityStateForm } from "../atividades/activity-forms";

type Search = { periodo?: string; status?: string; responsavel?: string };
const OPEN = new Set(["pendente", "em_andamento", "aguardando"]);
const day = 86_400_000;

function recifeDay(date: Date) { return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Recife" }).format(date); }
function due(activity: ActivityView) { return activity.inicio_planejado_em ?? activity.fim_planejado_em; }

export default async function AgendaPage({ searchParams }: { searchParams: Promise<Search> }) {
  const profile = await requirePagePermission("agenda.visualizar"); const search = await searchParams; const supabase = await createClient();
  const canOperate = profile.papel === "administrador" || profile.papel === "gestor";
  const result = await supabase.from("tarefas").select(ACTIVITY_SELECT).eq("ativo", true).order("inicio_planejado_em", { ascending: true, nullsFirst: false }).order("created_at", { ascending: false });
  if (result.error) console.error({ modulo: "crm_agenda", etapa: "list", codigo: result.error.code });
  const activities = ((result.data ?? []) as unknown[]).map(normalizeActivity).filter((x): x is ActivityView => x !== null);
  const now = new Date(); const today = recifeDay(now); const weekEnd = new Date(now.getTime() + 7 * day);
  const filtered = activities.filter((a) => {
    if (search.status && a.status !== search.status) return false;
    if (search.responsavel && a.responsavel_id !== search.responsavel) return false;
    const value = due(a); if (search.periodo === "sem_planejamento") return !value;
    if (!value) return !search.periodo; const date = new Date(value);
    if (search.periodo === "hoje") return recifeDay(date) === today;
    if (search.periodo === "semana") return date >= now && date <= weekEnd;
    if (search.periodo === "proximas") return date > now;
    if (search.periodo === "atrasadas") return date < now && OPEN.has(a.status);
    return true;
  });
  const responsaveis = Array.from(new Map(activities.filter((a) => a.responsavel).map((a) => [a.responsavel!.id, a.responsavel!])).values());
  const planned = filtered.filter((activity) => due(activity));
  const unplanned = filtered.filter((activity) => !due(activity));
  const counts = { hoje: activities.filter((a) => due(a) && recifeDay(new Date(due(a)!)) === today).length, proximas: activities.filter((a) => due(a) && new Date(due(a)!) >= now && new Date(due(a)!) <= weekEnd).length, atrasadas: activities.filter((a) => due(a) && new Date(due(a)!) < now && OPEN.has(a.status)).length, concluidas: activities.filter((a) => a.status === "concluida").length };
  const cards = [["Hoje", counts.hoje, CalendarDays], ["Proximas", counts.proximas, Clock3], ["Atrasadas", counts.atrasadas, AlertTriangle], ["Concluidas", counts.concluidas, CheckCircle2]] as const;
  return <main className="min-h-screen bg-[#F7F3ED] px-6 py-10 sm:px-8"><div className="mx-auto max-w-7xl">
    <div className="flex gap-3"><Link href="/dashboard" className={linkClass}>Voltar ao Dashboard</Link><Link href="/dashboard/crm/atividades" className={linkClass}>Central de Atividades</Link></div>
    <header className="mt-8 rounded-[2rem] border border-[#E8DDCB] bg-white p-6 sm:p-8"><h1 className="text-4xl font-bold text-[#071E36]">Agenda</h1><p className="mt-2 text-[#64736D]">Visao temporal das Atividades em America/Recife.</p></header>
    <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{cards.map(([title,count,Icon]) => <article key={title} className="rounded-3xl border border-[#E8DDCB] bg-white p-5"><Icon className="text-[#8B6827]"/><strong className="mt-3 block text-3xl text-[#071E36]">{count}</strong><span className="text-sm text-[#64736D]">{title}</span></article>)}</section>
    <form className="mt-6 grid gap-3 rounded-3xl border border-[#E8DDCB] bg-white p-5 sm:grid-cols-3"><select name="periodo" defaultValue={search.periodo ?? ""} className={inputClass}><option value="">Todos os periodos</option><option value="hoje">Hoje</option><option value="semana">Proximos 7 dias</option><option value="proximas">Todas as proximas</option><option value="atrasadas">Atrasadas</option><option value="sem_planejamento">Sem planejamento</option></select><select name="status" defaultValue={search.status ?? ""} className={inputClass}><option value="">Todos os estados</option>{["pendente","em_andamento","aguardando","concluida","cancelada"].map((x) => <option key={x} value={x}>{x.replaceAll("_"," ")}</option>)}</select><select name="responsavel" defaultValue={search.responsavel ?? ""} className={inputClass}><option value="">Todos os responsaveis</option>{responsaveis.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}</select><button className="rounded-xl bg-[#071E36] px-4 py-2 text-sm font-semibold text-white">Filtrar</button></form>
    {result.error ? <p role="alert" className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">Nao foi possivel carregar a Agenda.</p> : null}
    {!result.error && filtered.length === 0 ? <p className="mt-6 rounded-3xl border border-[#E8DDCB] bg-white p-8 text-center text-[#64736D]">Nenhuma Atividade neste periodo.</p> : null}
    {planned.length ? <AgendaGroup title="Atividades planejadas" activities={planned} canOperate={canOperate} /> : null}
    {unplanned.length ? <AgendaGroup title="Sem planejamento" activities={unplanned} canOperate={canOperate} /> : null}
    {canOperate && filtered.some((activity) => activity.status === "concluida" || activity.status === "cancelada") ? <section className="mt-8 grid gap-3"><h2 className="text-xl font-bold text-[#071E36]">Histórico recente</h2>{filtered.filter((activity) => activity.status === "concluida" || activity.status === "cancelada").map((activity) => <div key={`history-${activity.id}`} className="rounded-2xl border border-[#E8DDCB] bg-white p-4"><p className="font-semibold text-[#071E36]">{activity.titulo}</p><ActivityFinalActions activity={activity} /></div>)}</section> : null}
  </div></main>;
}
function AgendaGroup({ title, activities, canOperate }: { title: string; activities: readonly ActivityView[]; canOperate: boolean }) { return <section className="mt-6 grid gap-4"><h2 className="text-xl font-bold text-[#071E36]">{title}</h2>{activities.map((activity) => <article key={activity.id} className="grid gap-4 rounded-3xl border border-[#E8DDCB] bg-white p-5 md:grid-cols-[180px_1fr_240px]"><div><p className="font-bold text-[#071E36]">{formatRecife(due(activity))}</p><p className="text-xs text-[#64736D]">{activity.dia_inteiro ? "Dia inteiro" : "Horario local"}</p></div><div><h3 className="text-lg font-bold text-[#071E36]">{activity.titulo}</h3><p className="mt-1 text-sm text-[#64736D]">{activity.responsavel?.label ?? "Sem responsavel"} · {activity.local ?? "Sem local"}</p><p className="mt-2 text-xs font-semibold text-[#8B6827]">{getActivityStatus(activity.status)?.label} · {getActivityPriority(activity.prioridade)?.label}</p></div><div>{canOperate && OPEN.has(activity.status) ? <ActivityStateForm activity={activity} /> : <p className="text-xs text-[#64736D]">{OPEN.has(activity.status) ? "Acesso somente para leitura." : "Estado final: somente leitura."}</p>}</div></article>)}</section>; }
const inputClass = "rounded-xl border border-[#E8DDCB] bg-white px-3 py-2.5 text-sm text-[#071E36]";
const linkClass = "inline-flex rounded-xl border border-[#E8DDCB] bg-white px-4 py-2 text-sm font-semibold text-[#071E36]";
