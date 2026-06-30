import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { ConfirmSubmitButton } from "../../../components/ConfirmSubmitButton";
import { hasPapel } from "../../../lib/crm/pessoas/papeis";
import { supabase } from "../../../lib/supabase";

type Proprietario = {
  id: string;
  nome: string;
};

type PessoaProprietario = {
  id: string;
  nome: string;
  telefone: string | null;
  celular: string | null;
  whatsapp: string | null;
  email: string | null;
  papeis: string[] | null;
};

type Imovel = {
  id: string;
  proprietario_id: string | null;
  tipo: string | null;
  cidade: string | null;
  bairro: string | null;
  condominio: string | null;
  quartos: number | string | null;
  banheiros: number | string | null;
  garagem: boolean | null;
  metragem: number | string | null;
  aluguel_pretendido: number | string | null;
  valor_condominio: number | string | null;
  valor_iptu: number | string | null;
  taxa_bombeiro: number | string | null;
  situacao: string | null;
};

type SearchParams = Record<string, string | string[] | undefined>;

function paramValue(searchParams: SearchParams, key: string) {
  const value = searchParams[key];
  return Array.isArray(value) ? value[0] : value;
}

function valorTexto(formData: FormData, campo: string) {
  return String(formData.get(campo) ?? "").trim();
}

function valorNumero(formData: FormData, campo: string) {
  const valor = valorTexto(formData, campo);

  if (!valor) return null;

  const numero = Number(valor);
  return Number.isFinite(numero) ? numero : null;
}

function isPessoaProprietarioValue(value: string) {
  return value.startsWith("pessoa:");
}

