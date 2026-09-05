import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { AddressFields } from "../../../components/AddressFields";
import { ConfirmSubmitButton } from "../../../components/ConfirmSubmitButton";
import { DocumentUniqueForm } from "../../../components/DocumentUniqueForm";
import { requireCorretorPessoaId, requirePermission } from "../../../lib/auth/access-profile";
import { requirePagePermission } from "../../../lib/auth/page-permission";
import {
  addPapel,
  hasPapel,
  removePapel,
} from "../../../lib/crm/pessoas/papeis";
import { createClient } from "../../../lib/supabase/server";
import {
  formatarCNPJ,
  formatarCPF,
  limparDocumento,
  validarCNPJ,
  validarCPF,
} from "../../../lib/utils/validators";

type Inquilino = {
  id: string;
  nome: string;
  tipo_pessoa: string | null;
  telefone: string | null;
  celular: string | null;
  whatsapp: string | null;
  email: string | null;
  cpf_cnpj: string | null;
  cep: string | null;
  endereco: string | null;
  numero: string | null;
  complemento: string | null;
  cidade: string | null;
  bairro: string | null;
  estado: string | null;
  status: string | null;
  temperatura: string | null;
  score_relacionamento: number | null;
  responsavel_id: string | null;
  responsavel_pessoa_id: string | null;
  observacoes: string | null;
  papeis: string[] | null;
  created_at: string | null;
};

type SearchParams = Record<string, string | string[] | undefined>;

const statusInquilinos = ["prospect", "em_atendimento", "em_analise", "aprovado", "pendente", "perdido"];

function paramValue(searchParams: SearchParams, key: string) {
  const value = searchParams[key];
  return Array.isArray(value) ? value[0] : value;
}

function valorTexto(formData: FormData, campo: string) {
  return String(formData.get(campo) ?? "").trim();
}

