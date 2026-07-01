import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { ConfirmSubmitButton } from "../../../../components/ConfirmSubmitButton";
import {
  addPapel,
  hasPapel,
  isOnlyPapel,
  removePapel,
} from "../../../../lib/crm/pessoas/papeis";
import { supabase } from "../../../../lib/supabase";

type Corretor = {
  id: string;
  nome: string;
  telefone: string | null;
  celular: string | null;
  whatsapp: string | null;
  email: string | null;
  creci: string | null;
  ativo: boolean | null;
  observacoes: string | null;
  papeis: string[] | null;
  created_at: string | null;
};

type SearchParams = Record<string, string | string[] | undefined>;

function paramValue(searchParams: SearchParams, key: string) {
  const value = searchParams[key];
  return Array.isArray(value) ? value[0] : value;
}

function valorTexto(formData: FormData, campo: string) {
  return String(formData.get(campo) ?? "").trim();
}

function formatarData(data: string | null) {
  if (!data) return "—";

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "medium",
  }).format(new Date(data));
}

function telefonePrincipal(corretor: Corretor) {
  return corretor.telefone || corretor.celular || corretor.whatsapp;
}

function extrairCreci(observacoes: string | null) {
  const match = observacoes?.match(/CRECI:\s*(.+)/i);

  return match?.[1]?.trim() ?? null;
}

function normalizarCreci(creci: string) {
  return creci.trim().toUpperCase().replace(/\s+/g, "");
}

