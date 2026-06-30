import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { ConfirmSubmitButton } from "../../../components/ConfirmSubmitButton";
import {
  addPapel,
  hasPapel,
  isOnlyPapel,
  removePapel,
} from "../../../lib/crm/pessoas/papeis";
import { supabase } from "../../../lib/supabase";

type Proprietario = {
  id: string;
  nome: string;
  telefone: string | null;
  celular: string | null;
  whatsapp: string | null;
  email: string | null;
  papeis: string[] | null;
  created_at: string | null;
};

type SearchParams = Record<string, string | string[] | undefined>;

function paramValue(searchParams: SearchParams, key: string) {
  const value = searchParams[key];
  return Array.isArray(value) ? value[0] : value;
}

function formatarData(data: string | null) {
  if (!data) return "—";

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "medium",
  }).format(new Date(data));
}

function telefonePrincipal(pessoa: Proprietario) {
  return pessoa.telefone || pessoa.celular || pessoa.whatsapp;
}

export default async function ProprietariosPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const editId = paramValue(resolvedSearchParams, "edit") ?? "";

  async function salvarProprietario(formData: FormData) {
    "use server";

    const id = String(formData.get("id") ?? "").trim();
    const nome = String(formData.get("nome") ?? "").trim();
    const telefone = String(formData.get("telefone") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim();

    if (!nome) {
      throw new Error("O nome do proprietário é obrigatório.");
    }

    const { data: pessoaAtual } = id
      ? await supabase.from("pessoas").select("papeis").eq("id", id).single()
      : { data: null };

    const payload = {
      nome,
      telefone: telefone || null,
      email: email || null,
      papeis: addPapel(
        (pessoaAtual as { papeis?: string[] | null } | null)?.papeis,
        "proprietario",
      ),
      origem: "manual",
      status: "ativo",
      ativo: true,
      updated_at: new Date().toISOString(),
    };

    const { error } = id
      ? await supabase.from("pessoas").update(payload).eq("id", id)
      : await supabase.from("pessoas").insert(payload);

    if (error) {
      throw new Error("Não foi possível salvar o proprietário.");
    }

    revalidatePath("/dashboard/proprietarios");
    revalidatePath("/dashboard");
    redirect("/dashboard/proprietarios");
  }

  async function excluirProprietario(formData: FormData) {
    "use server";

    const id = String(formData.get("id") ?? "").trim();

    if (!id) {
      throw new Error("Proprietario nao informado.");
    }

    const { data: pessoa, error: pessoaError } = await supabase
      .from("pessoas")
      .select("papeis")
      .eq("id", id)
      .single();

    if (pessoaError) {
      throw new Error("Nao foi possivel localizar o proprietario.");
    }

    const papeis = (pessoa as { papeis?: string[] | null }).papeis;
    const payload = isOnlyPapel(papeis, "proprietario")
      ? { ativo: false, updated_at: new Date().toISOString() }
      : {
          papeis: removePapel(papeis, "proprietario"),
          updated_at: new Date().toISOString(),
        };

    const { error } = await supabase.from("pessoas").update(payload).eq("id", id);

    if (error) {
      throw new Error("Nao foi possivel excluir logicamente o proprietario.");
    }

    revalidatePath("/dashboard/proprietarios");
    revalidatePath("/dashboard");
  }

  const { data: proprietarios, error } = await supabase
    .from("pessoas")
    .select("id, nome, telefone, celular, whatsapp, email, papeis, created_at")
    .eq("ativo", true)
    .order("created_at", { ascending: false });

  const listaProprietarios = ((proprietarios ?? []) as Proprietario[]).filter(
    (proprietario) => hasPapel(proprietario, "proprietario"),
  );
  const proprietarioEmEdicao =
    listaProprietarios.find((proprietario) => proprietario.id === editId) ?? null;

  return (
    <main className="min-h-screen bg-[#F7F3ED] px-6 py-10 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <Link
          href="/dashboard"
          className="inline-flex rounded-xl border border-[#E8DDCB] bg-white px-4 py-2 text-sm font-medium text-[#071E36] transition hover:border-[#C89B3C]/45 hover:bg-[#C89B3C]/10"
        >
          ← Voltar ao Dashboard
        </Link>

        <div className="mt-8">
          <span className="rounded-full border border-[#C89B3C]/35 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#8B6827]">
            Cadastros
          </span>
          <h1 className="mt-5 text-4xl font-bold text-[#071E36]">Proprietários</h1>
          <p className="mt-2 text-[#64736D]">
            Cadastro e acompanhamento dos proprietários da Terrazza.
          </p>
        </div>

        <section className="mt-10 rounded-2xl border border-[#E8DDCB] bg-white p-6 shadow-sm sm:p-8">
          <h2 className="text-xl font-semibold text-[#071E36]">
            Novo proprietário
          </h2>

          <form action={salvarProprietario} className="mt-6 grid gap-5 md:grid-cols-3">
            <input type="hidden" name="id" value={proprietarioEmEdicao?.id ?? ""} />
            <label className="grid gap-2 text-sm font-medium text-[#102A27]">
              Nome
              <input
                name="nome"
                required
                defaultValue={proprietarioEmEdicao?.nome ?? ""}
                className="rounded-xl border border-[#E8DDCB] px-4 py-3 text-[#071E36] outline-none transition placeholder:text-[#9a9d98] focus:border-[#C89B3C]"
                placeholder="Nome completo"
              />
            </label>

            <label className="grid gap-2 text-sm font-medium text-[#102A27]">
              Telefone
              <input
                name="telefone"
                type="tel"
                defaultValue={proprietarioEmEdicao?.telefone ?? ""}
                className="rounded-xl border border-[#E8DDCB] px-4 py-3 text-[#071E36] outline-none transition placeholder:text-[#9a9d98] focus:border-[#C89B3C]"
                placeholder="(00) 00000-0000"
              />
            </label>

            <label className="grid gap-2 text-sm font-medium text-[#102A27]">
              E-mail
              <input
                name="email"
                type="email"
                defaultValue={proprietarioEmEdicao?.email ?? ""}
                className="rounded-xl border border-[#E8DDCB] px-4 py-3 text-[#071E36] outline-none transition placeholder:text-[#9a9d98] focus:border-[#C89B3C]"
                placeholder="nome@exemplo.com"
              />
            </label>

            <div className="md:col-span-3">
              <button
                type="submit"
                className="rounded-xl bg-[#071E36] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#0A2A4A]"
              >
                {proprietarioEmEdicao ? "Salvar alteracoes" : "Salvar Proprietario"}
              </button>
              {proprietarioEmEdicao ? (
                <Link
                  href="/dashboard/proprietarios"
                  className="ml-3 inline-flex rounded-xl border border-[#E8DDCB] bg-white px-5 py-3 text-sm font-semibold text-[#071E36] transition hover:border-[#C89B3C]/45 hover:bg-[#C89B3C]/10"
                >
                  Cancelar edicao
                </Link>
              ) : null}
            </div>
          </form>
        </section>

        <section className="mt-6 rounded-2xl border border-[#E8DDCB] bg-white p-6 shadow-sm sm:p-8">
          <div className="flex items-baseline justify-between gap-4">
            <h2 className="text-xl font-semibold text-[#071E36]">
              Proprietários cadastrados
            </h2>
            <span className="rounded-full bg-[#C89B3C]/10 px-3 py-1 text-sm font-medium text-[#8B6827]">
              {listaProprietarios.length} cadastrado{listaProprietarios.length === 1 ? "" : "s"}
            </span>
          </div>

          {error ? (
            <p className="mt-6 rounded-xl bg-[#fbebe7] px-4 py-3 text-sm text-[#8a2e1c]">
              Não foi possível carregar os proprietários. Tente novamente.
            </p>
          ) : listaProprietarios.length === 0 ? (
            <p className="mt-6 rounded-xl bg-[#F7F3ED] px-4 py-8 text-center text-sm text-[#64736D]">
              Nenhum proprietário cadastrado até o momento.
            </p>
          ) : (
            <div className="mt-6 overflow-x-auto">
              <table className="w-full min-w-[680px] text-left text-sm">
                <thead className="border-b border-[#E8DDCB] text-[#64736D]">
                  <tr>
                    <th className="px-4 py-3 font-medium">Nome</th>
                    <th className="px-4 py-3 font-medium">Telefone</th>
                    <th className="px-4 py-3 font-medium">E-mail</th>
                    <th className="px-4 py-3 font-medium">Data de cadastro</th>
                    <th className="px-4 py-3 font-medium">Acoes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#eee7dc] text-[#102A27]">
                  {listaProprietarios.map((proprietario) => (
                    <tr key={proprietario.id}>
                      <td className="px-4 py-4 font-medium text-[#071E36]">
                        {proprietario.nome}
                      </td>
                      <td className="px-4 py-4">
                        {telefonePrincipal(proprietario) || "—"}
                      </td>
                      <td className="px-4 py-4">{proprietario.email || "—"}</td>
                      <td className="px-4 py-4">
                        {formatarData(proprietario.created_at)}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-wrap gap-2">
                          <Link
                            href={`/dashboard/proprietarios?edit=${proprietario.id}`}
                            className="rounded-full border border-[#E8DDCB] bg-white px-3 py-1 text-xs font-semibold text-[#071E36] transition hover:border-[#C89B3C]/45 hover:bg-[#C89B3C]/10"
                          >
                            Editar
                          </Link>
                          <form action={excluirProprietario}>
                            <input type="hidden" name="id" value={proprietario.id} />
                            <ConfirmSubmitButton
                              message="Confirmar exclusao logica deste proprietario?"
                              className="rounded-full border border-red-100 bg-red-50 px-3 py-1 text-xs font-semibold text-red-700 transition hover:bg-red-100"
                            >
                              Excluir
                            </ConfirmSubmitButton>
                          </form>
                        </div>
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
