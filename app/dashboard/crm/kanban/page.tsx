import { supabase } from "../../../../lib/supabase";

type Lead = {
  id: string;
  nome: string;
  telefone: string | null;
  tipo_lead: string | null;
  objetivo: string | null;
  cidade: string | null;
  origem: string | null;
  status: string | null;
  responsavel: string | null;
};

const colunas = [
  {
    id: "novo",
    title: "Novo",
    description: "Entrada comercial",
    statusValues: ["novo", ""],
  },
  {
    id: "qualificando",
    title: "Qualificando",
    description: "UCE ou equipe coletando contexto",
    statusValues: ["ia_qualificando"],
  },
  {
    id: "atendimento",
    title: "Em atendimento",
    description: "Corretor ou consultor conduzindo",
    statusValues: ["corretor", "em_atendimento"],
  },
  {
    id: "visita",
    title: "Visita/avaliacao",
    description: "Agenda comercial ativa",
    statusValues: ["visita", "avaliacao", "avaliacao_imovel"],
  },
  {
    id: "proposta",
    title: "Proposta",
    description: "Negociacao em andamento",
    statusValues: ["proposta", "negociacao"],
  },
  {
    id: "fechado",
    title: "Fechado",
    description: "Conversao concluida",
    statusValues: ["fechado"],
  },
  {
    id: "perdido",
    title: "Perdido",
    description: "Oportunidade encerrada",
    statusValues: ["perdido"],
  },
];

function labelTexto(valor: string | null) {
  if (!valor) return "Nao informado";

  return valor.replaceAll("_", " ");
}

export default async function KanbanPage() {
  const { data, error } = await supabase
    .from("leads")
    .select("id, nome, telefone, tipo_lead, objetivo, cidade, origem, status, responsavel")
    .order("created_at", { ascending: false });

  const leads = (data ?? []) as Lead[];

  return (
    <main className="min-h-screen bg-[#F7F3ED] px-6 py-10 sm:px-8">
      <div className="mx-auto max-w-7xl">
        <div>
          <span className="rounded-full border border-[#C89B3C]/35 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#8B6827]">
            Terrazza CRM
          </span>
          <h1 className="mt-5 text-4xl font-bold text-[#071E36]">Kanban</h1>
          <p className="mt-2 text-[#64736D]">
            Visão inicial dos leads por etapa comercial.
          </p>
        </div>

        {error ? (
          <p className="mt-10 rounded-xl bg-[#fbebe7] px-4 py-3 text-sm text-[#8a2e1c]">
            Não foi possível carregar o Kanban. Verifique se a tabela leads já foi criada.
          </p>
        ) : (
          <section className="mt-10 flex gap-5 overflow-x-auto pb-4">
            {colunas.map((coluna) => {
              const leadsDaColuna = leads.filter(
                (lead) => coluna.statusValues.includes(lead.status || ""),
              );

              return (
                <div
                  key={coluna.id}
                  className="min-w-[280px] flex-1 rounded-2xl border border-[#E8DDCB] bg-white p-4 shadow-sm"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-[#071E36]">
                        {coluna.title}
                      </h2>
                      <p className="mt-1 text-xs text-[#64736D]">
                        {coluna.description}
                      </p>
                    </div>
                    <span className="rounded-full bg-[#C89B3C]/10 px-2.5 py-1 text-xs font-semibold text-[#8B6827]">
                      {leadsDaColuna.length}
                    </span>
                  </div>

                  <div className="mt-4 grid gap-3">
                    {leadsDaColuna.length === 0 ? (
                      <p className="rounded-xl bg-[#F7F3ED] px-4 py-6 text-center text-sm text-[#64736D]">
                        Sem leads nesta etapa.
                      </p>
                    ) : (
                      leadsDaColuna.map((lead) => (
                        <article
                          key={lead.id}
                          className="rounded-xl border border-[#E8DDCB] bg-[#fffdfa] p-4 shadow-sm"
                        >
                          <h3 className="font-semibold text-[#071E36]">
                            {lead.nome}
                          </h3>
                          <p className="mt-1 text-sm text-[#64736D]">
                            {lead.telefone || "Sem telefone"}
                          </p>
                          <div className="mt-4 grid gap-1 text-xs text-[#64736D]">
                            <span>{lead.tipo_lead || "Tipo não informado"}</span>
                            <span>{lead.objetivo || "Objetivo não informado"}</span>
                            <span>{lead.cidade || "Cidade não informada"}</span>
                            <span>Origem: {lead.origem || "manual"}</span>
                            <span>Status: {labelTexto(lead.status)}</span>
                            <span>{lead.responsavel || "Sem responsável"}</span>
                          </div>
                        </article>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </section>
        )}
      </div>
    </main>
  );
}
