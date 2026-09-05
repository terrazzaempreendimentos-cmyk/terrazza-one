import Link from "next/link";
import { BarChart3, Clock3, Flame, Plus, Search, UserCheck } from "lucide-react";

import { ConfirmSubmitButton } from "../../../../components/ConfirmSubmitButton";
import { requireCorretorPessoaId } from "../../../../lib/auth/access-profile";
import { requirePagePermission } from "../../../../lib/auth/page-permission";
import {
  getLeadEntryChannelLabel,
  getLeadFunnelStageLabel,
  getLeadHandoffStateLabel,
  getLeadOperationalStatusLabel,
  getLeadRelationshipTypeLabel,
  getLeadTemperatureLabel,
  LEAD_ENTRY_CHANNELS,
  LEAD_FUNNEL_STAGES,
  LEAD_OPERATIONAL_STATUSES,
  LEAD_RELATIONSHIP_TYPES,
  LEAD_TEMPERATURES,
} from "../../../../lib/crm/leads/catalogs";
import { hasPapel } from "../../../../lib/crm/pessoas/papeis";
import { createClient } from "../../../../lib/supabase/server";
import { archiveLead, createLead, updateLead } from "./actions";
import { LeadForm, type LeadFormValue } from "./lead-form";

type SearchParams = Record<string, string | string[] | undefined>;

type Lead = LeadFormValue & {
  responsavel: string | null;
  responsavel_pessoa: unknown;
  created_at: string | null;
};

