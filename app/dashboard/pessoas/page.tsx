import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Search, UsersRound } from "lucide-react";

import { AddressFields } from "../../../components/AddressFields";
import { ConfirmSubmitButton } from "../../../components/ConfirmSubmitButton";
import {
  DocumentUniqueForm,
  type DocumentFormState,
} from "../../../components/DocumentUniqueForm";
import { requirePermission } from "../../../lib/auth/access-profile";
import { requirePagePermission } from "../../../lib/auth/page-permission";
import {
  isPapelComercial,
  PAPEIS_COMERCIAIS,
} from "../../../lib/crm/pessoas/papeis";
import { createClient } from "../../../lib/supabase/server";
import {
  formatarCNPJ,
  formatarCPF,
  limparDocumento,
  validarCNPJ,
  validarCPF,
} from "../../../lib/utils/validators";

type SearchParams = Record<string, string | string[] | undefined>;

type Pessoa = {
  id: string;
  nome: string;
  tipo_pessoa: string | null;
  cpf_cnpj: string | null;
  rg_ie: string | null;
  data_nascimento: string | null;
  estado_civil: string | null;
  profissao: string | null;
  email: string | null;
  telefone: string | null;
  celular: string | null;
  whatsapp: string | null;
  cep: string | null;
  endereco: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  estado: string | null;
  papeis: string[] | null;
  origem: string | null;
  status: string | null;
  responsavel_id: string | null;
  temperatura: string | null;
  score_relacionamento: number | null;
  perfil_comportamental: string | null;
  resumo_uce: string | null;
  observacoes_uce: string | null;
  observacoes: string | null;
  created_at: string | null;
};

const papeisDisponiveis = PAPEIS_COMERCIAIS;
const statusOptions = ["ativo", "em_atendimento", "inativo", "bloqueado"];
const temperaturas = ["frio", "morno", "quente"];
const tiposPessoa = ["fisica", "juridica"];

function paramValue(searchParams: SearchParams, key: string) {
  const value = searchParams[key];
  return Array.isArray(value) ? value[0] : value;
}

function valorTexto(formData: FormData, campo: string) {
  return String(formData.get(campo) ?? "").trim();
}

function valorOpcional(formData: FormData, campo: string) {
  const valor = valorTexto(formData, campo);
  return valor || null;
}

function valorInteiro(formData: FormData, campo: string) {
  const valor = valorTexto(formData, campo);
  if (!valor) return 0;

  const numero = Number(valor);
  return Number.isFinite(numero) ? Math.trunc(numero) : 0;
}

function papeisSelecionados(formData: FormData) {
  const papeis = formData
    .getAll("papeis")
    .map((papel) => String(papel).trim())
    .filter(Boolean);

  if (!papeis.every(isPapelComercial)) return null;
  return Array.from(new Set(papeis));
}

