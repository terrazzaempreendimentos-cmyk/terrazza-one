import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { ConfirmSubmitButton } from "../../../components/ConfirmSubmitButton";
import { BrokerRouletteConfigurations, type BrokerRouletteConfigurationItem } from "../../../components/crm/roleta/broker-roulette-configurations";
import { hasPermission } from "../../../lib/auth/permissions";
import { requirePermission } from "../../../lib/auth/access-profile";
import { requirePagePermission } from "../../../lib/auth/page-permission";
import { CreciValidationForm } from "../crm/corretores/CreciValidationForm";
import {
  addPapel,
  removePapel,
} from "../../../lib/crm/pessoas/papeis";
import {
  getCorretoresUnificados,
} from "../../../lib/crm/corretores/getCorretoresUnificados";
import { createClient } from "../../../lib/supabase/server";

type SearchParams = Record<string, string | string[] | undefined>;
type RouletteConfiguration = { id: string; pessoa_id: string; participa_roleta: boolean; disponivel: boolean; peso: number; capacidade_atendimentos: number | null; cidades: unknown; objetivos_imobiliarios: unknown; canais: unknown; observacoes: string | null; updated_at: string };

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

function normalizarTexto(value: unknown) {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function normalizarCreci(value: string | null) {
  return String(value ?? "").trim().toUpperCase().replace(/\s+/g, "");
}

function badgeStatus(status: string | null) {
  if (status === "ativo") return "bg-emerald-50 text-emerald-700";
  if (status === "inativo") return "bg-slate-100 text-slate-600";
  return "bg-[#F7F3ED] text-[#071E36]";
}

function stringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

export default async function CorretoresPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const profile = await requirePagePermission("corretores.visualizar");
  const canManageRoulette = profile.papel === "administrador" && hasPermission(profile.papel, "configuracoes.administrar");
  const supabase = await createClient();

  const resolvedSearchParams = (await searchParams) ?? {};
  const editId = paramValue(resolvedSearchParams, "edit") ?? "";
  const busca = paramValue(resolvedSearchParams, "busca") ?? "";
  const filtroStatus = paramValue(resolvedSearchParams, "status") ?? "";
  const errorCode = paramValue(resolvedSearchParams, "error") ?? "";

  async function salvarCorretor(formData: FormData) {
    "use server";
    await requirePermission("corretores.administrar");
    const supabase = await createClient();

    const id = valorTexto(formData, "id");
    const sourceId = valorTexto(formData, "source_id");
    if (sourceId && !uuidValido(sourceId)) throw new Error("Corretor invalido.");
    const nome = valorTexto(formData, "nome");
    const creci = valorTexto(formData, "creci");
    const ativo = formData.get("ativo") === "on";

    if (!nome) {
      throw new Error("O nome do corretor e obrigatorio.");
    }

    if (creci) {
      const { data: corretores, error } = await getCorretoresUnificados(supabase);
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

    revalidatePath("/dashboard/corretores");
    revalidatePath("/dashboard/crm/corretores");
    revalidatePath("/dashboard/crm/roleta");
    redirect("/dashboard/corretores");
  }

  async function excluirCorretor(formData: FormData) {
    "use server";
    await requirePermission("corretores.arquivar");
    const supabase = await createClient();

    const sourceId = valorTexto(formData, "source_id");
    if (!sourceId) {
      throw new Error("Corretor nao informado.");
    }
    if (!uuidValido(sourceId)) throw new Error("Corretor invalido.");

    const { data: pessoa, error: pessoaError } = await supabase
      .from("pessoas")
      .select("papeis")
      .eq("id", sourceId)
      .single();

    if (pessoaError) throw new Error("Nao foi possivel localizar o corretor.");

    const papeis = (pessoa as { papeis?: string[] | null }).papeis;
    const payload = {
      papeis: removePapel(papeis, "corretor"),
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase.from("pessoas").update(payload).eq("id", sourceId);
    if (error) throw new Error("Nao foi possivel excluir logicamente o corretor.");

    revalidatePath("/dashboard/corretores");
    revalidatePath("/dashboard/crm/corretores");
    revalidatePath("/dashboard/crm/roleta");
  }

  const { data: corretores, error } = await getCorretoresUnificados(supabase);
  let rouletteConfigurations: RouletteConfiguration[] = [];
  let rouletteConfigurationError = false;

  if (canManageRoulette) {
    const configurationResult = await supabase
      .from("corretores_configuracoes")
      .select("id, pessoa_id, participa_roleta, disponivel, peso, capacidade_atendimentos, cidades, objetivos_imobiliarios, canais, observacoes, updated_at")
      .order("created_at", { ascending: true });
    if (configurationResult.error) {
      console.error({ modulo: "corretores", etapa: "roulette_configurations", codigo: configurationResult.error.code });
      rouletteConfigurationError = true;
    } else {
      rouletteConfigurations = (configurationResult.data ?? []) as unknown as RouletteConfiguration[];
    }
  }

  const rouletteConfigurationsByPerson = new Map(rouletteConfigurations.map((configuration) => [configuration.pessoa_id, configuration]));
  const rouletteItems: BrokerRouletteConfigurationItem[] = corretores.map((corretor) => {
    const configuration = rouletteConfigurationsByPerson.get(corretor.sourceId);
    return {
      personId: corretor.sourceId,
      personName: corretor.nome,
      roles: ["corretor"],
      configuration: configuration ? {
        id: configuration.id,
        updatedAt: configuration.updated_at,
        participates: configuration.participa_roleta,
        available: configuration.disponivel,
        weight: configuration.peso,
        capacity: configuration.capacidade_atendimentos,
        cities: stringArray(configuration.cidades),
        objectives: stringArray(configuration.objetivos_imobiliarios),
        channels: stringArray(configuration.canais),
        notes: configuration.observacoes,
      } : {
        id: null,
        updatedAt: null,
        participates: false,
        available: false,
        weight: 1,
        capacity: null,
        cities: [],
        objectives: [],
        channels: [],
        notes: null,
      },
    };
  });
  const participantWithoutActiveBroker = rouletteConfigurations.filter((configuration) => configuration.participa_roleta && !corretores.some((corretor) => corretor.sourceId === configuration.pessoa_id)).length;
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
            Pessoas ativas com papel corretor no cadastro central do CRM.
          </p>
          <Link href="/dashboard/pessoas?papel=corretor" className="mt-5 inline-flex rounded-xl bg-[#071E36] px-5 py-3 text-sm font-semibold text-white">
            Criar no cadastro central
          </Link>
        </header>

        <section className="mt-8 grid gap-4 md:grid-cols-4">
          {[
            ["Total", corretores.length, "pessoas-corretoras"],
            [
              "Cadastro Universal",
              corretores.length,
              "fonte unica",
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
          <form className="grid gap-4 md:grid-cols-4">
            <input
              name="busca"
              defaultValue={busca}
              className="rounded-xl border border-[#E8DDCB] px-4 py-3 text-sm text-[#071E36] outline-none focus:border-[#C89B3C] md:col-span-2"
              placeholder="Nome, telefone, WhatsApp, email, cidade ou CRECI"
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
                    <th className="px-4 py-3 font-medium">Acoes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#eee7dc] text-[#102A27]">
                  {corretoresFiltrados.map((corretor) => {
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
                          <div className="flex flex-wrap gap-2">
                            <Link
                              href={`/dashboard/corretores?edit=${encodeURIComponent(corretor.id)}`}
                              className="rounded-full border border-[#E8DDCB] bg-white px-3 py-1 text-xs font-semibold text-[#071E36] transition hover:border-[#C89B3C]/45 hover:bg-[#C89B3C]/10"
                            >
                              Editar
                            </Link>
                            <form action={excluirCorretor}>
                              <input type="hidden" name="source_id" value={corretor.sourceId} />
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

        {canManageRoulette ? (
          <section id="roleta" className="mt-6 scroll-mt-6 rounded-2xl border border-[#E8DDCB] bg-white p-6 shadow-sm sm:p-8">
            <h2 className="text-xl font-semibold text-[#071E36]">Configuracao da Roleta</h2>
            <p className="mt-1 text-sm text-[#64736D]">Administracao da participacao e das regras operacionais de cada Pessoa-corretora.</p>
            {rouletteConfigurationError ? <p role="alert" className="mt-5 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">Nao foi possivel carregar as configuracoes da Roleta.</p> : null}
            {participantWithoutActiveBroker > 0 ? <p role="alert" className="mt-5 rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-800">Ha {participantWithoutActiveBroker} configuracao participante vinculada a Pessoa inativa ou sem papel corretor. A RPC nao considera essa Pessoa elegivel.</p> : null}
            {!rouletteConfigurationError && rouletteItems.length === 0 ? <p className="mt-5 rounded-xl bg-[#F7F3ED] px-4 py-6 text-sm text-[#64736D]">Nenhuma Pessoa ativa com papel corretor foi encontrada.</p> : null}
            {!rouletteConfigurationError ? <div className="mt-6"><BrokerRouletteConfigurations items={rouletteItems} /></div> : null}
          </section>
        ) : null}
      </div>
    </main>
  );
}
