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
  { status: "novo", title: "Novo" },
  { status: "ia_qualificando", title: "IA qualificando" },
  { status: "corretor", title: "Corretor" },
  { status: "fechado", title: "Fechado" },
  { status: "perdido", title: "Perdido" },
];

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
          <section className="mt-10 grid gap-5 xl:grid-cols-5">
            {colunas.map((coluna) => {
              const leadsDaColuna = leads.filter(
                (lead) => (lead.status || "novo") === coluna.status,
              );

              return (
                <div
                  key={coluna.status}
                  className="rounded-2xl border border-[#E8DDCB] bg-white p-4 shadow-sm"
                >
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-[#071E36]">
                      {coluna.title}
                    </h2>
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
                            <span>{lead.origem || "manual"}</span>
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
