import Link from "next/link";

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

type TimelineEvento = {
  id: string;
  tipo: string | null;
  titulo: string | null;
  descricao: string | null;
  lead_id: string | null;
  proprietario_id: string | null;
  inquilino_id: string | null;
  imovel_id: string | null;
  corretor_id: string | null;
  origem: string | null;
  created_at: string | null;
};

function labelTexto(valor: string | null) {
  if (!valor) return "Evento";

  return valor.replaceAll("_", " ");
}

function iconePorTipo(tipo: string | null) {
  const icones: Record<string, string> = {
    tarefa: "✓",
    tarefa_criada: "+",
    tarefa_concluida: "✓",
    lead: "L",
    mensagem: "M",
    ligacao: "☎",
    visita: "V",
    follow_up: "F",
  };

  return tipo ? icones[tipo] ?? "•" : "•";
}

function formatarData(data: string | null) {
  if (!data) return "—";

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "medium",
  }).format(new Date(data));
}

function formatarHora(data: string | null) {
  if (!data) return "";

  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(data));
}

function nomeImovel(imovel: Imovel | undefined) {
  if (!imovel) return null;

  return [imovel.tipo, imovel.cidade, imovel.bairro].filter(Boolean).join(" • ");
}

function descricaoCurta(descricao: string | null) {
  if (!descricao) return null;

  return descricao.length > 180 ? `${descricao.slice(0, 180)}...` : descricao;
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

  const leadsPorId = new Map(leads.map((lead) => [lead.id, lead.nome]));
  const proprietariosPorId = new Map(
    proprietarios.map((proprietario) => [proprietario.id, proprietario.nome]),
  );
  const inquilinosPorId = new Map(
    inquilinos.map((inquilino) => [inquilino.id, inquilino.nome]),
  );
  const imoveisPorId = new Map(imoveis.map((imovel) => [imovel.id, imovel]));
  const corretoresPorId = new Map(
    corretores.map((corretor) => [corretor.id, corretor.nome]),
  );

  const erroCarregamento =
    timelineResult.error ||
    leadsResult.error ||
    proprietariosResult.error ||
    inquilinosResult.error ||
    imoveisResult.error ||
    corretoresResult.error;

  return (
    <main className="min-h-screen bg-[#F7F3ED] px-6 py-10 sm:px-8">
      <div className="mx-auto max-w-7xl">
        <Link
          href="/dashboard"
          className="inline-flex rounded-xl border border-[#E8DDCB] bg-white px-4 py-2 text-sm font-medium text-[#071E36] transition hover:border-[#C89B3C]/45 hover:bg-[#C89B3C]/10"
        >
          ← Voltar ao Dashboard
        </Link>

        <div className="mt-8">
          <span className="rounded-full border border-[#C89B3C]/35 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#8B6827]">
            Terrazza CRM
          </span>
          <h1 className="mt-5 text-4xl font-bold text-[#071E36]">
            Timeline Inteligente
          </h1>
          <p className="mt-2 max-w-3xl text-[#64736D]">
            Histórico único dos acontecimentos do relacionamento imobiliário.
          </p>
        </div>

        {erroCarregamento ? (
          <p className="mt-10 rounded-xl bg-[#fbebe7] px-4 py-3 text-sm text-[#8a2e1c]">
            Não foi possível carregar a timeline. Verifique se a tabela já foi criada.
          </p>
        ) : eventos.length === 0 ? (
          <p className="mt-10 rounded-2xl border border-[#E8DDCB] bg-white px-4 py-12 text-center text-sm text-[#64736D] shadow-sm">
            Nenhum evento registrado até o momento.
          </p>
        ) : (
          <section className="relative mt-12">
            <div className="absolute left-6 top-0 h-full w-px bg-[#C89B3C]/35 md:left-1/2" />

            <div className="grid gap-8">
              {eventos.map((evento, index) => {
                const vinculos = [
                  evento.lead_id ? ["Lead", leadsPorId.get(evento.lead_id)] : null,
                  evento.proprietario_id
                    ? [
                        "Proprietário",
                        proprietariosPorId.get(evento.proprietario_id),
                      ]
                    : null,
                  evento.inquilino_id
                    ? ["Inquilino", inquilinosPorId.get(evento.inquilino_id)]
                    : null,
                  evento.imovel_id
                    ? ["Imóvel", nomeImovel(imoveisPorId.get(evento.imovel_id))]
                    : null,
                  evento.corretor_id
                    ? ["Corretor", corretoresPorId.get(evento.corretor_id)]
                    : null,
                ].filter((vinculo): vinculo is string[] => Boolean(vinculo?.[1]));

                const alinhamento =
                  index % 2 === 0
                    ? "md:col-start-1 md:pr-12"
                    : "md:col-start-2 md:pl-12";

                return (
                  <article key={evento.id} className="relative grid md:grid-cols-2">
                    <div
                      className={`ml-16 rounded-2xl border border-[#E8DDCB] bg-white p-6 shadow-sm md:ml-0 ${alinhamento}`}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8B6827]">
                            {labelTexto(evento.tipo)}
                          </span>
                          <h2 className="mt-2 text-xl font-semibold text-[#071E36]">
                            {evento.titulo || "Evento sem título"}
                          </h2>
                        </div>
                        <span className="rounded-full bg-[#F7F3ED] px-3 py-1 text-xs font-medium text-[#64736D]">
                          {evento.origem || "manual"}
                        </span>
                      </div>

                      <p className="mt-3 text-sm text-[#64736D]">
                        {formatarData(evento.created_at)}
                        {evento.created_at ? ` às ${formatarHora(evento.created_at)}` : ""}
                      </p>

                      {descricaoCurta(evento.descricao) ? (
                        <p className="mt-4 text-sm leading-6 text-[#102A27]">
                          {descricaoCurta(evento.descricao)}
                        </p>
                      ) : null}

                      {vinculos.length > 0 ? (
                        <div className="mt-5 flex flex-wrap gap-2">
                          {vinculos.map(([label, nome]) => (
                            <span
                              key={`${evento.id}-${label}-${nome}`}
                              className="rounded-full border border-[#E8DDCB] px-3 py-1 text-xs text-[#64736D]"
                            >
                              {label}: {nome}
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </div>

                    <div className="absolute left-2 top-6 flex size-8 items-center justify-center rounded-full border border-[#C89B3C] bg-[#071E36] text-sm font-bold text-[#E1B866] md:left-1/2 md:-translate-x-1/2">
                      {iconePorTipo(evento.tipo)}
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