export default async function CorretoresPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const editId = paramValue(resolvedSearchParams, "edit") ?? "";
  const busca = paramValue(resolvedSearchParams, "busca") ?? "";
  const filtroStatus = paramValue(resolvedSearchParams, "status") ?? "";

  async function salvarCorretor(formData: FormData) {
    "use server";

    const id = valorTexto(formData, "id");
    const nome = valorTexto(formData, "nome");

    if (!nome) {
      throw new Error("O nome do corretor é obrigatório.");
    }

    const { data: pessoaAtual } = id
      ? await supabase.from("pessoas").select("papeis").eq("id", id).single()
      : { data: null };

    const creci = valorTexto(formData, "creci");

    if (creci) {
      const { data: corretoresAtivos, error: creciError } = await supabase
        .from("pessoas")
        .select("id, observacoes, papeis")
        .eq("ativo", true);

      if (creciError) {
        throw new Error("Nao foi possivel validar o CRECI.");
      }

      const creciJaExiste = ((corretoresAtivos ?? []) as Corretor[]).some(
        (corretor) =>
          corretor.id !== id &&
          hasPapel(corretor, "corretor") &&
          normalizarCreci(extrairCreci(corretor.observacoes) ?? "") ===
            normalizarCreci(creci),
      );

      if (creciJaExiste) {
        throw new Error("Ja existe um corretor ativo com este CRECI.");
      }
    }

    const payload = {
      nome,
      telefone: valorTexto(formData, "telefone") || null,
      email: valorTexto(formData, "email") || null,
      observacoes: creci ? `CRECI: ${creci}` : null,
      papeis: addPapel(
        (pessoaAtual as { papeis?: string[] | null } | null)?.papeis,
        "corretor",
      ),
      origem: "manual",
      status: formData.get("ativo") === "on" ? "ativo" : "inativo",
      ativo: formData.get("ativo") === "on",
      updated_at: new Date().toISOString(),
    };

    const { error } = id
      ? await supabase.from("pessoas").update(payload).eq("id", id)
      : await supabase.from("pessoas").insert(payload);

    if (error) {
      throw new Error("Não foi possível salvar o corretor.");
    }

    revalidatePath("/dashboard/crm/corretores");
    redirect("/dashboard/crm/corretores");
  }

  async function excluirCorretor(formData: FormData) {
    "use server";

    const id = valorTexto(formData, "id");

    if (!id) {
      throw new Error("Corretor nao informado.");
    }

    const { data: pessoa, error: pessoaError } = await supabase
      .from("pessoas")
      .select("papeis")
      .eq("id", id)
      .single();

    if (pessoaError) {
      throw new Error("Nao foi possivel localizar o corretor.");
    }

    const papeis = (pessoa as { papeis?: string[] | null }).papeis;
    const payload = isOnlyPapel(papeis, "corretor")
      ? { ativo: false, updated_at: new Date().toISOString() }
      : {
          papeis: removePapel(papeis, "corretor"),
          updated_at: new Date().toISOString(),
        };

    const { error } = await supabase.from("pessoas").update(payload).eq("id", id);

    if (error) {
      throw new Error("Nao foi possivel excluir logicamente o corretor.");
    }

    revalidatePath("/dashboard/crm/corretores");
  }

  const { data, error } = await supabase
    .from("pessoas")
    .select("id, nome, telefone, celular, whatsapp, email, observacoes, papeis, ativo, created_at")
    .eq("ativo", true)
    .order("created_at", { ascending: false });

  const corretores = ((data ?? []) as Corretor[])
    .filter((corretor) => hasPapel(corretor, "corretor"))
    .map((corretor) => ({
      ...corretor,
      telefone: telefonePrincipal(corretor),
      creci: extrairCreci(corretor.observacoes),
    }));
  const corretoresFiltrados = corretores.filter((corretor) => {
    const texto = [corretor.nome, corretor.telefone, corretor.email, corretor.creci]
      .join(" ")
      .toLowerCase();
    const status = corretor.ativo ? "ativo" : "inativo";

    return (
      (!busca || texto.includes(busca.toLowerCase())) &&
      (!filtroStatus || status === filtroStatus)
    );
  });
  const corretorEmEdicao =
    corretores.find((corretor) => corretor.id === editId) ?? null;

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

        <section className="mt-8 grid gap-4 md:grid-cols-4">
          {[
            ["Total", corretores.length, "corretores na matriz"],
            ["Ativos", corretores.filter((corretor) => corretor.ativo).length, "em operacao"],
            ["Com CRECI", corretores.filter((corretor) => corretor.creci).length, "documentados"],
            ["Filtrados", corretoresFiltrados.length, "resultado atual"],
          ].map(([titulo, valor, descricao]) => (
            <div key={titulo} className="rounded-2xl border border-[#E8DDCB] bg-white p-5 shadow-sm">
              <p className="text-sm font-semibold text-[#102A27]">{titulo}</p>
              <strong className="mt-3 block text-3xl text-[#071E36]">{valor}</strong>
              <p className="mt-1 text-xs text-[#64736D]">{descricao}</p>
            </div>
          ))}
        </section>

        <section className="mt-6 rounded-2xl border border-[#E8DDCB] bg-white p-5 shadow-sm">
          <form className="grid gap-4 md:grid-cols-4">
            <input
              name="busca"
              defaultValue={busca}
              className="rounded-xl border border-[#E8DDCB] px-4 py-3 text-sm text-[#071E36] outline-none focus:border-[#C89B3C] md:col-span-2"
              placeholder="Nome, telefone, email ou CRECI"
            />
            <select
              name="status"
              defaultValue={filtroStatus}
              className="rounded-xl border border-[#E8DDCB] bg-white px-4 py-3 text-sm text-[#071E36] outline-none focus:border-[#C89B3C]"
            >
              <option value="">Todos os status</option>
              <option value="ativo">Ativos</option>
              <option value="inativo">Inativos</option>
            </select>
            <button className="rounded-xl bg-[#071E36] px-5 py-3 text-sm font-semibold text-white hover:bg-[#0A2A4A]">
              Filtrar
            </button>
          </form>
        </section>

        <section className="mt-10 rounded-2xl border border-[#E8DDCB] bg-white p-6 shadow-sm sm:p-8">
          <h2 className="text-xl font-semibold text-[#071E36]">
            Novo corretor
          </h2>

          <form action={salvarCorretor} className="mt-6 grid gap-5 md:grid-cols-4">
            <input type="hidden" name="id" value={corretorEmEdicao?.id ?? ""} />
            <label className="grid gap-2 text-sm font-medium text-[#102A27]">
              Nome
              <input
                name="nome"
                required
                defaultValue={corretorEmEdicao?.nome ?? ""}
                className="rounded-xl border border-[#E8DDCB] px-4 py-3 text-[#071E36] outline-none transition placeholder:text-[#9a9d98] focus:border-[#C89B3C]"
                placeholder="Nome completo"
              />
            </label>

            <label className="grid gap-2 text-sm font-medium text-[#102A27]">
              Telefone
              <input
                name="telefone"
                type="tel"
                defaultValue={corretorEmEdicao?.telefone ?? ""}
                className="rounded-xl border border-[#E8DDCB] px-4 py-3 text-[#071E36] outline-none transition placeholder:text-[#9a9d98] focus:border-[#C89B3C]"
                placeholder="(00) 00000-0000"
              />
            </label>

            <label className="grid gap-2 text-sm font-medium text-[#102A27]">
              E-mail
              <input
                name="email"
                type="email"
                defaultValue={corretorEmEdicao?.email ?? ""}
                className="rounded-xl border border-[#E8DDCB] px-4 py-3 text-[#071E36] outline-none transition placeholder:text-[#9a9d98] focus:border-[#C89B3C]"
                placeholder="nome@exemplo.com"
              />
            </label>

            <label className="grid gap-2 text-sm font-medium text-[#102A27]">
              CRECI
              <input
                name="creci"
                defaultValue={corretorEmEdicao?.creci ?? ""}
                className="rounded-xl border border-[#E8DDCB] px-4 py-3 text-[#071E36] outline-none transition placeholder:text-[#9a9d98] focus:border-[#C89B3C]"
                placeholder="CRECI"
              />
            </label>

            <label className="flex items-center gap-3 self-end rounded-xl border border-[#E8DDCB] px-4 py-3 text-sm font-medium text-[#102A27]">
              <input
                name="ativo"
                type="checkbox"
                defaultChecked={corretorEmEdicao?.ativo ?? true}
                className="size-4 accent-[#C89B3C]"
              />
              Corretor ativo
            </label>

            <div className="md:col-span-4">
              <button
                type="submit"
                className="rounded-xl bg-[#071E36] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#0A2A4A]"
              >
                {corretorEmEdicao ? "Salvar alteracoes" : "Salvar Corretor"}
              </button>
              {corretorEmEdicao ? (
                <Link
                  href="/dashboard/crm/corretores"
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
              Corretores cadastrados
            </h2>
            <span className="rounded-full bg-[#C89B3C]/10 px-3 py-1 text-sm font-medium text-[#8B6827]">
              {corretoresFiltrados.length} cadastrado{corretoresFiltrados.length === 1 ? "" : "s"}
            </span>
          </div>

          {error ? (
            <p className="mt-6 rounded-xl bg-[#fbebe7] px-4 py-3 text-sm text-[#8a2e1c]">
              Não foi possível carregar os corretores. Tente novamente.
            </p>
          ) : corretoresFiltrados.length === 0 ? (
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
                    <th className="px-4 py-3 font-medium">Acoes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#eee7dc] text-[#102A27]">
                  {corretoresFiltrados.map((corretor) => (
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
                      <td className="px-4 py-4">
                        <div className="flex flex-wrap gap-2">
                          <Link
                            href={`/dashboard/crm/corretores?edit=${corretor.id}`}
                            className="rounded-full border border-[#E8DDCB] bg-white px-3 py-1 text-xs font-semibold text-[#071E36] transition hover:border-[#C89B3C]/45 hover:bg-[#C89B3C]/10"
                          >
                            Editar
                          </Link>
                          <form action={excluirCorretor}>
                            <input type="hidden" name="id" value={corretor.id} />
                            <ConfirmSubmitButton
                              message="Confirmar exclusao logica deste corretor?"
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
