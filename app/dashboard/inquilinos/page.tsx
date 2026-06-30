import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { ConfirmSubmitButton } from "../../../components/ConfirmSubmitButton";
import { supabase } from "../../../lib/supabase";

type Inquilino = {
  id: string;
  nome: string;
  telefone: string | null;
  email: string | null;
  cpf: string | null;
  cidade_interesse: string | null;
  bairro_interesse: string | null;
  faixa_aluguel: number | string | null;
  quartos_desejados: number | null;
  possui_pet: boolean | null;
  status: string | null;
  observacao: string | null;
  created_at: string | null;
};

type SearchParams = Record<string, string | string[] | undefined>;

function paramValue(searchParams: SearchParams, key: string) {
  const value = searchParams[key];
  return Array.isArray(value) ? value[0] : value;
}

const statusInquilinos = ["prospect", "em_analise", "aprovado", "perdido"];

function valorTexto(formData: FormData, campo: string) {
  return String(formData.get(campo) ?? "").trim();
}

function valorNumero(formData: FormData, campo: string) {
  const valor = valorTexto(formData, campo);

  if (!valor) return null;

  const numero = Number(valor);
  return Number.isFinite(numero) ? numero : null;
}

function valorInteiro(formData: FormData, campo: string) {
  const numero = valorNumero(formData, campo);

  if (numero === null) return null;

  return Math.trunc(numero);
}

function formatarData(data: string | null) {
  if (!data) return "—";

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "medium",
  }).format(new Date(data));
}

function formatarMoeda(valor: number | string | null) {
  if (valor === null || valor === "") return "—";

  const numero = Number(valor);

  if (!Number.isFinite(numero)) return "—";

  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(numero);
}

function labelStatus(status: string | null) {
  if (!status) return "—";

  return status.replaceAll("_", " ");
}