function uuidValido(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function valorNumero(formData: FormData, campo: string) {
  const value = valorTexto(formData, campo);
  if (!value) return 0;

  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function normalizar(value: unknown) {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function telefonePrincipal(pessoa: Inquilino) {
  return pessoa.whatsapp || pessoa.celular || pessoa.telefone;
}

function badgeClass(value: string | null | undefined) {
  if (value === "quente") return "bg-[#C89B3C]/15 text-[#8B6827] border-[#C89B3C]/25";
  if (value === "frio") return "bg-slate-100 text-slate-600 border-slate-200";
  return "bg-[#071E36]/8 text-[#071E36] border-[#071E36]/10";
}

export default async function InquilinosPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const profile = await requirePagePermission("pessoas.visualizar");
  const corretorPessoaId = requireCorretorPessoaId(profile);
  const supabase = await createClient();

  const resolvedSearchParams = (await searchParams) ?? {};
  const editId = paramValue(resolvedSearchParams, "edit") ?? "";
  const viewId = paramValue(resolvedSearchParams, "view") ?? "";
  const busca = paramValue(resolvedSearchParams, "busca") ?? "";
  const cidade = paramValue(resolvedSearchParams, "cidade") ?? "";
  const status = paramValue(resolvedSearchParams, "status") ?? "";
  const temperatura = paramValue(resolvedSearchParams, "temperatura") ?? "";
  const errorCode = paramValue(resolvedSearchParams, "error") ?? "";

  async function salvarInquilino(formData: FormData) {
    "use server";
    const id = valorTexto(formData, "id");
    const actor = await requirePermission(id ? "pessoas.editar" : "pessoas.criar");
    requireCorretorPessoaId(actor);
    if (id && !uuidValido(id)) throw new Error("Inquilino invalido.");
    const supabase = await createClient();
    const nome = valorTexto(formData, "nome");

    if (!nome) {
      throw new Error("O nome do inquilino e obrigatorio.");
    }

    const tipoPessoa = valorTexto(formData, "tipo_pessoa") || "fisica";
    const documento = valorTexto(formData, "cpf_cnpj");

    if (documento) {
      const documentoValido =
        tipoPessoa === "juridica" ? validarCNPJ(documento) : validarCPF(documento);

      if (!documentoValido) {
        throw new Error(
          tipoPessoa === "juridica" ? "CNPJ invalido." : "CPF invalido.",
        );
      }

      const { data: pessoasAtivas, error: documentoError } = await supabase
        .from("pessoas")
        .select("id, cpf_cnpj")
        .eq("ativo", true);

      if (documentoError) {
        throw new Error("Nao foi possivel validar o CPF/CNPJ.");
      }

      const documentoDuplicado = ((pessoasAtivas ?? []) as Pick<
        Inquilino,
        "id" | "cpf_cnpj"
      >[]).some(
        (pessoa) =>
          pessoa.id !== id &&
          limparDocumento(pessoa.cpf_cnpj ?? "") === limparDocumento(documento),
      );

      if (documentoDuplicado) {
        redirect("/dashboard/inquilinos?error=documento_duplicado");
      }
    }

    const { data: pessoaAtual } = id
      ? await supabase.from("pessoas").select("papeis, responsavel_pessoa_id").eq("id", id).single()
      : { data: null };

    const detalhes = [
      valorTexto(formData, "faixa_aluguel")
        ? `Faixa de aluguel: ${valorTexto(formData, "faixa_aluguel")}`
        : null,
      valorTexto(formData, "quartos_desejados")
        ? `Quartos desejados: ${valorTexto(formData, "quartos_desejados")}`
        : null,
      formData.get("possui_pet") === "on" ? "Possui pet" : "Sem pet informado",
      valorTexto(formData, "imovel_relacionado")
        ? `Imovel relacionado: ${valorTexto(formData, "imovel_relacionado")}`
        : null,
    ].filter(Boolean);
    const observacao = valorTexto(formData, "observacoes");

    const payload = {
      nome,
      tipo_pessoa: tipoPessoa,
      telefone: valorTexto(formData, "telefone") || null,
      whatsapp: valorTexto(formData, "whatsapp") || valorTexto(formData, "telefone") || null,
      email: valorTexto(formData, "email") || null,
      cpf_cnpj: documento
        ? tipoPessoa === "juridica"
          ? formatarCNPJ(documento)
          : formatarCPF(documento)
        : null,
      cep: valorTexto(formData, "cep") || null,
      endereco: valorTexto(formData, "endereco") || null,
      numero: valorTexto(formData, "numero") || null,
      complemento: valorTexto(formData, "complemento") || null,
      cidade: valorTexto(formData, "cidade") || null,
      bairro: valorTexto(formData, "bairro") || null,
      estado: valorTexto(formData, "estado") || null,
      status: valorTexto(formData, "status") || "prospect",
      temperatura: valorTexto(formData, "temperatura") || null,
      responsavel_id: null,
      responsavel_pessoa_id: actor.papel === "corretor" ? actor.pessoaId : (pessoaAtual as { responsavel_pessoa_id?: string | null } | null)?.responsavel_pessoa_id ?? null,
      score_relacionamento: valorNumero(formData, "score_relacionamento"),
      observacoes: [observacao, ...detalhes].filter(Boolean).join("\n") || null,
      papeis: addPapel(
        (pessoaAtual as { papeis?: string[] | null } | null)?.papeis,
        "inquilino",
      ),
      origem: "manual",
      ativo: true,
      updated_at: new Date().toISOString(),
    };

    let updateQuery = supabase.from("pessoas").update(payload).eq("id", id);
    if (actor.papel === "corretor") updateQuery = updateQuery.eq("responsavel_pessoa_id", actor.pessoaId!);
    const { data: saved, error } = id
      ? await updateQuery.select("id").maybeSingle()
      : await supabase.from("pessoas").insert(payload).select("id").single();

    if (error || !saved) {
      const mensagem = `${error?.message ?? ""} ${error?.code ?? ""}`.toLowerCase();
      if (
        mensagem.includes("cpf") ||
        mensagem.includes("cnpj") ||
        mensagem.includes("unique") ||
        mensagem.includes("duplicate")
      ) {
        redirect("/dashboard/inquilinos?error=documento_indice");
      }

      throw new Error("Nao foi possivel salvar o inquilino.");
    }

    revalidatePath("/dashboard/inquilinos");
    revalidatePath("/dashboard");
    redirect("/dashboard/inquilinos");
  }

  async function excluirInquilino(formData: FormData) {
    "use server";
    const actor = await requirePermission("pessoas.arquivar");
    requireCorretorPessoaId(actor);
    const supabase = await createClient();

    const id = valorTexto(formData, "id");
    if (!id) throw new Error("Inquilino nao informado.");

    const { data: pessoa, error: pessoaError } = await supabase
      .from("pessoas")
      .select("papeis")
      .eq("id", id)
      .single();

    if (pessoaError) throw new Error("Nao foi possivel localizar o inquilino.");

    const papeis = (pessoa as { papeis?: string[] | null }).papeis;
    const payload = {
      papeis: removePapel(papeis, "inquilino"),
      updated_at: new Date().toISOString(),
    };

    let archiveQuery = supabase.from("pessoas").update(payload).eq("id", id);
    if (actor.papel === "corretor") archiveQuery = archiveQuery.eq("responsavel_pessoa_id", actor.pessoaId!);
    const { data: archived, error } = await archiveQuery.select("id").maybeSingle();
    if (error || !archived) throw new Error("Nao foi possivel excluir logicamente o inquilino.");

    revalidatePath("/dashboard/inquilinos");
    revalidatePath("/dashboard");
  }

  const pessoasResult = await supabase
      .from("pessoas")
      .select(
        "id, nome, tipo_pessoa, telefone, celular, whatsapp, email, cpf_cnpj, cep, endereco, numero, complemento, cidade, bairro, estado, status, temperatura, score_relacionamento, responsavel_id, responsavel_pessoa_id, observacoes, papeis, created_at",
      )
      .eq("ativo", true)
      .order("created_at", { ascending: false });

  const inquilinos = ((pessoasResult.data ?? []) as Inquilino[]).filter((pessoa) =>
    hasPapel(pessoa, "inquilino"),
  );
  const documentosAtivos = ((pessoasResult.data ?? []) as Inquilino[])
    .filter((pessoa) => pessoa.cpf_cnpj)
    .map((pessoa) => ({ id: pessoa.id, cpf_cnpj: pessoa.cpf_cnpj }));
  const inquilinosFiltrados = inquilinos.filter((pessoa) => {
    const texto = normalizar(
      [pessoa.nome, telefonePrincipal(pessoa), pessoa.email, pessoa.cidade, pessoa.bairro].join(" "),
    );

    return (
      (!busca || texto.includes(normalizar(busca))) &&
      (!cidade || normalizar(pessoa.cidade).includes(normalizar(cidade))) &&
      (!status || pessoa.status === status) &&
      (!temperatura || pessoa.temperatura === temperatura)
    );
  });
  const inquilinoEmEdicao = inquilinos.find((inquilino) => inquilino.id === editId
    && (profile.papel !== "corretor" || inquilino.responsavel_pessoa_id === corretorPessoaId)) ?? null;
  const inquilinoVisualizado = inquilinos.find((inquilino) => inquilino.id === viewId) ?? null;
  const mensagemErro =
    errorCode === "documento_duplicado"
      ? "Ja existe uma pessoa ativa cadastrada com este CPF/CNPJ."
      : errorCode === "documento_indice"
        ? "Nao foi possivel salvar. Este CPF/CNPJ ja esta cadastrado em outra pessoa ativa."
        : "";
  const ativos = inquilinos.filter((pessoa) => pessoa.status !== "inativo").length;
  const emAtendimento = inquilinos.filter((pessoa) => pessoa.status === "em_atendimento").length;
  const pendencias = inquilinos.filter((pessoa) => pessoa.status === "pendente").length;

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
          <h1 className="mt-5 text-4xl font-bold text-[#071E36]">Inquilinos</h1>
          <p className="mt-2 max-w-3xl text-[#64736D]">
            Visao operacional de Pessoas com papel inquilino, conectando locacao,
            relacionamento, historico e futuras manutencoes.
          </p>
          <Link href="/dashboard/pessoas?papel=inquilino" className="mt-5 inline-flex rounded-xl bg-[#071E36] px-5 py-3 text-sm font-semibold text-white">
            Criar no cadastro central
          </Link>
        </header>

        <section className="mt-8 grid gap-4 md:grid-cols-5">
          {[
            ["Total", inquilinos.length, "inquilinos na matriz"],
            ["Ativos", ativos, "relacionamentos ativos"],
            ["Em atendimento", emAtendimento, "fluxos em andamento"],
            ["Manutencao aberta", 0, "placeholder operacional"],
            ["Pendencias", pendencias, "casos a acompanhar"],
          ].map(([title, value, subtitle]) => (
            <div key={title} className="rounded-2xl border border-[#E8DDCB] bg-white p-5 shadow-sm">
              <p className="text-sm font-semibold text-[#102A27]">{title}</p>
              <strong className="mt-3 block text-3xl text-[#071E36]">{value}</strong>
              <p className="mt-1 text-xs text-[#64736D]">{subtitle}</p>
            </div>
          ))}
        </section>

        <section className="mt-6 rounded-2xl border border-[#E8DDCB] bg-white p-5 shadow-sm">
          <form className="grid gap-4 lg:grid-cols-6">
            <input name="busca" defaultValue={busca} className="rounded-xl border border-[#E8DDCB] px-4 py-3 text-sm text-[#071E36] outline-none focus:border-[#C89B3C] lg:col-span-2" placeholder="Nome, telefone, WhatsApp ou email" />
            <input name="cidade" defaultValue={cidade} className="rounded-xl border border-[#E8DDCB] px-4 py-3 text-sm text-[#071E36] outline-none focus:border-[#C89B3C]" placeholder="Cidade" />
            <select name="status" defaultValue={status} className="rounded-xl border border-[#E8DDCB] bg-white px-4 py-3 text-sm text-[#071E36] outline-none focus:border-[#C89B3C]">
              <option value="">Status</option>
              {statusInquilinos.map((item) => (
                <option key={item} value={item}>{item.replaceAll("_", " ")}</option>
              ))}
            </select>
            <select name="temperatura" defaultValue={temperatura} className="rounded-xl border border-[#E8DDCB] bg-white px-4 py-3 text-sm text-[#071E36] outline-none focus:border-[#C89B3C]">
              <option value="">Temperatura</option>
              {["frio", "morno", "quente"].map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
            <button className="rounded-xl bg-[#071E36] px-5 py-3 text-sm font-semibold text-white hover:bg-[#0A2A4A]">
              Filtrar
            </button>
            <Link href="/dashboard/inquilinos" className="rounded-xl border border-[#E8DDCB] px-5 py-3 text-center text-sm font-semibold text-[#071E36] hover:bg-[#F7F3ED]">
              Limpar
            </Link>
          </form>
        </section>

        {inquilinoVisualizado ? (
          <section className="mt-6 rounded-2xl border border-[#C89B3C]/35 bg-[#071E36] p-6 text-white">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#E1B866]">
              Visualizacao
            </p>
            <h2 className="mt-2 text-2xl font-bold">{inquilinoVisualizado.nome}</h2>
            <p className="mt-2 text-white/70">
              {telefonePrincipal(inquilinoVisualizado) || "Sem telefone"} ·{" "}
              {inquilinoVisualizado.email || "Sem email"}
            </p>
          </section>
        ) : null}

        <section className="mt-6 rounded-2xl border border-[#E8DDCB] bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-[#071E36]">
            {inquilinoEmEdicao ? "Editar inquilino" : "Novo inquilino"}
          </h2>
          {mensagemErro ? (
            <p className="mt-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {mensagemErro}
            </p>
          ) : null}
          <DocumentUniqueForm
            action={salvarInquilino}
            className="mt-5 grid gap-5 md:grid-cols-3"
            currentId={inquilinoEmEdicao?.id ?? ""}
            documentosAtivos={documentosAtivos}
          >
            <input type="hidden" name="id" value={inquilinoEmEdicao?.id ?? ""} />
            {[
              ["Nome", "nome", inquilinoEmEdicao?.nome, "text"],
              ["Telefone", "telefone", inquilinoEmEdicao?.telefone, "tel"],
              ["WhatsApp", "whatsapp", inquilinoEmEdicao?.whatsapp, "tel"],
              ["E-mail", "email", inquilinoEmEdicao?.email, "email"],
              ["CPF/CNPJ", "cpf_cnpj", inquilinoEmEdicao?.cpf_cnpj, "text"],
              ["Faixa aluguel", "faixa_aluguel", "", "number"],
              ["Quartos desejados", "quartos_desejados", "", "number"],
              ["Imovel relacionado", "imovel_relacionado", "", "text"],
              ["Score relacionamento", "score_relacionamento", inquilinoEmEdicao?.score_relacionamento, "number"],
            ].map(([label, name, value, type]) => (
              <label key={String(name)} className="grid gap-2 text-sm font-medium text-[#102A27]">
                {label}
                <input name={String(name)} type={String(type)} defaultValue={String(value ?? "")} className="rounded-xl border border-[#E8DDCB] px-4 py-3 text-[#071E36] outline-none focus:border-[#C89B3C]" />
              </label>
            ))}
            <label className="grid gap-2 text-sm font-medium text-[#102A27]">
              Tipo pessoa
              <select name="tipo_pessoa" defaultValue={inquilinoEmEdicao?.tipo_pessoa ?? "fisica"} className="rounded-xl border border-[#E8DDCB] bg-white px-4 py-3 text-[#071E36] outline-none focus:border-[#C89B3C]">
                <option value="fisica">fisica</option>
                <option value="juridica">juridica</option>
              </select>
            </label>
            <label className="grid gap-2 text-sm font-medium text-[#102A27]">
              Status
              <select name="status" defaultValue={inquilinoEmEdicao?.status ?? "prospect"} className="rounded-xl border border-[#E8DDCB] bg-white px-4 py-3 text-[#071E36] outline-none focus:border-[#C89B3C]">
                {statusInquilinos.map((item) => (
                  <option key={item} value={item}>{item.replaceAll("_", " ")}</option>
                ))}
              </select>
            </label>
            <label className="grid gap-2 text-sm font-medium text-[#102A27]">
              Temperatura
              <select name="temperatura" defaultValue={inquilinoEmEdicao?.temperatura ?? ""} className="rounded-xl border border-[#E8DDCB] bg-white px-4 py-3 text-[#071E36] outline-none focus:border-[#C89B3C]">
                <option value="">Sem temperatura</option>
                {["frio", "morno", "quente"].map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-3 rounded-xl border border-[#E8DDCB] px-4 py-3 text-sm font-medium text-[#102A27]">
              <input name="possui_pet" type="checkbox" className="size-4 accent-[#C89B3C]" />
              Possui pet
            </label>
            <label className="grid gap-2 text-sm font-medium text-[#102A27] md:col-span-3">
              Observacoes
              <textarea name="observacoes" rows={4} defaultValue={inquilinoEmEdicao?.observacoes ?? ""} className="rounded-xl border border-[#E8DDCB] px-4 py-3 text-[#071E36] outline-none focus:border-[#C89B3C]" />
            </label>
            <div className="md:col-span-3">
              <AddressFields
                defaultValues={{
                  cep: inquilinoEmEdicao?.cep,
                  endereco: inquilinoEmEdicao?.endereco,
                  numero: inquilinoEmEdicao?.numero,
                  complemento: inquilinoEmEdicao?.complemento,
                  bairro: inquilinoEmEdicao?.bairro,
                  cidade: inquilinoEmEdicao?.cidade,
                  estado: inquilinoEmEdicao?.estado,
                }}
              />
            </div>
            <div className="md:col-span-3">
              <button type="submit" className="rounded-xl bg-[#071E36] px-5 py-3 text-sm font-semibold text-white hover:bg-[#0A2A4A]">
                {inquilinoEmEdicao ? "Salvar alteracoes" : "Salvar inquilino"}
              </button>
              {inquilinoEmEdicao ? (
                <Link href="/dashboard/inquilinos" className="ml-3 inline-flex rounded-xl border border-[#E8DDCB] px-5 py-3 text-sm font-semibold text-[#071E36] hover:bg-[#F7F3ED]">
                  Cancelar
                </Link>
              ) : null}
            </div>
          </DocumentUniqueForm>
        </section>

        <section className="mt-6 grid gap-5 lg:grid-cols-3">
          {pessoasResult.error ? (
            <p className="rounded-2xl border border-red-100 bg-red-50 p-6 text-sm text-red-700 lg:col-span-3">
              Nao foi possivel carregar inquilinos.
            </p>
          ) : inquilinosFiltrados.length === 0 ? (
            <p className="rounded-2xl border border-[#E8DDCB] bg-white p-8 text-center text-sm text-[#64736D] lg:col-span-3">
              Nenhum inquilino encontrado.
            </p>
          ) : (
            inquilinosFiltrados.map((inquilino) => (
              <article key={inquilino.id} className="rounded-2xl border border-[#E8DDCB] bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-bold text-[#071E36]">{inquilino.nome}</h2>
                    <p className="mt-1 text-sm text-[#64736D]">
                      {telefonePrincipal(inquilino) || "Sem telefone"} · {inquilino.email || "Sem email"}
                    </p>
                  </div>
                  <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${badgeClass(inquilino.temperatura)}`}>
                    {inquilino.temperatura || "sem temp."}
                  </span>
                </div>
                <div className="mt-4 grid gap-2 text-sm text-[#102A27]">
                  <p>{[inquilino.cidade, inquilino.bairro].filter(Boolean).join(" / ") || "Cidade nao informada"}</p>
                  <p>Imovel relacionado: <strong>placeholder</strong></p>
                  <p>Responsavel: aguardando vinculo canonico</p>
                  <p>Score: {inquilino.score_relacionamento ?? 0}</p>
                  <p>Status: {inquilino.status || "prospect"}</p>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Link href={`/dashboard/inquilinos?view=${inquilino.id}`} className="rounded-full border border-[#E8DDCB] px-3 py-1 text-xs font-semibold text-[#071E36] hover:bg-[#F7F3ED]">Visualizar</Link>
                  <Link href={`/dashboard/inquilinos?edit=${inquilino.id}`} className="rounded-full border border-[#E8DDCB] px-3 py-1 text-xs font-semibold text-[#071E36] hover:bg-[#F7F3ED]">Editar</Link>
                  <form action={excluirInquilino}>
                    <input type="hidden" name="id" value={inquilino.id} />
                    <ConfirmSubmitButton message="Confirmar exclusao logica deste inquilino?" className="rounded-full border border-red-100 bg-red-50 px-3 py-1 text-xs font-semibold text-red-700 hover:bg-red-100">
                      Excluir
                    </ConfirmSubmitButton>
                  </form>
                </div>
              </article>
            ))
          )}
        </section>

        <section className="mt-6 rounded-[2rem] border border-[#C89B3C]/35 bg-[#071E36] p-6 text-white">
          <span className="rounded-full border border-[#E1B866]/40 bg-[#E1B866]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#E1B866]">
            Historico e relacionamento
          </span>
          <p className="mt-4 max-w-3xl text-sm leading-6 text-white/72">
            Este bloco sera usado para UCE Memoria, manutencoes, conflitos,
            pendencias e historico do relacionamento com o inquilino.
          </p>
        </section>
      </div>
    </main>
  );
}
