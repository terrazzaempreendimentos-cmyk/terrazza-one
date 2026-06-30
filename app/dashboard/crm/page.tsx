import Link from "next/link";
import {
  CalendarClock,
  Flame,
  MessageSquareText,
  ShieldCheck,
  Sparkles,
  UsersRound,
} from "lucide-react";

import { supabase } from "../../../lib/supabase";

type Lead = {
  id: string;
  nome: string;
  tipo_lead: string | null;
  objetivo: string | null;
  origem: string | null;
  status: string | null;
  responsavel: string | null;
  created_at: string | null;
};

type Tarefa = {
  id: string;
  titulo: string;
  tipo: string | null;
  status: string | null;
  prioridade: string | null;
  data: string | null;
  hora: string | null;
  responsavel: string | null;
};

type TimelineEvento = {
  id: string;
  tipo: string | null;
  titulo: string;
  origem: string | null;
  created_at: string | null;
};

type Corretor = {
  id: string;
  nome: string;
  status: string | null;
};

function dataHoje() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
  }).format(new Date());
}

function labelTexto(valor: string | null) {
  if (!valor) return "Não informado";

  return valor.replaceAll("_", " ");
}

function formatarData(data: string | null) {
  if (!data) return "Sem data";

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "medium",
  }).format(new Date(data));
}

