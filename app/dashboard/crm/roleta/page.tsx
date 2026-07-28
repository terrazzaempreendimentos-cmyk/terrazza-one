import Link from "next/link";
import { History, Sparkles, Target, UsersRound, type LucideIcon } from "lucide-react";

import { hasPermission } from "../../../../lib/auth/permissions";
import { requirePagePermission } from "../../../../lib/auth/page-permission";
import { getLeadEntryChannelLabel, getLeadFunnelStageLabel, getLeadTemperatureLabel } from "../../../../lib/crm/leads/catalogs";
import { createClient } from "../../../../lib/supabase/server";
import { DistributionForm } from "./distribution-form";

type Lead = { id: string; nome: string; etapa_funil: string; temperatura: string | null; canal: string | null; created_at: string | null; updated_at: string | null };
type Person = { id: string; nome: string };
type Distribution = { id: string; criterio: string | null; motivo: string | null; status: string | null; created_at: string | null; lead: unknown; corretor: unknown };

function relationName(value: unknown, fallback: string) {
  const relation = Array.isArray(value) ? value[0] : value;
  if (!relation || typeof relation !== "object") return fallback;
  const name = (relation as { nome?: unknown }).nome;
  return typeof name === "string" && name.trim() ? name.trim() : fallback;
}

function formatDate(value: string | null) {
  if (!value) return "Nao informada";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Nao informada";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" }).format(date);
}

function summarize(value: string | null, limit = 120) {
  const text = value?.trim();
  if (!text) return "Sem motivo informado.";
  return text.length > limit ? `${text.slice(0, limit)}...` : text;
}