export default async function InquilinosPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const editId = paramValue(resolvedSearchParams, "edit") ?? "";

  async function salvarInquilino(formData: FormData) {
    "use server";

    const id = valorTexto(formData, "id");
    const nome = valorTexto(formData, "nome");

    if (!nome) {
      throw new Error("O nome do inquilino é obrigatório.");
    }

    const payload = {
      nome,
      telefone: valorTexto(formData, "telefone") || null,
      email: valorTexto(formData, "email") || null,
      cpf: valorTexto(formData, "cpf") || null,
      cidade_interesse: valorTexto(formData, "cidade_interesse") || null,
      bairro_interesse: valorTexto(formData, "bairro_interesse") || null,
      faixa_aluguel: valorNumero(formData, "faixa_aluguel"),
      quartos_desejados: valorInteiro(formData, "quartos_desejados"),
      possui_pet: formData.get("possui_pet") === "on",
      status: valorTexto(formData, "status") || "prospect",
      observacao: valorTexto(formData, "observacao") || null,
      updated_at: new Date().toISOString(),
    };

    const { error } = id
      ? await supabase.from("inquilinos").update(payload).eq("id", id)
      : await supabase.from("inquilinos").insert(payload);

    if (error) {
      throw new Error("Não foi possível salvar o inquilino.");
    }

    revalidatePath("/dashboard/inquilinos");
    redirect("/dashboard/inquilinos");
  }

  async function excluirInquilino(formData: FormData) {
    "use server";

    const id = valorTexto(formData, "id");

    if (!id) {
      throw new Error("Inquilino nao informado.");
    }

    const { error } = await supabase
      .from("inquilinos")
      .update({ ativo: false, updated_at: new Date().toISOString() })
      .eq("id", id);

    if (error) {
      throw new Error("Nao foi possivel excluir logicamente o inquilino.");
    }

    revalidatePath("/dashboard/inquilinos");
  }

  const { data, error } = await supabase
    .from("inquilinos")
    .select(
      "id, nome, telefone, email, cpf, cidade_interesse, bairro_interesse, faixa_aluguel, quartos_desejados, possui_pet, status, observacao, created_at",
    )
    .eq("ativo", true)
    .order("created_at", { ascending: false });

  const inquilinos = (data ?? []) as Inquilino[];
  const inquilinoEmEdicao =
    inquilinos.find((inquilino) => inquilino.id === editId) ?? null;

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
            Cadastros
          </span>
          <h1 className="mt-5 text-4xl font-bold text-[#071E36]">
            Inquilinos
          </h1>
          <p className="mt-2 text-[#64736D]">
            Cadastro e acompanhamento dos inquilinos da Terrazza.
          </p>
        </div>

        <section className="mt-10 rounded-2xl border border-[#E8DDCB] bg-white p-6 shadow-sm sm:p-8">
          <h2 className="text-xl font-semibold text-[#071E36]">
            Novo inquilino
          </h2>

          <form action={salvarInquilino} className="mt-6 grid gap-5 md:grid-cols-3">
            <input type="hidden" name="id" value={inquilinoEmEdicao?.id ?? ""} />
            <label className="grid gap-2 text-sm font-medium text-[#102A27]">
              Nome
              <input
                name="nome"
                required
                defaultValue={inquilinoEmEdicao?.nome ?? ""}
                className="rounded-xl border border-[#E8DDCB] px-4 py-3 text-[#071E36] outline-none transition placeholder:text-[#9a9d98] focus:border-[#C89B3C]"
                placeholder="Nome completo"
              />
            </label>

            <label className="grid gap-2 text-sm font-medium text-[#102A27]">
              Telefone
              <input
                name="telefone"
                type="tel"
                defaultValue={inquilinoEmEdicao?.telefone ?? ""}
                className="rounded-xl border border-[#E8DDCB] px-4 py-3 text-[#071E36] outline-none transition placeholder:text-[#9a9d98] focus:border-[#C89B3C]"
                placeholder="(00) 00000-0000"
              />
            </label>

            <label className="grid gap-2 text-sm font-medium text-[#102A27]">
              E-mail
              <input
                name="email"
                type="email"
                defaultValue={inquilinoEmEdicao?.email ?? ""}
                className="rounded-xl border border-[#E8DDCB] px-4 py-3 text-[#071E36] outline-none transition placeholder:text-[#9a9d98] focus:border-[#C89B3C]"
                placeholder="nome@exemplo.com"
              />
            </label>

            <label className="grid gap-2 text-sm font-medium text-[#102A27]">
              CPF
              <input
                name="cpf"
                defaultValue={inquilinoEmEdicao?.cpf ?? ""}
                className="rounded-xl border border-[#E8DDCB] px-4 py-3 text-[#071E36] outline-none transition placeholder:text-[#9a9d98] focus:border-[#C89B3C]"
                placeholder="000.000.000-00"
              />
            </label>

            <label className="grid gap-2 text-sm font-medium text-[#102A27]">
              Cidade de interesse
              <input
                name="cidade_interesse"
                defaultValue={inquilinoEmEdicao?.cidade_interesse ?? ""}
                className="rounded-xl border border-[#E8DDCB] px-4 py-3 text-[#071E36] outline-none transition placeholder:text-[#9a9d98] focus:border-[#C89B3C]"
                placeholder="Cidade"
              />
            </label>

            <label className="grid gap-2 text-sm font-medium text-[#102A27]">
              Bairro de interesse
              <input
                name="bairro_interesse"
                defaultValue={inquilinoEmEdicao?.bairro_interesse ?? ""}
                className="rounded-xl border border-[#E8DDCB] px-4 py-3 text-[#071E36] outline-none transition placeholder:text-[#9a9d98] focus:border-[#C89B3C]"
                placeholder="Bairro"
              />
            </label>

            <label className="grid gap-2 text-sm font-medium text-[#102A27]">
              Faixa de aluguel
              <input
                name="faixa_aluguel"
                type="number"
                min="0"
                step="0.01"
                defaultValue={inquilinoEmEdicao?.faixa_aluguel ?? ""}
                className="rounded-xl border border-[#E8DDCB] px-4 py-3 text-[#071E36] outline-none transition placeholder:text-[#9a9d98] focus:border-[#C89B3C]"
                placeholder="R$ 0,00"
              />
            </label>

            <label className="grid gap-2 text-sm font-medium text-[#102A27]">
              Quartos desejados
              <input
                name="quartos_desejados"
                type="number"
                min="0"
                defaultValue={inquilinoEmEdicao?.quartos_desejados ?? ""}
                className="rounded-xl border border-[#E8DDCB] px-4 py-3 text-[#071E36] outline-none transition placeholder:text-[#9a9d98] focus:border-[#C89B3C]"
                placeholder="0"
              />
            </label>

            <label className="grid gap-2 text-sm font-medium text-[#102A27]">
              Status
              <select
                name="status"
                defaultValue={inquilinoEmEdicao?.status ?? "prospect"}
                className="rounded-xl border border-[#E8DDCB] bg-white px-4 py-3 text-[#071E36] outline-none transition focus:border-[#C89B3C]"
              >
                {statusInquilinos.map((status) => (
                  <option key={status} value={status}>
                    {labelStatus(status)}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex items-center gap-3 self-end rounded-xl border border-[#E8DDCB] px-4 py-3 text-sm font-medium text-[#102A27]">
              <input
                name="possui_pet"
                type="checkbox"
                defaultChecked={Boolean(inquilinoEmEdicao?.possui_pet)}
                className="size-4 accent-[#C89B3C]"
              />
              Possui pet
            </label>

            <label className="grid gap-2 text-sm font-medium text-[#102A27] md:col-span-3">
              Observação
              <textarea
                name="observacao"
                rows={4}
                defaultValue={inquilinoEmEdicao?.observacao ?? ""}
                className="rounded-xl border border-[#E8DDCB] px-4 py-3 text-[#071E36] outline-none transition placeholder:text-[#9a9d98] focus:border-[#C89B3C]"
                placeholder="Preferências, perfil, restrições e próximos passos..."
              />
            </label>

            <div className="md:col-span-3">
              <button
                type="submit"
                className="rounded-xl bg-[#071E36] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#0A2A4A]"
              >
                {inquilinoEmEdicao ? "Salvar alteracoes" : "Salvar Inquilino"}
              </button>
              {inquilinoEmEdicao ? (
                <Link
                  href="/dashboard/inquilinos"
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
              Inquilinos cadastrados
            </h2>
            <span className="rounded-full bg-[#C89B3C]/10 px-3 py-1 text-sm font-medium text-[#8B6827]">
              {inquilinos.length} cadastrado{inquilinos.length === 1 ? "" : "s"}
            </span>
          </div>

          {error ? (
            <p className="mt-6 rounded-xl bg-[#fbebe7] px-4 py-3 text-sm text-[#8a2e1c]">
              Não foi possível carregar os inquilinos. Verifique se a tabela já foi criada.
            </p>
          ) : inquilinos.length === 0 ? (
            <p className="mt-6 rounded-xl bg-[#F7F3ED] px-4 py-8 text-center text-sm text-[#64736D]">
              Nenhum inquilino cadastrado até o momento.
            </p>
          ) : (
            <div className="mt-6 overflow-x-auto">
              <table className="w-full min-w-[920px] text-left text-sm">
                <thead className="border-b border-[#E8DDCB] text-[#64736D]">
                  <tr>
                    <th className="px-4 py-3 font-medium">Nome</th>
                    <th className="px-4 py-3 font-medium">Telefone</th>
                    <th className="px-4 py-3 font-medium">Cidade/Bairro</th>
                    <th className="px-4 py-3 font-medium">Faixa aluguel</th>
                    <th className="px-4 py-3 font-medium">Quartos</th>
                    <th className="px-4 py-3 font-medium">Pet</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Data</th>
                    <th className="px-4 py-3 font-medium">Acoes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#eee7dc] text-[#102A27]">
                  {inquilinos.map((inquilino) => (
                    <tr key={inquilino.id}>
                      <td className="px-4 py-4 font-medium text-[#071E36]">
                        {inquilino.nome}
                      </td>
                      <td className="px-4 py-4">{inquilino.telefone || "—"}</td>
                      <td className="px-4 py-4">
                        {[inquilino.cidade_interesse, inquilino.bairro_interesse]
                          .filter(Boolean)
                          .join(" / ") || "—"}
                      </td>
                      <td className="px-4 py-4">
                        {formatarMoeda(inquilino.faixa_aluguel)}
                      </td>
                      <td className="px-4 py-4">
                        {inquilino.quartos_desejados ?? "—"}
                      </td>
                      <td className="px-4 py-4">
                        {inquilino.possui_pet ? "Sim" : "Não"}
                      </td>
                      <td className="px-4 py-4">{labelStatus(inquilino.status)}</td>
                      <td className="px-4 py-4">
                        {formatarData(inquilino.created_at)}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-wrap gap-2">
                          <Link
                            href={`/dashboard/inquilinos?edit=${inquilino.id}`}
                            className="rounded-full border border-[#E8DDCB] bg-white px-3 py-1 text-xs font-semibold text-[#071E36] transition hover:border-[#C89B3C]/45 hover:bg-[#C89B3C]/10"
                          >
                            Editar
                          </Link>
                          <form action={excluirInquilino}>
                            <input type="hidden" name="id" value={inquilino.id} />
                            <ConfirmSubmitButton
                              message="Confirmar exclusao logica deste inquilino?"
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
