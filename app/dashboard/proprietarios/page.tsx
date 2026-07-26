import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { AddressFields } from "../../../components/AddressFields";
import { ConfirmSubmitButton } from "../../../components/ConfirmSubmitButton";
import { DocumentUniqueForm } from "../../../components/DocumentUniqueForm";
import { requireActiveProfile } from "../../../lib/auth/access-profile";
import {
  addPapel,
  hasPapel,
  isOnlyPapel,
  removePapel,
} from "../../../lib/crm/pessoas/papeis";
import { supabase } from "../../../lib/supabase";
import {
  formatarCNPJ,
  formatarCPF,
  limparDocumento,
  validarCNPJ,
  validarCPF,
} from "../../../lib/utils/validators";

type Proprietario = {
  id: string;
  nome: string;
  tipo_pessoa: string | null;
  cpf_cnpj: string | null;
  telefone: string | null;
  celular: string | null;
  whatsapp: string | null;
  email: string | null;
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
  observacoes: string | null;
  papeis: string[] | null;
  created_at: string | null;
};

type Corretor = {
  id: string;
  nome: string;
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

function telefonePrincipal(pessoa: Proprietario) {
  return pessoa.whatsapp || pessoa.celular || pessoa.telefone;
}

function badgeClass(value: string | null | undefined) {
  if (value === "quente" || value === "estrategico") {
    return "bg-[#C89B3C]/15 text-[#8B6827] border-[#C89B3C]/25";
  }

  if (value === "inativo" || value === "frio") {
    return "bg-slate-100 text-slate-600 border-slate-200";
  }

  return "bg-[#071E36]/8 text-[#071E36] border-[#071E36]/10";
}

export default async function ProprietariosPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const editId = paramValue(resolvedSearchParams, "edit") ?? "";
  const viewId = paramValue(resolvedSearchParams, "view") ?? "";
  const busca = paramValue(resolvedSearchParams, "busca") ?? "";
  const cidade = paramValue(resolvedSearchParams, "cidade") ?? "";
  const status = paramValue(resolvedSearchParams, "status") ?? "";
  const responsavel = paramValue(resolvedSearchParams, "responsavel") ?? "";
  const temperatura = paramValue(resolvedSearchParams, "temperatura") ?? "";
  const errorCode = paramValue(resolvedSearchParams, "error") ?? "";

  async function salvarProprietario(formData: FormData) {
    "use server";
    await requireActiveProfile();

    const id = valorTexto(formData, "id");
    const nome = valorTexto(formData, "nome");

    if (!nome) {
      throw new Error("O nome do proprietario e obrigatorio.");
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
        Proprietario,
        "id" | "cpf_cnpj"
      >[]).some(
        (pessoa) =>
          pessoa.id !== id &&
          limparDocumento(pessoa.cpf_cnpj ?? "") === limparDocumento(documento),
      );

      if (documentoDuplicado) {
        redirect("/dashboard/proprietarios?error=documento_duplicado");
      }
    }

    const { data: pessoaAtual } = id
      ? await supabase.from("pessoas").select("papeis").eq("id", id).single()
      : { data: null };

    const payload = {
      nome,
      tipo_pessoa: tipoPessoa,
      cpf_cnpj: documento
        ? tipoPessoa === "juridica"
          ? formatarCNPJ(documento)
          : formatarCPF(documento)
        : null,
      telefone: valorTexto(formData, "telefone") || null,
      whatsapp: valorTexto(formData, "whatsapp") || valorTexto(formData, "telefone") || null,
      email: valorTexto(formData, "email") || null,
      cep: valorTexto(formData, "cep") || null,
      endereco: valorTexto(formData, "endereco") || null,
      numero: valorTexto(formData, "numero") || null,
      complemento: valorTexto(formData, "complemento") || null,
      cidade: valorTexto(formData, "cidade") || null,
      bairro: valorTexto(formData, "bairro") || null,
      estado: valorTexto(formData, "estado") || null,
      status: valorTexto(formData, "status") || "ativo",
      temperatura: valorTexto(formData, "temperatura") || null,
      responsavel_id: valorTexto(formData, "responsavel_id") || null,
      score_relacionamento: valorNumero(formData, "score_relacionamento"),
      observacoes: valorTexto(formData, "observacoes") || null,
      papeis: addPapel(
        (pessoaAtual as { papeis?: string[] | null } | null)?.papeis,
        "proprietario",
      ),
      origem: "manual",
      ativo: true,
      updated_at: new Date().toISOString(),
    };

    const { error } = id
      ? await supabase.from("pessoas").update(payload).eq("id", id)
      : await supabase.from("pessoas").insert(payload);

    if (error) {
      const mensagem = `${error.message ?? ""} ${error.code ?? ""}`.toLowerCase();
      if (
        mensagem.includes("cpf") ||
        mensagem.includes("cnpj") ||
        mensagem.includes("unique") ||
        mensagem.includes("duplicate")
      ) {
        redirect("/dashboard/proprietarios?error=documento_indice");
      }

      throw new Error("Nao foi possivel salvar o proprietario.");
    }

    revalidatePath("/dashboard/proprietarios");
    revalidatePath("/dashboard");
    redirect("/dashboard/proprietarios");
  }

  async function excluirProprietario(formData: FormData) {
    "use server";
    await requireActiveProfile();

    const id = valorTexto(formData, "id");
    if (!id) throw new Error("Proprietario nao informado.");

    const { data: pessoa, error: pessoaError } = await supabase
      .from("pessoas")
      .select("papeis")
      .eq("id", id)
      .single();

    if (pessoaError) throw new Error("Nao foi possivel localizar o proprietario.");

    const papeis = (pessoa as { papeis?: string[] | null }).papeis;
    const payload = isOnlyPapel(papeis, "proprietario")
      ? { ativo: false, updated_at: new Date().toISOString() }
      : {
          papeis: removePapel(papeis, "proprietario"),
          updated_at: new Date().toISOString(),
        };

    const { error } = await supabase.from("pessoas").update(payload).eq("id", id);
    if (error) throw new Error("Nao foi possivel excluir logicamente o proprietario.");

    revalidatePath("/dashboard/proprietarios");
    revalidatePath("/dashboard");
  }

  const [pessoasResult, corretoresResult] = await Promise.all([
    supabase
      .from("pessoas")
      .select(
        "id, nome, tipo_pessoa, cpf_cnpj, telefone, celular, whatsapp, email, cep, endereco, numero, complemento, cidade, bairro, estado, status, temperatura, score_relacionamento, responsavel_id, observacoes, papeis, created_at",
      )
      .eq("ativo", true)
      .order("created_at", { ascending: false }),
    supabase.from("corretores").select("id, nome").eq("ativo", true).order("nome"),
  ]);

  const corretores = (corretoresResult.data ?? []) as Corretor[];
  const corretoresPorId = new Map(corretores.map((corretor) => [corretor.id, corretor.nome]));
  const proprietarios = ((pessoasResult.data ?? []) as Proprietario[]).filter((pessoa) =>
    hasPapel(pessoa, "proprietario"),
  );
  const documentosAtivos = ((pessoasResult.data ?? []) as Proprietario[])
    .filter((pessoa) => pessoa.cpf_cnpj)
    .map((pessoa) => ({ id: pessoa.id, cpf_cnpj: pessoa.cpf_cnpj }));
  const proprietariosFiltrados = proprietarios.filter((pessoa) => {
    const texto = normalizar(
      [pessoa.nome, telefonePrincipal(pessoa), pessoa.email, pessoa.cidade, pessoa.bairro].join(" "),
    );

    return (
      (!busca || texto.includes(normalizar(busca))) &&
      (!cidade || normalizar(pessoa.cidade).includes(normalizar(cidade))) &&
      (!status || pessoa.status === status) &&
      (!responsavel || pessoa.responsavel_id === responsavel) &&
      (!temperatura || pessoa.temperatura === temperatura)
    );
  });
  const proprietarioEmEdicao =
    proprietarios.find((proprietario) => proprietario.id === editId) ?? null;
  const proprietarioVisualizado =
    proprietarios.find((proprietario) => proprietario.id === viewId) ?? null;
  const mensagemErro =
    errorCode === "documento_duplicado"
      ? "Ja existe uma pessoa ativa cadastrada com este CPF/CNPJ."
      : errorCode === "documento_indice"
        ? "Nao foi possivel salvar. Este CPF/CNPJ ja esta cadastrado em outra pessoa ativa."
        : "";
  const ativos = proprietarios.filter((pessoa) => pessoa.status !== "inativo").length;
  const quentes = proprietarios.filter(
    (pessoa) => pessoa.temperatura === "quente" || pessoa.temperatura === "estrategico",
  ).length;

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
          <h1 className="mt-5 text-4xl font-bold text-[#071E36]">Proprietarios</h1>
          <p className="mt-2 max-w-3xl text-[#64736D]">
            Visao operacional de Pessoas com papel proprietario, mantendo o cadastro
            matriz como fonte unica do relacionamento.
          </p>
        </header>

        <section className="mt-8 grid gap-4 md:grid-cols-5">
          {[
            ["Total", proprietarios.length, "proprietarios na matriz"],
            ["Ativos", ativos, "com relacionamento ativo"],
            ["Com imoveis", 0, "placeholder de vinculos"],
            ["Aguardando retorno", 0, "retornos pendentes"],
            ["Quentes", quentes, "perfil estrategico"],
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
              {["ativo", "em_atendimento", "aguardando_retorno", "inativo"].map((item) => (
                <option key={item} value={item}>{item.replaceAll("_", " ")}</option>
              ))}
            </select>
            <select name="responsavel" defaultValue={responsavel} className="rounded-xl border border-[#E8DDCB] bg-white px-4 py-3 text-sm text-[#071E36] outline-none focus:border-[#C89B3C]">
              <option value="">Responsavel</option>
              {corretores.map((corretor) => (
                <option key={corretor.id} value={corretor.id}>{corretor.nome}</option>
              ))}
            </select>
            <select name="temperatura" defaultValue={temperatura} className="rounded-xl border border-[#E8DDCB] bg-white px-4 py-3 text-sm text-[#071E36] outline-none focus:border-[#C89B3C]">
              <option value="">Temperatura</option>
              {["frio", "morno", "quente", "estrategico"].map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
            <button className="rounded-xl bg-[#071E36] px-5 py-3 text-sm font-semibold text-white hover:bg-[#0A2A4A]">
              Filtrar
            </button>
            <Link href="/dashboard/proprietarios" className="rounded-xl border border-[#E8DDCB] px-5 py-3 text-center text-sm font-semibold text-[#071E36] hover:bg-[#F7F3ED]">
              Limpar
            </Link>
          </form>
        </section>

        {proprietarioVisualizado ? (
          <section className="mt-6 rounded-2xl border border-[#C89B3C]/35 bg-[#071E36] p-6 text-white">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#E1B866]">
              Visualizacao
            </p>
            <h2 className="mt-2 text-2xl font-bold">{proprietarioVisualizado.nome}</h2>
            <p className="mt-2 text-white/70">
              {telefonePrincipal(proprietarioVisualizado) || "Sem telefone"} ·{" "}
              {proprietarioVisualizado.email || "Sem email"}
            </p>
          </section>
        ) : null}

        <section className="mt-6 rounded-2xl border border-[#E8DDCB] bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-[#071E36]">
            {proprietarioEmEdicao ? "Editar proprietario" : "Novo proprietario"}
          </h2>
          {mensagemErro ? (
            <p className="mt-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {mensagemErro}
            </p>
          ) : null}
          <DocumentUniqueForm
            action={salvarProprietario}
            className="mt-5 grid gap-5 md:grid-cols-3"
            currentId={proprietarioEmEdicao?.id ?? ""}
            documentosAtivos={documentosAtivos}
          >
            <input type="hidden" name="id" value={proprietarioEmEdicao?.id ?? ""} />
            {[
              ["Nome", "nome", proprietarioEmEdicao?.nome, "text"],
              ["CPF/CNPJ", "cpf_cnpj", proprietarioEmEdicao?.cpf_cnpj, "text"],
              ["Telefone", "telefone", proprietarioEmEdicao?.telefone, "tel"],
              ["WhatsApp", "whatsapp", proprietarioEmEdicao?.whatsapp, "tel"],
              ["E-mail", "email", proprietarioEmEdicao?.email, "email"],
              ["Score relacionamento", "score_relacionamento", proprietarioEmEdicao?.score_relacionamento, "number"],
            ].map(([label, name, value, type]) => (
              <label key={String(name)} className="grid gap-2 text-sm font-medium text-[#102A27]">
                {label}
                <input name={String(name)} type={String(type)} defaultValue={String(value ?? "")} className="rounded-xl border border-[#E8DDCB] px-4 py-3 text-[#071E36] outline-none focus:border-[#C89B3C]" />
              </label>
            ))}
            <label className="grid gap-2 text-sm font-medium text-[#102A27]">
              Tipo pessoa
              <select name="tipo_pessoa" defaultValue={proprietarioEmEdicao?.tipo_pessoa ?? "fisica"} className="rounded-xl border border-[#E8DDCB] bg-white px-4 py-3 text-[#071E36] outline-none focus:border-[#C89B3C]">
                <option value="fisica">fisica</option>
                <option value="juridica">juridica</option>
              </select>
            </label>
            <label className="grid gap-2 text-sm font-medium text-[#102A27]">
              Status
              <select name="status" defaultValue={proprietarioEmEdicao?.status ?? "ativo"} className="rounded-xl border border-[#E8DDCB] bg-white px-4 py-3 text-[#071E36] outline-none focus:border-[#C89B3C]">
                {["ativo", "em_atendimento", "aguardando_retorno", "inativo"].map((item) => (
                  <option key={item} value={item}>{item.replaceAll("_", " ")}</option>
                ))}
              </select>
            </label>
            <label className="grid gap-2 text-sm font-medium text-[#102A27]">
              Temperatura
              <select name="temperatura" defaultValue={proprietarioEmEdicao?.temperatura ?? ""} className="rounded-xl border border-[#E8DDCB] bg-white px-4 py-3 text-[#071E36] outline-none focus:border-[#C89B3C]">
                <option value="">Sem temperatura</option>
                {["frio", "morno", "quente", "estrategico"].map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </label>
            <label className="grid gap-2 text-sm font-medium text-[#102A27]">
              Responsavel
              <select name="responsavel_id" defaultValue={proprietarioEmEdicao?.responsavel_id ?? ""} className="rounded-xl border border-[#E8DDCB] bg-white px-4 py-3 text-[#071E36] outline-none focus:border-[#C89B3C]">
                <option value="">Sem responsavel</option>
                {corretores.map((corretor) => (
                  <option key={corretor.id} value={corretor.id}>{corretor.nome}</option>
                ))}
              </select>
            </label>
            <label className="grid gap-2 text-sm font-medium text-[#102A27] md:col-span-3">
              Observacoes
              <textarea name="observacoes" rows={4} defaultValue={proprietarioEmEdicao?.observacoes ?? ""} className="rounded-xl border border-[#E8DDCB] px-4 py-3 text-[#071E36] outline-none focus:border-[#C89B3C]" />
            </label>
            <div className="md:col-span-3">
              <AddressFields
                defaultValues={{
                  cep: proprietarioEmEdicao?.cep,
                  endereco: proprietarioEmEdicao?.endereco,
                  numero: proprietarioEmEdicao?.numero,
                  complemento: proprietarioEmEdicao?.complemento,
                  bairro: proprietarioEmEdicao?.bairro,
                  cidade: proprietarioEmEdicao?.cidade,
                  estado: proprietarioEmEdicao?.estado,
                }}
              />
            </div>
            <div className="md:col-span-3">
              <button type="submit" className="rounded-xl bg-[#071E36] px-5 py-3 text-sm font-semibold text-white hover:bg-[#0A2A4A]">
                {proprietarioEmEdicao ? "Salvar alteracoes" : "Salvar proprietario"}
              </button>
              {proprietarioEmEdicao ? (
                <Link href="/dashboard/proprietarios" className="ml-3 inline-flex rounded-xl border border-[#E8DDCB] px-5 py-3 text-sm font-semibold text-[#071E36] hover:bg-[#F7F3ED]">
                  Cancelar
                </Link>
              ) : null}
            </div>
          </DocumentUniqueForm>
        </section>

        <section className="mt-6 grid gap-5 lg:grid-cols-3">
          {pessoasResult.error ? (
            <p className="rounded-2xl border border-red-100 bg-red-50 p-6 text-sm text-red-700 lg:col-span-3">
              Nao foi possivel carregar proprietarios.
            </p>
          ) : proprietariosFiltrados.length === 0 ? (
            <p className="rounded-2xl border border-[#E8DDCB] bg-white p-8 text-center text-sm text-[#64736D] lg:col-span-3">
              Nenhum proprietario encontrado.
            </p>
          ) : (
            proprietariosFiltrados.map((proprietario) => (
              <article key={proprietario.id} className="rounded-2xl border border-[#E8DDCB] bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-bold text-[#071E36]">{proprietario.nome}</h2>
                    <p className="mt-1 text-sm text-[#64736D]">
                      {telefonePrincipal(proprietario) || "Sem telefone"} · {proprietario.email || "Sem email"}
                    </p>
                  </div>
                  <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${badgeClass(proprietario.temperatura)}`}>
                    {proprietario.temperatura || "sem temp."}
                  </span>
                </div>
                <div className="mt-4 grid gap-2 text-sm text-[#102A27]">
                  <p>{[proprietario.cidade, proprietario.bairro].filter(Boolean).join(" / ") || "Cidade nao informada"}</p>
                  <p>Imoveis vinculados: <strong>placeholder</strong></p>
                  <p>Responsavel: {corretoresPorId.get(proprietario.responsavel_id ?? "") || "-"}</p>
                  <p>Score: {proprietario.score_relacionamento ?? 0}</p>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Link href={`/dashboard/proprietarios?view=${proprietario.id}`} className="rounded-full border border-[#E8DDCB] px-3 py-1 text-xs font-semibold text-[#071E36] hover:bg-[#F7F3ED]">Visualizar</Link>
                  <Link href={`/dashboard/proprietarios?edit=${proprietario.id}`} className="rounded-full border border-[#E8DDCB] px-3 py-1 text-xs font-semibold text-[#071E36] hover:bg-[#F7F3ED]">Editar</Link>
                  <form action={excluirProprietario}>
                    <input type="hidden" name="id" value={proprietario.id} />
                    <ConfirmSubmitButton message="Confirmar exclusao logica deste proprietario?" className="rounded-full border border-red-100 bg-red-50 px-3 py-1 text-xs font-semibold text-red-700 hover:bg-red-100">
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
            UCE Memoria do Proprietario
          </span>
          <p className="mt-4 max-w-3xl text-sm leading-6 text-white/72">
            Em breve, este bloco exibira historico de conversas, manutencoes,
            conflitos, preferencias e riscos relacionados ao proprietario.
          </p>
        </section>
      </div>
    </main>
  );
}
