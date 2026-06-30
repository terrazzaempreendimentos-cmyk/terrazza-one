import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  BriefcaseBusiness,
  Building2,
  Clock3,
  FileText,
  MessageSquareText,
  ScrollText,
  UserRound,
} from "lucide-react";

import { ConfirmSubmitButton } from "../../../../components/ConfirmSubmitButton";
import { supabase } from "../../../../lib/supabase";

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

type Corretor = {
  id: string;
  nome: string | null;
};

function labelTexto(valor: string | null | undefined) {
  if (!valor) return "-";
  return valor.replaceAll("_", " ");
}

function formatarData(data: string | null) {
  if (!data) return "-";

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "medium",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(data));
}

function badgeClassName(papel: string) {
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

function InfoItem({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <div className="rounded-2xl border border-[#E8DDCB] bg-[#fffdfa] p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8B6827]">
        {label}
      </p>
      <p className="mt-2 font-semibold text-[#071E36]">{value || "-"}</p>
    </div>
  );
}

export default async function PessoaDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  async function excluirPessoa(formData: FormData) {
    "use server";

    const pessoaId = String(formData.get("id") ?? "").trim();
    if (!pessoaId) throw new Error("Pessoa nao informada.");

    const { error } = await supabase
      .from("pessoas")
      .update({ ativo: false, updated_at: new Date().toISOString() })
      .eq("id", pessoaId);

    if (error) {
      throw new Error("Nao foi possivel excluir logicamente a pessoa.");
    }

    revalidatePath("/dashboard/pessoas");
    redirect("/dashboard/pessoas");
  }

  const [pessoaResult, corretoresResult] = await Promise.all([
    supabase.from("pessoas").select("*").eq("id", id).eq("ativo", true).maybeSingle(),
    supabase.from("corretores").select("id, nome").eq("ativo", true),
  ]);

  const pessoa = (pessoaResult.data ?? null) as Pessoa | null;
  const corretores = (corretoresResult.data ?? []) as Corretor[];
  const responsavel = corretores.find(
    (corretor) => corretor.id === pessoa?.responsavel_id,
  );
  const placeholders = [
    { title: "Imoveis relacionados", icon: Building2 },
    { title: "Negocios", icon: BriefcaseBusiness },
    { title: "Atendimentos", icon: MessageSquareText },
    { title: "Timeline", icon: ScrollText },
    { title: "UCE Memoria", icon: Clock3 },
    { title: "Documentos", icon: FileText },
  ];

  return (
    <main className="min-h-screen bg-[#F7F3ED] px-6 py-10 sm:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-wrap gap-3">
          <Link
            href="/dashboard/pessoas"
            className="rounded-xl border border-[#E8DDCB] bg-white px-4 py-2 text-sm font-semibold text-[#071E36] transition hover:border-[#C89B3C]/45 hover:bg-[#C89B3C]/10"
          >
            Voltar
          </Link>
          {pessoa ? (
            <Link
              href={`/dashboard/pessoas?edit=${pessoa.id}`}
              className="rounded-xl bg-[#071E36] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#0A2A4A]"
            >
              Editar
            </Link>
          ) : null}
          {pessoa ? (
            <form action={excluirPessoa}>
              <input type="hidden" name="id" value={pessoa.id} />
              <ConfirmSubmitButton
                message="Confirmar exclusao logica desta pessoa?"
                className="rounded-xl border border-red-100 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100"
              >
                Excluir
              </ConfirmSubmitButton>
            </form>
          ) : null}
        </div>

        <header className="mt-8 rounded-[2rem] border border-[#E8DDCB] bg-white p-6 shadow-sm sm:p-8">
          <span className="rounded-full border border-[#C89B3C]/35 bg-[#C89B3C]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#8B6827]">
            Cadastro universal
          </span>
          <div className="mt-5 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-4xl font-bold tracking-tight text-[#071E36]">
                {pessoa?.nome ?? "Pessoa nao encontrada"}
              </h1>
              <div className="mt-4 flex flex-wrap gap-2">
                {(pessoa?.papeis ?? []).map((papel) => (
                  <span key={papel} className={badgeClassName(papel)}>
                    {labelTexto(papel)}
                  </span>
                ))}
                <span className="rounded-full bg-[#F7F3ED] px-3 py-1 text-xs font-semibold text-[#64736D]">
                  {labelTexto(pessoa?.status)}
                </span>
                <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                  {labelTexto(pessoa?.temperatura)}
                </span>
              </div>
            </div>
            <span className="inline-flex w-fit items-center gap-2 rounded-2xl border border-[#E8DDCB] bg-[#F7F3ED] px-4 py-3 text-sm font-semibold text-[#071E36]">
              <UserRound size={18} className="text-[#C89B3C]" />
              Score {pessoa?.score_relacionamento ?? 0}
            </span>
          </div>
        </header>

        {pessoaResult.error || corretoresResult.error ? (
          <p className="mt-6 rounded-xl bg-[#fbebe7] px-4 py-3 text-sm text-[#8a2e1c]">
            Nao foi possivel carregar todos os dados da pessoa.
          </p>
        ) : null}

        {pessoa ? (
          <>
            <section className="mt-6 grid gap-6 xl:grid-cols-2">
              <div className="rounded-3xl border border-[#E8DDCB] bg-white p-6 shadow-sm">
                <h2 className="text-xl font-semibold text-[#071E36]">
                  Dados principais
                </h2>
                <div className="mt-5 grid gap-3 md:grid-cols-2">
                  <InfoItem label="Tipo" value={labelTexto(pessoa.tipo_pessoa)} />
                  <InfoItem label="CPF/CNPJ" value={pessoa.cpf_cnpj} />
                  <InfoItem label="RG/IE" value={pessoa.rg_ie} />
                  <InfoItem label="Nascimento" value={formatarData(pessoa.data_nascimento)} />
                  <InfoItem label="Estado civil" value={pessoa.estado_civil} />
                  <InfoItem label="Profissao" value={pessoa.profissao} />
                </div>
              </div>

              <div className="rounded-3xl border border-[#E8DDCB] bg-white p-6 shadow-sm">
                <h2 className="text-xl font-semibold text-[#071E36]">Contatos</h2>
                <div className="mt-5 grid gap-3 md:grid-cols-2">
                  <InfoItem label="E-mail" value={pessoa.email} />
                  <InfoItem label="Telefone" value={pessoa.telefone} />
                  <InfoItem label="Celular" value={pessoa.celular} />
                  <InfoItem label="WhatsApp" value={pessoa.whatsapp} />
                </div>
              </div>
            </section>

            <section className="mt-6 grid gap-6 xl:grid-cols-2">
              <div className="rounded-3xl border border-[#E8DDCB] bg-white p-6 shadow-sm">
                <h2 className="text-xl font-semibold text-[#071E36]">Endereco</h2>
                <div className="mt-5 grid gap-3 md:grid-cols-2">
                  <InfoItem label="CEP" value={pessoa.cep} />
                  <InfoItem label="Endereco" value={[pessoa.endereco, pessoa.numero].filter(Boolean).join(", ")} />
                  <InfoItem label="Complemento" value={pessoa.complemento} />
                  <InfoItem label="Bairro" value={pessoa.bairro} />
                  <InfoItem label="Cidade" value={pessoa.cidade} />
                  <InfoItem label="Estado" value={pessoa.estado} />
                </div>
              </div>

              <div className="rounded-3xl border border-[#E8DDCB] bg-white p-6 shadow-sm">
                <h2 className="text-xl font-semibold text-[#071E36]">
                  Relacionamento
                </h2>
                <div className="mt-5 grid gap-3 md:grid-cols-2">
                  <InfoItem label="Origem" value={pessoa.origem} />
                  <InfoItem label="Status" value={labelTexto(pessoa.status)} />
                  <InfoItem label="Responsavel" value={responsavel?.nome} />
                  <InfoItem label="Temperatura" value={labelTexto(pessoa.temperatura)} />
                </div>
              </div>
            </section>

            <section className="mt-6 grid gap-6 xl:grid-cols-3">
              <article className="rounded-3xl border border-[#E8DDCB] bg-white p-6 shadow-sm">
                <h2 className="text-xl font-semibold text-[#071E36]">Resumo UCE</h2>
                <p className="mt-3 text-sm leading-6 text-[#64736D]">
                  {pessoa.resumo_uce || "Sem resumo UCE registrado."}
                </p>
              </article>
              <article className="rounded-3xl border border-[#E8DDCB] bg-white p-6 shadow-sm">
                <h2 className="text-xl font-semibold text-[#071E36]">
                  Perfil comportamental
                </h2>
                <p className="mt-3 text-sm leading-6 text-[#64736D]">
                  {pessoa.perfil_comportamental || "Sem perfil comportamental registrado."}
                </p>
              </article>
              <article className="rounded-3xl border border-[#E8DDCB] bg-white p-6 shadow-sm">
                <h2 className="text-xl font-semibold text-[#071E36]">Observacoes</h2>
                <p className="mt-3 text-sm leading-6 text-[#64736D]">
                  {pessoa.observacoes || pessoa.observacoes_uce || "Sem observacoes registradas."}
                </p>
              </article>
            </section>

            <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {placeholders.map((item) => {
                const Icon = item.icon;
                return (
                  <article key={item.title} className="rounded-3xl border border-[#E8DDCB] bg-white p-6 shadow-sm">
                    <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#071E36] text-[#E1B866]">
                      <Icon size={20} />
                    </span>
                    <h2 className="mt-4 text-lg font-semibold text-[#071E36]">
                      {item.title}
                    </h2>
                    <p className="mt-2 text-sm text-[#64736D]">
                      Preparado para conexao futura com o cadastro universal.
                    </p>
                  </article>
                );
              })}
            </section>
          </>
        ) : (
          <p className="mt-6 rounded-3xl border border-[#E8DDCB] bg-white px-4 py-12 text-center text-sm text-[#64736D] shadow-sm">
            Pessoa nao encontrada ou inativa.
          </p>
        )}
      </div>
    </main>
  );
}
