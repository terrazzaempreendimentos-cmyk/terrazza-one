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
        "id, proprietario_id, tipo, cidade, bairro, aluguel_pretendido, situacao",
      ),
  ]);

  const proprietarios = (proprietariosResult.data ?? []) as Proprietario[];
  const imoveis = (imoveisResult.data ?? []) as Imovel[];
  const proprietariosPorId = new Map(
    proprietarios.map((proprietario) => [proprietario.id, proprietario.nome]),
  );

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
          <h1 className="text-4xl font-bold text-[#143d2c]">Imóveis</h1>
          <p className="mt-2 text-[#5f6f65]">
            Cadastro e acompanhamento dos imóveis da Terrazza.
          </p>
        </div>

        <section className="mt-10 rounded-2xl border border-[#dfd4c2] bg-white p-6 shadow-sm sm:p-8">
          <h2 className="text-xl font-semibold text-[#143d2c]">Novo imóvel</h2>

          <form action={cadastrarImovel} className="mt-6 grid gap-5 md:grid-cols-3">
            <label className="grid gap-2 text-sm font-medium text-[#355346]">
              Proprietário
              <select
                name="proprietario_id"
                required
                className="rounded-xl border border-[#dfd4c2] bg-white px-4 py-3 text-[#143d2c] outline-none transition focus:border-[#143d2c]"
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

            <label className="grid gap-2 text-sm font-medium text-[#355346]">
              Tipo
              <input
                name="tipo"
                className="rounded-xl border border-[#dfd4c2] px-4 py-3 text-[#143d2c] outline-none transition placeholder:text-[#9a9d98] focus:border-[#143d2c]"
                placeholder="Apartamento, casa, studio..."
              />
            </label>

            <label className="grid gap-2 text-sm font-medium text-[#355346]">
              Situação
              <input
                name="situacao"
                className="rounded-xl border border-[#dfd4c2] px-4 py-3 text-[#143d2c] outline-none transition placeholder:text-[#9a9d98] focus:border-[#143d2c]"
                placeholder="Disponível, ocupado..."
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
              Bairro
              <input
                name="bairro"
                className="rounded-xl border border-[#dfd4c2] px-4 py-3 text-[#143d2c] outline-none transition placeholder:text-[#9a9d98] focus:border-[#143d2c]"
                placeholder="Bairro"
              />
            </label>

            <label className="grid gap-2 text-sm font-medium text-[#355346]">
              Condomínio
              <input
                name="condominio"
                className="rounded-xl border border-[#dfd4c2] px-4 py-3 text-[#143d2c] outline-none transition placeholder:text-[#9a9d98] focus:border-[#143d2c]"
                placeholder="Nome do condomínio"
              />
            </label>

            <label className="grid gap-2 text-sm font-medium text-[#355346]">
              Quartos
              <input
                name="quartos"
                type="number"
                min="0"
                className="rounded-xl border border-[#dfd4c2] px-4 py-3 text-[#143d2c] outline-none transition placeholder:text-[#9a9d98] focus:border-[#143d2c]"
                placeholder="0"
              />
            </label>

            <label className="grid gap-2 text-sm font-medium text-[#355346]">
              Banheiros
              <input
                name="banheiros"
                type="number"
                min="0"
                className="rounded-xl border border-[#dfd4c2] px-4 py-3 text-[#143d2c] outline-none transition placeholder:text-[#9a9d98] focus:border-[#143d2c]"
                placeholder="0"
              />
            </label>

            <label className="grid gap-2 text-sm font-medium text-[#355346]">
              Metragem
              <input
                name="metragem"
                type="number"
                min="0"
                step="0.01"
                className="rounded-xl border border-[#dfd4c2] px-4 py-3 text-[#143d2c] outline-none transition placeholder:text-[#9a9d98] focus:border-[#143d2c]"
                placeholder="0"
              />
            </label>

            <label className="grid gap-2 text-sm font-medium text-[#355346] md:col-span-2">
              Aluguel pretendido
              <input
                name="aluguel_pretendido"
                type="number"
                min="0"
                step="0.01"
                className="rounded-xl border border-[#dfd4c2] px-4 py-3 text-[#143d2c] outline-none transition placeholder:text-[#9a9d98] focus:border-[#143d2c]"
                placeholder="R$ 0,00"
              />
            </label>

            <label className="flex items-center gap-3 self-end rounded-xl border border-[#dfd4c2] px-4 py-3 text-sm font-medium text-[#355346]">
              <input
                name="garagem"
                type="checkbox"
                className="size-4 accent-[#143d2c]"
              />
              Possui garagem
            </label>

            <div className="md:col-span-3">
              <button
                type="submit"
                className="rounded-xl bg-[#143d2c] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#0f3022]"
              >
                Salvar Imóvel
              </button>
            </div>
          </form>
        </section>

        <section className="mt-6 rounded-2xl border border-[#dfd4c2] bg-white p-6 shadow-sm sm:p-8">
          <div className="flex items-baseline justify-between gap-4">
            <h2 className="text-xl font-semibold text-[#143d2c]">
              Imóveis cadastrados
            </h2>
            <span className="text-sm text-[#6b746c]">
              {imoveis.length} cadastrado{imoveis.length === 1 ? "" : "s"}
            </span>
          </div>

          {proprietariosResult.error || imoveisResult.error ? (
            <p className="mt-6 rounded-xl bg-[#fbebe7] px-4 py-3 text-sm text-[#8a2e1c]">
              Não foi possível carregar os imóveis. Tente novamente.
            </p>
          ) : imoveis.length === 0 ? (
            <p className="mt-6 rounded-xl bg-[#f7f3ed] px-4 py-8 text-center text-sm text-[#6b746c]">
              Nenhum imóvel cadastrado até o momento.
            </p>
          ) : (
            <div className="mt-6 overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="border-b border-[#dfd4c2] text-[#6b746c]">
                  <tr>
                    <th className="px-4 py-3 font-medium">Proprietário</th>
                    <th className="px-4 py-3 font-medium">Tipo</th>
                    <th className="px-4 py-3 font-medium">Cidade</th>
                    <th className="px-4 py-3 font-medium">Bairro</th>
                    <th className="px-4 py-3 font-medium">Aluguel pretendido</th>
                    <th className="px-4 py-3 font-medium">Situação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#eee7dc] text-[#355346]">
                  {imoveis.map((imovel) => (
                    <tr key={imovel.id}>
                      <td className="px-4 py-4 font-medium text-[#143d2c]">
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
