import { revalidatePath } from "next/cache";

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
  created_at: string | null;
};

const tiposLead = [
  "proprietário",
  "inquilino",
  "comprador",
  "vendedor",
  "corretor parceiro",
];

const origens = ["whatsapp", "instagram", "indicação", "portal", "site", "manual"];

const statusLeads = ["novo", "ia_qualificando", "corretor", "fechado", "perdido"];

function valorTexto(formData: FormData, campo: string) {
  return String(formData.get(campo) ?? "").trim();
}

function formatarData(data: string | null) {
  if (!data) return "—";

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "medium",
  }).format(new Date(data));
}

function labelTexto(valor: string | null) {
  if (!valor) return "—";

  return valor.replaceAll("_", " ");
}

export default async function LeadsPage() {
  async function cadastrarLead(formData: FormData) {
    "use server";

    const nome = valorTexto(formData, "nome");

    if (!nome) {
      throw new Error("O nome do lead é obrigatório.");
    }

    const { error } = await supabase.from("leads").insert({
      nome,
      telefone: valorTexto(formData, "telefone") || null,
      tipo_lead: valorTexto(formData, "tipo_lead") || null,
      objetivo: valorTexto(formData, "objetivo") || null,
      cidade: valorTexto(formData, "cidade") || null,
      bairro_interesse: valorTexto(formData, "bairro_interesse") || null,
      origem: valorTexto(formData, "origem") || "manual",
      status: valorTexto(formData, "status") || "novo",
      responsavel: valorTexto(formData, "responsavel") || null,
      observacao: valorTexto(formData, "observacao") || null,
    });

    if (error) {
      throw new Error("Não foi possível salvar o lead.");
    }

    revalidatePath("/dashboard/crm/leads");
  }

  const { data, error } = await supabase
    .from("leads")
    .select(
      "id, nome, telefone, tipo_lead, objetivo, cidade, origem, status, responsavel, created_at",
    )
    .order("created_at", { ascending: false });

  const leads = (data ?? []) as Lead[];

  return (
    <main className="min-h-screen bg-[#f7f3ed] px-6 py-10 sm:px-8">
      <div className="mx-auto max-w-7xl">
        <div>
          <span className="rounded-full border border-[#dfd4c2] bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#7a8a80]">
            Terrazza CRM
          </span>
          <h1 className="mt-5 text-4xl font-bold text-[#143d2c]">Leads</h1>
          <p className="mt-2 text-[#5f6f65]">
            Central comercial da Terrazza CRM.
          </p>
        </div>

        <section className="mt-10 rounded-2xl border border-[#dfd4c2] bg-white p-6 shadow-sm sm:p-8">
          <h2 className="text-xl font-semibold text-[#143d2c]">
            Novo lead manual
          </h2>

          <form action={cadastrarLead} className="mt-6 grid gap-5 md:grid-cols-3">
            <label className="grid gap-2 text-sm font-medium text-[#355346]">
              Nome
              <input
                name="nome"
                required
                className="rounded-xl border border-[#dfd4c2] px-4 py-3 text-[#143d2c] outline-none transition placeholder:text-[#9a9d98] focus:border-[#143d2c]"
                placeholder="Nome do lead"
              />
            </label>

            <label className="grid gap-2 text-sm font-medium text-[#355346]">
              Telefone
              <input
                name="telefone"
                type="tel"
                className="rounded-xl border border-[#dfd4c2] px-4 py-3 text-[#143d2c] outline-none transition placeholder:text-[#9a9d98] focus:border-[#143d2c]"
                placeholder="(00) 00000-0000"
              />
            </label>

            <label className="grid gap-2 text-sm font-medium text-[#355346]">
              Tipo de lead
              <select
                name="tipo_lead"
                defaultValue="proprietário"
                className="rounded-xl border border-[#dfd4c2] bg-white px-4 py-3 text-[#143d2c] outline-none transition focus:border-[#143d2c]"
              >
                {tiposLead.map((tipo) => (
                  <option key={tipo} value={tipo}>
                    {tipo}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-2 text-sm font-medium text-[#355346]">
              Objetivo
              <input
                name="objetivo"
                className="rounded-xl border border-[#dfd4c2] px-4 py-3 text-[#143d2c] outline-none transition placeholder:text-[#9a9d98] focus:border-[#143d2c]"
                placeholder="Comprar, alugar, vender..."
              />
            </label>

            <label className="grid gap-2 text-sm font-medium text-[#355346]">
              Cidade
              <input
                name="cidade"
                className="rounded-xl border border-[#dfd4c2] px-4 py-3 text-[#143d2c] outline-none transition placeholder:text-[#9a9d98] focus:border-[#143d2c]"
                placeholder="Cidade"
              />
            </label>

            <label className="grid gap-2 text-sm font-medium text-[#355346]">
              Bairro de interesse
              <input
                name="bairro_interesse"
                className="rounded-xl border border-[#dfd4c2] px-4 py-3 text-[#143d2c] outline-none transition placeholder:text-[#9a9d98] focus:border-[#143d2c]"
                placeholder="Bairro"
              />
            </label>

            <label className="grid gap-2 text-sm font-medium text-[#355346]">
              Origem
              <select
                name="origem"
                defaultValue="manual"
                className="rounded-xl border border-[#dfd4c2] bg-white px-4 py-3 text-[#143d2c] outline-none transition focus:border-[#143d2c]"
              >
                {origens.map((origem) => (
                  <option key={origem} value={origem}>
                    {origem}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-2 text-sm font-medium text-[#355346]">
              Status
              <select
                name="status"
                defaultValue="novo"
                className="rounded-xl border border-[#dfd4c2] bg-white px-4 py-3 text-[#143d2c] outline-none transition focus:border-[#143d2c]"
              >
                {statusLeads.map((status) => (
                  <option key={status} value={status}>
                    {labelTexto(status)}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-2 text-sm font-medium text-[#355346]">
              Responsável
              <input
                name="responsavel"
                className="rounded-xl border border-[#dfd4c2] px-4 py-3 text-[#143d2c] outline-none transition placeholder:text-[#9a9d98] focus:border-[#143d2c]"
                placeholder="Corretor ou responsável"
              />
            </label>

            <label className="grid gap-2 text-sm font-medium text-[#355346] md:col-span-3">
              Observação
              <textarea
                name="observacao"
                rows={4}
                className="rounded-xl border border-[#dfd4c2] px-4 py-3 text-[#143d2c] outline-none transition placeholder:text-[#9a9d98] focus:border-[#143d2c]"
                placeholder="Contexto do atendimento, necessidade, próximos passos..."
              />
            </label>

            <div className="md:col-span-3">
              <button
                type="submit"
                className="rounded-xl bg-[#143d2c] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#0f3022]"
              >
                Salvar Lead
              </button>
            </div>
          </form>
        </section>

        <section className="mt-6 rounded-2xl border border-[#dfd4c2] bg-white p-6 shadow-sm sm:p-8">
          <div className="flex items-baseline justify-between gap-4">
            <h2 className="text-xl font-semibold text-[#143d2c]">
              Leads cadastrados
            </h2>
            <span className="text-sm text-[#6b746c]">
              {leads.length} cadastrado{leads.length === 1 ? "" : "s"}
            </span>
          </div>

          {error ? (
            <p className="mt-6 rounded-xl bg-[#fbebe7] px-4 py-3 text-sm text-[#8a2e1c]">
              Não foi possível carregar os leads. Verifique se a tabela já foi criada.
            </p>
          ) : leads.length === 0 ? (
            <p className="mt-6 rounded-xl bg-[#f7f3ed] px-4 py-8 text-center text-sm text-[#6b746c]">
              Nenhum lead cadastrado até o momento.
            </p>
          ) : (
            <div className="mt-6 overflow-x-auto">
              <table className="w-full min-w-[960px] text-left text-sm">
                <thead className="border-b border-[#dfd4c2] text-[#6b746c]">
                  <tr>
                    <th className="px-4 py-3 font-medium">Nome</th>
                    <th className="px-4 py-3 font-medium">Telefone</th>
                    <th className="px-4 py-3 font-medium">Tipo</th>
                    <th className="px-4 py-3 font-medium">Objetivo</th>
                    <th className="px-4 py-3 font-medium">Cidade</th>
                    <th className="px-4 py-3 font-medium">Origem</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Responsável</th>
                    <th className="px-4 py-3 font-medium">Data</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#eee7dc] text-[#355346]">
                  {leads.map((lead) => (
                    <tr key={lead.id}>
                      <td className="px-4 py-4 font-medium text-[#143d2c]">
                        {lead.nome}
                      </td>
                      <td className="px-4 py-4">{lead.telefone || "—"}</td>
                      <td className="px-4 py-4">{lead.tipo_lead || "—"}</td>
                      <td className="px-4 py-4">{lead.objetivo || "—"}</td>
                      <td className="px-4 py-4">{lead.cidade || "—"}</td>
                      <td className="px-4 py-4">{lead.origem || "—"}</td>
                      <td className="px-4 py-4">{labelTexto(lead.status)}</td>
                      <td className="px-4 py-4">{lead.responsavel || "—"}</td>
                      <td className="px-4 py-4">
                        {formatarData(lead.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
