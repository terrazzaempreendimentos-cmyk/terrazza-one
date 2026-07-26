import Link from "next/link";
import { revalidatePath } from "next/cache";
import {
  ArrowRight,
  BadgeCheck,
  Clock3,
  History,
  MapPin,
  Search,
  Sparkles,
  Target,
  TrendingUp,
  UsersRound,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { requirePermission } from "../../../../lib/auth/access-profile";
import { requirePagePermission } from "../../../../lib/auth/page-permission";
import {
  getCorretorUnificadoPorId,
  getCorretoresUnificados,
  type CorretorUnificado,
} from "../../../../lib/crm/corretores/getCorretoresUnificados";
import { supabase } from "../../../../lib/supabase";

type SearchParams = Record<string, string | string[] | undefined>;

type Lead = {
  id: string;
  nome: string;
  telefone: string | null;
  tipo_lead: string | null;
  objetivo: string | null;
  cidade: string | null;
  origem: string | null;
  status: string | null;
};

type Distribuicao = {
  id: string;
  lead_id: string | null;
  corretor_id: string | null;
  criterio: string | null;
  motivo: string | null;
  status: string | null;
  created_at: string | null;
};

function paramValue(searchParams: SearchParams, key: string) {
  const value = searchParams[key];
  return Array.isArray(value) ? value[0] : value;
}

function valorTexto(formData: FormData, campo: string) {
  return String(formData.get(campo) ?? "").trim();
}

function normalizarTexto(value: unknown) {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function labelTexto(valor: string | null | undefined) {
  if (!valor) return "-";
  return valor.replaceAll("_", " ");
}

function formatarData(data: string | null) {
  if (!data) return "-";

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(data));
}

function badgeDisponibilidade(disponibilidade: string | null) {
  switch (disponibilidade) {
    case "ocupado":
      return { label: "Ocupado", className: "bg-amber-50 text-amber-700 ring-amber-100" };
    case "fora_expediente":
      return {
        label: "Fora do expediente",
        className: "bg-slate-100 text-slate-600 ring-slate-200",
      };
    case "disponivel":
    default:
      return {
        label: "Disponivel",
        className: "bg-emerald-50 text-emerald-700 ring-emerald-100",
      };
  }
}

function badgeConversao(taxa: number | null) {
  const valor = Number(taxa ?? 0);

  if (valor >= 60) return { label: "Alta", className: "bg-emerald-50 text-emerald-700 ring-emerald-100" };
  if (valor >= 30) return { label: "Media", className: "bg-sky-50 text-sky-700 ring-sky-100" };
  return { label: "Baixa", className: "bg-slate-100 text-slate-600 ring-slate-200" };
}

function formatarTaxa(taxa: number | null) {
  if (taxa === null || taxa === undefined) return "-";

  return `${Number(taxa).toLocaleString("pt-BR", {
    maximumFractionDigits: 1,
  })}%`;
}

function scoreCorretor(corretor: CorretorUnificado) {
  const conversao = Math.min(Number(corretor.taxa_conversao ?? 0), 100);
  const peso = Math.min(Number(corretor.peso_roleta ?? 1) * 10, 30);
  const disponibilidade = corretor.disponibilidade === "disponivel" ? 20 : 0;
  const velocidade = Math.max(0, 20 - Number(corretor.tempo_medio_resposta_min ?? 20) / 2);

  return Math.min(100, Math.round(conversao * 0.45 + peso + disponibilidade + velocidade));
}

export default async function RoletaPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  await requirePagePermission("roleta.visualizar");

  const resolvedSearchParams = (await searchParams) ?? {};
  const busca = paramValue(resolvedSearchParams, "busca") ?? "";
  const filtroCidade = paramValue(resolvedSearchParams, "cidade") ?? "";
  const filtroTipoLead = paramValue(resolvedSearchParams, "tipo_lead") ?? "";
  const filtroStatus = paramValue(resolvedSearchParams, "status") ?? "";
  const filtroCorretor = paramValue(resolvedSearchParams, "corretor") ?? "";

  async function distribuirLead(formData: FormData) {
    "use server";
    await requirePermission("leads.distribuir");

    const leadId = valorTexto(formData, "lead_id");
    const corretorId = valorTexto(formData, "corretor_id");

    if (!leadId || !corretorId) {
      throw new Error("Selecione um lead e um corretor para distribuir.");
    }

    const [{ data: lead, error: leadError }, corretoresResult] = await Promise.all([
      supabase.from("leads").select("id, nome").eq("id", leadId).single(),
      getCorretoresUnificados(),
    ]);

    if (leadError || !lead) throw new Error("Nao foi possivel localizar o lead selecionado.");
    if (corretoresResult.error) throw new Error("Nao foi possivel carregar a lista de corretores.");

    const corretor = getCorretorUnificadoPorId(corretoresResult.data, corretorId);
    if (!corretor) throw new Error("Nao foi possivel localizar o corretor selecionado.");

    const { error: leadUpdateError } = await supabase
      .from("leads")
      .update({ responsavel: corretor.nome, status: "corretor" })
      .eq("id", leadId);

    if (leadUpdateError) throw new Error("Nao foi possivel atualizar o lead distribuido.");

    if (corretor.origem === "corretores") {
      const { error: distribuicaoError } = await supabase.from("roleta_distribuicoes").insert({
        lead_id: leadId,
        corretor_id: corretor.sourceId,
        criterio: "manual",
        motivo: "Distribuicao manual assistida pela Roleta Inteligente.",
        status: "distribuido",
      });

      if (distribuicaoError) throw new Error("Nao foi possivel registrar a distribuicao.");

      const leadsRecebidos = Number(corretor.leads_recebidos ?? 0) + 1;
      const { error: corretorUpdateError } = await supabase
        .from("corretores")
        .update({ leads_recebidos: leadsRecebidos })
        .eq("id", corretor.sourceId);

      if (corretorUpdateError) throw new Error("Nao foi possivel atualizar os indicadores do corretor.");
    } else {
      const { error: distribuicaoError } = await supabase.from("roleta_distribuicoes").insert({
        lead_id: leadId,
        corretor_id: null,
        criterio: "manual",
        motivo: `Distribuicao manual para ${corretor.nome} do Cadastro Universal.`,
        status: "distribuido",
      });

      if (distribuicaoError) throw new Error("Nao foi possivel registrar a distribuicao.");
    }

    const descricao = `Lead ${lead.nome} distribuido para corretor ${corretor.nome}`;
    const { error: timelineError } = await supabase.from("timeline").insert({
      tipo: "roleta",
      titulo: "Lead distribuido",
      descricao,
      lead_id: leadId,
      corretor_id: corretor.origem === "corretores" ? corretor.sourceId : null,
      origem: "roleta_inteligente",
    });

    if (timelineError) console.error("timelineError", timelineError);

    revalidatePath("/dashboard/crm/roleta");
    revalidatePath("/dashboard/crm/leads");
    revalidatePath("/dashboard/crm/timeline");
  }

  const [corretoresResult, leadsResult, distribuicoesResult] = await Promise.all([
    getCorretoresUnificados(),
    supabase
      .from("leads")
      .select("id, nome, telefone, tipo_lead, objetivo, cidade, origem, status")
      .in("status", ["novo", "ia_qualificando"])
      .order("created_at", { ascending: false }),
    supabase
      .from("roleta_distribuicoes")
      .select("id, lead_id, corretor_id, criterio, motivo, status, created_at")
      .order("created_at", { ascending: false })
      .limit(8),
  ]);

  const corretores = (corretoresResult.data ?? []) as CorretorUnificado[];
  const leads = (leadsResult.data ?? []) as Lead[];
  const distribuicoes = (distribuicoesResult.data ?? []) as Distribuicao[];
  const erroCarregamento =
    corretoresResult.error || leadsResult.error || distribuicoesResult.error;

  const cidades = Array.from(
    new Set(
      [...corretores.map((corretor) => corretor.cidade_base), ...leads.map((lead) => lead.cidade)]
        .filter(Boolean) as string[],
    ),
  ).sort((a, b) => a.localeCompare(b));
  const tiposLead = Array.from(new Set(leads.map((lead) => lead.tipo_lead).filter(Boolean) as string[]));
  const corretoresPorId = new Map(corretores.map((corretor) => [corretor.sourceId, corretor.nome]));
  const leadsPorId = new Map(leads.map((lead) => [lead.id, lead.nome]));

  const corretoresFiltrados = corretores.filter((corretor) => {
    const texto = normalizarTexto(
      [corretor.nome, corretor.creci, corretor.especialidade, corretor.cidade_base, corretor.disponibilidade].join(" "),
    );

    return (
      (!busca || texto.includes(normalizarTexto(busca))) &&
      (!filtroCidade || corretor.cidade_base === filtroCidade) &&
      (!filtroStatus || corretor.disponibilidade === filtroStatus) &&
      (!filtroCorretor || corretor.id === filtroCorretor)
    );
  });

  const leadsFiltrados = leads.filter((lead) => {
    const texto = normalizarTexto(
      [lead.nome, lead.telefone, lead.tipo_lead, lead.objetivo, lead.cidade, lead.origem, lead.status].join(" "),
    );

    return (
      (!busca || texto.includes(normalizarTexto(busca))) &&
      (!filtroCidade || lead.cidade === filtroCidade) &&
      (!filtroTipoLead || lead.tipo_lead === filtroTipoLead)
    );
  });

  const disponiveis = corretores.filter((corretor) => corretor.disponibilidade !== "ocupado").length;
  const resumoCards: Array<{
    titulo: string;
    valor: number;
    detalhe: string;
    icon: LucideIcon;
  }> = [
    {
      titulo: "Corretores ativos",
      valor: corretores.length,
      detalhe: "Equipe apta para receber leads",
      icon: UsersRound,
    },
    {
      titulo: "Disponiveis",
      valor: disponiveis,
      detalhe: "Disponiveis ou fora de atendimento ativo",
      icon: BadgeCheck,
    },
    {
      titulo: "Leads aguardando",
      valor: leads.length,
      detalhe: "Novos ou em qualificacao",
      icon: Target,
    },
    {
      titulo: "Distribuicoes recentes",
      valor: distribuicoes.length,
      detalhe: "Ultimos registros da roleta",
      icon: History,
    },
  ];

  return (
    <main className="min-h-screen bg-[#F7F3ED] px-6 py-10 sm:px-8">
      <div className="mx-auto max-w-7xl">
        <Link
          href="/dashboard"
          className="inline-flex rounded-xl border border-[#E8DDCB] bg-white px-4 py-2 text-sm font-medium text-[#071E36] transition hover:border-[#C89B3C]/45 hover:bg-[#C89B3C]/10"
        >
          Voltar ao Dashboard
        </Link>

        <header className="mt-8 rounded-[2rem] border border-[#E8DDCB] bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-4">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#071E36] text-[#E1B866] shadow-lg shadow-[#071E36]/15">
                <Sparkles size={26} strokeWidth={2.2} />
              </span>
              <div>
                <span className="rounded-full border border-[#C89B3C]/35 bg-[#C89B3C]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#8B6827]">
                  Terrazza CRM
                </span>
                <h1 className="mt-4 text-4xl font-bold tracking-tight text-[#071E36]">
                  Roleta Inteligente Premium
                </h1>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-[#64736D]">
                  Distribuicao assistida de leads, disponibilidade de corretores,
                  score visual e historico operacional.
                </p>
              </div>
            </div>
            <span className="rounded-2xl border border-[#E8DDCB] bg-[#F7F3ED] px-4 py-3 text-sm font-semibold text-[#071E36]">
              Manual assistida
            </span>
          </div>
        </header>

        {erroCarregamento ? (
          <p className="mt-8 rounded-xl bg-[#fbebe7] px-4 py-3 text-sm text-[#8a2e1c]">
            Nao foi possivel carregar a roleta. Verifique se o SQL da Roleta ja foi aplicado.
          </p>
        ) : null}

        <section className="mt-8 grid gap-4 md:grid-cols-4">
          {resumoCards.map((card) => {
            const Icon = card.icon;
            return (
            <article key={card.titulo} className="rounded-3xl border border-[#E8DDCB] bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between gap-4">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#071E36] text-[#E1B866]">
                  <Icon size={20} />
                </span>
                <strong className="text-3xl font-bold text-[#071E36]">{card.valor}</strong>
              </div>
              <h2 className="mt-4 text-sm font-semibold uppercase tracking-[0.14em] text-[#071E36]">
                {card.titulo}
              </h2>
              <p className="mt-1 text-sm text-[#64736D]">{card.detalhe}</p>
            </article>
            );
          })}
        </section>

        <form
          className="mt-8 grid gap-3 rounded-[2rem] border border-[#E8DDCB] bg-white p-5 shadow-sm lg:grid-cols-[1.4fr_repeat(4,1fr)_auto]"
          action="/dashboard/crm/roleta"
        >
          <label className="relative">
            <Search
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#9a9d98]"
            />
            <input
              name="busca"
              defaultValue={busca}
              placeholder="Buscar corretor ou lead..."
              className="h-full w-full rounded-xl border border-[#E8DDCB] bg-white py-3 pl-9 pr-3 text-sm text-[#071E36] outline-none focus:border-[#C89B3C]"
            />
          </label>
          <select name="cidade" defaultValue={filtroCidade} className="rounded-xl border border-[#E8DDCB] bg-white px-3 py-3 text-sm text-[#071E36]">
            <option value="">Cidade</option>
            {cidades.map((cidade) => (
              <option key={cidade} value={cidade}>{cidade}</option>
            ))}
          </select>
          <select name="tipo_lead" defaultValue={filtroTipoLead} className="rounded-xl border border-[#E8DDCB] bg-white px-3 py-3 text-sm text-[#071E36]">
            <option value="">Tipo lead</option>
            {tiposLead.map((tipo) => (
              <option key={tipo} value={tipo}>{tipo}</option>
            ))}
          </select>
          <select name="status" defaultValue={filtroStatus} className="rounded-xl border border-[#E8DDCB] bg-white px-3 py-3 text-sm text-[#071E36]">
            <option value="">Status corretor</option>
            {["disponivel", "ocupado", "fora_expediente"].map((status) => (
              <option key={status} value={status}>{labelTexto(status)}</option>
            ))}
          </select>
          <select name="corretor" defaultValue={filtroCorretor} className="rounded-xl border border-[#E8DDCB] bg-white px-3 py-3 text-sm text-[#071E36]">
            <option value="">Corretor</option>
            {corretores.map((corretor) => (
              <option key={corretor.id} value={corretor.id}>{corretor.nome}</option>
            ))}
          </select>
          <button type="submit" className="rounded-xl bg-[#071E36] px-5 py-3 text-sm font-semibold text-white">
            Filtrar
          </button>
        </form>

        <section className="mt-8 rounded-[2rem] border border-[#E8DDCB] bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-semibold text-[#071E36]">
                Corretores disponiveis
              </h2>
              <p className="mt-1 text-sm text-[#64736D]">
                Score visual pondera disponibilidade, conversao, peso e velocidade.
              </p>
            </div>
            <span className="rounded-full bg-[#C89B3C]/10 px-3 py-1 text-sm font-medium text-[#8B6827]">
              {corretoresFiltrados.length} exibido{corretoresFiltrados.length === 1 ? "" : "s"}
            </span>
          </div>

          <div className="mt-6 grid gap-4 xl:grid-cols-2">
            {corretoresFiltrados.map((corretor) => {
              const disponibilidade = badgeDisponibilidade(corretor.disponibilidade);
              const conversao = badgeConversao(corretor.taxa_conversao);
              const score = scoreCorretor(corretor);

              return (
                <article key={corretor.id} className="rounded-3xl border border-[#E8DDCB] bg-[#fffdfa] p-5 shadow-sm transition duration-300 hover:border-[#C89B3C]/35 hover:shadow-lg">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <h3 className="text-xl font-semibold text-[#071E36]">{corretor.nome}</h3>
                      <p className="mt-1 text-sm text-[#64736D]">CRECI {corretor.creci || "-"}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ${disponibilidade.className}`}>
                        {disponibilidade.label}
                      </span>
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ${conversao.className}`}>
                        Conversao {conversao.label}
                      </span>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
                    <span className="flex items-center gap-2 rounded-2xl bg-white px-3 py-2 text-[#64736D]">
                      <MapPin size={16} className="text-[#C89B3C]" />
                      {corretor.cidade_base || "Cidade base nao definida"}
                    </span>
                    <span className="flex items-center gap-2 rounded-2xl bg-white px-3 py-2 text-[#64736D]">
                      <BadgeCheck size={16} className="text-[#C89B3C]" />
                      {corretor.especialidade || "Sem especialidade"}
                    </span>
                    <span className="flex items-center gap-2 rounded-2xl bg-white px-3 py-2 text-[#64736D]">
                      <UsersRound size={16} className="text-[#C89B3C]" />
                      {corretor.leads_recebidos ?? 0} leads recebidos
                    </span>
                    <span className="flex items-center gap-2 rounded-2xl bg-white px-3 py-2 text-[#64736D]">
                      <Clock3 size={16} className="text-[#C89B3C]" />
                      {corretor.tempo_medio_resposta_min ?? "-"} min resposta
                    </span>
                    <span className="flex items-center gap-2 rounded-2xl bg-white px-3 py-2 text-[#64736D]">
                      <TrendingUp size={16} className="text-[#C89B3C]" />
                      {formatarTaxa(corretor.taxa_conversao)} conversao
                    </span>
                    <span className="flex items-center gap-2 rounded-2xl bg-white px-3 py-2 text-[#64736D]">
                      <Sparkles size={16} className="text-[#C89B3C]" />
                      Peso {corretor.peso_roleta ?? 1}
                    </span>
                  </div>

                  <div className="mt-5">
                    <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.14em] text-[#8B6827]">
                      <span>Score visual</span>
                      <span>{score}/100</span>
                    </div>
                    <div className="mt-2 h-2 rounded-full bg-[#F7F3ED]">
                      <div className="h-2 rounded-full bg-[#C89B3C]" style={{ width: `${score}%` }} />
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <section className="mt-8 grid gap-6 xl:grid-cols-[1.3fr_0.8fr]">
          <div className="rounded-[2rem] border border-[#E8DDCB] bg-white p-6 shadow-sm sm:p-8">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-semibold text-[#071E36]">
                  Leads aguardando distribuicao
                </h2>
                <p className="mt-1 text-sm text-[#64736D]">
                  Distribuicao manual assistida para corretores ativos.
                </p>
              </div>
              <span className="rounded-full bg-[#C89B3C]/10 px-3 py-1 text-sm font-medium text-[#8B6827]">
                {leadsFiltrados.length} lead{leadsFiltrados.length === 1 ? "" : "s"}
              </span>
            </div>

            <div className="mt-6 grid gap-4">
              {leadsFiltrados.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-[#E8DDCB] bg-[#F7F3ED] px-4 py-10 text-center text-sm text-[#64736D]">
                  Nenhum lead novo ou em qualificacao para os filtros atuais.
                </p>
              ) : (
                leadsFiltrados.map((lead) => (
                  <article key={lead.id} className="rounded-3xl border border-[#E8DDCB] bg-[#fffdfa] p-5 shadow-sm">
                    <div className="grid gap-5 xl:grid-cols-[1fr_320px] xl:items-end">
                      <div>
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <h3 className="text-xl font-semibold text-[#071E36]">{lead.nome}</h3>
                            <p className="mt-1 text-sm text-[#64736D]">
                              {lead.telefone || "Telefone nao informado"}
                            </p>
                          </div>
                          <span className="rounded-full bg-[#071E36]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-[#071E36]">
                            {labelTexto(lead.status)}
                          </span>
                        </div>
                        <div className="mt-5 grid gap-3 text-sm sm:grid-cols-3">
                          {[
                            ["Tipo", lead.tipo_lead || "-"],
                            ["Objetivo", lead.objetivo || "-"],
                            ["Cidade", lead.cidade || "-"],
                            ["Origem", lead.origem || "manual"],
                          ].map(([label, value]) => (
                            <span key={label} className="rounded-2xl bg-white px-3 py-2 text-[#64736D]">
                              <strong className="text-[#071E36]">{label}:</strong> {value}
                            </span>
                          ))}
                        </div>
                      </div>

                      <form action={distribuirLead} className="rounded-2xl border border-[#E8DDCB] bg-white p-4">
                        <input type="hidden" name="lead_id" value={lead.id} />
                        <label className="grid gap-2 text-sm font-medium text-[#102A27]">
                          Corretor responsavel
                          <select name="corretor_id" required defaultValue="" className="rounded-xl border border-[#E8DDCB] bg-white px-4 py-3 text-[#071E36] outline-none transition focus:border-[#C89B3C]">
                            <option value="">Selecionar corretor</option>
                            {corretores.map((corretor) => (
                              <option key={corretor.id} value={corretor.id}>{corretor.nome}</option>
                            ))}
                          </select>
                        </label>
                        <button type="submit" className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#071E36] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#0A2A4A]">
                          Distribuir
                          <ArrowRight size={16} />
                        </button>
                      </form>
                    </div>
                  </article>
                ))
              )}
            </div>
          </div>

          <aside className="rounded-[2rem] border border-[#E8DDCB] bg-white p-6 shadow-sm sm:p-8">
            <h2 className="text-2xl font-semibold text-[#071E36]">
              Historico de distribuicao
            </h2>
            <p className="mt-1 text-sm text-[#64736D]">
              Ultimas movimentacoes registradas pela roleta.
            </p>
            <div className="mt-6 space-y-3">
              {distribuicoes.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-[#E8DDCB] bg-[#F7F3ED] px-4 py-8 text-center text-sm text-[#64736D]">
                  Nenhuma distribuicao registrada.
                </p>
              ) : (
                distribuicoes.map((distribuicao) => (
                  <article key={distribuicao.id} className="rounded-2xl border border-[#E8DDCB] bg-[#fffdfa] p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-[#071E36]">
                          {leadsPorId.get(distribuicao.lead_id ?? "") || "Lead ja distribuido"}
                        </p>
                        <p className="mt-1 text-sm text-[#64736D]">
                          {corretoresPorId.get(distribuicao.corretor_id ?? "") || "Corretor nao localizado"}
                        </p>
                      </div>
                      <span className="rounded-full bg-[#F7F3ED] px-3 py-1 text-xs font-semibold text-[#071E36]">
                        {labelTexto(distribuicao.status)}
                      </span>
                    </div>
                    <p className="mt-3 text-xs leading-5 text-[#64736D]">
                      {distribuicao.motivo || labelTexto(distribuicao.criterio)}
                    </p>
                    <p className="mt-3 text-xs font-semibold uppercase tracking-[0.14em] text-[#8B6827]">
                      {formatarData(distribuicao.created_at)}
                    </p>
                  </article>
                ))
              )}
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}
