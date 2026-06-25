import Link from "next/link";
import { revalidatePath } from "next/cache";

import { supabase } from "../../../lib/supabase";

type Proprietario = {
  id: string;
  nome: string;
};

type Imovel = {
  id: string;
  proprietario_id: string | null;
  tipo: string | null;
  cidade: string | null;
  bairro: string | null;
  aluguel_pretendido: number | string | null;
  valor_condominio: number | string | null;
  valor_iptu: number | string | null;
  taxa_bombeiro: number | string | null;
  situacao: string | null;
};

function valorTexto(formData: FormData, campo: string) {
  return String(formData.get(campo) ?? "").trim();
}

function valorNumero(formData: FormData, campo: string) {
  const valor = valorTexto(formData, campo);

  if (!valor) return null;

  const numero = Number(valor);
  return Number.isFinite(numero) ? numero : null;
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

export default async function ImoveisPage() {
  async function cadastrarImovel(formData: FormData) {
    "use server";

    const proprietarioId = valorTexto(formData, "proprietario_id");
    const tipo = valorTexto(formData, "tipo");
    const cidade = valorTexto(formData, "cidade");
    const bairro = valorTexto(formData, "bairro");
    const condominio = valorTexto(formData, "condominio");
    const situacao = valorTexto(formData, "situacao");

    if (!proprietarioId) {
      throw new Error("Selecione um proprietário para o imóvel.");
    }

    const { error } = await supabase.from("imoveis").insert({
      proprietario_id: proprietarioId,
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
    });

    if (error) {
      throw new Error("Não foi possível salvar o imóvel.");
    }

    revalidatePath("/dashboard/imoveis");
    revalidatePath("/dashboard");
  }

  const [proprietariosResult, imoveisResult] = await Promise.all([
    supabase
      .from("proprietarios")
      .select("id, nome")
      .order("nome", { ascending: true }),
    supabase
      .from("imoveis")
      .select(
        "id, proprietario_id, tipo, cidade, bairro, aluguel_pretendido, valor_condominio, valor_iptu, taxa_bombeiro, situacao",
      ),
  ]);

  const proprietarios = (proprietariosResult.data ?? []) as Proprietario[];
  const imoveis = (imoveisResult.data ?? []) as Imovel[];
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

          <form action={cadastrarImovel} className="mt-6 grid gap-5 md:grid-cols-3">
            <label className="grid gap-2 text-sm font-medium text-[#102A27]">
              Proprietário
              <select
                name="proprietario_id"
                required
                className="rounded-xl border border-[#E8DDCB] bg-white px-4 py-3 text-[#071E36] outline-none transition focus:border-[#C89B3C]"
                defaultValue=""
              >
                <option value="" disabled>
                  Selecione um proprietário
                </option>
                {proprietarios.map((proprietario) => (
                  <option key={proprietario.id} value={proprietario.id}>
                    {proprietario.nome}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-2 text-sm font-medium text-[#102A27]">
              Tipo
              <input
                name="tipo"
                className="rounded-xl border border-[#E8DDCB] px-4 py-3 text-[#071E36] outline-none transition placeholder:text-[#9a9d98] focus:border-[#C89B3C]"
                placeholder="Apartamento, casa, studio..."
              />
            </label>

            <label className="grid gap-2 text-sm font-medium text-[#102A27]">
              Situação
              <input
                name="situacao"
                className="rounded-xl border border-[#E8DDCB] px-4 py-3 text-[#071E36] outline-none transition placeholder:text-[#9a9d98] focus:border-[#C89B3C]"
                placeholder="Disponível, ocupado..."
              />
            </label>

            <label className="grid gap-2 text-sm font-medium text-[#102A27]">
              Cidade
              <input
                name="cidade"
                className="rounded-xl border border-[#E8DDCB] px-4 py-3 text-[#071E36] outline-none transition placeholder:text-[#9a9d98] focus:border-[#C89B3C]"
                placeholder="Cidade"
              />
            </label>

            <label className="grid gap-2 text-sm font-medium text-[#102A27]">
              Bairro
              <input
                name="bairro"
                className="rounded-xl border border-[#E8DDCB] px-4 py-3 text-[#071E36] outline-none transition placeholder:text-[#9a9d98] focus:border-[#C89B3C]"
                placeholder="Bairro"
              />
            </label>

            <label className="grid gap-2 text-sm font-medium text-[#102A27]">
              Condomínio
              <input
                name="condominio"
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
                className="rounded-xl border border-[#E8DDCB] px-4 py-3 text-[#071E36] outline-none transition placeholder:text-[#9a9d98] focus:border-[#C89B3C]"
                placeholder="R$ 0,00"
              />
            </label>

            <label className="flex items-center gap-3 self-end rounded-xl border border-[#E8DDCB] px-4 py-3 text-sm font-medium text-[#102A27]">
              <input
                name="garagem"
                type="checkbox"
                className="size-4 accent-[#C89B3C]"
              />
              Possui garagem
            </label>

            <div className="md:col-span-3">
              <button
                type="submit"
                className="rounded-xl bg-[#071E36] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#0A2A4A]"
              >
                Salvar Imóvel
              </button>
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

          {proprietariosResult.error || imoveisResult.error ? (
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
