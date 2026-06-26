import { revalidatePath } from "next/cache";
import { BookOpen, Brain, CheckCircle2, Database, PlusCircle } from "lucide-react";

import { supabase } from "../../../../../lib/supabase";

type Conhecimento = {
  id: string;
  categoria: string;
  titulo: string;
  conteudo: string;
  ativo: boolean | null;
  origem: string | null;
  created_at: string | null;
};

const categorias = [
  "Institucional",
  "Locação",
  "Venda",
  "Administração",
  "Garantias",
  "Documentação",
  "Proprietários",
  "Inquilinos",
  "Corretores",
  "Vista ERP",
  "OKE Sistemas",
  "LGPD",
  "Atendimento",
  "Comercial",
  "Jurídico",
];

function valorTexto(formData: FormData, campo: string) {
  return String(formData.get(campo) ?? "").trim();
}

function formatarData(data: string | null) {
  if (!data) return "—";

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "medium",
  }).format(new Date(data));
}

function resumirConteudo(conteudo: string) {
  return conteudo.length > 180 ? `${conteudo.slice(0, 180)}...` : conteudo;
}

export default async function BaseConhecimentoPage() {
  async function cadastrarConhecimento(formData: FormData) {
    "use server";

    const categoria = valorTexto(formData, "categoria");
    const titulo = valorTexto(formData, "titulo");
    const conteudo = valorTexto(formData, "conteudo");

    if (!categoria || !titulo || !conteudo) {
      throw new Error("Categoria, título e conteúdo são obrigatórios.");
    }

    const { error } = await supabase.from("ia_conhecimento").insert({
      categoria,
      titulo,
      conteudo,
      ativo: formData.get("ativo") === "on",
      origem: valorTexto(formData, "origem") || "manual",
    });

    if (error) {
      throw new Error("Não foi possível salvar o conhecimento.");
    }

    revalidatePath("/dashboard/crm/ia/conhecimento");
  }

  const { data, error } = await supabase
    .from("ia_conhecimento")
    .select("id, categoria, titulo, conteudo, ativo, origem, created_at")
    .order("created_at", { ascending: false });

  const conhecimentos = (data ?? []) as Conhecimento[];

  return (
    <main className="min-h-screen bg-[#F7F3ED] px-6 py-10 sm:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="rounded-[2rem] border border-[#E8DDCB] bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-4">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#071E36] text-[#E1B866] shadow-lg shadow-[#071E36]/15">
                <BookOpen size={26} strokeWidth={2.2} />
              </span>
              <div>
                <span className="rounded-full border border-[#C89B3C]/35 bg-[#C89B3C]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#8B6827]">
                  IA Comercial
                </span>
                <h1 className="mt-4 text-4xl font-bold tracking-tight text-[#071E36]">
                  Base de Conhecimento
                </h1>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-[#64736D]">
                  Conteúdos internos que futuramente irão orientar a IA Comercial
                  da Terrazza.
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-[#E8DDCB] bg-[#F7F3ED] px-4 py-3 text-sm text-[#64736D]">
              <span className="block text-xs font-semibold uppercase tracking-[0.14em] text-[#8B6827]">
                Fonte interna
              </span>
              <strong className="mt-1 block text-[#071E36]">
                Conhecimento Terrazza
              </strong>
            </div>
          </div>

          <div className="mt-6 h-px bg-gradient-to-r from-[#C89B3C]/60 via-[#E8DDCB] to-transparent" />
        </header>

        <section className="mt-8 grid gap-6 xl:grid-cols-[420px_1fr]">
          <div className="rounded-[2rem] border border-[#E8DDCB] bg-white p-6 shadow-sm sm:p-8">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#071E36] text-[#E1B866]">
                <PlusCircle size={20} />
              </span>
              <div>
                <h2 className="text-xl font-semibold text-[#071E36]">
                  Novo conhecimento
                </h2>
                <p className="text-sm text-[#64736D]">
                  Cadastre regras, contexto e informações internas.
                </p>
              </div>
            </div>

            <form action={cadastrarConhecimento} className="mt-6 grid gap-5">
              <label className="grid gap-2 text-sm font-medium text-[#102A27]">
                Categoria
                <select
                  name="categoria"
                  required
                  defaultValue="Institucional"
                  className="rounded-xl border border-[#E8DDCB] bg-white px-4 py-3 text-[#071E36] outline-none transition focus:border-[#C89B3C]"
                >
                  {categorias.map((categoria) => (
                    <option key={categoria} value={categoria}>
                      {categoria}
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid gap-2 text-sm font-medium text-[#102A27]">
                Título
                <input
                  name="titulo"
                  required
                  className="rounded-xl border border-[#E8DDCB] px-4 py-3 text-[#071E36] outline-none transition placeholder:text-[#9a9d98] focus:border-[#C89B3C]"
                  placeholder="Ex.: Política de atendimento inicial"
                />
              </label>

              <label className="grid gap-2 text-sm font-medium text-[#102A27]">
                Conteúdo
                <textarea
                  name="conteudo"
                  required
                  rows={8}
                  className="rounded-xl border border-[#E8DDCB] px-4 py-3 text-[#071E36] outline-none transition placeholder:text-[#9a9d98] focus:border-[#C89B3C]"
                  placeholder="Descreva o conhecimento interno que futuramente guiará a IA..."
                />
              </label>

              <label className="grid gap-2 text-sm font-medium text-[#102A27]">
                Origem
                <input
                  name="origem"
                  defaultValue="manual"
                  className="rounded-xl border border-[#E8DDCB] px-4 py-3 text-[#071E36] outline-none transition placeholder:text-[#9a9d98] focus:border-[#C89B3C]"
                  placeholder="manual"
                />
              </label>

              <label className="flex items-center gap-3 rounded-2xl border border-[#E8DDCB] bg-[#F7F3ED] px-4 py-3 text-sm font-medium text-[#102A27]">
                <input
                  name="ativo"
                  type="checkbox"
                  defaultChecked
                  className="h-4 w-4 accent-[#071E36]"
                />
                Conhecimento ativo
              </label>

              <button
                type="submit"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#071E36] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#0A2A4A]"
              >
                Salvar Conhecimento
                <Brain size={16} />
              </button>
            </form>
          </div>

          <div className="rounded-[2rem] border border-[#E8DDCB] bg-white p-6 shadow-sm sm:p-8">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-[#071E36]">
                  Conhecimentos cadastrados
                </h2>
                <p className="mt-1 text-sm text-[#64736D]">
                  Base interna preparada para orientar respostas futuras da IA.
                </p>
              </div>
              <span className="inline-flex items-center gap-2 rounded-full border border-[#C89B3C]/30 bg-[#C89B3C]/10 px-3 py-1 text-sm font-semibold text-[#8B6827]">
                <Database size={15} />
                {conhecimentos.length}
              </span>
            </div>

            {error ? (
              <p className="mt-6 rounded-xl bg-[#fbebe7] px-4 py-3 text-sm text-[#8a2e1c]">
                Não foi possível carregar a base de conhecimento. Verifique se o
                SQL 007 já foi aplicado no Supabase.
              </p>
            ) : conhecimentos.length === 0 ? (
              <p className="mt-6 rounded-2xl border border-dashed border-[#E8DDCB] bg-[#F7F3ED] px-4 py-12 text-center text-sm text-[#64736D]">
                Nenhum conhecimento cadastrado ainda.
              </p>
            ) : (
              <div className="mt-6 grid gap-4">
                {conhecimentos.map((conhecimento) => (
                  <article
                    key={conhecimento.id}
                    className="rounded-3xl border border-[#E8DDCB] bg-[#fffdfa] p-5 shadow-sm transition hover:border-[#C89B3C]/35 hover:shadow-lg hover:shadow-[#071E36]/10"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <span className="rounded-full bg-[#C89B3C]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-[#8B6827]">
                          {conhecimento.categoria}
                        </span>
                        <h3 className="mt-3 text-lg font-semibold text-[#071E36]">
                          {conhecimento.titulo}
                        </h3>
                      </div>

                      <span
                        className={[
                          "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold",
                          conhecimento.ativo
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-slate-100 text-slate-600",
                        ].join(" ")}
                      >
                        <CheckCircle2 size={14} />
                        {conhecimento.ativo ? "ativo" : "inativo"}
                      </span>
                    </div>

                    <p className="mt-4 text-sm leading-6 text-[#64736D]">
                      {resumirConteudo(conhecimento.conteudo)}
                    </p>

                    <div className="mt-5 flex flex-wrap gap-2 border-t border-[#E8DDCB]/70 pt-4 text-xs font-medium text-[#64736D]">
                      <span className="rounded-full bg-white px-3 py-1">
                        Origem: {conhecimento.origem || "manual"}
                      </span>
                      <span className="rounded-full bg-white px-3 py-1">
                        Criado em: {formatarData(conhecimento.created_at)}
                      </span>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