export default async function CRMPage() {
  const hoje = dataHoje();
  const [leadsResult, tarefasResult, timelineResult, corretoresResult] =
    await Promise.all([
      supabase
        .from("leads")
        .select("id, nome, tipo_lead, objetivo, origem, status, responsavel, created_at")
        .order("created_at", { ascending: false }),
      supabase
        .from("tarefas")
        .select("id, titulo, tipo, status, prioridade, data, hora, responsavel")
        .order("data", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: false }),
      supabase
        .from("timeline")
        .select("id, tipo, titulo, origem, created_at")
        .order("created_at", { ascending: false })
        .limit(6),
      supabase
        .from("corretores")
        .select("id, nome, status")
        .order("nome", { ascending: true }),
    ]);

  const leads = (leadsResult.data ?? []) as Lead[];
  const tarefas = (tarefasResult.data ?? []) as Tarefa[];
  const eventos = (timelineResult.data ?? []) as TimelineEvento[];
  const corretores = (corretoresResult.data ?? []) as Corretor[];

  const leadsQuentes = leads.filter((lead) =>
    ["corretor", "ia_qualificando"].includes(lead.status ?? ""),
  );
  const tarefasHoje = tarefas.filter(
    (tarefa) => tarefa.data === hoje && tarefa.status !== "concluida",
  );
  const tarefasAtrasadas = tarefas.filter(
    (tarefa) =>
      tarefa.data &&
      tarefa.data < hoje &&
      tarefa.status !== "concluida" &&
      tarefa.status !== "cancelada",
  );
  const visitasAgendadas = tarefas.filter(
    (tarefa) =>
      ["visita", "avaliacao_imovel", "reuniao"].includes(tarefa.tipo ?? ""),
  );
  const atendimentosEmAndamento = leads.filter((lead) =>
    ["ia_qualificando", "corretor"].includes(lead.status ?? ""),
  );
  const corretoresAtivos = corretores.filter(
    (corretor) => !corretor.status || corretor.status === "ativo",
  );

  const cards = [
    {
      titulo: "Leads ativos",
      valor: leads.filter((lead) => lead.status !== "perdido").length,
      detalhe: "Base comercial em acompanhamento",
      icon: UsersRound,
    },
    {
      titulo: "Leads quentes",
      valor: leadsQuentes.length,
      detalhe: "Prontos para ação consultiva",
      icon: Flame,
    },
    {
      titulo: "Atendimentos em andamento",
      valor: atendimentosEmAndamento.length,
      detalhe: "Conversas em qualificação",
      icon: MessageSquareText,
    },
    {
      titulo: "Tarefas de hoje",
      valor: tarefasHoje.length,
      detalhe: "Agenda operacional do dia",
      icon: CalendarClock,
    },
    {
      titulo: "Visitas agendadas",
      valor: visitasAgendadas.length,
      detalhe: "Visitas e avaliações previstas",
      icon: Sparkles,
    },
    {
      titulo: "Corretores ativos",
      valor: corretoresAtivos.length,
      detalhe: "Equipe disponível para distribuição",
      icon: ShieldCheck,
    },
  ];

  const erroCarregamento =
    leadsResult.error ||
    tarefasResult.error ||
    timelineResult.error ||
    corretoresResult.error;

  return (
    <main className="min-h-screen bg-[#F7F3ED] px-6 py-10 sm:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="rounded-[2rem] border border-[#E8DDCB] bg-white p-6 shadow-sm sm:p-8">
          <span className="rounded-full border border-[#C89B3C]/35 bg-[#C89B3C]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#8B6827]">
            Terrazza CRM
          </span>
          <div className="mt-5 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-4xl font-bold tracking-tight text-[#071E36]">
                CRM Terrazza
              </h1>
              <p className="mt-2 max-w-3xl leading-6 text-[#64736D]">
                Central operacional de leads, atendimentos e relacionamento comercial.
              </p>
            </div>
            <Link
              href="/dashboard/crm/leads"
              className="inline-flex w-fit rounded-xl bg-[#071E36] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#0A2A4A]"
            >
              Abrir leads
            </Link>
          </div>
        </header>

        {erroCarregamento ? (
          <p className="mt-6 rounded-xl bg-[#fbebe7] px-4 py-3 text-sm text-[#8a2e1c]">
            Alguns dados operacionais não puderam ser carregados. A central permanece pronta para receber dados reais.
          </p>
        ) : null}

        <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {cards.map((card) => {
            const Icon = card.icon;

            return (
              <article
                key={card.titulo}
                className="rounded-3xl border border-[#E8DDCB] bg-white p-5 shadow-sm"
              >
                <div className="flex items-center justify-between gap-4">
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#071E36] text-[#E1B866]">
                    <Icon size={21} strokeWidth={2.2} />
                  </span>
                  <strong className="text-3xl font-bold text-[#071E36]">
                    {card.valor}
                  </strong>
                </div>
                <h2 className="mt-4 text-sm font-semibold uppercase tracking-[0.14em] text-[#071E36]">
                  {card.titulo}
                </h2>
                <p className="mt-1 text-sm text-[#64736D]">{card.detalhe}</p>
              </article>
            );
          })}
        </section>

        <section className="mt-6 grid gap-6 xl:grid-cols-2">
          <div className="rounded-3xl border border-[#E8DDCB] bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-[#071E36]">
              Próximos atendimentos
            </h2>
            <div className="mt-5 grid gap-3">
              {tarefas.slice(0, 4).map((tarefa) => (
                <div
                  key={tarefa.id}
                  className="rounded-2xl border border-[#E8DDCB] bg-[#fffdfa] p-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold text-[#071E36]">{tarefa.titulo}</p>
                      <p className="mt-1 text-sm text-[#64736D]">
                        {formatarData(tarefa.data)} {tarefa.hora ? `às ${tarefa.hora}` : ""}
                      </p>
                    </div>
                    <span className="rounded-full bg-[#C89B3C]/10 px-3 py-1 text-xs font-semibold text-[#8B6827]">
                      {labelTexto(tarefa.status)}
                    </span>
                  </div>
                </div>
              ))}
              {tarefas.length === 0 ? (
                <p className="rounded-2xl bg-[#F7F3ED] px-4 py-8 text-center text-sm text-[#64736D]">
                  Nenhum atendimento agendado.
                </p>
              ) : null}
            </div>
          </div>

          <div className="rounded-3xl border border-[#E8DDCB] bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-[#071E36]">
              Leads prioritários
            </h2>
            <div className="mt-5 grid gap-3">
              {leadsQuentes.slice(0, 4).map((lead) => (
                <div
                  key={lead.id}
                  className="rounded-2xl border border-[#E8DDCB] bg-[#fffdfa] p-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold text-[#071E36]">{lead.nome}</p>
                      <p className="mt-1 text-sm text-[#64736D]">
                        {labelTexto(lead.tipo_lead)} • {labelTexto(lead.objetivo)}
                      </p>
                    </div>
                    <span className="rounded-full bg-[#071E36] px-3 py-1 text-xs font-semibold text-[#E1B866]">
                      {labelTexto(lead.status)}
                    </span>
                  </div>
                </div>
              ))}
              {leadsQuentes.length === 0 ? (
                <p className="rounded-2xl bg-[#F7F3ED] px-4 py-8 text-center text-sm text-[#64736D]">
                  Nenhum lead prioritário no momento.
                </p>
              ) : null}
            </div>
          </div>

          <div className="rounded-3xl border border-[#E8DDCB] bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-[#071E36]">
              Pendências comerciais
            </h2>
            <div className="mt-5 grid gap-3">
              {tarefasAtrasadas.slice(0, 5).map((tarefa) => (
                <div
                  key={tarefa.id}
                  className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4"
                >
                  <p className="font-semibold text-[#071E36]">{tarefa.titulo}</p>
                  <p className="mt-1 text-sm text-[#64736D]">
                    Responsável: {tarefa.responsavel || "não definido"}
                  </p>
                </div>
              ))}
              {tarefasAtrasadas.length === 0 ? (
                <p className="rounded-2xl bg-[#F7F3ED] px-4 py-8 text-center text-sm text-[#64736D]">
                  Sem pendências atrasadas.
                </p>
              ) : null}
            </div>
          </div>

          <div className="rounded-3xl border border-[#E8DDCB] bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-[#071E36]">
              Últimas movimentações
            </h2>
            <div className="mt-5 grid gap-3">
              {eventos.map((evento) => (
                <div
                  key={evento.id}
                  className="rounded-2xl border border-[#E8DDCB] bg-[#fffdfa] p-4"
                >
                  <p className="font-semibold text-[#071E36]">{evento.titulo}</p>
                  <p className="mt-1 text-sm text-[#64736D]">
                    {labelTexto(evento.tipo)} • {labelTexto(evento.origem)}
                  </p>
                </div>
              ))}
              {eventos.length === 0 ? (
                <p className="rounded-2xl bg-[#F7F3ED] px-4 py-8 text-center text-sm text-[#64736D]">
                  Nenhuma movimentação registrada.
                </p>
              ) : null}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
