import Link from "next/link";

import { TimelinePanel } from "../../../../components/crm/TimelinePanel";
import {
  montarTimelineItems,
  type TimelineEvento,
} from "../../../../lib/timeline";
import { supabase } from "../../../../lib/supabase";

type Lead = {
  id: string;
  nome: string;
};

type Proprietario = {
  id: string;
  nome: string;
};

type Inquilino = {
  id: string;
  nome: string;
};

type Imovel = {
  id: string;
  tipo: string | null;
  cidade: string | null;
  bairro: string | null;
};

type Corretor = {
  id: string;
  nome: string;
};

const tiposEventosOperacionais = [
  "lead criado",
  "mensagem recebida",
  "resposta enviada",
  "handoff UCE",
  "tarefa criada",
  "visita agendada",
  "proposta enviada",
  "manutencao registrada",
  "atendimento concluido",
];

function nomeImovel(imovel: Imovel) {
  return (
    [imovel.tipo, imovel.cidade, imovel.bairro].filter(Boolean).join(" • ") ||
    "Imóvel sem identificação"
  );
}

export default async function TimelinePage() {
  const [
    timelineResult,
    leadsResult,
    proprietariosResult,
    inquilinosResult,
    imoveisResult,
    corretoresResult,
  ] = await Promise.all([
    supabase
      .from("timeline")
      .select(
        "id, tipo, titulo, descricao, lead_id, proprietario_id, inquilino_id, imovel_id, corretor_id, origem, created_at",
      )
      .order("created_at", { ascending: false }),
    supabase.from("leads").select("id, nome"),
    supabase.from("proprietarios").select("id, nome"),
    supabase.from("inquilinos").select("id, nome"),
    supabase.from("imoveis").select("id, tipo, cidade, bairro"),
    supabase.from("corretores").select("id, nome"),
  ]);

  const eventos = (timelineResult.data ?? []) as TimelineEvento[];
  const leads = (leadsResult.data ?? []) as Lead[];
  const proprietarios = (proprietariosResult.data ?? []) as Proprietario[];
  const inquilinos = (inquilinosResult.data ?? []) as Inquilino[];
  const imoveis = (imoveisResult.data ?? []) as Imovel[];
  const corretores = (corretoresResult.data ?? []) as Corretor[];

  const timelineItems = montarTimelineItems(eventos, {
    leadsPorId: new Map(leads.map((lead) => [lead.id, lead.nome])),
    proprietariosPorId: new Map(
      proprietarios.map((proprietario) => [
        proprietario.id,
        proprietario.nome,
      ]),
    ),
    inquilinosPorId: new Map(
      inquilinos.map((inquilino) => [inquilino.id, inquilino.nome]),
    ),
    imoveisPorId: new Map(imoveis.map((imovel) => [imovel.id, nomeImovel(imovel)])),
    corretoresPorId: new Map(
      corretores.map((corretor) => [corretor.id, corretor.nome]),
    ),
  });

  const erroCarregamento =
    timelineResult.error ||
    leadsResult.error ||
    proprietariosResult.error ||
    inquilinosResult.error ||
    imoveisResult.error ||
    corretoresResult.error;

  const resumoTimeline = [
    {
      titulo: "Eventos recentes",
      valor: eventos.length,
      descricao: "Registros operacionais",
    },
    {
      titulo: "Origens",
      valor: new Set(eventos.map((evento) => evento.origem).filter(Boolean)).size,
      descricao: "Canais identificados",
    },
    {
      titulo: "Responsaveis",
      valor: corretores.length,
      descricao: "Corretores vinculaveis",
    },
    {
      titulo: "Tipos de evento",
      valor: new Set(eventos.map((evento) => evento.tipo).filter(Boolean)).size,
      descricao: "Categorias registradas",
    },
  ];

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
          <span className="rounded-full border border-[#C89B3C]/35 bg-[#C89B3C]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#8B6827]">
            Terrazza CRM
          </span>
          <h1 className="mt-5 text-4xl font-bold text-[#071E36]">
            Timeline Inteligente
          </h1>
          <p className="mt-2 max-w-3xl leading-6 text-[#64736D]">
            Histórico único dos acontecimentos do relacionamento imobiliário,
            preparado para receber eventos da Agenda, IA, WhatsApp, Vista ERP e
            Sistema.
          </p>
        </header>

        {!erroCarregamento ? (
          <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {resumoTimeline.map((card) => (
              <article
                key={card.titulo}
                className="rounded-3xl border border-[#E8DDCB] bg-white p-5 shadow-sm"
              >
                <strong className="text-3xl font-bold text-[#071E36]">
                  {card.valor}
                </strong>
                <h2 className="mt-3 text-sm font-semibold uppercase tracking-[0.14em] text-[#071E36]">
                  {card.titulo}
                </h2>
                <p className="mt-1 text-sm text-[#64736D]">{card.descricao}</p>
              </article>
            ))}
          </section>
        ) : null}

        {!erroCarregamento ? (
          <section className="mt-6 rounded-3xl border border-[#E8DDCB] bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-[#071E36]">
              Eventos operacionais
            </h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {tiposEventosOperacionais.map((tipo) => (
                <span
                  key={tipo}
                  className="rounded-full border border-[#E8DDCB] bg-[#F7F3ED] px-3 py-1 text-xs font-semibold text-[#64736D]"
                >
                  {tipo}
                </span>
              ))}
            </div>
          </section>
        ) : null}

        {erroCarregamento ? (
          <p className="mt-10 rounded-xl bg-[#fbebe7] px-4 py-3 text-sm text-[#8a2e1c]">
            Não foi possível carregar a timeline. Verifique se a tabela já foi
            criada.
          </p>
        ) : timelineItems.length === 0 ? (
          <p className="mt-10 rounded-2xl border border-[#E8DDCB] bg-white px-4 py-12 text-center text-sm text-[#64736D] shadow-sm">
            Nenhum evento registrado até o momento.
          </p>
        ) : (
          <TimelinePanel eventos={timelineItems} />
        )}
      </div>
    </main>
  );
}