async function resolverProprietarioId(proprietarioSelecionado: string) {
  if (!isPessoaProprietarioValue(proprietarioSelecionado)) {
    return proprietarioSelecionado;
  }

  const pessoaId = proprietarioSelecionado.replace("pessoa:", "");
  const { data: pessoa, error: pessoaError } = await supabase
    .from("pessoas")
    .select("nome, telefone, celular, whatsapp, email")
    .eq("id", pessoaId)
    .single();

  if (pessoaError || !pessoa) {
    throw new Error("Nao foi possivel localizar a pessoa proprietaria.");
  }

  const pessoaProprietaria = pessoa as {
    nome: string;
    telefone: string | null;
    celular: string | null;
    whatsapp: string | null;
    email: string | null;
  };
  const telefone =
    pessoaProprietaria.telefone ||
    pessoaProprietaria.celular ||
    pessoaProprietaria.whatsapp ||
    null;

  if (pessoaProprietaria.email) {
    const { data: existentePorEmail } = await supabase
      .from("proprietarios")
      .select("id")
      .eq("email", pessoaProprietaria.email)
      .maybeSingle();

    if (existentePorEmail?.id) {
      return existentePorEmail.id as string;
    }
  }

  if (telefone) {
    const { data: existentePorTelefone } = await supabase
      .from("proprietarios")
      .select("id")
      .eq("telefone", telefone)
      .maybeSingle();

    if (existentePorTelefone?.id) {
      return existentePorTelefone.id as string;
    }
  }

  const { data: proprietarioCriado, error } = await supabase
    .from("proprietarios")
    .insert({
      nome: pessoaProprietaria.nome,
      telefone,
      email: pessoaProprietaria.email,
      ativo: true,
      updated_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error || !proprietarioCriado?.id) {
    throw new Error("Nao foi possivel criar o vinculo legado do proprietario.");
  }

  return proprietarioCriado.id as string;
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

export default async function ImoveisPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const editId = paramValue(resolvedSearchParams, "edit") ?? "";

  async function salvarImovel(formData: FormData) {
    "use server";

    const id = valorTexto(formData, "id");
    const proprietarioId = valorTexto(formData, "proprietario_id");
    const tipo = valorTexto(formData, "tipo");
    const cidade = valorTexto(formData, "cidade");
    const bairro = valorTexto(formData, "bairro");
    const condominio = valorTexto(formData, "condominio");
    const situacao = valorTexto(formData, "situacao");

    if (!proprietarioId) {
      throw new Error("Selecione um proprietário para o imóvel.");
    }

    const proprietarioIdLegado = await resolverProprietarioId(proprietarioId);

    const payload = {
      proprietario_id: proprietarioIdLegado,
      tipo: tipo || null,
      cidade: cidade || null,
      bairro: bairro || null,
      condominio: condominio || null,
      quartos: valorNumero(formData, "quartos"),
      banheiros: valorNumero(formData, "banheiros"),
      garagem: formData.get("garagem") === "on",
      metragem: valorNumero(formData, "metragem"),
      situacao: situacao || null,
      aluguel_pretendido: valorNumero(formData, "aluguel_pretendido"),
      valor_condominio: valorNumero(formData, "valor_condominio"),
      valor_iptu: valorNumero(formData, "valor_iptu"),
      taxa_bombeiro: valorNumero(formData, "taxa_bombeiro"),
      updated_at: new Date().toISOString(),
    };

    const { error } = id
      ? await supabase.from("imoveis").update(payload).eq("id", id)
      : await supabase.from("imoveis").insert(payload);

    if (error) {
      throw new Error("Não foi possível salvar o imóvel.");
    }

    revalidatePath("/dashboard/imoveis");
    revalidatePath("/dashboard");
    redirect("/dashboard/imoveis");
  }

  async function excluirImovel(formData: FormData) {
    "use server";

    const id = valorTexto(formData, "id");

    if (!id) {
      throw new Error("Imovel nao informado.");
    }

    const { error } = await supabase
      .from("imoveis")
      .update({ ativo: false, updated_at: new Date().toISOString() })
      .eq("id", id);

    if (error) {
      throw new Error("Nao foi possivel excluir logicamente o imovel.");
    }

    revalidatePath("/dashboard/imoveis");
    revalidatePath("/dashboard");
  }

  const [proprietariosResult, pessoasResult, imoveisResult] = await Promise.all([
    supabase
      .from("proprietarios")
      .select("id, nome")
      .order("nome", { ascending: true }),
    supabase
      .from("pessoas")
      .select("id, nome, telefone, celular, whatsapp, email, papeis")
      .eq("ativo", true)
      .order("nome", { ascending: true }),
    supabase
      .from("imoveis")
      .select(
        "id, proprietario_id, tipo, cidade, bairro, condominio, quartos, banheiros, garagem, metragem, aluguel_pretendido, valor_condominio, valor_iptu, taxa_bombeiro, situacao",
      )
      .eq("ativo", true),
  ]);

  const proprietarios = (proprietariosResult.data ?? []) as Proprietario[];
  const pessoasProprietarias = ((pessoasResult.data ?? []) as PessoaProprietario[]).filter(
    (pessoa) => hasPapel(pessoa, "proprietario"),
  );
  const imoveis = (imoveisResult.data ?? []) as Imovel[];
  const imovelEmEdicao = imoveis.find((imovel) => imovel.id === editId) ?? null;
  const proprietariosPorId = new Map(
    proprietarios.map((proprietario) => [proprietario.id, proprietario.nome]),
  );

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
          <h1 className="mt-5 text-4xl font-bold text-[#071E36]">Imóveis</h1>
          <p className="mt-2 text-[#64736D]">
            Cadastro e acompanhamento dos imóveis da Terrazza.
          </p>
        </div>

        <section className="mt-10 rounded-2xl border border-[#E8DDCB] bg-white p-6 shadow-sm sm:p-8">
          <h2 className="text-xl font-semibold text-[#071E36]">Novo imóvel</h2>

          <form action={salvarImovel} className="mt-6 grid gap-5 md:grid-cols-3">
            <input type="hidden" name="id" value={imovelEmEdicao?.id ?? ""} />
            <label className="grid gap-2 text-sm font-medium text-[#102A27]">
              Proprietário
              <select
                name="proprietario_id"
                required
                defaultValue={imovelEmEdicao?.proprietario_id ?? ""}
                className="rounded-xl border border-[#E8DDCB] bg-white px-4 py-3 text-[#071E36] outline-none transition focus:border-[#C89B3C]"
              >
                <option value="" disabled>
                  Selecione um proprietário
                </option>
                {pessoasProprietarias.length > 0 ? (
                  <optgroup label="Pessoas com papel proprietario">
                    {pessoasProprietarias.map((pessoa) => (
                      <option key={`pessoa-${pessoa.id}`} value={`pessoa:${pessoa.id}`}>
                        {pessoa.nome}
                      </option>
                    ))}
                  </optgroup>
                ) : null}
                <optgroup label="Cadastros legados">
                  {proprietarios.map((proprietario) => (
                    <option key={proprietario.id} value={proprietario.id}>
                      {proprietario.nome}
                    </option>
                  ))}
                </optgroup>
              </select>
            </label>

            <label className="grid gap-2 text-sm font-medium text-[#102A27]">
              Tipo
              <input
                name="tipo"
                defaultValue={imovelEmEdicao?.tipo ?? ""}
                className="rounded-xl border border-[#E8DDCB] px-4 py-3 text-[#071E36] outline-none transition placeholder:text-[#9a9d98] focus:border-[#C89B3C]"
                placeholder="Apartamento, casa, studio..."
              />
            </label>

            <label className="grid gap-2 text-sm font-medium text-[#102A27]">
              Situação
              <input
                name="situacao"
                defaultValue={imovelEmEdicao?.situacao ?? ""}
                className="rounded-xl border border-[#E8DDCB] px-4 py-3 text-[#071E36] outline-none transition placeholder:text-[#9a9d98] focus:border-[#C89B3C]"
                placeholder="Disponível, ocupado..."
              />
            </label>

            <label className="grid gap-2 text-sm font-medium text-[#102A27]">
              Cidade
              <input
                name="cidade"
                defaultValue={imovelEmEdicao?.cidade ?? ""}
                className="rounded-xl border border-[#E8DDCB] px-4 py-3 text-[#071E36] outline-none transition placeholder:text-[#9a9d98] focus:border-[#C89B3C]"
                placeholder="Cidade"
              />
            </label>

            <label className="grid gap-2 text-sm font-medium text-[#102A27]">
              Bairro
              <input
                name="bairro"
                defaultValue={imovelEmEdicao?.bairro ?? ""}
                className="rounded-xl border border-[#E8DDCB] px-4 py-3 text-[#071E36] outline-none transition placeholder:text-[#9a9d98] focus:border-[#C89B3C]"
                placeholder="Bairro"
              />
            </label>

            <label className="grid gap-2 text-sm font-medium text-[#102A27]">
              Condomínio
              <input
                name="condominio"
                defaultValue={imovelEmEdicao?.condominio ?? ""}
                className="rounded-xl border border-[#E8DDCB] px-4 py-3 text-[#071E36] outline-none transition placeholder:text-[#9a9d98] focus:border-[#C89B3C]"
                placeholder="Nome do condomínio"
              />
            </label>

            <label className="grid gap-2 text-sm font-medium text-[#102A27]">
              Quartos
              <input
                name="quartos"
                type="number"
                min="0"
                defaultValue={imovelEmEdicao?.quartos ?? ""}
                className="rounded-xl border border-[#E8DDCB] px-4 py-3 text-[#071E36] outline-none transition placeholder:text-[#9a9d98] focus:border-[#C89B3C]"
                placeholder="0"
              />
            </label>

            <label className="grid gap-2 text-sm font-medium text-[#102A27]">
              Banheiros
              <input
                name="banheiros"
                type="number"
                min="0"
                defaultValue={imovelEmEdicao?.banheiros ?? ""}
                className="rounded-xl border border-[#E8DDCB] px-4 py-3 text-[#071E36] outline-none transition placeholder:text-[#9a9d98] focus:border-[#C89B3C]"
                placeholder="0"
              />
            </label>

            <label className="grid gap-2 text-sm font-medium text-[#102A27]">
              Metragem
              <input
                name="metragem"
                type="number"
                min="0"
                step="0.01"
                defaultValue={imovelEmEdicao?.metragem ?? ""}
                className="rounded-xl border border-[#E8DDCB] px-4 py-3 text-[#071E36] outline-none transition placeholder:text-[#9a9d98] focus:border-[#C89B3C]"
                placeholder="0"
              />
            </label>

            <label className="grid gap-2 text-sm font-medium text-[#102A27]">
              Aluguel pretendido
              <input
                name="aluguel_pretendido"
                type="number"
                min="0"
                step="0.01"
                defaultValue={imovelEmEdicao?.aluguel_pretendido ?? ""}
                className="rounded-xl border border-[#E8DDCB] px-4 py-3 text-[#071E36] outline-none transition placeholder:text-[#9a9d98] focus:border-[#C89B3C]"
                placeholder="R$ 0,00"
              />
            </label>

            <label className="grid gap-2 text-sm font-medium text-[#102A27]">
              Condomínio
              <input
                name="valor_condominio"
                type="number"
                min="0"
                step="0.01"
                defaultValue={imovelEmEdicao?.valor_condominio ?? ""}
                className="rounded-xl border border-[#E8DDCB] px-4 py-3 text-[#071E36] outline-none transition placeholder:text-[#9a9d98] focus:border-[#C89B3C]"
                placeholder="R$ 0,00"
              />
            </label>

            <label className="grid gap-2 text-sm font-medium text-[#102A27]">
              IPTU
              <input
                name="valor_iptu"
                type="number"
                min="0"
                step="0.01"
                defaultValue={imovelEmEdicao?.valor_iptu ?? ""}
                className="rounded-xl border border-[#E8DDCB] px-4 py-3 text-[#071E36] outline-none transition placeholder:text-[#9a9d98] focus:border-[#C89B3C]"
                placeholder="R$ 0,00"
              />
            </label>

            <label className="grid gap-2 text-sm font-medium text-[#102A27] md:col-span-2">
              Taxa bombeiro
              <input
                name="taxa_bombeiro"
                type="number"
                min="0"
                step="0.01"
                defaultValue={imovelEmEdicao?.taxa_bombeiro ?? ""}
                className="rounded-xl border border-[#E8DDCB] px-4 py-3 text-[#071E36] outline-none transition placeholder:text-[#9a9d98] focus:border-[#C89B3C]"
                placeholder="R$ 0,00"
              />
            </label>

            <label className="flex items-center gap-3 self-end rounded-xl border border-[#E8DDCB] px-4 py-3 text-sm font-medium text-[#102A27]">
              <input
                name="garagem"
                type="checkbox"
                defaultChecked={Boolean(imovelEmEdicao?.garagem)}
                className="size-4 accent-[#C89B3C]"
              />
              Possui garagem
            </label>

            <div className="md:col-span-3">
              <button
                type="submit"
                className="rounded-xl bg-[#071E36] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#0A2A4A]"
              >
                {imovelEmEdicao ? "Salvar alteracoes" : "Salvar Imovel"}
              </button>
              {imovelEmEdicao ? (
                <Link
                  href="/dashboard/imoveis"
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
              Imóveis cadastrados
            </h2>
            <span className="rounded-full bg-[#C89B3C]/10 px-3 py-1 text-sm font-medium text-[#8B6827]">
              {imoveis.length} cadastrado{imoveis.length === 1 ? "" : "s"}
            </span>
          </div>

          {proprietariosResult.error || pessoasResult.error || imoveisResult.error ? (
            <p className="mt-6 rounded-xl bg-[#fbebe7] px-4 py-3 text-sm text-[#8a2e1c]">
              Não foi possível carregar os imóveis. Tente novamente.
            </p>
          ) : imoveis.length === 0 ? (
            <p className="mt-6 rounded-xl bg-[#F7F3ED] px-4 py-8 text-center text-sm text-[#64736D]">
              Nenhum imóvel cadastrado até o momento.
            </p>
          ) : (
            <div className="mt-6 overflow-x-auto">
              <table className="w-full min-w-[980px] text-left text-sm">
                <thead className="border-b border-[#E8DDCB] text-[#64736D]">
                  <tr>
                    <th className="px-4 py-3 font-medium">Proprietário</th>
                    <th className="px-4 py-3 font-medium">Tipo</th>
                    <th className="px-4 py-3 font-medium">Cidade</th>
                    <th className="px-4 py-3 font-medium">Bairro</th>
                    <th className="px-4 py-3 font-medium">Aluguel pretendido</th>
                    <th className="px-4 py-3 font-medium">Condomínio</th>
                    <th className="px-4 py-3 font-medium">IPTU</th>
                    <th className="px-4 py-3 font-medium">Acoes</th>
                    <th className="px-4 py-3 font-medium">Taxa bombeiro</th>
                    <th className="px-4 py-3 font-medium">Situação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#eee7dc] text-[#102A27]">
                  {imoveis.map((imovel) => (
                    <tr key={imovel.id}>
                      <td className="px-4 py-4 font-medium text-[#071E36]">
                        {imovel.proprietario_id
                          ? proprietariosPorId.get(imovel.proprietario_id) ?? "—"
                          : "—"}
                      </td>
                      <td className="px-4 py-4">{imovel.tipo || "—"}</td>
                      <td className="px-4 py-4">{imovel.cidade || "—"}</td>
                      <td className="px-4 py-4">{imovel.bairro || "—"}</td>
                      <td className="px-4 py-4">
                        {formatarMoeda(imovel.aluguel_pretendido)}
                      </td>
                      <td className="px-4 py-4">
                        {formatarMoeda(imovel.valor_condominio)}
                      </td>
                      <td className="px-4 py-4">
                        {formatarMoeda(imovel.valor_iptu)}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-wrap gap-2">
                          <Link
                            href={`/dashboard/imoveis?edit=${imovel.id}`}
                            className="rounded-full border border-[#E8DDCB] bg-white px-3 py-1 text-xs font-semibold text-[#071E36] transition hover:border-[#C89B3C]/45 hover:bg-[#C89B3C]/10"
                          >
                            Editar
                          </Link>
                          <form action={excluirImovel}>
                            <input type="hidden" name="id" value={imovel.id} />
                            <ConfirmSubmitButton
                              message="Confirmar exclusao logica deste imovel?"
                              className="rounded-full border border-red-100 bg-red-50 px-3 py-1 text-xs font-semibold text-red-700 transition hover:bg-red-100"
                            >
                              Excluir
                            </ConfirmSubmitButton>
                          </form>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        {formatarMoeda(imovel.taxa_bombeiro)}
                      </td>
                      <td className="px-4 py-4">{imovel.situacao || "—"}</td>
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
