import Link from "next/link";
import { History, Settings2, Sparkles, Target, type LucideIcon } from "lucide-react";

import { requireCorretorPessoaId } from "../../../../lib/auth/access-profile";
import { hasPermission } from "../../../../lib/auth/permissions";
import { requirePagePermission } from "../../../../lib/auth/page-permission";
import { getLeadEntryChannelLabel, getLeadFunnelStageLabel, getLeadObjectiveLabel, getLeadTemperatureLabel } from "../../../../lib/crm/leads/catalogs";
import { REASSIGNMENT_ELIGIBLE_STAGES } from "../../../../lib/crm/roleta/reatribuicao";
import { createClient } from "../../../../lib/supabase/server";
import { DistributionForm } from "./distribution-form";
import { TransferAssignmentForm } from "./transfer-assignment-form";

type Lead = { id: string; nome: string; etapa_funil: string; temperatura: string | null; canal: string | null; cidade: string | null; objetivo_imobiliario: string | null; created_at: string | null; updated_at: string | null };
type Person = { id: string; nome: string };
type Configuration = { id: string; pessoa_id: string; participa_roleta: boolean; disponivel: boolean };
type AssignedLead = { id: string; nome: string; etapa_funil: string; status_operacional: string; temperatura: string | null; cidade: string | null; updated_at: string | null; responsavel_id: string; responsavel_pessoa: unknown };
type Distribution = { id: string; criterio: string | null; motivo: string | null; status: string | null; created_at: string | null; reatribuido_em: string | null; lead: unknown; corretor_anterior: unknown; corretor_atual: unknown };

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

function historyCriterionLabel(value: string | null) {
  if (value === "roleta_automatica") return "Roleta automatica";
  if (value === "manual") return "Distribuicao manual";
  if (value === "reatribuicao_manual") return "Reatribuicao manual";
  return "Distribuicao registrada";
}

