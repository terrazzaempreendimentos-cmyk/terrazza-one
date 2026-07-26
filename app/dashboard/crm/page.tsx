import Link from "next/link";
import {
  BriefcaseBusiness,
  CalendarClock,
  ClipboardList,
  FileText,
  Flame,
  LineChart,
  MessageSquareText,
  Sparkles,
  UsersRound,
} from "lucide-react";

import { requirePagePermission } from "../../../lib/auth/page-permission";
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

function dataHoje() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
  }).format(new Date());
}

function labelTexto(valor: string | null) {
  if (!valor) return "Nao informado";
  return valor.replaceAll("_", " ");
}

function formatarData(data: string | null) {
  if (!data) return "Sem data";

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "medium",
  }).format(new Date(data));
}

export default async function CRMPage() {
  await requirePagePermission("dashboard.visualizar");

  const hoje = dataHoje();
  const [leadsResult, tarefasResult, timelineResult] = await Promise.all([
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
  ]);

  const leads = (leadsResult.data ?? []) as Lead[];
  const tarefas = (tarefasResult.data ?? []) as Tarefa[];
  const eventos = (timelineResult.data ?? []) as TimelineEvento[];

  const leadsQuentes = leads.filter((lead) =>
    ["corretor", "ia_qualificando", "proposta", "negociacao"].includes(
      lead.status ?? "",
    ),
  );
  const novosHoje = leads.filter((lead) => lead.created_at?.startsWith(hoje));
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
  const visitasAgendadas = tarefas.filter((tarefa) =>
    ["visita", "avaliacao_imovel", "reuniao", "vistoria"].includes(
      tarefa.tipo ?? "",
    ),
  );
  const atendimentosEmAndamento = leads.filter((lead) =>
    ["ia_qualificando", "corretor"].includes(lead.status ?? ""),
  );
  const propostasAbertas = leads.filter((lead) =>
    ["proposta", "negociacao"].includes(lead.status ?? ""),
  );
  const followUpsPendentes = tarefas.filter((tarefa) =>
    ["follow_up", "ligacao", "mensagem"].includes(tarefa.tipo ?? ""),
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
      detalhe: "Prontos para acao consultiva",
      icon: Flame,
    },
    {
      titulo: "Novos hoje",
      valor: novosHoje.length,
      detalhe: "Entradas comerciais do dia",
      icon: Sparkles,
    },
    {
      titulo: "Atendimentos em andamento",
      valor: atendimentosEmAndamento.length,
      detalhe: "Conversas em qualificacao",
      icon: MessageSquareText,
    },
    {
      titulo: "Visitas agendadas",
      valor: visitasAgendadas.length,
      detalhe: "Visitas e avaliacoes previstas",
      icon: CalendarClock,
    },
    {
      titulo: "Propostas abertas",
      valor: propostasAbertas.length,
      detalhe: "Negociacoes em andamento",
      icon: FileText,
    },
    {
      titulo: "Negocios em negociacao",
      valor: propostasAbertas.length,
      detalhe: "Oportunidades comerciais ativas",
      icon: BriefcaseBusiness,
    },
    {
      titulo: "Follow-ups pendentes",
      valor: followUpsPendentes.length,
      detalhe: "Retornos e contatos a fazer",
      icon: ClipboardList,
    },
  ];

  const pipelineResumo = [
    ["Venda", "Novo lead", "Qualificacao", "Visita", "Proposta", "Negociacao", "Contrato", "Fechado"],
    ["Locacao", "Novo lead", "Qualificacao", "Visita", "Ficha cadastral", "Analise", "Contrato", "Entrega de chaves"],
    ["Administracao", "Novo proprietario", "Avaliacao", "Documentacao", "Fotos", "Publicacao", "Contrato", "Administracao ativa"],
    ["Captacao", "Novo contato", "Qualificacao", "Avaliacao", "Proposta comercial", "Autorizacao", "Publicacao", "Ativo"],
  ];

  const erroCarregamento = leadsResult.error || tarefasResult.error || timelineResult.error;

  return (
    <main className="min-h-screen bg-[#F7F3ED] px-6 py-10 sm:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="rounded-[2rem] border border-[#E8DDCB] bg-white p-6 shadow-sm sm:p-8">
          <span className="rounded-full border border-[#C89B3C]/35 bg-[#C89B3C]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#8B6827]">
            CRM Comercial
          </span>
          <div className="mt-5 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-4xl font-bold tracking-tight text-[#071E36]">
                CRM Terrazza
              </h1>
              <p className="mt-2 max-w-3xl leading-6 text-[#64736D]">
                Central operacional de leads, atendimentos, negocios, pipeline,
                agenda, timeline e atividades comerciais.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/dashboard/crm/leads"
                className="inline-flex w-fit rounded-xl bg-[#071E36] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#0A2A4A]"
              >
                Abrir leads
              </Link>
              <Link
                href="/dashboard/crm/negocios"
                className="inline-flex w-fit rounded-xl border border-[#E8DDCB] bg-[#F7F3ED] px-5 py-3 text-sm font-semibold text-[#071E36] transition hover:border-[#C89B3C]/45 hover:bg-[#C89B3C]/10"
              >
                Ver negocios
              </Link>
            </div>
          </div>
        </header>

        {erroCarregamento ? (
          <p className="mt-6 rounded-xl bg-[#fbebe7] px-4 py-3 text-sm text-[#8a2e1c]">
            Alguns dados operacionais nao puderam ser carregados. A central
            permanece pronta para receber dados reais.
          </p>
        ) : null}

        <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
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

        <section className="mt-6 rounded-3xl border border-[#E8DDCB] bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <LineChart className="text-[#C89B3C]" size={20} />
            <h2 className="text-xl font-semibold text-[#071E36]">
              Pipeline resumido
            </h2>
          </div>
          <div className="mt-5 grid gap-4 xl:grid-cols-4">
            {pipelineResumo.map(([tipo, ...etapas]) => (
              <div key={tipo} className="rounded-2xl border border-[#E8DDCB] bg-[#F7F3ED] p-4">
                <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[#071E36]">
                  {tipo}
                </p>
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

        <section className="mt-6 grid gap-6 xl:grid-cols-2">
          <div className="rounded-3xl border border-[#E8DDCB] bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-[#071E36]">
              Prioridades comerciais do dia
            </h2>
            <div className="mt-5 grid gap-3">
              {[
                ["Leads aguardando retorno", `${leadsQuentes.length} contatos prioritarios`],
                ["Tarefas de hoje", `${tarefasHoje.length} acoes na agenda`],
                ["Follow-ups pendentes", `${followUpsPendentes.length} retornos a fazer`],
                ["Visitas e avaliacoes", `${visitasAgendadas.length} compromissos previstos`],
                ["Pendencias comerciais", `${tarefasAtrasadas.length} tarefas atrasadas`],
              ].map(([title, detail]) => (
                <div key={title} className="rounded-2xl border border-[#E8DDCB] bg-[#fffdfa] p-4">
                  <p className="font-semibold text-[#071E36]">{title}</p>
                  <p className="mt-1 text-sm text-[#64736D]">{detail}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-[#E8DDCB] bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-[#071E36]">
              Atendimentos recentes
            </h2>
            <div className="mt-5 grid gap-3">
              {leads.slice(0, 4).map((lead) => (
                <div key={lead.id} className="rounded-2xl border border-[#E8DDCB] bg-[#fffdfa] p-4">
                  <p className="font-semibold text-[#071E36]">{lead.nome}</p>
                  <p className="mt-1 text-sm text-[#64736D]">
                    {labelTexto(lead.tipo_lead)} · {labelTexto(lead.objetivo)}
                  </p>
                </div>
              ))}
              {leads.length === 0 ? (
                <p className="rounded-2xl bg-[#F7F3ED] px-4 py-8 text-center text-sm text-[#64736D]">
                  Nenhum atendimento recente.
                </p>
              ) : null}
            </div>
          </div>

          <div className="rounded-3xl border border-[#E8DDCB] bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-[#071E36]">
              Proximas visitas
            </h2>
            <div className="mt-5 grid gap-3">
              {tarefas.slice(0, 4).map((tarefa) => (
                <div key={tarefa.id} className="rounded-2xl border border-[#E8DDCB] bg-[#fffdfa] p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold text-[#071E36]">{tarefa.titulo}</p>
                      <p className="mt-1 text-sm text-[#64736D]">
                        {formatarData(tarefa.data)} {tarefa.hora ? `as ${tarefa.hora}` : ""}
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
                  Nenhuma visita agendada.
                </p>
              ) : null}
            </div>
          </div>

          <div className="rounded-3xl border border-[#E8DDCB] bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-[#071E36]">
              Ultimas atividades
            </h2>
            <div className="mt-5 grid gap-3">
              {eventos.map((evento) => (
                <div key={evento.id} className="rounded-2xl border border-[#E8DDCB] bg-[#fffdfa] p-4">
                  <p className="font-semibold text-[#071E36]">{evento.titulo}</p>
                  <p className="mt-1 text-sm text-[#64736D]">
                    {labelTexto(evento.tipo)} · {labelTexto(evento.origem)}
                  </p>
                </div>
              ))}
              {eventos.length === 0 ? (
                <p className="rounded-2xl bg-[#F7F3ED] px-4 py-8 text-center text-sm text-[#64736D]">
                  Nenhuma atividade registrada.
                </p>
              ) : null}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
