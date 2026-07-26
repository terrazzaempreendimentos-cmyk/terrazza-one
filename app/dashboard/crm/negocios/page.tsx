import Link from "next/link";
import {
  BriefcaseBusiness,
  CalendarClock,
  Flame,
  LineChart,
  Search,
  ShieldCheck,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { requirePagePermission } from "../../../../lib/auth/page-permission";

type Negocio = {
  id: string;
  titulo: string;
  pessoa: string;
  imovel: string;
  tipo: "venda" | "locacao" | "administracao" | "captacao";
  etapa: string;
  valorEstimado: string;
  probabilidade: number;
  responsavel: string;
  origem: string;
  temperatura: "frio" | "morno" | "quente";
  proximaAcao: string;
  dataPrevista: string;
  status: string;
};

const pipelines = {
  venda: ["Novo lead", "Qualificacao", "Visita", "Proposta", "Negociacao", "Documentacao", "Contrato", "Fechado", "Perdido"],
  locacao: ["Novo lead", "Qualificacao", "Visita", "Ficha cadastral", "Analise", "Contrato", "Entrega de chaves", "Fechado", "Perdido"],
  administracao: ["Novo proprietario", "Qualificacao", "Avaliacao do imovel", "Documentacao", "Fotos", "Publicacao", "Propostas", "Contrato de administracao", "Administracao ativa"],
  captacao: ["Novo contato", "Qualificacao", "Avaliacao", "Proposta comercial", "Autorizacao", "Publicacao", "Ativo"],
};

const negocios: Negocio[] = [
  {
    id: "neg-001",
    titulo: "Locacao Ponta Verde ate R$ 3.500",
    pessoa: "Mariana Alves",
    imovel: "Apartamento Ponta Verde",
    tipo: "locacao",
    etapa: "Visita",
    valorEstimado: "R$ 3.500",
    probabilidade: 72,
    responsavel: "Equipe Locacao",
    origem: "Instagram",
    temperatura: "quente",
    proximaAcao: "Confirmar disponibilidade para visita",
    dataPrevista: "Hoje",
    status: "em_negociacao",
  },
  {
    id: "neg-002",
    titulo: "Venda casa no Poco",
    pessoa: "Roberto Lima",
    imovel: "Casa no Poco",
    tipo: "venda",
    etapa: "Avaliacao",
    valorEstimado: "R$ 780.000",
    probabilidade: 58,
    responsavel: "Vendas",
    origem: "Site",
    temperatura: "morno",
    proximaAcao: "Agendar avaliacao comercial",
    dataPrevista: "Esta semana",
    status: "qualificando",
  },
  {
    id: "neg-003",
    titulo: "Administracao de apto no Farol",
    pessoa: "Ana Paula",
    imovel: "Apartamento Farol",
    tipo: "administracao",
    etapa: "Documentacao",
    valorEstimado: "R$ 2.800 locacao",
    probabilidade: 81,
    responsavel: "Patrimonial",
    origem: "Manual",
    temperatura: "quente",
    proximaAcao: "Validar matricula e autorizacao",
    dataPrevista: "Amanha",
    status: "em_andamento",
  },
  {
    id: "neg-004",
    titulo: "Captacao Jatiuca",
    pessoa: "Carlos Henrique",
    imovel: "Imovel a captar",
    tipo: "captacao",
    etapa: "Proposta comercial",
    valorEstimado: "A definir",
    probabilidade: 45,
    responsavel: "Captacao",
    origem: "Indicacao",
    temperatura: "morno",
    proximaAcao: "Enviar proposta de administracao",
    dataPrevista: "3 dias",
    status: "proposta",
  },
];

function temperaturaClassName(temperatura: Negocio["temperatura"]) {
  const classes = {
    frio: "bg-slate-100 text-slate-700",
    morno: "bg-amber-50 text-amber-700",
    quente: "bg-red-50 text-red-700",
  };

  return `rounded-full px-3 py-1 text-xs font-semibold ${classes[temperatura]}`;
}

export default async function NegociosPage() {
  await requirePagePermission("negocios.visualizar");

  const cards: Array<{ titulo: string; valor: number; icon: LucideIcon }> = [
    { titulo: "Negocios ativos", valor: negocios.length, icon: BriefcaseBusiness },
    {
      titulo: "Em negociacao",
      valor: negocios.filter((item) => item.status.includes("negociacao")).length,
      icon: LineChart,
    },
    {
      titulo: "Quentes",
      valor: negocios.filter((item) => item.temperatura === "quente").length,
      icon: Flame,
    },
    { titulo: "Proximas acoes", valor: negocios.length, icon: CalendarClock },
  ];

  return (
    <main className="min-h-screen bg-[#F7F3ED] px-6 py-10 sm:px-8">
      <div className="mx-auto max-w-7xl">
        <Link
          href="/dashboard/crm"
          className="inline-flex rounded-xl border border-[#E8DDCB] bg-white px-4 py-2 text-sm font-medium text-[#071E36] transition hover:border-[#C89B3C]/45 hover:bg-[#C89B3C]/10"
        >
          Voltar ao CRM
        </Link>

        <header className="mt-8 rounded-[2rem] border border-[#E8DDCB] bg-white p-6 shadow-sm sm:p-8">
          <span className="rounded-full border border-[#C89B3C]/35 bg-[#C89B3C]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#8B6827]">
            CRM Comercial
          </span>
          <div className="mt-5 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-4xl font-bold tracking-tight text-[#071E36]">
                Negocios
              </h1>
              <p className="mt-2 max-w-3xl leading-6 text-[#64736D]">
                Oportunidades comerciais em andamento, organizadas por tipo,
                etapa, responsavel e proxima acao.
              </p>
            </div>
            <button
              type="button"
              disabled
              className="inline-flex w-fit rounded-xl border border-[#E8DDCB] bg-[#F7F3ED] px-5 py-3 text-sm font-semibold text-[#8B6827]"
            >
              Novo negocio em breve
            </button>
          </div>
        </header>

        <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {cards.map((card) => {
            const Icon = card.icon;

            return (
            <article key={card.titulo} className="rounded-3xl border border-[#E8DDCB] bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between gap-4">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#071E36] text-[#E1B866]">
                  <Icon size={20} strokeWidth={2.2} />
                </span>
                <strong className="text-3xl font-bold text-[#071E36]">{card.valor}</strong>
              </div>
              <h2 className="mt-4 text-sm font-semibold uppercase tracking-[0.14em] text-[#071E36]">
                {card.titulo}
              </h2>
            </article>
            );
          })}
        </section>

        <section className="mt-6 rounded-[2rem] border border-[#E8DDCB] bg-white p-5 shadow-sm">
          <form className="grid gap-3 lg:grid-cols-[1.4fr_repeat(4,1fr)_auto]">
            <label className="relative">
              <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#9a9d98]" />
              <input
                placeholder="Buscar por pessoa, imovel, responsavel..."
                className="h-full w-full rounded-xl border border-[#E8DDCB] bg-white py-3 pl-9 pr-3 text-sm text-[#071E36] outline-none focus:border-[#C89B3C]"
              />
            </label>
            {["Tipo", "Etapa", "Responsavel", "Status"].map((label) => (
              <select key={label} className="rounded-xl border border-[#E8DDCB] bg-white px-3 py-3 text-sm text-[#071E36]">
                <option>{label}</option>
              </select>
            ))}
            <button type="button" className="rounded-xl bg-[#071E36] px-5 py-3 text-sm font-semibold text-white">
              Filtrar
            </button>
          </form>
        </section>

        <section className="mt-6 grid gap-5 xl:grid-cols-2">
          {negocios.map((negocio) => (
            <article key={negocio.id} className="rounded-3xl border border-[#E8DDCB] bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8B6827]">
                    {negocio.tipo}
                  </p>
                  <h2 className="mt-2 text-xl font-bold text-[#071E36]">{negocio.titulo}</h2>
                  <p className="mt-1 text-sm text-[#64736D]">
                    {negocio.pessoa} · {negocio.imovel}
                  </p>
                </div>
                <span className={temperaturaClassName(negocio.temperatura)}>
                  {negocio.temperatura}
                </span>
              </div>

              <div className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
                {[
                  ["Etapa", negocio.etapa],
                  ["Valor estimado", negocio.valorEstimado],
                  ["Responsavel", negocio.responsavel],
                  ["Origem", negocio.origem],
                  ["Data prevista", negocio.dataPrevista],
                  ["Status", negocio.status.replaceAll("_", " ")],
                ].map(([label, value]) => (
                  <span key={label} className="rounded-2xl bg-[#F7F3ED] px-3 py-2 text-[#64736D]">
                    <strong className="text-[#071E36]">{label}:</strong> {value}
                  </span>
                ))}
              </div>

              <div className="mt-5">
                <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.14em] text-[#8B6827]">
                  <span>Probabilidade</span>
                  <span>{negocio.probabilidade}%</span>
                </div>
                <div className="mt-2 h-2 rounded-full bg-[#F7F3ED]">
                  <div className="h-2 rounded-full bg-[#C89B3C]" style={{ width: `${negocio.probabilidade}%` }} />
                </div>
              </div>

              <div className="mt-5 rounded-2xl border border-[#E8DDCB] bg-[#fffdfa] p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8B6827]">
                  Proxima acao
                </p>
                <p className="mt-2 text-sm font-semibold text-[#071E36]">{negocio.proximaAcao}</p>
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                {["Visualizar", "Editar", "Mover etapa", "Excluir logico"].map((acao) => (
                  <button
                    key={acao}
                    type="button"
                    disabled
                    className="rounded-full border border-[#E8DDCB] bg-white px-3 py-1 text-xs font-semibold text-[#071E36] opacity-80"
                  >
                    {acao}
                  </button>
                ))}
              </div>
            </article>
          ))}
        </section>

        <section className="mt-6 rounded-[2rem] border border-[#E8DDCB] bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <ShieldCheck className="text-[#C89B3C]" size={20} />
            <h2 className="text-xl font-semibold text-[#071E36]">Pipelines por tipo</h2>
          </div>
          <div className="mt-5 grid gap-4 xl:grid-cols-4">
            {Object.entries(pipelines).map(([tipo, etapas]) => (
              <div key={tipo} className="rounded-2xl border border-[#E8DDCB] bg-[#F7F3ED] p-4">
                <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[#071E36]">{tipo}</p>
                <div className="mt-4 grid gap-2">
                  {etapas.map((etapa, index) => (
                    <span key={etapa} className="flex items-center gap-2 text-xs text-[#64736D]">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-[10px] font-bold text-[#8B6827]">
                        {index + 1}
                      </span>
                      {etapa}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
