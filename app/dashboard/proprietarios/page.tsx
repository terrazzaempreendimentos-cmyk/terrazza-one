import Link from "next/link";
import { revalidatePath } from "next/cache";

import { supabase } from "../../../lib/supabase";

type Proprietario = {
  id: string;
  nome: string;
  telefone: string | null;
  email: string | null;
  created_at: string | null;
};

function formatarData(data: string | null) {
  if (!data) return "—";

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "medium",
  }).format(new Date(data));
}

export default async function ProprietariosPage() {
  async function cadastrarProprietario(formData: FormData) {
    "use server";

    const nome = String(formData.get("nome") ?? "").trim();
    const telefone = String(formData.get("telefone") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim();

    if (!nome) {
      throw new Error("O nome do proprietário é obrigatório.");
    }

    const { error } = await supabase.from("proprietarios").insert({
      nome,
      telefone: telefone || null,
      email: email || null,
    });

    if (error) {
      throw new Error("Não foi possível salvar o proprietário.");
    }

    revalidatePath("/dashboard/proprietarios");
    revalidatePath("/dashboard");
  }

  const { data: proprietarios, error } = await supabase
    .from("proprietarios")
    .select("id, nome, telefone, email, created_at")
    .order("created_at", { ascending: false });

  const listaProprietarios = (proprietarios ?? []) as Proprietario[];

  return (
    <main className="min-h-screen bg-[#f7f3ed] px-6 py-10 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <Link
          href="/dashboard"
          className="inline-flex rounded-xl border border-[#dfd4c2] bg-white px-4 py-2 text-sm font-medium text-[#143d2c] transition hover:bg-[#f4efe7]"
        >
          ← Voltar ao Dashboard
        </Link>

        <div className="mt-8">
          <h1 className="text-4xl font-bold text-[#143d2c]">Proprietários</h1>
          <p className="mt-2 text-[#5f6f65]">
            Cadastro e acompanhamento dos proprietários da Terrazza.
          </p>
        </div>

        <section className="mt-10 rounded-2xl border border-[#dfd4c2] bg-white p-6 shadow-sm sm:p-8">
          <h2 className="text-xl font-semibold text-[#143d2c]">
            Novo proprietário
          </h2>

          <form action={cadastrarProprietario} className="mt-6 grid gap-5 md:grid-cols-3">
            <label className="grid gap-2 text-sm font-medium text-[#355346]">
              Nome
              <input
                name="nome"
                required
                className="rounded-xl border border-[#dfd4c2] px-4 py-3 text-[#143d2c] outline-none transition placeholder:text-[#9a9d98] focus:border-[#143d2c]"
                placeholder="Nome completo"
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
              E-mail
              <input
                name="email"
                type="email"
                className="rounded-xl border border-[#dfd4c2] px-4 py-3 text-[#143d2c] outline-none transition placeholder:text-[#9a9d98] focus:border-[#143d2c]"
                placeholder="nome@exemplo.com"
              />
            </label>

            <div className="md:col-span-3">
              <button
                type="submit"
                className="rounded-xl bg-[#143d2c] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#0f3022]"
              >
                Salvar Proprietário
              </button>
            </div>
          </form>
        </section>

        <section className="mt-6 rounded-2xl border border-[#dfd4c2] bg-white p-6 shadow-sm sm:p-8">
          <div className="flex items-baseline justify-between gap-4">
            <h2 className="text-xl font-semibold text-[#143d2c]">
              Proprietários cadastrados
            </h2>
            <span className="text-sm text-[#6b746c]">
              {listaProprietarios.length} cadastrado{listaProprietarios.length === 1 ? "" : "s"}
            </span>
          </div>

          {error ? (
            <p className="mt-6 rounded-xl bg-[#fbebe7] px-4 py-3 text-sm text-[#8a2e1c]">
              Não foi possível carregar os proprietários. Tente novamente.
            </p>
          ) : listaProprietarios.length === 0 ? (
            <p className="mt-6 rounded-xl bg-[#f7f3ed] px-4 py-8 text-center text-sm text-[#6b746c]">
              Nenhum proprietário cadastrado até o momento.
            </p>
          ) : (
            <div className="mt-6 overflow-x-auto">
              <table className="w-full min-w-[680px] text-left text-sm">
                <thead className="border-b border-[#dfd4c2] text-[#6b746c]">
                  <tr>
                    <th className="px-4 py-3 font-medium">Nome</th>
                    <th className="px-4 py-3 font-medium">Telefone</th>
                    <th className="px-4 py-3 font-medium">E-mail</th>
                    <th className="px-4 py-3 font-medium">Data de cadastro</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#eee7dc] text-[#355346]">
                  {listaProprietarios.map((proprietario) => (
                    <tr key={proprietario.id}>
                      <td className="px-4 py-4 font-medium text-[#143d2c]">
                        {proprietario.nome}
                      </td>
                      <td className="px-4 py-4">{proprietario.telefone || "—"}</td>
                      <td className="px-4 py-4">{proprietario.email || "—"}</td>
                      <td className="px-4 py-4">
                        {formatarData(proprietario.created_at)}
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
