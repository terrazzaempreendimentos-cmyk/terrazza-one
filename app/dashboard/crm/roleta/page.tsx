import Link from "next/link";
import { revalidatePath } from "next/cache";
import {
  ArrowRight,
  BadgeCheck,
  Clock3,
  MapPin,
  Sparkles,
  Target,
  TrendingUp,
  UsersRound,
} from "lucide-react";

import { supabase } from "../../../../lib/supabase";

type Corretor = {
  id: string;
  nome: string;
  creci: string | null;
  ativo: boolean | null;
  especialidade: string | null;
  cidade_base: string | null;
  peso_roleta: number | null;
  leads_recebidos: number | null;
  tempo_medio_resposta_min: number | null;
  taxa_conversao: number | null;
  disponibilidade: string | null;
};

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

function valorTexto(formData: FormData, campo: string) {
  return String(formData.get(campo) ?? "").trim();
}

function labelTexto(valor: string | null) {
  if (!valor) return "—";

  return valor.replaceAll("_", " ");
}

function badgeDisponibilidade(disponibilidade: string | null) {
  switch (disponibilidade) {
    case "ocupado":
      return {
        label: "Ocupado",
        className: "bg-amber-50 text-amber-700 ring-amber-100",
      };
    case "fora_expediente":
      return {
        label: "Fora do expediente",
        className: "bg-slate-100 text-slate-600 ring-slate-200",
      };
    case "disponivel":
    default:
      return {
        label: "Disponível",
        className: "bg-emerald-50 text-emerald-700 ring-emerald-100",
      };
  }
}

function badgeConversao(taxa: number | null) {
  const valor = Number(taxa ?? 0);

  if (valor >= 60) {
    return {
      label: "Alta",
      className: "bg-emerald-50 text-emerald-700 ring-emerald-100",
    };
  }

  if (valor >= 30) {
    return {
      label: "Média",
      className: "bg-sky-50 text-sky-700 ring-sky-100",
    };
  }

  return {
    label: "Baixa",
    className: "bg-slate-100 text-slate-600 ring-slate-200",
  };
}

function formatarTaxa(taxa: number | null) {
  if (taxa === null || taxa === undefined) return "—";

  return `${Number(taxa).toLocaleString("pt-BR", {
    maximumFractionDigits: 1,
  })}%`;
}

