import Link from "next/link";
import { revalidatePath } from "next/cache";

import { supabase } from "../../../../lib/supabase";

type Corretor = {
  id: string;
  nome: string;
  telefone: string | null;
  email: string | null;
  creci: string | null;
  ativo: boolean | null;
  created_at: string | null;
};

function valorTexto(formData: FormData, campo: string) {
  return String(formData.get(campo) ?? "").trim();
}

function formatarData(data: string | null) {
  if (!data) return "—";

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "medium",
  }).format(new Date(data));
}

export default async function CorretoresPage() {
  async function cadastrarCorretor(formData: FormData) {
    "use server";

    const nome = valorTexto(formData, "nome");

    if (!nome) {
      throw new Error("O nome do corretor é obrigatório.");
    }

    const { error } = await supabase.from("corretores").insert({
      nome,
      telefone: valorTexto(formData, "telefone") || null,
      email: valorTexto(formData, "email") || null,
      creci: valorTexto(formData, "creci") || null,
      ativo: formData.get("ativo") === "on",
    });

    if (error) {
      throw new Error("Não foi possível salvar o corretor.");
    }

    revalidatePath("/dashboard/crm/corretores");
  }

  const { data, error } = await supabase
    .from("corretores")
    .select("id, nome, telefone, email, creci, ativo, created_at")
    .order("created_at", { ascending: false });

  const corretores = (data ?? []) as Corretor[];

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
            Corretores
          </h1>
          <p className="mt-2 text-[#64736D]">
            Cadastro e acompanhamento dos corretores da Terrazza CRM.
          </p>
        </div>

        <section className="mt-10 rounded-2xl border border-[#E8DDCB] bg-white p-6 shadow-sm sm:p-8">
          <h2 className="text-xl font-semibold text-[#071E36]">
            Novo corretor
          </h2>

          <form action={cadastrarCorretor} className="mt-6 grid gap-5 md:grid-cols-4">
            <label className="grid gap-2 text-sm font-medium text-[#102A27]">
              Nome
              <input
                name="nome"
                required
                className="rounded-xl border border-[#E8DDCB] px-4 py-3 text-[#071E36] outline-none transition placeholder:text-[#9a9d98] focus:border-[#C89B3C]"
                placeholder="Nome completo"
              />
            </label>

            <label className="grid gap-2 text-sm font-medium text-[#102A27]">
              Telefone
              <input
                name="telefone"
                type="tel"
                className="rounded-xl border border-[#E8DDCB] px-4 py-3 text-[#071E36] outline-none transition placeholder:text-[#9a9d98] focus:border-[#C89B3C]"
                placeholder="(00) 00000-0000"
              />
            </label>

            <label className="grid gap-2 text-sm font-medium text-[#102A27]">
              E-mail
              <input
                name="email"
                type="email"
                className="rounded-xl border border-[#E8DDCB] px-4 py-3 text-[#071E36] outline-none transition placeholder:text-[#9a9d98] focus:border-[#C89B3C]"
                placeholder="nome@exemplo.com"
              />
            </label>

            <label className="grid gap-2 text-sm font-medium text-[#102A27]">
              CRECI
              <input
                name="creci"
                className="rounded-xl border border-[#E8DDCB] px-4 py-3 text-[#071E36] outline-none transition placeholder:text-[#9a9d98] focus:border-[#C89B3C]"
                placeholder="CRECI"
              />
            </label>

            <label className="flex items-center gap-3 self-end rounded-xl border border-[#E8DDCB] px-4 py-3 text-sm font-medium text-[#102A27]">
              <input
                name="ativo"
                type="checkbox"
                defaultChecked
                className="size-4 accent-[#C89B3C]"
              />
              Corretor ativo
            </label>

            <div className="md:col-span-4">
              <button
                type="submit"
                className="rounded-xl bg-[#071E36] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#0A2A4A]"
              >
                Salvar Corretor
              </button>
            </div>
          </form>
        </section>

        <section className="mt-6 rounded-2xl border border-[#E8DDCB] bg-white p-6 shadow-sm sm:p-8">
          <div className="flex items-baseline justify-between gap-4">
            <h2 className="text-xl font-semibold text-[#071E36]">
              Corretores cadastrados
            </h2>
            <span className="rounded-full bg-[#C89B3C]/10 px-3 py-1 text-sm font-medium text-[#8B6827]">
              {corretores.length} cadastrado{corretores.length === 1 ? "" : "s"}
            </span>
          </div>

          {error ? (
            <p className="mt-6 rounded-xl bg-[#fbebe7] px-4 py-3 text-sm text-[#8a2e1c]">
              Não foi possível carregar os corretores. Tente novamente.
            </p>
          ) : corretores.length === 0 ? (
            <p className="mt-6 rounded-xl bg-[#F7F3ED] px-4 py-8 text-center text-sm text-[#64736D]">
              Nenhum corretor cadastrado até o momento.
            </p>
          ) : (
            <div className="mt-6 overflow-x-auto">
              <table className="w-full min-w-[820px] text-left text-sm">
                <thead className="border-b border-[#E8DDCB] text-[#64736D]">
                  <tr>
                    <th className="px-4 py-3 font-medium">Nome</th>
                    <th className="px-4 py-3 font-medium">Telefone</th>
                    <th className="px-4 py-3 font-medium">E-mail</th>
                    <th className="px-4 py-3 font-medium">CRECI</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Data</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#eee7dc] text-[#102A27]">
                  {corretores.map((corretor) => (
                    <tr key={corretor.id}>
                      <td className="px-4 py-4 font-medium text-[#071E36]">
                        {corretor.nome}
                      </td>
                      <td className="px-4 py-4">{corretor.telefone || "—"}</td>
                      <td className="px-4 py-4">{corretor.email || "—"}</td>
                      <td className="px-4 py-4">{corretor.creci || "—"}</td>
                      <td className="px-4 py-4">
                        <span className="rounded-full bg-[#C89B3C]/10 px-3 py-1 text-xs font-semibold text-[#8B6827]">
                          {corretor.ativo ? "Ativo" : "Inativo"}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        {formatarData(corretor.created_at)}
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
