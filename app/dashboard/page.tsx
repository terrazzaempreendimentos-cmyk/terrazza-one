import Link from "next/link";

import { requirePagePermission } from "../../lib/auth/page-permission";
import { hasPapel } from "../../lib/crm/pessoas/papeis";
import { createClient } from "../../lib/supabase/server";

type PessoaResumo = {
  id: string;
  papeis: string[] | null;
  temperatura: string | null;
  status: string | null;
};

function metricCard(title: string, value: number | string, subtitle: string, href?: string) {
  const content = (
    <>
      <p className="text-sm font-semibold text-[#102A27]">{title}</p>
      <strong className="mt-4 block text-4xl text-[#071E36]">{value}</strong>
      <p className="mt-2 text-sm text-[#64736D]">{subtitle}</p>
    </>
  );
  const className =
    "rounded-2xl border border-[#E8DDCB] bg-white p-5 shadow-sm transition hover:border-[#C89B3C]/45 hover:shadow-lg hover:shadow-[#071E36]/10";

  return href ? (
    <Link key={title} href={href} className={className}>
      {content}
    </Link>
  ) : (
    <div key={title} className={className}>
      {content}
    </div>
  );
}

function smallItem(title: string, description: string, badge: string) {
  return (
    <div className="rounded-2xl border border-[#E8DDCB] bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-[#071E36]">{title}</p>
          <p className="mt-1 text-sm text-[#64736D]">{description}</p>
        </div>
        <span className="rounded-full bg-[#C89B3C]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-[#8B6827]">
          {badge}
        </span>
      </div>
    </div>
  );
}

