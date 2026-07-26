import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { ConfirmSubmitButton } from "../../../components/ConfirmSubmitButton";
import { requireActiveProfile } from "../../../lib/auth/access-profile";
import { CreciValidationForm } from "../crm/corretores/CreciValidationForm";
import {
  addPapel,
  isOnlyPapel,
  removePapel,
} from "../../../lib/crm/pessoas/papeis";
import {
  getCorretoresUnificados,
  type CorretorOrigem,
} from "../../../lib/crm/corretores/getCorretoresUnificados";
import { supabase } from "../../../lib/supabase";

type SearchParams = Record<string, string | string[] | undefined>;

function paramValue(searchParams: SearchParams, key: string) {
  const value = searchParams[key];
  return Array.isArray(value) ? value[0] : value;
}

function valorTexto(formData: FormData, campo: string) {
  return String(formData.get(campo) ?? "").trim();
}

function normalizarTexto(value: unknown) {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function normalizarCreci(value: string | null) {
  return String(value ?? "").trim().toUpperCase().replace(/\s+/g, "");
}

function badgeOrigem(origem: CorretorOrigem) {
  return origem === "pessoas"
    ? {
        label: "Cadastro Universal",
        className: "bg-[#071E36] text-[#E1B866]",
      }
    : {
        label: "Cadastro antigo",
        className: "bg-slate-100 text-slate-700",
      };
}

function badgeStatus(status: string | null) {
  if (status === "ativo") return "bg-emerald-50 text-emerald-700";
  if (status === "inativo") return "bg-slate-100 text-slate-600";
  return "bg-[#F7F3ED] text-[#071E36]";
}

export default async function CorretoresPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const editId = paramValue(resolvedSearchParams, "edit") ?? "";
  const busca = paramValue(resolvedSearchParams, "busca") ?? "";
  const filtroOrigem = paramValue(resolvedSearchParams, "origem") ?? "";
  const filtroStatus = paramValue(resolvedSearchParams, "status") ?? "";
  const errorCode = paramValue(resolvedSearchParams, "error") ?? "";

  async function salvarCorretor(formData: FormData) {
    "use server";
    await requireActiveProfile();

    const id = valorTexto(formData, "id");
    const sourceId = valorTexto(formData, "source_id");
    const origem = (valorTexto(formData, "origem") || "pessoas") as CorretorOrigem;
    const nome = valorTexto(formData, "nome");
    const creci = valorTexto(formData, "creci");
    const ativo = formData.get("ativo") === "on";

    if (!nome) {
      throw new Error("O nome do corretor e obrigatorio.");
    }

    if (creci) {
      const { data: corretores, error } = await getCorretoresUnificados();
      if (error) throw new Error("Nao foi possivel validar o CRECI.");

      const creciDuplicado = corretores.some(
        (corretor) =>
          corretor.id !== id &&
          normalizarCreci(corretor.creci) === normalizarCreci(creci),
      );

      if (creciDuplicado) {
        redirect("/dashboard/corretores?error=creci_duplicado");
      }
    }

    if (sourceId && origem === "corretores") {
      const { error } = await supabase
        .from("corretores")
        .update({
          nome,
          creci: creci || null,
          ativo,
          updated_at: new Date().toISOString(),
        })
        .eq("id", sourceId);

      if (error) {
        const mensagem = `${error.message ?? ""} ${error.code ?? ""}`.toLowerCase();
        if (
          mensagem.includes("creci") ||
          mensagem.includes("unique") ||
          mensagem.includes("duplicate")
        ) {
          redirect("/dashboard/corretores?error=creci_indice");
        }

        throw new Error("Nao foi possivel salvar o corretor antigo.");
      }
    } else {
      const { data: pessoaAtual } = sourceId
        ? await supabase.from("pessoas").select("papeis").eq("id", sourceId).single()
        : { data: null };

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
        status: ativo ? "ativo" : "inativo",
        ativo,
        updated_at: new Date().toISOString(),
      };

      const { error } = sourceId
        ? await supabase.from("pessoas").update(payload).eq("id", sourceId)
        : await supabase.from("pessoas").insert(payload);

      if (error) {
        const mensagem = `${error.message ?? ""} ${error.code ?? ""}`.toLowerCase();
        if (
          mensagem.includes("creci") ||
          mensagem.includes("unique") ||
          mensagem.includes("duplicate")
        ) {
          redirect("/dashboard/corretores?error=creci_indice");
        }

        throw new Error("Nao foi possivel salvar o corretor.");
      }
    }

    revalidatePath("/dashboard/corretores");
    revalidatePath("/dashboard/crm/corretores");
    revalidatePath("/dashboard/crm/roleta");
    redirect("/dashboard/corretores");
  }

  async function excluirCorretor(formData: FormData) {
    "use server";
    await requireActiveProfile();

    const sourceId = valorTexto(formData, "source_id");
    const origem = valorTexto(formData, "origem") as CorretorOrigem;

    if (!sourceId) {
      throw new Error("Corretor nao informado.");
    }

    if (origem === "corretores") {
      const { error } = await supabase
        .from("corretores")
        .update({ ativo: false, updated_at: new Date().toISOString() })
        .eq("id", sourceId);

      if (error) throw new Error("Nao foi possivel excluir o corretor antigo.");
    } else {
      const { data: pessoa, error: pessoaError } = await supabase
        .from("pessoas")
        .select("papeis")
        .eq("id", sourceId)
        .single();

      if (pessoaError) throw new Error("Nao foi possivel localizar o corretor.");

      const papeis = (pessoa as { papeis?: string[] | null }).papeis;
      const payload = isOnlyPapel(papeis, "corretor")
        ? { ativo: false, updated_at: new Date().toISOString() }
        : {
            papeis: removePapel(papeis, "corretor"),
            updated_at: new Date().toISOString(),
          };

      const { error } = await supabase.from("pessoas").update(payload).eq("id", sourceId);
      if (error) throw new Error("Nao foi possivel excluir logicamente o corretor.");
    }

    revalidatePath("/dashboard/corretores");
    revalidatePath("/dashboard/crm/corretores");
    revalidatePath("/dashboard/crm/roleta");
  }

  const { data: corretores, error } = await getCorretoresUnificados();
  const corretoresFiltrados = corretores.filter((corretor) => {
    const texto = normalizarTexto(
      [
        corretor.nome,
        corretor.creci,
        corretor.telefone,
        corretor.whatsapp,
        corretor.email,
        corretor.cidade,
        corretor.status,
        corretor.origem,
      ].join(" "),
    );

    return (
      (!busca || texto.includes(normalizarTexto(busca))) &&
      (!filtroOrigem || corretor.origem === filtroOrigem) &&
      (!filtroStatus || corretor.status === filtroStatus)
    );
  });

  const corretorEmEdicao = corretores.find((corretor) => corretor.id === editId) ?? null;
  const crecisAtivos = corretores
    .filter((corretor) => corretor.ativo && corretor.creci)
    .map((corretor) => ({ id: corretor.id, creci: corretor.creci ?? "" }));
  const mensagemErro =
    errorCode === "creci_duplicado"
      ? "Ja existe um corretor ativo cadastrado com este CRECI."
      : errorCode === "creci_indice"
        ? "Nao foi possivel salvar. Este CRECI ja esta cadastrado em outro corretor ativo."
        : "";

  return (
    <main className="min-h-screen bg-[#F7F3ED] px-6 py-10 sm:px-8">
      <div className="mx-auto max-w-7xl">
        <Link
          href="/dashboard"
          className="inline-flex rounded-xl border border-[#E8DDCB] bg-white px-4 py-2 text-sm font-medium text-[#071E36] transition hover:border-[#C89B3C]/45 hover:bg-[#C89B3C]/10"
        >
          Voltar ao Dashboard
        </Link>

        <header className="mt-8 rounded-[2rem] border border-[#E8DDCB] bg-white p-8 shadow-sm">
          <span className="rounded-full border border-[#C89B3C]/35 bg-[#C89B3C]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#8B6827]">
            Cadastros premium
          </span>
          <h1 className="mt-5 text-4xl font-bold text-[#071E36]">
            Corretores
          </h1>
          <p className="mt-2 max-w-3xl text-[#64736D]">
            Visao unificada de corretores do Cadastro Universal de Pessoas e do
            cadastro antigo, com deduplicacao por CRECI ou nome e contato.
          </p>
        </header>

        <section className="mt-8 grid gap-4 md:grid-cols-4">
          {[
            ["Total", corretores.length, "corretores unificados"],
            [
              "Cadastro Universal",
              corretores.filter((corretor) => corretor.origem === "pessoas").length,
              "base futura",
            ],
            [
              "Cadastro antigo",
              corretores.filter((corretor) => corretor.origem === "corretores").length,
              "compatibilidade",
            ],
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
          <form className="grid gap-4 md:grid-cols-5">
            <input
              name="busca"
              defaultValue={busca}
              className="rounded-xl border border-[#E8DDCB] px-4 py-3 text-sm text-[#071E36] outline-none focus:border-[#C89B3C] md:col-span-2"
              placeholder="Nome, telefone, WhatsApp, email, cidade ou CRECI"
            />
            <select
              name="origem"
              defaultValue={filtroOrigem}
              className="rounded-xl border border-[#E8DDCB] bg-white px-4 py-3 text-sm text-[#071E36] outline-none focus:border-[#C89B3C]"
            >
              <option value="">Todas as origens</option>
              <option value="pessoas">Cadastro Universal</option>
              <option value="corretores">Cadastro antigo</option>
            </select>
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
            {corretorEmEdicao ? "Editar corretor" : "Novo corretor"}
          </h2>
          <p className="mt-1 text-sm text-[#64736D]">
            Novos corretores sao criados em Pessoas com papel corretor.
          </p>

          {mensagemErro ? (
            <p className="mt-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {mensagemErro}
            </p>
          ) : null}

          <CreciValidationForm
            action={salvarCorretor}
            crecisAtivos={crecisAtivos}
            corretor={{
              id: corretorEmEdicao?.id ?? "",
              sourceId: corretorEmEdicao?.sourceId ?? "",
              origem: corretorEmEdicao?.origem ?? "pessoas",
              nome: corretorEmEdicao?.nome ?? "",
              telefone: corretorEmEdicao?.telefone ?? "",
              email: corretorEmEdicao?.email ?? "",
              creci: corretorEmEdicao?.creci ?? "",
              ativo: corretorEmEdicao?.ativo ?? true,
            }}
          />
        </section>

        <section className="mt-6 rounded-2xl border border-[#E8DDCB] bg-white p-6 shadow-sm sm:p-8">
          <div className="flex items-baseline justify-between gap-4">
            <h2 className="text-xl font-semibold text-[#071E36]">
              Corretores cadastrados
            </h2>
            <span className="rounded-full bg-[#C89B3C]/10 px-3 py-1 text-sm font-medium text-[#8B6827]">
              {corretoresFiltrados.length} exibido{corretoresFiltrados.length === 1 ? "" : "s"}
            </span>
          </div>

          {error ? (
            <p className="mt-6 rounded-xl bg-[#fbebe7] px-4 py-3 text-sm text-[#8a2e1c]">
              Nao foi possivel carregar os corretores. Tente novamente.
            </p>
          ) : corretoresFiltrados.length === 0 ? (
            <p className="mt-6 rounded-xl bg-[#F7F3ED] px-4 py-8 text-center text-sm text-[#64736D]">
              Nenhum corretor ativo encontrado. Cadastre um corretor em Cadastros
              &gt; Corretores ou crie uma Pessoa com papel Corretor.
            </p>
          ) : (
            <div className="mt-6 overflow-x-auto">
              <table className="w-full min-w-[1040px] text-left text-sm">
                <thead className="border-b border-[#E8DDCB] text-[#64736D]">
                  <tr>
                    <th className="px-4 py-3 font-medium">Nome</th>
                    <th className="px-4 py-3 font-medium">CRECI</th>
                    <th className="px-4 py-3 font-medium">Telefone/WhatsApp</th>
                    <th className="px-4 py-3 font-medium">E-mail</th>
                    <th className="px-4 py-3 font-medium">Cidade</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Origem</th>
                    <th className="px-4 py-3 font-medium">Acoes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#eee7dc] text-[#102A27]">
                  {corretoresFiltrados.map((corretor) => {
                    const origem = badgeOrigem(corretor.origem);

                    return (
                      <tr key={corretor.id}>
                        <td className="px-4 py-4 font-medium text-[#071E36]">
                          {corretor.nome}
                        </td>
                        <td className="px-4 py-4">{corretor.creci || "-"}</td>
                        <td className="px-4 py-4">
                          {corretor.whatsapp || corretor.telefone || "-"}
                        </td>
                        <td className="px-4 py-4">{corretor.email || "-"}</td>
                        <td className="px-4 py-4">{corretor.cidade || "-"}</td>
                        <td className="px-4 py-4">
                          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${badgeStatus(corretor.status)}`}>
                            {corretor.status || "-"}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${origem.className}`}>
                            {origem.label}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex flex-wrap gap-2">
                            <Link
                              href={`/dashboard/corretores?edit=${encodeURIComponent(corretor.id)}`}
                              className="rounded-full border border-[#E8DDCB] bg-white px-3 py-1 text-xs font-semibold text-[#071E36] transition hover:border-[#C89B3C]/45 hover:bg-[#C89B3C]/10"
                            >
                              Editar
                            </Link>
                            <form action={excluirCorretor}>
                              <input type="hidden" name="source_id" value={corretor.sourceId} />
                              <input type="hidden" name="origem" value={corretor.origem} />
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
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
