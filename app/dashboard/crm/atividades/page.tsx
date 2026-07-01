import Link from "next/link";
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  Filter,
  Search,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

type Atividade = {
  id: string;
  titulo: string;
  tipo: string;
  pessoa: string;
  imovel: string;
  negocio: string;
  responsavel: string;
  prazo: string;
  prioridade: "baixa" | "media" | "alta" | "urgente";
  status: "pendente" | "em_andamento" | "concluida" | "atrasada";
  descricao: string;
};

const atividades: Atividade[] = [
  {
    id: "ativ-001",
    titulo: "Retornar lead quente",
    tipo: "follow-up",
    pessoa: "Mariana Alves",
    imovel: "Apartamento Ponta Verde",
    negocio: "Locacao ate R$ 3.500",
    responsavel: "Equipe Locacao",
    prazo: "Hoje, 15:00",
    prioridade: "alta",
    status: "pendente",
    descricao: "Confirmar interesse e sugerir horarios de visita.",
  },
  {
    id: "ativ-002",
    titulo: "Agendar avaliacao",
    tipo: "avaliacao",
    pessoa: "Roberto Lima",
    imovel: "Casa no Poco",
    negocio: "Venda casa no Poco",
    responsavel: "Vendas",
    prazo: "Amanha",
    prioridade: "media",
    status: "em_andamento",
    descricao: "Validar metragem, documentacao e expectativa de preco.",
  },
  {
    id: "ativ-003",
    titulo: "Solicitar documentos",
    tipo: "documentacao",
    pessoa: "Ana Paula",
    imovel: "Apartamento Farol",
    negocio: "Administracao de apto no Farol",
    responsavel: "Patrimonial",
    prazo: "Esta semana",
    prioridade: "alta",
    status: "pendente",
    descricao: "Pedir matricula, IPTU e autorizacao para administracao.",
  },
  {
    id: "ativ-004",
    titulo: "Registrar proposta enviada",
    tipo: "proposta",
    pessoa: "Carlos Henrique",
    imovel: "Imovel a captar",
    negocio: "Captacao Jatiuca",
    responsavel: "Captacao",
    prazo: "Ontem",
    prioridade: "urgente",
    status: "atrasada",
    descricao: "Atualizar proximo passo e registrar retorno do proprietario.",
  },
];

function badgeClassName(valor: Atividade["prioridade"] | Atividade["status"]) {
  const classes: Record<string, string> = {
    baixa: "bg-slate-100 text-slate-700",
    media: "bg-sky-50 text-sky-700",
    alta: "bg-amber-50 text-amber-700",
    urgente: "bg-red-50 text-red-700",
    pendente: "bg-amber-50 text-amber-700",
    em_andamento: "bg-sky-50 text-sky-700",
    concluida: "bg-emerald-50 text-emerald-700",
    atrasada: "bg-red-50 text-red-700",
  };

  return `rounded-full px-3 py-1 text-xs font-semibold ${classes[valor]}`;
}

export default function AtividadesPage() {
  const cards: Array<{ titulo: string; valor: number; icon: LucideIcon }> = [
    {
      titulo: "Pendentes",
      valor: atividades.filter((item) => item.status === "pendente").length,
      icon: ClipboardList,
    },
    {
      titulo: "Em andamento",
      valor: atividades.filter((item) => item.status === "em_andamento").length,
      icon: CalendarClock,
    },
    {
      titulo: "Atrasadas",
      valor: atividades.filter((item) => item.status === "atrasada").length,
      icon: AlertTriangle,
    },
    {
      titulo: "Concluidas",
      valor: atividades.filter((item) => item.status === "concluida").length,
      icon: CheckCircle2,
    },
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
          <h1 className="mt-5 text-4xl font-bold tracking-tight text-[#071E36]">
            Atividades
          </h1>
          <p className="mt-2 max-w-3xl leading-6 text-[#64736D]">
            Central de tarefas comerciais ligadas a pessoas, imoveis, negocios,
            responsaveis e prazos.
          </p>
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
                placeholder="Buscar atividade, pessoa, negocio..."
                className="h-full w-full rounded-xl border border-[#E8DDCB] bg-white py-3 pl-9 pr-3 text-sm text-[#071E36] outline-none focus:border-[#C89B3C]"
              />
            </label>
            {["Tipo", "Responsavel", "Prioridade", "Status"].map((label) => (
              <select key={label} className="rounded-xl border border-[#E8DDCB] bg-white px-3 py-3 text-sm text-[#071E36]">
                <option>{label}</option>
              </select>
            ))}
            <button type="button" className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#071E36] px-5 py-3 text-sm font-semibold text-white">
              <Filter size={16} />
              Filtrar
            </button>
          </form>
        </section>

        <section className="mt-6 grid gap-4">
          {atividades.map((atividade) => (
            <article key={atividade.id} className="rounded-3xl border border-[#E8DDCB] bg-white p-5 shadow-sm">
              <div className="grid gap-5 xl:grid-cols-[1.2fr_1fr_auto] xl:items-start">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8B6827]">
                    {atividade.tipo}
                  </p>
                  <h2 className="mt-2 text-xl font-bold text-[#071E36]">{atividade.titulo}</h2>
                  <p className="mt-2 text-sm leading-6 text-[#64736D]">{atividade.descricao}</p>
                </div>

                <div className="grid gap-2 text-sm">
                  {[
                    ["Pessoa", atividade.pessoa],
                    ["Imovel", atividade.imovel],
                    ["Negocio", atividade.negocio],
                    ["Responsavel", atividade.responsavel],
                    ["Prazo", atividade.prazo],
                  ].map(([label, value]) => (
                    <span key={label} className="rounded-2xl bg-[#F7F3ED] px-3 py-2 text-[#64736D]">
                      <strong className="text-[#071E36]">{label}:</strong> {value}
                    </span>
                  ))}
                </div>

                <div className="flex min-w-[180px] flex-col gap-2">
                  <span className={badgeClassName(atividade.prioridade)}>
                    Prioridade {atividade.prioridade}
                  </span>
                  <span className={badgeClassName(atividade.status)}>
                    {atividade.status.replaceAll("_", " ")}
                  </span>
                  <button
                    type="button"
                    disabled
                    className="mt-3 rounded-xl border border-[#E8DDCB] bg-[#F7F3ED] px-4 py-3 text-sm font-semibold text-[#071E36]"
                  >
                    Editar em breve
                  </button>
                </div>
              </div>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