function uuidValido(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function labelTexto(valor: string | null | undefined) {
  if (!valor) return "-";
  return valor.replaceAll("_", " ");
}

function formatarData(data: string | null) {
  if (!data) return "";
  return data.slice(0, 10);
}

function badgePapelClassName(papel: string) {
  const map: Record<string, string> = {
    proprietario: "bg-[#071E36] text-[#E1B866]",
    inquilino: "bg-emerald-50 text-emerald-700",
    comprador: "bg-sky-50 text-sky-700",
    vendedor: "bg-amber-50 text-amber-700",
    corretor: "bg-violet-50 text-violet-700",
    parceiro: "bg-indigo-50 text-indigo-700",
    prestador: "bg-slate-100 text-slate-700",
    investidor: "bg-red-50 text-red-700",
  };

  return `rounded-full px-3 py-1 text-xs font-semibold ${
    map[papel] ?? "bg-[#F7F3ED] text-[#64736D]"
  }`;
}

function temperaturaClassName(temperatura: string | null) {
  const map: Record<string, string> = {
    frio: "bg-slate-100 text-slate-700",
    morno: "bg-amber-50 text-amber-700",
    quente: "bg-red-50 text-red-700",
  };

  return `rounded-full px-3 py-1 text-xs font-semibold ${
    map[temperatura ?? ""] ?? "bg-[#F7F3ED] text-[#64736D]"
  }`;
}

function sanitizeSearchTerm(term: string) {
  return term.replace(/[%,]/g, " ").trim();
}

export default async function PessoasPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  await requirePagePermission("pessoas.visualizar");
  const supabase = await createClient();

  const resolvedSearchParams = (await searchParams) ?? {};
  const editId = paramValue(resolvedSearchParams, "edit") ?? "";
  const filtroPapel = paramValue(resolvedSearchParams, "papel") ?? "";
  const filtroStatus = paramValue(resolvedSearchParams, "status") ?? "";
  const filtroTemperatura = paramValue(resolvedSearchParams, "temperatura") ?? "";
  const busca = paramValue(resolvedSearchParams, "busca") ?? "";
  const errorCode = paramValue(resolvedSearchParams, "error") ?? "";
  const papelSolicitado = paramValue(resolvedSearchParams, "papel") ?? "";
  const papelInicial = isPapelComercial(papelSolicitado) ? papelSolicitado : "";

  async function salvarPessoa(formData: FormData): Promise<DocumentFormState> {
    "use server";
    const id = valorTexto(formData, "id");
    try {
      await requirePermission(id ? "pessoas.editar" : "pessoas.criar");
    } catch {
      return {
        status: "erro",
        mensagem: "Voce nao possui permissao para realizar esta operacao.",
      };
    }

    if (id && !uuidValido(id)) {
      return { status: "erro", mensagem: "A pessoa informada nao foi encontrada." };
    }

    let supabase;
    try {
      supabase = await createClient();
    } catch (error) {
      console.error("Falha ao preparar persistencia de Pessoa.", {
        module: "pessoas.salvar",
        stage: "client",
        code: error instanceof Error ? error.name : "unknown_error",
      });
      return {
        status: "erro",
        mensagem: "Nao foi possivel salvar. Tente novamente.",
      };
    }
    const nome = valorTexto(formData, "nome");

    if (!nome) {
      return { status: "erro", mensagem: "O nome da pessoa e obrigatorio." };
    }

    const papeis = papeisSelecionados(formData);
    if (papeis === null) {
      return { status: "erro", mensagem: "Um dos papeis comerciais informados e invalido." };
    }

    const tipoPessoa = valorTexto(formData, "tipo_pessoa") || "fisica";
    const documento = valorTexto(formData, "cpf_cnpj");

    if (documento) {
      const documentoValido =
        tipoPessoa === "juridica" ? validarCNPJ(documento) : validarCPF(documento);

      if (!documentoValido) {
        return {
          status: "erro",
          mensagem: tipoPessoa === "juridica" ? "CNPJ invalido." : "CPF invalido.",
        };
      }

      const { data: pessoasAtivas, error: documentoError } = await supabase
        .from("pessoas")
        .select("id, cpf_cnpj")
        .eq("ativo", true);

      if (documentoError) {
        console.error("Falha ao validar documento de Pessoa.", {
          module: "pessoas.salvar",
          stage: "document_validation",
          code: documentoError.code,
        });
        return {
          status: "erro",
          mensagem: "Nao foi possivel salvar. Tente novamente.",
        };
      }

      const documentoDuplicado = ((pessoasAtivas ?? []) as Pick<
        Pessoa,
        "id" | "cpf_cnpj"
      >[]).some(
        (pessoa) =>
          pessoa.id !== id &&
          limparDocumento(pessoa.cpf_cnpj ?? "") === limparDocumento(documento),
      );

      if (documentoDuplicado) {
        return {
          status: "erro",
          mensagem: "Ja existe uma pessoa ativa cadastrada com este CPF/CNPJ.",
        };
      }
    }

    const payload = {
      nome,
      tipo_pessoa: tipoPessoa,
      cpf_cnpj: documento
        ? tipoPessoa === "juridica"
          ? formatarCNPJ(documento)
          : formatarCPF(documento)
        : null,
      rg_ie: valorOpcional(formData, "rg_ie"),
      data_nascimento: valorOpcional(formData, "data_nascimento"),
      estado_civil: valorOpcional(formData, "estado_civil"),
      profissao: valorOpcional(formData, "profissao"),
      email: valorOpcional(formData, "email"),
      telefone: valorOpcional(formData, "telefone"),
      celular: valorOpcional(formData, "celular"),
      whatsapp: valorOpcional(formData, "whatsapp"),
      cep: valorOpcional(formData, "cep"),
      endereco: valorOpcional(formData, "endereco"),
      numero: valorOpcional(formData, "numero"),
      complemento: valorOpcional(formData, "complemento"),
      bairro: valorOpcional(formData, "bairro"),
      cidade: valorOpcional(formData, "cidade"),
      estado: valorOpcional(formData, "estado"),
      papeis,
      origem: valorTexto(formData, "origem") || "manual",
      status: valorTexto(formData, "status") || "ativo",
      responsavel_id: null,
      temperatura: valorOpcional(formData, "temperatura"),
      score_relacionamento: valorInteiro(formData, "score_relacionamento"),
      perfil_comportamental: valorOpcional(formData, "perfil_comportamental"),
      resumo_uce: valorOpcional(formData, "resumo_uce"),
      observacoes_uce: valorOpcional(formData, "observacoes_uce"),
      observacoes: valorOpcional(formData, "observacoes"),
      updated_at: new Date().toISOString(),
    };

    const { data: pessoaSalva, error } = id
      ? await supabase.from("pessoas").update(payload).eq("id", id).select("id").maybeSingle()
      : await supabase.from("pessoas").insert(payload).select("id").single();

    if (error) {
      console.error("Falha ao persistir Pessoa.", {
        module: "pessoas.salvar",
        stage: id ? "update" : "insert",
        code: error.code,
      });
      if (error.code === "23505") {
        return {
          status: "erro",
          mensagem: "Ja existe uma pessoa cadastrada com este CPF/CNPJ.",
        };
      }

      if (error.code === "42501") {
        return {
          status: "erro",
          mensagem: "Voce nao possui permissao para realizar esta operacao.",
        };
      }

      return {
        status: "erro",
        mensagem: "Nao foi possivel salvar. Tente novamente.",
      };
    }

    if (!pessoaSalva?.id) {
      return {
        status: "erro",
        mensagem: id
          ? "A pessoa informada nao foi encontrada."
          : "Nao foi possivel salvar. Tente novamente.",
      };
    }

    revalidatePath("/dashboard/pessoas");
    redirect("/dashboard/pessoas");
  }

  async function excluirPessoa(formData: FormData) {
    "use server";
    await requirePermission("pessoas.arquivar");
    const supabase = await createClient();

    const id = valorTexto(formData, "id");
    if (!id) throw new Error("Pessoa nao informada.");

    const { error } = await supabase
      .from("pessoas")
      .update({ ativo: false, updated_at: new Date().toISOString() })
      .eq("id", id);

    if (error) {
      throw new Error("Nao foi possivel excluir logicamente a pessoa.");
    }

    revalidatePath("/dashboard/pessoas");
  }

  let pessoasQuery = supabase
    .from("pessoas")
    .select("*")
    .eq("ativo", true)
    .order("created_at", { ascending: false });

  if (filtroPapel) pessoasQuery = pessoasQuery.contains("papeis", [filtroPapel]);
  if (filtroStatus) pessoasQuery = pessoasQuery.eq("status", filtroStatus);
  if (filtroTemperatura) pessoasQuery = pessoasQuery.eq("temperatura", filtroTemperatura);

  const termoBusca = sanitizeSearchTerm(busca);
  if (termoBusca) {
    pessoasQuery = pessoasQuery.or(
      `nome.ilike.%${termoBusca}%,telefone.ilike.%${termoBusca}%,whatsapp.ilike.%${termoBusca}%,email.ilike.%${termoBusca}%,cpf_cnpj.ilike.%${termoBusca}%`,
    );
  }

  const pessoasResult = await pessoasQuery;

  const pessoas = (pessoasResult.data ?? []) as Pessoa[];
  const documentosAtivos = pessoas
    .filter((pessoa) => pessoa.cpf_cnpj)
    .map((pessoa) => ({ id: pessoa.id, cpf_cnpj: pessoa.cpf_cnpj }));
  const pessoaEmEdicao = pessoas.find((pessoa) => pessoa.id === editId) ?? null;
  const mensagemErro =
    errorCode === "documento_duplicado"
      ? "Ja existe uma pessoa ativa cadastrada com este CPF/CNPJ."
      : errorCode === "documento_indice"
        ? "Nao foi possivel salvar. Este CPF/CNPJ ja esta cadastrado em outra pessoa ativa."
        : "";

  return (
    <main className="min-h-screen bg-[#F7F3ED] px-6 py-10 sm:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="rounded-[2rem] border border-[#E8DDCB] bg-white p-6 shadow-sm sm:p-8">
          <span className="rounded-full border border-[#C89B3C]/35 bg-[#C89B3C]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#8B6827]">
            Cadastros
          </span>
          <div className="mt-5 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-4xl font-bold tracking-tight text-[#071E36]">
                Pessoas
              </h1>
              <p className="mt-2 max-w-3xl leading-6 text-[#64736D]">
                Cadastro universal de clientes, proprietarios, inquilinos,
                compradores, vendedores, corretores, parceiros e prestadores.
              </p>
            </div>
            <span className="inline-flex w-fit items-center gap-2 rounded-2xl border border-[#E8DDCB] bg-[#F7F3ED] px-4 py-3 text-sm font-semibold text-[#071E36]">
              <UsersRound size={18} className="text-[#C89B3C]" />
              {pessoas.length} pessoa{pessoas.length === 1 ? "" : "s"}
            </span>
          </div>
        </header>

        {pessoasResult.error ? (
          <p className="mt-6 rounded-xl bg-[#fbebe7] px-4 py-3 text-sm text-[#8a2e1c]">
            Nao foi possivel carregar todos os dados. Verifique se o SQL 014 foi aplicado.
          </p>
        ) : null}

        <section className="mt-6 rounded-3xl border border-[#E8DDCB] bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-[#071E36]">
                {pessoaEmEdicao ? "Editar pessoa" : "Nova pessoa"}
              </h2>
              <p className="mt-1 text-sm text-[#64736D]">
                Uma pessoa pode ter multiplos papeis no CRM.
              </p>
            </div>
            {pessoaEmEdicao ? (
              <Link
                href="/dashboard/pessoas"
                className="w-fit rounded-xl border border-[#E8DDCB] bg-white px-4 py-2 text-sm font-semibold text-[#071E36] transition hover:border-[#C89B3C]/45 hover:bg-[#C89B3C]/10"
              >
                Cancelar edicao
              </Link>
            ) : null}
          </div>

          {mensagemErro ? (
            <p className="mt-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {mensagemErro}
            </p>
          ) : null}

          <DocumentUniqueForm
            action={salvarPessoa}
            className="mt-6 grid gap-6"
            currentId={pessoaEmEdicao?.id ?? ""}
            documentosAtivos={documentosAtivos}
          >
            <input type="hidden" name="id" value={pessoaEmEdicao?.id ?? ""} />

            <fieldset className="grid gap-4 rounded-3xl border border-[#E8DDCB] p-5 md:grid-cols-4">
              <legend className="px-2 text-sm font-semibold text-[#071E36]">
                Dados principais
              </legend>
              <label className="grid gap-2 text-sm font-medium text-[#102A27] md:col-span-2">
                Nome
                <input
                  name="nome"
                  required
                  defaultValue={pessoaEmEdicao?.nome ?? ""}
                  className="rounded-xl border border-[#E8DDCB] px-4 py-3 text-[#071E36] outline-none transition focus:border-[#C89B3C]"
                />
              </label>
              <label className="grid gap-2 text-sm font-medium text-[#102A27]">
                Tipo
                <select
                  name="tipo_pessoa"
                  defaultValue={pessoaEmEdicao?.tipo_pessoa ?? "fisica"}
                  className="rounded-xl border border-[#E8DDCB] bg-white px-4 py-3 text-[#071E36] outline-none transition focus:border-[#C89B3C]"
                >
                  {tiposPessoa.map((tipo) => (
                    <option key={tipo} value={tipo}>
                      {labelTexto(tipo)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-2 text-sm font-medium text-[#102A27]">
                CPF/CNPJ
                <input name="cpf_cnpj" defaultValue={pessoaEmEdicao?.cpf_cnpj ?? ""} className="rounded-xl border border-[#E8DDCB] px-4 py-3 text-[#071E36] outline-none transition focus:border-[#C89B3C]" />
              </label>
              <label className="grid gap-2 text-sm font-medium text-[#102A27]">
                RG/IE
                <input name="rg_ie" defaultValue={pessoaEmEdicao?.rg_ie ?? ""} className="rounded-xl border border-[#E8DDCB] px-4 py-3 text-[#071E36] outline-none transition focus:border-[#C89B3C]" />
              </label>
              <label className="grid gap-2 text-sm font-medium text-[#102A27]">
                Data nascimento
                <input name="data_nascimento" type="date" defaultValue={formatarData(pessoaEmEdicao?.data_nascimento ?? null)} className="rounded-xl border border-[#E8DDCB] px-4 py-3 text-[#071E36] outline-none transition focus:border-[#C89B3C]" />
              </label>
              <label className="grid gap-2 text-sm font-medium text-[#102A27]">
                Estado civil
                <input name="estado_civil" defaultValue={pessoaEmEdicao?.estado_civil ?? ""} className="rounded-xl border border-[#E8DDCB] px-4 py-3 text-[#071E36] outline-none transition focus:border-[#C89B3C]" />
              </label>
              <label className="grid gap-2 text-sm font-medium text-[#102A27]">
                Profissao
                <input name="profissao" defaultValue={pessoaEmEdicao?.profissao ?? ""} className="rounded-xl border border-[#E8DDCB] px-4 py-3 text-[#071E36] outline-none transition focus:border-[#C89B3C]" />
              </label>
            </fieldset>

            <fieldset className="grid gap-4 rounded-3xl border border-[#E8DDCB] p-5 md:grid-cols-4">
              <legend className="px-2 text-sm font-semibold text-[#071E36]">
                Contatos
              </legend>
              {[
                ["email", "E-mail", "email"],
                ["telefone", "Telefone", "tel"],
                ["celular", "Celular", "tel"],
                ["whatsapp", "WhatsApp", "tel"],
              ].map(([name, label, type]) => (
                <label key={name} className="grid gap-2 text-sm font-medium text-[#102A27]">
                  {label}
                  <input
                    name={name}
                    type={type}
                    defaultValue={String(pessoaEmEdicao?.[name as keyof Pessoa] ?? "")}
                    className="rounded-xl border border-[#E8DDCB] px-4 py-3 text-[#071E36] outline-none transition focus:border-[#C89B3C]"
                  />
                </label>
              ))}
            </fieldset>

            <fieldset className="rounded-3xl border border-[#E8DDCB] p-5">
              <legend className="px-2 text-sm font-semibold text-[#071E36]">
                Endereco
              </legend>
              <AddressFields
                defaultValues={{
                  cep: pessoaEmEdicao?.cep,
                  endereco: pessoaEmEdicao?.endereco,
                  numero: pessoaEmEdicao?.numero,
                  complemento: pessoaEmEdicao?.complemento,
                  bairro: pessoaEmEdicao?.bairro,
                  cidade: pessoaEmEdicao?.cidade,
                  estado: pessoaEmEdicao?.estado,
                }}
              />
            </fieldset>

            <fieldset className="rounded-3xl border border-[#E8DDCB] p-5">
              <legend className="px-2 text-sm font-semibold text-[#071E36]">
                Papeis no CRM
              </legend>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {papeisDisponiveis.map((papel) => (
                  <label
                    key={papel}
                    className="flex items-center gap-3 rounded-xl border border-[#E8DDCB] bg-[#fffdfa] px-4 py-3 text-sm font-medium text-[#102A27]"
                  >
                    <input
                      name="papeis"
                      type="checkbox"
                      value={papel}
                      defaultChecked={Boolean(
                        pessoaEmEdicao?.papeis?.includes(papel) || papelInicial === papel,
                      )}
                      className="size-4 accent-[#C89B3C]"
                    />
                    {labelTexto(papel)}
                  </label>
                ))}
              </div>
            </fieldset>

            <fieldset className="grid gap-4 rounded-3xl border border-[#E8DDCB] p-5 md:grid-cols-5">
              <legend className="px-2 text-sm font-semibold text-[#071E36]">
                Relacionamento
              </legend>
              <label className="grid gap-2 text-sm font-medium text-[#102A27]">
                Origem
                <input name="origem" defaultValue={pessoaEmEdicao?.origem ?? "manual"} className="rounded-xl border border-[#E8DDCB] px-4 py-3 text-[#071E36] outline-none transition focus:border-[#C89B3C]" />
              </label>
              <label className="grid gap-2 text-sm font-medium text-[#102A27]">
                Status
                <select name="status" defaultValue={pessoaEmEdicao?.status ?? "ativo"} className="rounded-xl border border-[#E8DDCB] bg-white px-4 py-3 text-[#071E36] outline-none transition focus:border-[#C89B3C]">
                  {statusOptions.map((status) => (
                    <option key={status} value={status}>{labelTexto(status)}</option>
                  ))}
                </select>
              </label>
              <label className="grid gap-2 text-sm font-medium text-[#102A27]">
                Temperatura
                <select name="temperatura" defaultValue={pessoaEmEdicao?.temperatura ?? ""} className="rounded-xl border border-[#E8DDCB] bg-white px-4 py-3 text-[#071E36] outline-none transition focus:border-[#C89B3C]">
                  <option value="">Sem temperatura</option>
                  {temperaturas.map((temperatura) => (
                    <option key={temperatura} value={temperatura}>{labelTexto(temperatura)}</option>
                  ))}
                </select>
              </label>
              <label className="grid gap-2 text-sm font-medium text-[#102A27]">
                Score relacionamento
                <input name="score_relacionamento" type="number" min="0" max="100" defaultValue={pessoaEmEdicao?.score_relacionamento ?? 0} className="rounded-xl border border-[#E8DDCB] px-4 py-3 text-[#071E36] outline-none transition focus:border-[#C89B3C]" />
              </label>
            </fieldset>

            <fieldset className="grid gap-4 rounded-3xl border border-[#E8DDCB] p-5 md:grid-cols-3">
              <legend className="px-2 text-sm font-semibold text-[#071E36]">
                UCE
              </legend>
              <label className="grid gap-2 text-sm font-medium text-[#102A27]">
                Perfil comportamental
                <textarea name="perfil_comportamental" rows={4} defaultValue={pessoaEmEdicao?.perfil_comportamental ?? ""} className="rounded-xl border border-[#E8DDCB] px-4 py-3 text-[#071E36] outline-none transition focus:border-[#C89B3C]" />
              </label>
              <label className="grid gap-2 text-sm font-medium text-[#102A27]">
                Resumo UCE
                <textarea name="resumo_uce" rows={4} defaultValue={pessoaEmEdicao?.resumo_uce ?? ""} className="rounded-xl border border-[#E8DDCB] px-4 py-3 text-[#071E36] outline-none transition focus:border-[#C89B3C]" />
              </label>
              <label className="grid gap-2 text-sm font-medium text-[#102A27]">
                Observacoes UCE
                <textarea name="observacoes_uce" rows={4} defaultValue={pessoaEmEdicao?.observacoes_uce ?? ""} className="rounded-xl border border-[#E8DDCB] px-4 py-3 text-[#071E36] outline-none transition focus:border-[#C89B3C]" />
              </label>
              <label className="grid gap-2 text-sm font-medium text-[#102A27] md:col-span-3">
                Observacoes gerais
                <textarea name="observacoes" rows={4} defaultValue={pessoaEmEdicao?.observacoes ?? ""} className="rounded-xl border border-[#E8DDCB] px-4 py-3 text-[#071E36] outline-none transition focus:border-[#C89B3C]" />
              </label>
            </fieldset>

            <div className="flex flex-wrap gap-3">
              <button type="submit" className="rounded-xl bg-[#071E36] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#0A2A4A]">
                {pessoaEmEdicao ? "Salvar alteracoes" : "Criar pessoa"}
              </button>
              {pessoaEmEdicao ? (
                <Link href="/dashboard/pessoas" className="rounded-xl border border-[#E8DDCB] bg-white px-5 py-3 text-sm font-semibold text-[#071E36] transition hover:border-[#C89B3C]/45 hover:bg-[#C89B3C]/10">
                  Cancelar edicao
                </Link>
              ) : null}
            </div>
          </DocumentUniqueForm>
        </section>

        <section className="mt-6 rounded-3xl border border-[#E8DDCB] bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-[#071E36]">
                Pessoas cadastradas
              </h2>
              <p className="mt-1 text-sm text-[#64736D]">
                Busque por nome, telefone, WhatsApp, email ou CPF/CNPJ.
              </p>
            </div>
            <form className="grid gap-3 md:grid-cols-5" action="/dashboard/pessoas">
              <label className="relative md:col-span-2">
                <Search className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[#64736D]" size={16} />
                <input name="busca" defaultValue={busca} placeholder="Buscar pessoa" className="w-full rounded-xl border border-[#E8DDCB] bg-white py-2.5 pr-3 pl-9 text-sm text-[#071E36] outline-none focus:border-[#C89B3C]" />
              </label>
              <select name="papel" defaultValue={filtroPapel} className="rounded-xl border border-[#E8DDCB] bg-white px-3 py-2.5 text-sm text-[#071E36]">
                <option value="">Todos os papeis</option>
                {papeisDisponiveis.map((papel) => (
                  <option key={papel} value={papel}>{labelTexto(papel)}</option>
                ))}
              </select>
              <select name="status" defaultValue={filtroStatus} className="rounded-xl border border-[#E8DDCB] bg-white px-3 py-2.5 text-sm text-[#071E36]">
                <option value="">Todos os status</option>
                {statusOptions.map((status) => (
                  <option key={status} value={status}>{labelTexto(status)}</option>
                ))}
              </select>
              <select name="temperatura" defaultValue={filtroTemperatura} className="rounded-xl border border-[#E8DDCB] bg-white px-3 py-2.5 text-sm text-[#071E36]">
                <option value="">Temperatura</option>
                {temperaturas.map((temperatura) => (
                  <option key={temperatura} value={temperatura}>{labelTexto(temperatura)}</option>
                ))}
              </select>
              <button type="submit" className="rounded-xl bg-[#071E36] px-4 py-2.5 text-sm font-semibold text-white md:col-span-5 xl:col-span-1">
                Filtrar
              </button>
            </form>
          </div>

          <div className="mt-6 grid gap-4">
            {pessoas.length === 0 ? (
              <p className="rounded-2xl bg-[#F7F3ED] px-4 py-10 text-center text-sm text-[#64736D]">
                Nenhuma pessoa encontrada.
              </p>
            ) : (
              pessoas.map((pessoa) => (
                <article key={pessoa.id} className="rounded-3xl border border-[#E8DDCB] bg-[#fffdfa] p-5 shadow-sm">
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link href={`/dashboard/pessoas/${pessoa.id}`} className="text-xl font-semibold text-[#071E36] transition hover:text-[#8B6827]">
                          {pessoa.nome}
                        </Link>
                        <span className={temperaturaClassName(pessoa.temperatura)}>
                          {labelTexto(pessoa.temperatura)}
                        </span>
                        <span className="rounded-full bg-[#F7F3ED] px-3 py-1 text-xs font-semibold text-[#64736D]">
                          {labelTexto(pessoa.status)}
                        </span>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {(pessoa.papeis ?? []).map((papel) => (
                          <span key={`${pessoa.id}-${papel}`} className={badgePapelClassName(papel)}>
                            {labelTexto(papel)}
                          </span>
                        ))}
                        {(pessoa.papeis ?? []).length === 0 ? (
                          <span className="rounded-full bg-[#F7F3ED] px-3 py-1 text-xs font-semibold text-[#64736D]">
                            sem papel definido
                          </span>
                        ) : null}
                      </div>
                      <div className="mt-4 grid gap-2 text-sm text-[#64736D] md:grid-cols-3">
                        <span>Telefone/WhatsApp: {pessoa.whatsapp || pessoa.celular || pessoa.telefone || "-"}</span>
                        <span>Email: {pessoa.email || "-"}</span>
                        <span>Cidade/Bairro: {[pessoa.cidade, pessoa.bairro].filter(Boolean).join(" / ") || "-"}</span>
                        <span>Responsavel: aguardando vinculo canonico</span>
                        <span>Score: {pessoa.score_relacionamento ?? 0}</span>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Link href={`/dashboard/pessoas/${pessoa.id}`} className="rounded-full border border-[#E8DDCB] bg-white px-3 py-1 text-xs font-semibold text-[#071E36] transition hover:border-[#C89B3C]/45 hover:bg-[#C89B3C]/10">
                        Visualizar
                      </Link>
                      <Link href={`/dashboard/pessoas?edit=${pessoa.id}`} className="rounded-full border border-[#E8DDCB] bg-white px-3 py-1 text-xs font-semibold text-[#071E36] transition hover:border-[#C89B3C]/45 hover:bg-[#C89B3C]/10">
                        Editar
                      </Link>
                      <form action={excluirPessoa}>
                        <input type="hidden" name="id" value={pessoa.id} />
                        <ConfirmSubmitButton message="Confirmar exclusao logica desta pessoa?" className="rounded-full border border-red-100 bg-red-50 px-3 py-1 text-xs font-semibold text-red-700 transition hover:bg-red-100">
                          Excluir
                        </ConfirmSubmitButton>
                      </form>
                    </div>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