export default async function RoletaPage() {
  const profile = await requirePagePermission("roleta.visualizar");
  const canDistribute = hasPermission(profile.papel, "leads.distribuir") && hasPermission(profile.papel, "leads.editar") && (profile.papel === "administrador" || profile.papel === "gestor");
  const supabase = await createClient();

  const [leadsResult, peopleResult, historyResult] = await Promise.all([
    supabase.from("leads").select("id, nome, etapa_funil, temperatura, canal, created_at, updated_at").eq("status_operacional", "ativo").in("etapa_funil", ["novo", "qualificacao"]).is("responsavel_id", null).order("created_at", { ascending: true }),
    supabase.from("pessoas").select("id, nome").eq("ativo", true).contains("papeis", ["corretor"]).order("nome", { ascending: true }),
    supabase.from("roleta_distribuicoes").select("id, criterio, motivo, status, created_at, lead:leads!roleta_distribuicoes_lead_id_fkey(nome), corretor:pessoas!roleta_distribuicoes_corretor_pessoa_id_fkey(nome)").not("corretor_pessoa_id", "is", null).order("created_at", { ascending: false }).limit(10),
  ]);

  if (leadsResult.error) console.error({ modulo: "crm_roleta", etapa: "eligible_leads", codigo: leadsResult.error.code });
  if (peopleResult.error) console.error({ modulo: "crm_roleta", etapa: "eligible_people", codigo: peopleResult.error.code });
  if (historyResult.error) console.error({ modulo: "crm_roleta", etapa: "recent_history", codigo: historyResult.error.code });

  const leads = leadsResult.error ? [] : ((leadsResult.data ?? []) as Lead[]);
  const people = peopleResult.error ? [] : ((peopleResult.data ?? []) as Person[]).filter((person) => person.nome.trim());
  const history = historyResult.error ? [] : ((historyResult.data ?? []) as unknown as Distribution[]);
  const operationalError = leadsResult.error || peopleResult.error;

  return (
    <main className="min-h-screen bg-[#F7F3ED] px-6 py-10 sm:px-8">
      <div className="mx-auto max-w-7xl">
        <Link href="/dashboard" className="inline-flex rounded-xl border border-[#E8DDCB] bg-white px-4 py-2 text-sm font-medium text-[#071E36]">Voltar ao Dashboard</Link>
        <header className="mt-8 rounded-[2rem] border border-[#E8DDCB] bg-white p-6 shadow-sm sm:p-8">
          <div className="flex items-start gap-4"><span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#071E36] text-[#E1B866]"><Sparkles size={26} /></span><div><span className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8B6827]">Terrazza CRM</span><h1 className="mt-3 text-4xl font-bold text-[#071E36]">Roleta operacional</h1><p className="mt-2 text-sm text-[#64736D]">Distribuicao canonica, deterministica e atomica de Leads.</p></div></div>
        </header>
        {operationalError ? <p role="alert" className="mt-8 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">Nao foi possivel carregar a fila operacional da Roleta.</p> : null}

        <section className="mt-8 grid gap-4 md:grid-cols-3">
          <SummaryCard icon={Target} label="Leads elegiveis" value={leads.length} />
          <SummaryCard icon={UsersRound} label="Pessoas-corretoras" value={people.length} />
          <SummaryCard icon={History} label="Historico recente" value={history.length} />
        </section>

        <section className="mt-8 grid gap-6 xl:grid-cols-[1.3fr_0.8fr]">
          <div className="rounded-[2rem] border border-[#E8DDCB] bg-white p-6 shadow-sm sm:p-8">
            <h2 className="text-2xl font-semibold text-[#071E36]">Fila aguardando distribuicao</h2>
            <p className="mt-1 text-sm text-[#64736D]">A Pessoa-corretora e escolhida novamente no servidor a cada envio.</p>
            <div className="mt-6 grid gap-4">
              {!operationalError && leads.length === 0 ? <p className="rounded-2xl border border-dashed border-[#E8DDCB] bg-[#F7F3ED] px-4 py-10 text-center text-sm text-[#64736D]">Nenhum Lead elegivel para distribuicao.</p> : null}
              {leads.map((lead) => (
                <article key={lead.id} className="grid gap-5 rounded-3xl border border-[#E8DDCB] bg-[#fffdfa] p-5 lg:grid-cols-[1fr_300px] lg:items-end">
                  <div><h3 className="text-xl font-semibold text-[#071E36]">{lead.nome}</h3><div className="mt-4 flex flex-wrap gap-2 text-xs"><Badge label={getLeadFunnelStageLabel(lead.etapa_funil) ?? "Etapa invalida"} /><Badge label={lead.temperatura ? getLeadTemperatureLabel(lead.temperatura) ?? "Temperatura invalida" : "Sem temperatura"} /><Badge label={getLeadEntryChannelLabel(lead.canal) ?? "Canal nao informado"} /></div><p className="mt-4 text-sm text-[#64736D]">Atualizado em {formatDate(lead.updated_at ?? lead.created_at)}</p><Link href={`/dashboard/crm/leads/${lead.id}`} className="mt-3 inline-flex text-sm font-semibold text-[#8B6827] underline">Abrir Lead</Link></div>
                  {canDistribute ? <DistributionForm leadId={lead.id} disabled={people.length === 0 || Boolean(peopleResult.error)} /> : <p className="rounded-xl bg-[#F7F3ED] px-4 py-3 text-sm text-[#64736D]">Seu perfil possui acesso somente de leitura.</p>}
                </article>
              ))}
            </div>
          </div>

          <aside className="rounded-[2rem] border border-[#E8DDCB] bg-white p-6 shadow-sm sm:p-8">
            <h2 className="text-2xl font-semibold text-[#071E36]">Historico canonico recente</h2>
            <p className="mt-1 text-sm text-[#64736D]">Somente distribuicoes vinculadas a Pessoas-corretoras.</p>
            {historyResult.error ? <p role="alert" className="mt-6 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">Nao foi possivel carregar o historico recente.</p> : null}
            {!historyResult.error && history.length === 0 ? <p className="mt-6 rounded-2xl border border-dashed border-[#E8DDCB] bg-[#F7F3ED] px-4 py-8 text-center text-sm text-[#64736D]">Nenhuma distribuicao canonica registrada.</p> : null}
            <div className="mt-6 space-y-3">{history.map((item) => <article key={item.id} className="rounded-2xl border border-[#E8DDCB] bg-[#fffdfa] p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-semibold text-[#071E36]">{relationName(item.lead, "Lead nao localizado")}</p><p className="mt-1 text-sm text-[#64736D]">{relationName(item.corretor, "Pessoa-corretora nao localizada")}</p></div><Badge label={item.status ?? "Sem status"} /></div><p className="mt-3 text-xs leading-5 text-[#64736D]">{summarize(item.motivo ?? item.criterio)}</p><p className="mt-3 text-xs font-semibold uppercase tracking-[0.12em] text-[#8B6827]">{formatDate(item.created_at)}</p></article>)}</div>
          </aside>
        </section>
      </div>
    </main>
  );
}

function SummaryCard({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: number }) {
  return <article className="rounded-3xl border border-[#E8DDCB] bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#071E36] text-[#E1B866]"><Icon size={20} /></span><strong className="text-3xl text-[#071E36]">{value}</strong></div><h2 className="mt-4 text-sm font-semibold uppercase tracking-[0.12em] text-[#071E36]">{label}</h2></article>;
}

function Badge({ label }: { label: string }) {
  return <span className="rounded-full bg-[#C89B3C]/10 px-3 py-1 font-semibold text-[#8B6827]">{label.replaceAll("_", " ")}</span>;
}