export default async function RoletaPage() {
  async function distribuirLead(formData: FormData) {
    "use server";

    const leadId = valorTexto(formData, "lead_id");
    const corretorId = valorTexto(formData, "corretor_id");

    if (!leadId || !corretorId) {
      throw new Error("Selecione um lead e um corretor para distribuir.");
    }

    const [{ data: lead, error: leadError }, { data: corretor, error: corretorError }] =
      await Promise.all([
        supabase.from("leads").select("id, nome").eq("id", leadId).single(),
        supabase
          .from("corretores")
          .select("id, nome, leads_recebidos")
          .eq("id", corretorId)
          .single(),
      ]);

    if (leadError || !lead) {
      throw new Error("Não foi possível localizar o lead selecionado.");
    }

    if (corretorError || !corretor) {
      throw new Error("Não foi possível localizar o corretor selecionado.");
    }

    const { error: distribuicaoError } = await supabase
      .from("roleta_distribuicoes")
      .insert({
        lead_id: leadId,
        corretor_id: corretorId,
        criterio: "manual",
        motivo: "Distribuição manual assistida pela Roleta Inteligente.",
        status: "distribuido",
      });

    if (distribuicaoError) {
      throw new Error("Não foi possível registrar a distribuição.");
    }

    const { error: leadUpdateError } = await supabase
      .from("leads")
      .update({
        responsavel: corretor.nome,
        status: "corretor",
      })
      .eq("id", leadId);

    if (leadUpdateError) {
      throw new Error("Não foi possível atualizar o lead distribuído.");
    }

    const leadsRecebidos = Number(corretor.leads_recebidos ?? 0) + 1;
    const { error: corretorUpdateError } = await supabase
      .from("corretores")
      .update({ leads_recebidos: leadsRecebidos })
      .eq("id", corretorId);

    if (corretorUpdateError) {
      throw new Error("Não foi possível atualizar os indicadores do corretor.");
    }

    const descricao = `Lead ${lead.nome} distribuído para corretor ${corretor.nome}`;

    const { error: timelineError } = await supabase.from("timeline").insert({
      tipo: "roleta",
      titulo: "Lead distribuído",
      descricao,
      lead_id: leadId,
      corretor_id: corretorId,
      origem: "roleta_inteligente",
    });

    if (timelineError) {
      console.error("timelineError", timelineError);
    }

    revalidatePath("/dashboard/crm/roleta");
    revalidatePath("/dashboard/crm/leads");
    revalidatePath("/dashboard/crm/timeline");
  }

  const [corretoresResult, leadsResult] = await Promise.all([
    supabase
      .from("corretores")
      .select(
        "id, nome, creci, ativo, especialidade, cidade_base, peso_roleta, leads_recebidos, tempo_medio_resposta_min, taxa_conversao, disponibilidade",
      )
      .eq("ativo", true)
      .order("nome", { ascending: true }),
    supabase
      .from("leads")
      .select("id, nome, telefone, tipo_lead, objetivo, cidade, origem, status")
      .in("status", ["novo", "ia_qualificando"])
      .order("created_at", { ascending: false }),
  ]);

  const corretores = (corretoresResult.data ?? []) as Corretor[];
  const leads = (leadsResult.data ?? []) as Lead[];
  const erroCarregamento = corretoresResult.error || leadsResult.error;

  return (
    <main className="min-h-screen bg-[#F7F3ED] px-6 py-10 sm:px-8">
      <div className="mx-auto max-w-7xl">
        <Link
          href="/dashboard"
          className="inline-flex rounded-xl border border-[#E8DDCB] bg-white px-4 py-2 text-sm font-medium text-[#071E36] transition hover:border-[#C89B3C]/45 hover:bg-[#C89B3C]/10"
        >
          ← Voltar ao Dashboard
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
                  Roleta Inteligente
                </h1>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-[#64736D]">
                  Distribuição estratégica de leads entre corretores da Terrazza
                  CRM.
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-[#E8DDCB] bg-[#F7F3ED] px-4 py-3 text-sm text-[#64736D]">
              <span className="block text-xs font-semibold uppercase tracking-[0.14em] text-[#8B6827]">
                Fase atual
              </span>
              <strong className="mt-1 block text-[#071E36]">
                Manual assistida
              </strong>
            </div>
          </div>
        </header>

        {erroCarregamento ? (
          <p className="mt-8 rounded-xl bg-[#fbebe7] px-4 py-3 text-sm text-[#8a2e1c]">
            Não foi possível carregar a roleta. Verifique se o SQL da Sprint 8
            já foi aplicado no Supabase.
          </p>
        ) : (
          <>
            <section className="mt-8 grid gap-4 md:grid-cols-3">
              <article className="rounded-3xl border border-[#E8DDCB] bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between gap-4">
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#071E36] text-[#E1B866]">
                    <UsersRound size={20} />
                  </span>
                  <strong className="text-3xl font-bold text-[#071E36]">
                    {corretores.length}
                  </strong>
                </div>
                <h2 className="mt-4 text-sm font-semibold uppercase tracking-[0.14em] text-[#071E36]">
                  Corretores ativos
                </h2>
                <p className="mt-1 text-sm text-[#64736D]">
                  Disponíveis para distribuição manual.
                </p>
              </article>

              <article className="rounded-3xl border border-[#E8DDCB] bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between gap-4">
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#C89B3C]/15 text-[#8B6827]">
                    <Target size={20} />
                  </span>
                  <strong className="text-3xl font-bold text-[#071E36]">
                    {leads.length}
                  </strong>
                </div>
                <h2 className="mt-4 text-sm font-semibold uppercase tracking-[0.14em] text-[#071E36]">
                  Leads disponíveis
                </h2>
                <p className="mt-1 text-sm text-[#64736D]">
                  Status novo ou IA qualificando.
                </p>
              </article>

              <article className="rounded-3xl border border-[#C89B3C]/35 bg-[#071E36] p-5 text-white shadow-sm">
                <div className="flex items-center justify-between gap-4">
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 text-[#E1B866]">
                    <ArrowRight size={20} />
                  </span>
                  <strong className="text-3xl font-bold text-[#E1B866]">
                    MVP
                  </strong>
                </div>
                <h2 className="mt-4 text-sm font-semibold uppercase tracking-[0.14em] text-white">
                  Sem algoritmo automático
                </h2>
                <p className="mt-1 text-sm text-white/68">
                  A decisão ainda é humana, com apoio visual.
                </p>
              </article>
            </section>

            <section className="mt-8 rounded-[2rem] border border-[#E8DDCB] bg-white p-6 shadow-sm sm:p-8">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-semibold text-[#071E36]">
                    Painel de corretores
                  </h2>
                  <p className="mt-1 text-sm text-[#64736D]">
                    Indicadores iniciais para apoiar a distribuição.
                  </p>
                </div>
                <span className="rounded-full bg-[#C89B3C]/10 px-3 py-1 text-sm font-medium text-[#8B6827]">
                  Score visual inicial
                </span>
              </div>

              {corretores.length === 0 ? (
                <p className="mt-6 rounded-2xl border border-dashed border-[#E8DDCB] bg-[#F7F3ED] px-4 py-10 text-center text-sm text-[#64736D]">
                  Nenhum corretor ativo disponível.
                </p>
              ) : (
                <div className="mt-6 grid gap-4 xl:grid-cols-2">
                  {corretores.map((corretor) => {
                    const disponibilidade = badgeDisponibilidade(
                      corretor.disponibilidade,
                    );
                    const conversao = badgeConversao(corretor.taxa_conversao);

                    return (
                      <article
                        key={corretor.id}
                        className="rounded-3xl border border-[#E8DDCB] bg-[#fffdfa] p-5 shadow-sm transition duration-300 hover:scale-[1.005] hover:border-[#C89B3C]/35 hover:shadow-lg"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-4">
                          <div>
                            <h3 className="text-xl font-semibold text-[#071E36]">
                              {corretor.nome}
                            </h3>
                            <p className="mt-1 text-sm text-[#64736D]">
                              CRECI {corretor.creci || "—"}
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <span
                              className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ${disponibilidade.className}`}
                            >
                              {disponibilidade.label}
                            </span>
                            <span
                              className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ${conversao.className}`}
                            >
                              Conversão {conversao.label}
                            </span>
                          </div>
                        </div>

                        <div className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
                          <span className="flex items-center gap-2 rounded-2xl bg-white px-3 py-2 text-[#64736D]">
                            <MapPin size={16} className="text-[#C89B3C]" />
                            {corretor.cidade_base || "Cidade base não definida"}
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
                            {corretor.tempo_medio_resposta_min ?? "—"} min resposta
                          </span>
                          <span className="flex items-center gap-2 rounded-2xl bg-white px-3 py-2 text-[#64736D]">
                            <TrendingUp size={16} className="text-[#C89B3C]" />
                            {formatarTaxa(corretor.taxa_conversao)} conversão
                          </span>
                          <span className="flex items-center gap-2 rounded-2xl bg-white px-3 py-2 text-[#64736D]">
                            <Sparkles size={16} className="text-[#C89B3C]" />
                            Peso {corretor.peso_roleta ?? 1}
                          </span>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>

            <section className="mt-8 rounded-[2rem] border border-[#E8DDCB] bg-white p-6 shadow-sm sm:p-8">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-semibold text-[#071E36]">
                    Leads disponíveis
                  </h2>
                  <p className="mt-1 text-sm text-[#64736D]">
                    Distribuição manual assistida para corretores ativos.
                  </p>
                </div>
                <span className="rounded-full bg-[#C89B3C]/10 px-3 py-1 text-sm font-medium text-[#8B6827]">
                  {leads.length} lead{leads.length === 1 ? "" : "s"}
                </span>
              </div>

              {leads.length === 0 ? (
                <p className="mt-6 rounded-2xl border border-dashed border-[#E8DDCB] bg-[#F7F3ED] px-4 py-10 text-center text-sm text-[#64736D]">
                  Nenhum lead novo ou em qualificação por IA no momento.
                </p>
              ) : (
                <div className="mt-6 grid gap-4">
                  {leads.map((lead) => (
                    <article
                      key={lead.id}
                      className="rounded-3xl border border-[#E8DDCB] bg-[#fffdfa] p-5 shadow-sm"
                    >
                      <div className="grid gap-5 xl:grid-cols-[1fr_360px] xl:items-end">
                        <div>
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <h3 className="text-xl font-semibold text-[#071E36]">
                                {lead.nome}
                              </h3>
                              <p className="mt-1 text-sm text-[#64736D]">
                                {lead.telefone || "Telefone não informado"}
                              </p>
                            </div>
                            <span className="rounded-full bg-[#071E36]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-[#071E36]">
                              {labelTexto(lead.status)}
                            </span>
                          </div>

                          <div className="mt-5 grid gap-3 text-sm sm:grid-cols-3">
                            <span className="rounded-2xl bg-white px-3 py-2 text-[#64736D]">
                              <strong className="text-[#071E36]">Tipo:</strong>{" "}
                              {lead.tipo_lead || "—"}
                            </span>
                            <span className="rounded-2xl bg-white px-3 py-2 text-[#64736D]">
                              <strong className="text-[#071E36]">Objetivo:</strong>{" "}
                              {lead.objetivo || "—"}
                            </span>
                            <span className="rounded-2xl bg-white px-3 py-2 text-[#64736D]">
                              <strong className="text-[#071E36]">Cidade:</strong>{" "}
                              {lead.cidade || "—"}
                            </span>
                            <span className="rounded-2xl bg-white px-3 py-2 text-[#64736D]">
                              <strong className="text-[#071E36]">Origem:</strong>{" "}
                              {lead.origem || "manual"}
                            </span>
                          </div>
                        </div>

                        <form
                          action={distribuirLead}
                          className="rounded-2xl border border-[#E8DDCB] bg-white p-4"
                        >
                          <input type="hidden" name="lead_id" value={lead.id} />
                          <label className="grid gap-2 text-sm font-medium text-[#102A27]">
                            Corretor responsável
                            <select
                              name="corretor_id"
                              required
                              defaultValue=""
                              className="rounded-xl border border-[#E8DDCB] bg-white px-4 py-3 text-[#071E36] outline-none transition focus:border-[#C89B3C]"
                            >
                              <option value="">Selecionar corretor</option>
                              {corretores.map((corretor) => (
                                <option key={corretor.id} value={corretor.id}>
                                  {corretor.nome}
                                </option>
                              ))}
                            </select>
                          </label>

                          <button
                            type="submit"
                            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#071E36] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#0A2A4A]"
                          >
                            Distribuir
                            <ArrowRight size={16} />
                          </button>
                        </form>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </main>
  );
}