type ResponsiblePerson = {
  id: string;
  nome: string | null;
  ativo: boolean | null;
  papeis: string[] | null;
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function paramValue(searchParams: SearchParams, key: string) {
  const value = searchParams[key];
  return Array.isArray(value) ? value[0] : value;
}

function normalizeText(value: unknown) {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function formatDate(value: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(new Date(value));
}

function relationName(value: unknown): string | null {
  const relation = Array.isArray(value) ? value[0] : value;
  if (!relation || typeof relation !== "object") return null;
  const name = (relation as { nome?: unknown }).nome;
  return typeof name === "string" && name.trim() ? name.trim() : null;
}

function badgeClass(kind: "temperature" | "channel" | "status" | "handoff") {
  const classes = {
    temperature: "bg-amber-50 text-amber-700 ring-amber-100",
    channel: "bg-[#C89B3C]/10 text-[#8B6827] ring-[#C89B3C]/20",
    status: "bg-[#F7F3ED] text-[#071E36] ring-[#E8DDCB]",
    handoff: "bg-[#071E36] text-[#E1B866] ring-[#071E36]/20",
  };
  return `rounded-full px-3 py-1 text-xs font-semibold ring-1 ${classes[kind]}`;
}

function nextAction(lead: Lead) {
  if (lead.status_operacional === "arquivado") return "Lead arquivado";
  if (lead.etapa_funil === "fechado") return "Registrar pos-atendimento";
  if (lead.etapa_funil === "perdido") return "Aguardar eventual reabertura autorizada";
  if (lead.etapa_funil === "qualificacao") return "Concluir qualificacao";
  if (lead.etapa_funil === "atendimento") return "Continuar atendimento";
  return "Avancar proxima etapa";
}

export default async function LeadsPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const profile = await requirePagePermission("leads.visualizar");
  const corretorPessoaId = requireCorretorPessoaId(profile);
  const supabase = await createClient();
  const params = (await searchParams) ?? {};

  const busca = paramValue(params, "busca") ?? "";
  const filtroEtapa = paramValue(params, "etapa") ?? "";
  const filtroStatus = paramValue(params, "status") ?? "";
  const filtroCanal = paramValue(params, "canal") ?? "";
  const filtroTipo = paramValue(params, "tipo") ?? "";
  const filtroResponsavel = paramValue(params, "responsavel_id") ?? "";
  const filtroTemperatura = paramValue(params, "temperatura") ?? "";
  const editId = paramValue(params, "edit") ?? "";
  const editRequested = Boolean(editId);
  const editIdValid = UUID_PATTERN.test(editId);

  let listPromise = supabase
    .from("leads")
    .select(
      "id, nome, telefone, email, cidade, bairro_interesse, tipo_relacionamento, objetivo_imobiliario, canal, origem_detalhe, etapa_funil, status_operacional, temperatura, handoff_status, responsavel_id, atribuido_em, responsavel, observacao, created_at, responsavel_pessoa:pessoas!leads_responsavel_id_fkey(id, nome)",
    )
    .order("created_at", { ascending: false });
  if (profile.papel === "corretor") listPromise = listPromise.eq("responsavel_id", corretorPessoaId!);
  let responsiblePromise = supabase
    .from("pessoas")
    .select("id, nome, ativo, papeis")
    .eq("ativo", true)
    .contains("papeis", ["corretor"])
    .order("nome", { ascending: true });
  if (profile.papel === "corretor") responsiblePromise = responsiblePromise.eq("id", corretorPessoaId!);
  let editQuery = supabase
        .from("leads")
        .select(
          "id, nome, telefone, email, cidade, bairro_interesse, tipo_relacionamento, objetivo_imobiliario, canal, origem_detalhe, etapa_funil, status_operacional, temperatura, handoff_status, responsavel_id, observacao",
        )
        .eq("id", editId);
  if (profile.papel === "corretor") editQuery = editQuery.eq("responsavel_id", corretorPessoaId!);
  const editPromise = editRequested && editIdValid
    ? editQuery.maybeSingle()
    : Promise.resolve({ data: null, error: null });

  const [listResult, responsibleResult, editResult] = await Promise.all([
    listPromise,
    responsiblePromise,
    editPromise,
  ]);

  const leads = (listResult.data ?? []) as unknown as Lead[];
  const responsibleOptions = ((responsibleResult.data ?? []) as unknown as ResponsiblePerson[])
    .filter((person) => person.ativo === true && Boolean(person.nome?.trim()) && hasPapel(person, "corretor"))
    .map((person) => ({ id: person.id, nome: person.nome!.trim() }));
  const leadEmEdicao = editResult.data as unknown as LeadFormValue | null;
  const editError = editRequested && (!editIdValid || Boolean(editResult.error) || !leadEmEdicao);

  if (listResult.error) {
    console.error({ modulo: "crm_leads", etapa: "list", codigo: listResult.error.code });
  }
  if (responsibleResult.error) {
    console.error({ modulo: "crm_leads", etapa: "responsible_list", codigo: responsibleResult.error.code });
  }
  if (editResult.error) {
    console.error({ modulo: "crm_leads", etapa: "edit_load", codigo: editResult.error.code });
  }

  const filteredLeads = leads.filter((lead) => {
    const responsibleName = relationName(lead.responsavel_pessoa) ?? lead.responsavel;
    const searchable = normalizeText([
      lead.nome,
      lead.telefone,
      lead.email,
      lead.cidade,
      lead.bairro_interesse,
      lead.tipo_relacionamento,
      lead.objetivo_imobiliario,
      lead.canal,
      lead.origem_detalhe,
      lead.etapa_funil,
      lead.status_operacional,
      lead.temperatura,
      responsibleName,
      lead.observacao,
    ].join(" "));

    return (
      (!busca || searchable.includes(normalizeText(busca))) &&
      (!filtroEtapa || lead.etapa_funil === filtroEtapa) &&
      (!filtroStatus || lead.status_operacional === filtroStatus) &&
      (!filtroCanal || lead.canal === filtroCanal) &&
      (!filtroTipo || lead.tipo_relacionamento === filtroTipo) &&
      (!filtroResponsavel || lead.responsavel_id === filtroResponsavel) &&
      (!filtroTemperatura || lead.temperatura === filtroTemperatura)
    );
  });

  const summary = [
    { title: "Total", value: leads.length, description: "Leads na base comercial", icon: BarChart3 },
    { title: "Novos", value: leads.filter((lead) => lead.etapa_funil === "novo").length, description: "Aguardando primeira acao", icon: Plus },
    { title: "Quentes", value: leads.filter((lead) => lead.temperatura === "quente").length, description: "Com potencial imediato", icon: Flame },
    { title: "Em qualificacao", value: leads.filter((lead) => lead.etapa_funil === "qualificacao").length, description: "Coleta de contexto", icon: Clock3 },
    { title: "Convertidos", value: leads.filter((lead) => lead.status_operacional === "convertido").length, description: "Fechados na operacao", icon: UserCheck },
  ];

  return (
    <main className="min-h-screen bg-[#F7F3ED] px-6 py-10 sm:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="rounded-[2rem] border border-[#E8DDCB] bg-white p-6 shadow-sm sm:p-8">
          <span className="rounded-full border border-[#C89B3C]/35 bg-[#C89B3C]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#8B6827]">Terrazza CRM</span>
          <h1 className="mt-5 text-4xl font-bold tracking-tight text-[#071E36]">Leads Premium</h1>
          <p className="mt-2 max-w-3xl leading-6 text-[#64736D]">Cadastro manual canonico com funil, status, temperatura, handoff e responsavel por Pessoa.</p>
        </header>

        <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {summary.map((card) => {
            const Icon = card.icon;
            return <article key={card.title} className="rounded-3xl border border-[#E8DDCB] bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#071E36] text-[#E1B866]"><Icon size={20} /></span><strong className="text-3xl text-[#071E36]">{card.value}</strong></div><h2 className="mt-4 text-sm font-semibold uppercase tracking-[0.14em] text-[#071E36]">{card.title}</h2><p className="mt-1 text-sm text-[#64736D]">{card.description}</p></article>;
          })}
        </section>

        <section className="mt-8 rounded-[2rem] border border-[#E8DDCB] bg-white p-6 shadow-sm sm:p-8">
          <div className="flex items-end justify-between gap-4">
            <div><h2 className="text-xl font-semibold text-[#071E36]">{leadEmEdicao ? "Editar lead" : "Novo lead manual"}</h2><p className="mt-1 text-sm text-[#64736D]">Os campos comerciais usam exclusivamente os catalogos canonicos.</p></div>
            {editRequested ? <Link href="/dashboard/crm/leads" className="rounded-xl border border-[#E8DDCB] px-4 py-2 text-sm font-semibold text-[#071E36]">Cancelar edicao</Link> : null}
          </div>
          {editError ? (
            <p role="alert" className="mt-6 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">Lead nao encontrado para edicao.</p>
          ) : (
            <LeadForm key={leadEmEdicao?.id ?? "novo"} action={leadEmEdicao ? updateLead : createLead} lead={leadEmEdicao} responsaveis={responsibleOptions} />
          )}
          {responsibleResult.error ? <p role="alert" className="mt-4 text-sm text-red-700">Nao foi possivel carregar os responsaveis comerciais.</p> : null}
        </section>

        <section className="mt-8 rounded-[2rem] border border-[#E8DDCB] bg-white p-6 shadow-sm sm:p-8">
          <div className="flex items-end justify-between gap-4"><div><h2 className="text-xl font-semibold text-[#071E36]">Leads cadastrados</h2><p className="mt-1 text-sm text-[#64736D]">Busca e filtros sobre os campos canonicos.</p></div><span className="rounded-full bg-[#C89B3C]/10 px-3 py-1 text-sm text-[#8B6827]">{filteredLeads.length} de {leads.length}</span></div>
          <form className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4" action="/dashboard/crm/leads">
            <label className="relative xl:col-span-2"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9a9d98]" /><input name="busca" defaultValue={busca} placeholder="Buscar lead..." className="w-full rounded-xl border border-[#E8DDCB] py-3 pl-9 pr-3 text-sm" /></label>
            <FilterSelect name="tipo" label="Tipo" value={filtroTipo} items={LEAD_RELATIONSHIP_TYPES} />
            <FilterSelect name="etapa" label="Etapa" value={filtroEtapa} items={LEAD_FUNNEL_STAGES} />
            <FilterSelect name="status" label="Status" value={filtroStatus} items={LEAD_OPERATIONAL_STATUSES} />
            <FilterSelect name="canal" label="Canal" value={filtroCanal} items={LEAD_ENTRY_CHANNELS} />
            <FilterSelect name="temperatura" label="Temperatura" value={filtroTemperatura} items={LEAD_TEMPERATURES} />
            <select name="responsavel_id" defaultValue={filtroResponsavel} className="rounded-xl border border-[#E8DDCB] bg-white px-3 py-3 text-sm"><option value="">Responsavel</option>{responsibleOptions.map((person) => <option key={person.id} value={person.id}>{person.nome}</option>)}</select>
            <button type="submit" className="rounded-xl bg-[#071E36] px-5 py-3 text-sm font-semibold text-white">Filtrar</button>
          </form>

          {listResult.error ? <p role="alert" className="mt-6 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">Nao foi possivel carregar os leads.</p> : filteredLeads.length === 0 ? <p className="mt-6 rounded-xl bg-[#F7F3ED] px-4 py-8 text-center text-sm text-[#64736D]">Nenhum lead encontrado.</p> : (
            <div className="mt-6 grid gap-4">
              {filteredLeads.map((lead) => {
                const responsibleName = relationName(lead.responsavel_pessoa) ?? lead.responsavel ?? "-";
                return <article key={lead.id} className="rounded-3xl border border-[#E8DDCB] bg-[#fffdfa] p-5 shadow-sm">
                  <div className="grid gap-5 xl:grid-cols-[1.3fr_1fr_auto]">
                    <div><Link href={`/dashboard/crm/leads/${lead.id}`} className="text-xl font-semibold text-[#071E36] hover:text-[#8B6827]">{lead.nome}</Link><p className="mt-1 text-sm text-[#64736D]">{lead.telefone || "Telefone nao informado"} · {lead.email || "E-mail nao informado"} · {lead.cidade || "Cidade nao informada"}</p><div className="mt-3 flex flex-wrap gap-2"><span className={badgeClass("channel")}>{getLeadEntryChannelLabel(lead.canal) ?? "Canal invalido"}</span>{lead.temperatura ? <span className={badgeClass("temperature")}>{getLeadTemperatureLabel(lead.temperatura)}</span> : null}<span className={badgeClass("handoff")}>{getLeadHandoffStateLabel(lead.handoff_status) ?? "Handoff invalido"}</span></div><p className="mt-4 text-sm text-[#64736D]">{lead.observacao || "Sem observacao operacional."}</p></div>
                    <div className="grid gap-2 text-sm"><Info label="Etapa" value={getLeadFunnelStageLabel(lead.etapa_funil) ?? "Invalida"} /><Info label="Status" value={getLeadOperationalStatusLabel(lead.status_operacional) ?? "Invalido"} /><Info label="Tipo" value={getLeadRelationshipTypeLabel(lead.tipo_relacionamento) ?? "-"} /><Info label="Responsavel" value={responsibleName} /><Info label="Criado em" value={formatDate(lead.created_at)} /></div>
                    <div className="min-w-[220px] rounded-2xl border border-[#E8DDCB] bg-white p-4"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8B6827]">Proxima acao</p><p className="mt-2 text-sm font-semibold text-[#071E36]">{nextAction(lead)}</p></div>
                  </div>
                  <div className="mt-5 flex flex-wrap gap-2 border-t border-[#E8DDCB] pt-4"><Link href={`/dashboard/crm/leads/${lead.id}`} className="rounded-full border border-[#E8DDCB] px-3 py-1 text-xs font-semibold">Visualizar</Link><Link href={`/dashboard/crm/leads?edit=${lead.id}`} className="rounded-full border border-[#E8DDCB] px-3 py-1 text-xs font-semibold">Editar</Link><form action={archiveLead}><input type="hidden" name="id" value={lead.id} /><ConfirmSubmitButton message="Arquivar este lead?" className="rounded-full border border-red-100 bg-red-50 px-3 py-1 text-xs font-semibold text-red-700">Arquivar</ConfirmSubmitButton></form></div>
                </article>;
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function FilterSelect({ name, label, value, items }: { name: string; label: string; value: string; items: readonly { id: string; label: string }[] }) {
  return <select name={name} defaultValue={value} className="rounded-xl border border-[#E8DDCB] bg-white px-3 py-3 text-sm"><option value="">{label}</option>{items.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select>;
}

function Info({ label, value }: { label: string; value: string }) {
  return <span className="rounded-2xl bg-white px-3 py-2 text-[#64736D]"><strong className="text-[#071E36]">{label}:</strong> {value}</span>;
}