export default async function RoletaPage() {
  const profile = await requirePagePermission("roleta.visualizar");
  const corretorPessoaId = requireCorretorPessoaId(profile);
  const canDistribute = hasPermission(profile.papel, "leads.distribuir") && hasPermission(profile.papel, "leads.editar") && (profile.papel === "administrador" || profile.papel === "gestor");
  const canManageConfigurations = profile.papel === "administrador" && hasPermission(profile.papel, "configuracoes.administrar");
  const supabase = await createClient();

  const leadsPromise = canDistribute
    ? supabase.from("leads").select("id, nome, etapa_funil, temperatura, canal, cidade, objetivo_imobiliario, created_at, updated_at").eq("status_operacional", "ativo").in("etapa_funil", ["novo", "qualificacao"]).is("responsavel_id", null).order("created_at", { ascending: true })
    : Promise.resolve({ data: [], error: null });
  let historyQuery = supabase.from("roleta_distribuicoes").select("id, criterio, motivo, status, created_at, reatribuido_em, lead:leads!roleta_distribuicoes_lead_id_fkey(nome), corretor_anterior:pessoas!roleta_distribuicoes_corretor_anterior_pessoa_id_fkey(nome), corretor_atual:pessoas!roleta_distribuicoes_corretor_pessoa_id_fkey(nome)").not("corretor_pessoa_id", "is", null).order("created_at", { ascending: false }).limit(10);
  if (profile.papel === "corretor") historyQuery = historyQuery.eq("corretor_pessoa_id", corretorPessoaId!);
  const [leadsResult, historyResult] = await Promise.all([leadsPromise, historyQuery]);

  if (leadsResult.error) console.error({ modulo: "crm_roleta", etapa: "eligible_leads", codigo: leadsResult.error.code });
  if (historyResult.error) console.error({ modulo: "crm_roleta", etapa: "recent_history", codigo: historyResult.error.code });

  const leads = leadsResult.error ? [] : ((leadsResult.data ?? []) as Lead[]);
  const history = historyResult.error ? [] : ((historyResult.data ?? []) as unknown as Distribution[]);

  let assignedLeads: AssignedLead[] = [];
  let transferPeople: Person[] = [];
  let assignedLoadError = false;

  if (canDistribute || profile.papel === "corretor") {
    let assignedQuery = supabase.from("leads").select("id, nome, etapa_funil, status_operacional, temperatura, cidade, updated_at, responsavel_id, responsavel_pessoa:pessoas!leads_responsavel_id_fkey(nome)").eq("status_operacional", "ativo").in("etapa_funil", [...REASSIGNMENT_ELIGIBLE_STAGES]).not("responsavel_id", "is", null).order("updated_at", { ascending: false });
    if (profile.papel === "corretor") assignedQuery = assignedQuery.eq("responsavel_id", corretorPessoaId!);
    const transferPeoplePromise = canDistribute
      ? supabase.from("pessoas").select("id, nome").eq("ativo", true).contains("papeis", ["corretor"]).order("nome", { ascending: true })
      : Promise.resolve({ data: [], error: null });
    const [assignedResult, transferPeopleResult] = await Promise.all([
      assignedQuery,
      transferPeoplePromise,
    ]);
    if (assignedResult.error) console.error({ modulo: "crm_roleta", etapa: "assigned_leads", codigo: assignedResult.error.code });
    if (transferPeopleResult.error) console.error({ modulo: "crm_roleta", etapa: "reassignment_people", codigo: transferPeopleResult.error.code });
    assignedLoadError = Boolean(assignedResult.error || transferPeopleResult.error);
    assignedLeads = assignedResult.error ? [] : ((assignedResult.data ?? []) as unknown as AssignedLead[]);
    transferPeople = transferPeopleResult.error ? [] : ((transferPeopleResult.data ?? []) as Person[]).filter((person) => person.nome.trim());
  }

  let people: Person[] = [];
  let configurations: Configuration[] = [];
  let configurationLoadError = false;

  if (canManageConfigurations) {
    const [peopleResult, configurationsResult] = await Promise.all([
      supabase.from("pessoas").select("id, nome").eq("ativo", true).contains("papeis", ["corretor"]).order("nome", { ascending: true }),
      supabase.from("corretores_configuracoes").select("id, pessoa_id, participa_roleta, disponivel").order("created_at", { ascending: true }),
    ]);
    if (peopleResult.error) console.error({ modulo: "crm_roleta", etapa: "configuration_people", codigo: peopleResult.error.code });
    if (configurationsResult.error) console.error({ modulo: "crm_roleta", etapa: "configuration_list", codigo: configurationsResult.error.code });
    configurationLoadError = Boolean(peopleResult.error || configurationsResult.error);
    people = peopleResult.error ? [] : ((peopleResult.data ?? []) as Person[]).filter((person) => person.nome.trim());
    configurations = configurationsResult.error ? [] : ((configurationsResult.data ?? []) as unknown as Configuration[]);
  }

  const participants = configurations.filter((configuration) => configuration.participa_roleta).length;
  const available = configurations.filter((configuration) => configuration.participa_roleta && configuration.disponivel).length;
  const configuredPersonIds = new Set(configurations.map((configuration) => configuration.pessoa_id));
  const pendingConfigurations = people.filter((person) => !configuredPersonIds.has(person.id)).length;

  return (
    <main className="min-h-screen bg-[#F7F3ED] px-6 py-10 sm:px-8">
      <div className="mx-auto max-w-7xl">
        <Link href="/dashboard" className="inline-flex rounded-xl border border-[#E8DDCB] bg-white px-4 py-2 text-sm font-medium text-[#071E36]">Voltar ao Dashboard</Link>
        <header className="mt-8 rounded-[2rem] border border-[#E8DDCB] bg-white p-6 shadow-sm sm:p-8"><div className="flex items-start gap-4"><span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#071E36] text-[#E1B866]"><Sparkles size={26} /></span><div><span className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8B6827]">Terrazza CRM</span><h1 className="mt-3 text-4xl font-bold text-[#071E36]">Roleta inteligente</h1><p className="mt-2 text-sm text-[#64736D]">Selecao automatica, ponderada e atomica dentro do PostgreSQL.</p></div></div></header>

        {leadsResult.error ? <p role="alert" className="mt-8 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">Nao foi possivel carregar a fila operacional da Roleta.</p> : null}

        <section className="mt-8 grid gap-4 md:grid-cols-2">
          <SummaryCard icon={Target} label="Leads elegiveis" value={leads.length} />
          <SummaryCard icon={History} label="Historico recente" value={history.length} />
        </section>

        <section className="mt-8 rounded-[2rem] border border-[#E8DDCB] bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div className="flex items-start gap-3"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#071E36] text-[#E1B866]"><Settings2 size={20} /></span><div><h2 className="text-2xl font-semibold text-[#071E36]">Equipe da Roleta</h2><p className="mt-1 text-sm text-[#64736D]">Resumo operacional da equipe configurada para distribuicao.</p></div></div>{canManageConfigurations ? <Link href="/dashboard/corretores?secao=roleta#roleta" className="inline-flex rounded-xl bg-[#071E36] px-4 py-2.5 text-sm font-semibold text-white">Gerenciar corretores</Link> : null}</div>
          {canManageConfigurations ? <><div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5"><MiniIndicator label="Pessoas-corretoras ativas" value={people.length} /><MiniIndicator label="Configuracoes criadas" value={configurations.length} /><MiniIndicator label="Participantes" value={participants} /><MiniIndicator label="Disponiveis" value={available} /><MiniIndicator label="Pendentes" value={pendingConfigurations} /></div>{configurationLoadError ? <p role="alert" className="mt-6 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">Nao foi possivel carregar o resumo da equipe.</p> : null}</> : <p className="mt-5 rounded-xl bg-[#F7F3ED] px-4 py-4 text-sm text-[#64736D]">Configuracao administrada pela gestao.</p>}
        </section>

        {canDistribute || profile.papel === "corretor" ? (
          <section className="mt-8 rounded-[2rem] border border-[#E8DDCB] bg-white p-6 shadow-sm sm:p-8">
            <h2 className="text-2xl font-semibold text-[#071E36]">Atendimentos atribuidos</h2>
            <p className="mt-1 text-sm text-[#64736D]">Transferencia administrativa entre Pessoas-corretoras, com motivo e registro atomico.</p>
            {assignedLoadError ? <p role="alert" className="mt-6 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">Nao foi possivel carregar os atendimentos atribuidos.</p> : null}
            {!assignedLoadError && assignedLeads.length === 0 ? <p className="mt-6 rounded-2xl border border-dashed border-[#E8DDCB] bg-[#F7F3ED] px-4 py-8 text-center text-sm text-[#64736D]">Nenhum atendimento elegivel para transferencia.</p> : null}
            <div className="mt-6 grid gap-4">{assignedLeads.map((lead) => {
              const responsibleName = relationName(lead.responsavel_pessoa, "Pessoa-corretora nao localizada");
              return <article key={lead.id} className="grid gap-5 rounded-3xl border border-[#E8DDCB] bg-[#fffdfa] p-5 lg:grid-cols-[1fr_360px] lg:items-start"><div><h3 className="text-xl font-semibold text-[#071E36]">{lead.nome}</h3><div className="mt-3 flex flex-wrap gap-2 text-xs"><Badge label={getLeadFunnelStageLabel(lead.etapa_funil) ?? "Etapa invalida"} /><Badge label={lead.temperatura ? getLeadTemperatureLabel(lead.temperatura) ?? "Temperatura invalida" : "Sem temperatura"} /></div><dl className="mt-4 grid gap-1 text-sm text-[#64736D]"><div><dt className="inline font-semibold text-[#071E36]">Responsavel: </dt><dd className="inline">{responsibleName}</dd></div><div><dt className="inline font-semibold text-[#071E36]">Cidade: </dt><dd className="inline">{lead.cidade || "Nao informada"}</dd></div><div><dt className="inline font-semibold text-[#071E36]">Atualizado: </dt><dd className="inline">{formatDate(lead.updated_at)}</dd></div></dl><Link href={`/dashboard/crm/leads/${lead.id}`} className="mt-3 inline-flex text-sm font-semibold text-[#8B6827] underline">Abrir Lead</Link></div>{canDistribute ? <TransferAssignmentForm leadId={lead.id} currentResponsibleId={lead.responsavel_id} currentResponsibleName={responsibleName} people={transferPeople} /> : null}</article>;
            })}</div>
          </section>
        ) : null}

        <section className={`mt-8 grid gap-6 ${canDistribute ? "xl:grid-cols-[1.3fr_0.8fr]" : ""}`}>
          {canDistribute ? (
          <div className="rounded-[2rem] border border-[#E8DDCB] bg-white p-6 shadow-sm sm:p-8">
            <h2 className="text-2xl font-semibold text-[#071E36]">Fila aguardando distribuicao</h2><p className="mt-1 text-sm text-[#64736D]">A aplicacao envia apenas o Lead; a Pessoa-corretora e escolhida atomicamente pelo banco.</p>
            <div className="mt-6 grid gap-4">
              {!leadsResult.error && leads.length === 0 ? <p className="rounded-2xl border border-dashed border-[#E8DDCB] bg-[#F7F3ED] px-4 py-10 text-center text-sm text-[#64736D]">Nenhum Lead elegivel para distribuicao.</p> : null}
              {leads.map((lead) => <article key={lead.id} className="grid gap-5 rounded-3xl border border-[#E8DDCB] bg-[#fffdfa] p-5 lg:grid-cols-[1fr_320px] lg:items-end"><div><h3 className="text-xl font-semibold text-[#071E36]">{lead.nome}</h3><div className="mt-4 flex flex-wrap gap-2 text-xs"><Badge label={getLeadFunnelStageLabel(lead.etapa_funil) ?? "Etapa invalida"} /><Badge label={lead.temperatura ? getLeadTemperatureLabel(lead.temperatura) ?? "Temperatura invalida" : "Sem temperatura"} /><Badge label={getLeadEntryChannelLabel(lead.canal) ?? "Canal nao informado"} /></div><dl className="mt-4 grid gap-1 text-sm text-[#64736D]"><div><dt className="inline font-semibold text-[#071E36]">Cidade: </dt><dd className="inline">{lead.cidade || "Nao informada"}</dd></div><div><dt className="inline font-semibold text-[#071E36]">Objetivo: </dt><dd className="inline">{getLeadObjectiveLabel(lead.objetivo_imobiliario) ?? "Nao informado"}</dd></div><div><dt className="inline font-semibold text-[#071E36]">Atualizado: </dt><dd className="inline">{formatDate(lead.updated_at ?? lead.created_at)}</dd></div></dl><Link href={`/dashboard/crm/leads/${lead.id}`} className="mt-3 inline-flex text-sm font-semibold text-[#8B6827] underline">Abrir Lead</Link></div>{canDistribute ? <DistributionForm leadId={lead.id} /> : <p className="rounded-xl bg-[#F7F3ED] px-4 py-3 text-sm text-[#64736D]">Seu perfil possui acesso somente de leitura.</p>}</article>)}
            </div>
          </div>) : null}

          <aside className="rounded-[2rem] border border-[#E8DDCB] bg-white p-6 shadow-sm sm:p-8">
            <h2 className="text-2xl font-semibold text-[#071E36]">Historico canonico recente</h2><p className="mt-1 text-sm text-[#64736D]">Distribuicoes vinculadas a Pessoas-corretoras.</p>
            {historyResult.error ? <p role="alert" className="mt-6 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">Nao foi possivel carregar o historico recente.</p> : null}
            {!historyResult.error && history.length === 0 ? <p className="mt-6 rounded-2xl border border-dashed border-[#E8DDCB] bg-[#F7F3ED] px-4 py-8 text-center text-sm text-[#64736D]">Nenhuma distribuicao canonica registrada.</p> : null}
            <div className="mt-6 space-y-3">{history.map((item) => <article key={item.id} className="rounded-2xl border border-[#E8DDCB] bg-[#fffdfa] p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-semibold text-[#071E36]">{relationName(item.lead, "Lead nao localizado")}</p>{item.criterio === "reatribuicao_manual" ? <p className="mt-1 text-sm text-[#64736D]">{relationName(item.corretor_anterior, "Pessoa nao disponivel")} → {relationName(item.corretor_atual, "Pessoa nao disponivel")}</p> : <p className="mt-1 text-sm text-[#64736D]">{relationName(item.corretor_atual, "Pessoa nao disponivel")}</p>}</div><Badge label={historyCriterionLabel(item.criterio)} /></div>{canDistribute ? <p className="mt-3 text-xs leading-5 text-[#64736D]">{summarize(item.motivo)}</p> : null}<p className="mt-3 text-xs font-semibold uppercase tracking-[0.12em] text-[#8B6827]">{formatDate(item.reatribuido_em ?? item.created_at)} · {item.status ?? "sem status"}</p></article>)}</div>
          </aside>
        </section>
      </div>
    </main>
  );
}

function SummaryCard({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: number }) {
  return <article className="rounded-3xl border border-[#E8DDCB] bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#071E36] text-[#E1B866]"><Icon size={20} /></span><strong className="text-3xl text-[#071E36]">{value}</strong></div><h2 className="mt-4 text-sm font-semibold uppercase tracking-[0.12em] text-[#071E36]">{label}</h2></article>;
}

function MiniIndicator({ label, value }: { label: string; value: number }) {
  return <div className="rounded-2xl bg-[#F7F3ED] p-4"><strong className="text-2xl text-[#071E36]">{value}</strong><p className="mt-1 text-xs text-[#64736D]">{label}</p></div>;
}

function Badge({ label }: { label: string }) {
  return <span className="rounded-full bg-[#C89B3C]/10 px-3 py-1 font-semibold text-[#8B6827]">{label.replaceAll("_", " ")}</span>;
}