export default async function DashboardPage() {
  await requirePagePermission("dashboard.visualizar");
  const supabase = await createClient();

  const [pessoasResult, imoveisResult, atendimentosResult, manutencoesResult] =
    await Promise.all([
      supabase.from("pessoas").select("id, papeis, temperatura, status").eq("ativo", true),
      supabase.from("imoveis").select("id, status").eq("ativo", true),
      supabase.from("atendimentos").select("id, status"),
      supabase.from("manutencoes_conflitos").select("id, prioridade, status").eq("ativo", true),
    ]);

  const pessoas = (pessoasResult.data ?? []) as PessoaResumo[];
  const imoveisAtivos = imoveisResult.count ?? imoveisResult.data?.length ?? 0;
  const atendimentos = atendimentosResult.data ?? [];
  const manutencoes = manutencoesResult.data ?? [];
  const leadsAtivos = pessoas.filter((pessoa) =>
    ["comprador", "vendedor", "inquilino", "proprietario"].some((papel) =>
      hasPapel(pessoa, papel),
    ),
  ).length;
  const leadsQuentes = pessoas.filter((pessoa) => pessoa.temperatura === "quente").length;
  const proprietarios = pessoas.filter((pessoa) => hasPapel(pessoa, "proprietario")).length;
  const inquilinos = pessoas.filter((pessoa) => hasPapel(pessoa, "inquilino")).length;
  const manutencoesCriticas = manutencoes.filter(
    (item) => item.prioridade === "critica" || item.prioridade === "alta",
  ).length;

  return (
    <main className="min-h-screen bg-[#F7F3ED] px-6 py-10 sm:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="overflow-hidden rounded-[2rem] border border-[#E8DDCB] bg-white shadow-sm">
          <div className="grid gap-8 p-8 lg:grid-cols-[1.4fr_0.8fr] lg:p-10">
            <div>
              <span className="rounded-full border border-[#C89B3C]/35 bg-[#C89B3C]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-[#8B6827]">
                Painel executivo
              </span>
              <h1 className="mt-5 text-4xl font-bold tracking-tight text-[#071E36]">
                Dashboard Terrazza One
              </h1>
              <p className="mt-3 max-w-3xl text-[#64736D]">
                Visao consolidada da operacao comercial, cadastros, atendimentos,
                manutencoes e inteligencia contextual da Terrazza.
              </p>
            </div>
            <div className="rounded-2xl border border-[#C89B3C]/30 bg-[#071E36] p-6 text-white">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#E1B866]">
                Prioridade do dia
              </p>
              <p className="mt-3 text-3xl font-bold">{leadsQuentes + manutencoesCriticas}</p>
              <p className="mt-2 text-sm text-white/70">
                Pontos que merecem acompanhamento comercial ou operacional.
              </p>
            </div>
          </div>
        </header>

        <section className="mt-8">
          <h2 className="text-xl font-semibold text-[#071E36]">Resumo da operacao</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-6">
            {[
              metricCard("Pessoas", pessoas.length, "Cadastro matriz", "/dashboard/pessoas"),
              metricCard("Imoveis ativos", imoveisAtivos, "Carteira operacional", "/dashboard/imoveis"),
              metricCard("Leads ativos", leadsAtivos, "Pessoas com papel comercial", "/dashboard/crm/leads"),
              metricCard("Atendimentos", atendimentos.length, "Conversas em andamento", "/dashboard/crm/atendimentos"),
              metricCard("Manutencoes", manutencoes.length, "Casos abertos", "/dashboard/crm/manutencoes"),
              metricCard("Tarefas hoje", 0, "Agenda operacional", "/dashboard/crm/agenda"),
            ]}
          </div>
        </section>

        <section className="mt-8 grid gap-6 xl:grid-cols-[1fr_1fr]">
          <div>
            <h2 className="text-xl font-semibold text-[#071E36]">Prioridades do dia</h2>
            <div className="mt-4 grid gap-3">
              {smallItem("Leads quentes", `${leadsQuentes} contatos com temperatura alta`, "comercial")}
              {smallItem("Visitas e agendamentos", "Agenda pronta para consolidar compromissos", "agenda")}
              {smallItem("Proprietarios aguardando retorno", `${proprietarios} proprietarios monitoraveis`, "cadastro")}
              {smallItem("Inquilinos com pendencia", `${inquilinos} inquilinos na base matriz`, "relacionamento")}
              {smallItem("Manutencoes criticas", `${manutencoesCriticas} casos de maior prioridade`, "operacao")}
            </div>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-[#071E36]">Visao comercial</h2>
            <div className="mt-4 grid gap-3">
              {[
                ["Pipeline resumido", "Leads, visitas, propostas e fechamento em consolidacao."],
                ["Locacao", "Fluxo preparado para inquilinos, garantias e imoveis disponiveis."],
                ["Venda", "Base pronta para vendedores, compradores e propostas."],
                ["Administracao", "Carteira operacional conectada a proprietarios e manutencoes."],
                ["Captacao", "Entrada de novos imoveis com Pessoas como base."],
              ].map(([title, description]) => (
                <div key={title} className="rounded-2xl border border-[#E8DDCB] bg-white p-4">
                  <p className="font-semibold text-[#071E36]">{title}</p>
                  <p className="mt-1 text-sm text-[#64736D]">{description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-8 overflow-hidden rounded-[2rem] border border-[#C89B3C]/35 bg-[#071E36] p-8 text-white shadow-xl shadow-[#071E36]/15">
          <span className="rounded-full border border-[#E1B866]/40 bg-[#E1B866]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-[#E1B866]">
            UCE em destaque
          </span>
          <div className="mt-6 grid gap-4 md:grid-cols-4">
            {[
              ["Ultimos insights", "Resumo contextual dos atendimentos futuros."],
              ["Memorias recentes", "Historico persistente aparecera aqui."],
              ["Correspondencias futuras", "Pessoas, imoveis e oportunidades conectadas."],
              ["Alertas inteligentes", "Sinais operacionais e comerciais em breve."],
            ].map(([title, description]) => (
              <div key={title} className="rounded-2xl border border-white/10 bg-white/[0.06] p-4">
                <p className="font-semibold">{title}</p>
                <p className="mt-2 text-sm text-white/70">{description}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
