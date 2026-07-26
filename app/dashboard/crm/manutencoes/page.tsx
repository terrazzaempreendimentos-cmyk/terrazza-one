import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  Clock3,
  Hammer,
  ShieldAlert,
  Wrench,
} from "lucide-react";

import { supabase } from "../../../../lib/supabase";
import { ConfirmSubmitButton } from "../../../../components/ConfirmSubmitButton";
import { requireActiveProfile } from "../../../../lib/auth/access-profile";
import {
  createOperationalMemoryFromMaintenance,
  searchMemories,
  type UCEMemory,
  type UCEMemoryEntityType,
} from "../../../../lib/uce/memory/persistent";

type SearchParams = Record<string, string | string[] | undefined>;

type CadastroBasico = {
  id: string;
  nome?: string | null;
  tipo?: string | null;
  cidade?: string | null;
  bairro?: string | null;
};

type CasoOperacional = {
  id: string;
  tipo: string;
  categoria: string | null;
  titulo: string;
  resumo: string | null;
  descricao: string | null;
  imovel_id: string | null;
  proprietario_id: string | null;
  inquilino_id: string | null;
  responsavel_id: string | null;
  prioridade: string | null;
  status: string | null;
  origem: string | null;
  risco: string | null;
  proxima_acao: string | null;
  observacoes: string | null;
  data_abertura: string | null;
  data_prazo: string | null;
  data_conclusao: string | null;
  created_at: string | null;
};

type MemoryRelatedEntity = {
  entityType: UCEMemoryEntityType;
  entityId?: string | null;
  entityLabel?: string | null;
};

const tipos = ["manutencao", "conflito"];
const prioridades = ["baixa", "media", "alta", "critica"];
const statusCasos = [
  "aberto",
  "em analise",
  "aguardando proprietario",
  "aguardando orcamento",
  "autorizado",
  "em execucao",
  "resolvido",
  "conflito ativo",
  "encerrado",
];
const categoriasManutencao = [
  "hidraulica",
  "eletrica",
  "infiltracao",
  "ar-condicionado",
  "fechadura",
  "pintura",
  "mobilia",
  "limpeza",
  "estrutural",
  "outros",
];
const categoriasConflito = [
  "atraso de aluguel",
  "reclamacao de barulho",
  "descumprimento contratual",
  "mau uso do imovel",
  "acesso ao imovel",
  "divergencia de vistoria",
  "cobranca contestada",
  "comunicacao dificil",
];
const mesesAno = [
  "Janeiro",
  "Fevereiro",
  "Marco",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];
const opcoesRisco = ["baixo", "medio", "alto", "critico"];

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

function dataOpcional(formData: FormData, campo: string) {
  const valor = valorTexto(formData, campo);
  return valor || null;
}

function labelTexto(valor: string | null | undefined) {
  if (!valor) return "-";
  return valor.replaceAll("_", " ");
}

function nomeImovel(imovel: CadastroBasico | undefined) {
  if (!imovel) return "-";
  return [imovel.tipo, imovel.cidade, imovel.bairro].filter(Boolean).join(" / ") || "-";
}

function formatarData(data: string | null) {
  if (!data) return "-";

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "medium",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(data));
}

function inputDate(data: string | null | undefined) {
  if (!data) return "";
  return data.slice(0, 10);
}

function prioridadeClassName(prioridade: string | null | undefined) {
  const classes: Record<string, string> = {
    baixa: "bg-slate-100 text-slate-700",
    media: "bg-amber-50 text-amber-700",
    alta: "bg-orange-50 text-orange-700",
    critica: "bg-red-50 text-red-700",
  };

  return `rounded-full px-3 py-1 text-xs font-semibold ${
    classes[prioridade ?? ""] ?? classes.media
  }`;
}

function statusClassName(status: string | null | undefined) {
  if (status === "resolvido" || status === "encerrado") {
    return "bg-emerald-50 text-emerald-700";
  }
  if (status === "conflito ativo") return "bg-red-50 text-red-700";
  if (status?.includes("aguardando")) return "bg-amber-50 text-amber-700";
  return "bg-[#F7F3ED] text-[#071E36]";
}

function isCasoAberto(caso: Pick<CasoOperacional, "status">) {
  return !["resolvido", "encerrado"].includes(caso.status ?? "");
}

function monthIndexFromDate(data: string | null) {
  if (!data) return -1;
  const date = new Date(data);
  if (Number.isNaN(date.getTime())) return -1;
  return date.getMonth();
}

async function getRelatedEntityLabel(
  table: "inquilinos" | "proprietarios" | "imoveis",
  id: string | null,
) {
  if (!id) return null;

  if (table === "imoveis") {
    const { data } = await supabase
      .from("imoveis")
      .select("id, tipo, cidade, bairro")
      .eq("id", id)
      .maybeSingle();

    return data ? nomeImovel(data as CadastroBasico) : null;
  }

  if (table === "inquilinos") {
    const { data } = await supabase
      .from("inquilinos")
      .select("id, nome")
      .eq("id", id)
      .maybeSingle();

    return data?.nome ?? null;
  }

  const { data } = await supabase
    .from("proprietarios")
    .select("id, nome")
    .eq("id", id)
    .maybeSingle();

  return data?.nome ?? null;
}

async function buildRelatedMemoryEntities(input: {
  inquilinoId: string | null;
  proprietarioId: string | null;
  imovelId: string | null;
}) {
  const [inquilinoLabel, proprietarioLabel, imovelLabel] = await Promise.all([
    getRelatedEntityLabel("inquilinos", input.inquilinoId),
    getRelatedEntityLabel("proprietarios", input.proprietarioId),
    getRelatedEntityLabel("imoveis", input.imovelId),
  ]);
  const entities: MemoryRelatedEntity[] = [];

  if (input.inquilinoId) {
    entities.push({
      entityType: "inquilino",
      entityId: input.inquilinoId,
      entityLabel: inquilinoLabel,
    });
  }

  if (input.proprietarioId) {
    entities.push({
      entityType: "proprietario",
      entityId: input.proprietarioId,
      entityLabel: proprietarioLabel,
    });
  }

  if (input.imovelId) {
    entities.push({
      entityType: "imovel",
      entityId: input.imovelId,
      entityLabel: imovelLabel,
    });
  }

  return entities;
}

export default async function ManutencoesPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const filtroTipo = paramValue(resolvedSearchParams, "tipo") ?? "";
  const filtroStatus = paramValue(resolvedSearchParams, "status") ?? "";
  const filtroPrioridade = paramValue(resolvedSearchParams, "prioridade") ?? "";
  const filtroCategoria = paramValue(resolvedSearchParams, "categoria") ?? "";
  const filtroImovel = paramValue(resolvedSearchParams, "imovel_id") ?? "";
  const filtroInquilino = paramValue(resolvedSearchParams, "inquilino_id") ?? "";
  const filtroProprietario = paramValue(resolvedSearchParams, "proprietario_id") ?? "";
  const filtroResponsavel = paramValue(resolvedSearchParams, "responsavel_id") ?? "";
  const filtroRisco = paramValue(resolvedSearchParams, "risco") ?? "";
  const filtroPeriodoInicio = paramValue(resolvedSearchParams, "periodo_inicio") ?? "";
  const filtroPeriodoFim = paramValue(resolvedSearchParams, "periodo_fim") ?? "";
  const editId = paramValue(resolvedSearchParams, "edit") ?? "";
  const anoHistorico = new Date().getFullYear();

  async function salvarCaso(formData: FormData) {
    "use server";
    await requireActiveProfile();

    const id = valorTexto(formData, "id");
    const tipo = valorTexto(formData, "tipo");
    const titulo = valorTexto(formData, "titulo");

    if (!tipo || !titulo) {
      throw new Error("Tipo e titulo sao obrigatorios.");
    }

    const payload = {
      tipo,
      categoria: valorOpcional(formData, "categoria"),
      titulo,
      resumo: valorOpcional(formData, "resumo"),
      descricao: valorOpcional(formData, "descricao"),
      imovel_id: valorOpcional(formData, "imovel_id"),
      proprietario_id: valorOpcional(formData, "proprietario_id"),
      inquilino_id: valorOpcional(formData, "inquilino_id"),
      responsavel_id: valorOpcional(formData, "responsavel_id"),
      prioridade: valorTexto(formData, "prioridade") || "media",
      status: valorTexto(formData, "status") || "aberto",
      origem: valorTexto(formData, "origem") || "manual",
      risco: valorOpcional(formData, "risco"),
      proxima_acao: valorOpcional(formData, "proxima_acao"),
      observacoes: valorOpcional(formData, "observacoes"),
      data_prazo: dataOpcional(formData, "data_prazo"),
      updated_at: new Date().toISOString(),
    };

    const result = id
      ? await supabase
          .from("manutencoes_conflitos")
          .update(payload)
          .eq("id", id)
          .select("id")
          .single()
      : await supabase
          .from("manutencoes_conflitos")
          .insert(payload)
          .select("id")
          .single();

    if (result.error) {
      throw new Error("Nao foi possivel salvar o caso operacional.");
    }

    if (!id) {
      const relatedEntities = await buildRelatedMemoryEntities({
        inquilinoId: payload.inquilino_id,
        proprietarioId: payload.proprietario_id,
        imovelId: payload.imovel_id,
      });

      await createOperationalMemoryFromMaintenance({
        tipo: payload.tipo,
        categoria: payload.categoria,
        titulo: payload.titulo,
        resumo: payload.resumo,
        descricao: payload.descricao,
        status: payload.status,
        prioridade: payload.prioridade,
        proximaAcao: payload.proxima_acao,
        relatedEntities,
      });
    }

    revalidatePath("/dashboard/crm/manutencoes");
    redirect("/dashboard/crm/manutencoes");
  }

  async function excluirCaso(formData: FormData) {
    "use server";
    await requireActiveProfile();

    const id = valorTexto(formData, "id");

    if (!id) {
      throw new Error("Caso nao informado.");
    }

    const { error } = await supabase
      .from("manutencoes_conflitos")
      .update({
        ativo: false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) {
      throw new Error("Nao foi possivel excluir logicamente o caso.");
    }

    revalidatePath("/dashboard/crm/manutencoes");
  }

  let casosQuery = supabase
    .from("manutencoes_conflitos")
    .select(
      "id, tipo, categoria, titulo, resumo, descricao, imovel_id, proprietario_id, inquilino_id, responsavel_id, prioridade, status, origem, risco, proxima_acao, observacoes, data_abertura, data_prazo, data_conclusao, created_at",
    )
    .eq("ativo", true)
    .order("created_at", { ascending: false });

  if (filtroTipo) casosQuery = casosQuery.eq("tipo", filtroTipo);
  if (filtroStatus) casosQuery = casosQuery.eq("status", filtroStatus);
  if (filtroPrioridade) casosQuery = casosQuery.eq("prioridade", filtroPrioridade);
  if (filtroCategoria) casosQuery = casosQuery.eq("categoria", filtroCategoria);
  if (filtroImovel) casosQuery = casosQuery.eq("imovel_id", filtroImovel);
  if (filtroInquilino) casosQuery = casosQuery.eq("inquilino_id", filtroInquilino);
  if (filtroProprietario) casosQuery = casosQuery.eq("proprietario_id", filtroProprietario);
  if (filtroResponsavel) casosQuery = casosQuery.eq("responsavel_id", filtroResponsavel);
  if (filtroRisco) casosQuery = casosQuery.ilike("risco", `%${filtroRisco}%`);
  if (filtroPeriodoInicio) casosQuery = casosQuery.gte("data_abertura", filtroPeriodoInicio);
  if (filtroPeriodoFim) casosQuery = casosQuery.lte("data_abertura", filtroPeriodoFim);

  const [
    casosResult,
    resumoResult,
    imoveisResult,
    proprietariosResult,
    inquilinosResult,
    corretoresResult,
    memoriesResult,
    historicoAnualResult,
  ] = await Promise.all([
    casosQuery,
    supabase
      .from("manutencoes_conflitos")
      .select("id, tipo, prioridade, status")
      .eq("ativo", true),
    supabase
      .from("imoveis")
      .select("id, tipo, cidade, bairro")
      .order("created_at", { ascending: false }),
    supabase.from("proprietarios").select("id, nome").order("nome", { ascending: true }),
    supabase.from("inquilinos").select("id, nome").order("nome", { ascending: true }),
    supabase.from("corretores").select("id, nome").order("nome", { ascending: true }),
    searchMemories({ limit: 120 }).catch(() => [] as UCEMemory[]),
    filtroImovel
      ? supabase
          .from("manutencoes_conflitos")
          .select(
            "id, tipo, categoria, titulo, resumo, descricao, imovel_id, proprietario_id, inquilino_id, responsavel_id, prioridade, status, origem, risco, proxima_acao, observacoes, data_abertura, data_prazo, data_conclusao, created_at",
          )
          .eq("ativo", true)
          .eq("imovel_id", filtroImovel)
          .gte("data_abertura", `${anoHistorico}-01-01`)
          .lte("data_abertura", `${anoHistorico}-12-31`)
          .order("data_abertura", { ascending: false })
      : Promise.resolve({ data: [], error: null }),
  ]);

  const casos = (casosResult.data ?? []) as CasoOperacional[];
  const resumoBase = (resumoResult.data ?? []) as Pick<
    CasoOperacional,
    "id" | "tipo" | "prioridade" | "status"
  >[];
  const imoveis = (imoveisResult.data ?? []) as CadastroBasico[];
  const proprietarios = (proprietariosResult.data ?? []) as CadastroBasico[];
  const inquilinos = (inquilinosResult.data ?? []) as CadastroBasico[];
  const corretores = (corretoresResult.data ?? []) as CadastroBasico[];
  const historicoAnual = (historicoAnualResult.data ?? []) as CasoOperacional[];
  const memories = ((memoriesResult ?? []) as UCEMemory[]).filter(
    (memory) => memory.source === "crm_manutencoes",
  );
  const casoEmEdicao = casos.find((caso) => caso.id === editId) ?? null;
  const casoDestaque = casoEmEdicao ?? casos[0] ?? null;
  const imovelHistorico = imoveis.find((imovel) => imovel.id === filtroImovel) ?? null;

  const imoveisPorId = new Map(imoveis.map((imovel) => [imovel.id, imovel]));
  const proprietariosPorId = new Map(
    proprietarios.map((proprietario) => [proprietario.id, proprietario.nome ?? "-"]),
  );
  const inquilinosPorId = new Map(
    inquilinos.map((inquilino) => [inquilino.id, inquilino.nome ?? "-"]),
  );
  const corretoresPorId = new Map(
    corretores.map((corretor) => [corretor.id, corretor.nome ?? "-"]),
  );
  const memoriesByTitle = new Map<string, UCEMemory[]>();

  for (const memory of memories) {
    const currentMemories = memoriesByTitle.get(memory.title) ?? [];
    currentMemories.push(memory);
    memoriesByTitle.set(memory.title, currentMemories);
  }

  const resumo = [
    {
      titulo: "Solicitacoes abertas",
      valor: resumoBase.filter((caso) => isCasoAberto(caso)).length,
      detalhe: "Demandas em acompanhamento",
      icon: ClipboardList,
    },
    {
      titulo: "Urgentes",
      valor: resumoBase.filter((caso) => ["alta", "critica"].includes(caso.prioridade ?? ""))
        .length,
      detalhe: "Alta prioridade operacional",
      icon: AlertTriangle,
    },
    {
      titulo: "Aguardando proprietario",
      valor: resumoBase.filter((caso) => caso.status === "aguardando proprietario").length,
      detalhe: "Dependem de autorizacao",
      icon: Clock3,
    },
    {
      titulo: "Aguardando orcamento",
      valor: resumoBase.filter((caso) => caso.status === "aguardando orcamento").length,
      detalhe: "Prestadores acionados",
      icon: Hammer,
    },
    {
      titulo: "Resolvidas",
      valor: resumoBase.filter((caso) => caso.status === "resolvido").length,
      detalhe: "Finalizadas com registro",
      icon: CheckCircle2,
    },
    {
      titulo: "Conflitos ativos",
      valor: resumoBase.filter((caso) => caso.status === "conflito ativo").length,
      detalhe: "Exigem acompanhamento fino",
      icon: ShieldAlert,
    },
  ];

  const erroCarregamento =
    casosResult.error ||
    resumoResult.error ||
    imoveisResult.error ||
    proprietariosResult.error ||
    inquilinosResult.error ||
    corretoresResult.error ||
    historicoAnualResult.error;

  const historicoPorMes = mesesAno.map((mes, index) => ({
    mes,
    itens: historicoAnual.filter((caso) => monthIndexFromDate(caso.data_abertura) === index),
  }));
  const resumoHistoricoAnual = {
    manutencoes: historicoAnual.filter((caso) => caso.tipo === "manutencao").length,
    conflitos: historicoAnual.filter((caso) => caso.tipo === "conflito").length,
    abertas: historicoAnual.filter((caso) => isCasoAberto(caso)).length,
    resolvidas: historicoAnual.filter((caso) => caso.status === "resolvido").length,
    criticas: historicoAnual.filter((caso) => caso.prioridade === "critica").length,
  };

  return (
    <main className="min-h-screen bg-[#F7F3ED] px-6 py-10 sm:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="rounded-[2rem] border border-[#E8DDCB] bg-white p-6 shadow-sm sm:p-8">
          <span className="rounded-full border border-[#C89B3C]/35 bg-[#C89B3C]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#8B6827]">
            Terrazza CRM
          </span>
          <div className="mt-5 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-4xl font-bold tracking-tight text-[#071E36]">
                Manutencoes e Conflitos
              </h1>
              <p className="mt-2 max-w-3xl leading-6 text-[#64736D]">
                Acompanhe solicitacoes, pendencias e historico de relacionamento
                entre inquilinos, proprietarios e imoveis.
              </p>
            </div>
            <span className="inline-flex w-fit items-center gap-2 rounded-2xl border border-[#E8DDCB] bg-[#F7F3ED] px-4 py-3 text-sm font-semibold text-[#071E36]">
              <Wrench size={18} className="text-[#C89B3C]" />
              Operacao patrimonial
            </span>
          </div>
        </header>

        {erroCarregamento ? (
          <p className="mt-6 rounded-xl bg-[#fbebe7] px-4 py-3 text-sm text-[#8a2e1c]">
            Nao foi possivel carregar todos os dados. Verifique se o SQL 012 ja foi aplicado.
          </p>
        ) : null}

        <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {resumo.map((card) => {
            const Icon = card.icon;
            return (
              <article
                key={card.titulo}
                className="rounded-3xl border border-[#E8DDCB] bg-white p-5 shadow-sm"
              >
                <div className="flex items-center justify-between gap-4">
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#071E36] text-[#E1B866]">
                    <Icon size={20} strokeWidth={2.2} />
                  </span>
                  <strong className="text-3xl font-bold text-[#071E36]">
                    {card.valor}
                  </strong>
                </div>
                <h2 className="mt-4 text-sm font-semibold uppercase tracking-[0.14em] text-[#071E36]">
                  {card.titulo}
                </h2>
                <p className="mt-1 text-sm text-[#64736D]">{card.detalhe}</p>
              </article>
            );
          })}
        </section>

        <section className="mt-6 rounded-3xl border border-[#E8DDCB] bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-[#071E36]">
                {casoEmEdicao ? "Editar caso operacional" : "Novo caso operacional"}
              </h2>
              <p className="mt-1 text-sm text-[#64736D]">
                Cadastro real com edicao e exclusao logica por ativo=false.
              </p>
            </div>
            {casoEmEdicao ? (
              <Link
                href="/dashboard/crm/manutencoes"
                className="w-fit rounded-xl border border-[#E8DDCB] bg-white px-4 py-2 text-sm font-semibold text-[#071E36] transition hover:border-[#C89B3C]/45 hover:bg-[#C89B3C]/10"
              >
                Cancelar edicao
              </Link>
            ) : null}
          </div>

          <form action={salvarCaso} className="mt-6 grid gap-5 md:grid-cols-3">
            <input type="hidden" name="id" value={casoEmEdicao?.id ?? ""} />

            <label className="grid gap-2 text-sm font-medium text-[#102A27]">
              Tipo
              <select
                name="tipo"
                required
                defaultValue={casoEmEdicao?.tipo ?? "manutencao"}
                className="rounded-xl border border-[#E8DDCB] bg-white px-4 py-3 text-[#071E36] outline-none transition focus:border-[#C89B3C]"
              >
                {tipos.map((tipo) => (
                  <option key={tipo} value={tipo}>
                    {labelTexto(tipo)}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-2 text-sm font-medium text-[#102A27]">
              Categoria
              <select
                name="categoria"
                defaultValue={casoEmEdicao?.categoria ?? ""}
                className="rounded-xl border border-[#E8DDCB] bg-white px-4 py-3 text-[#071E36] outline-none transition focus:border-[#C89B3C]"
              >
                <option value="">Selecione</option>
                <optgroup label="Manutencao">
                  {categoriasManutencao.map((categoria) => (
                    <option key={categoria} value={categoria}>
                      {categoria}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Conflito">
                  {categoriasConflito.map((categoria) => (
                    <option key={categoria} value={categoria}>
                      {categoria}
                    </option>
                  ))}
                </optgroup>
              </select>
            </label>

            <label className="grid gap-2 text-sm font-medium text-[#102A27]">
              Titulo
              <input
                name="titulo"
                required
                defaultValue={casoEmEdicao?.titulo ?? ""}
                className="rounded-xl border border-[#E8DDCB] px-4 py-3 text-[#071E36] outline-none transition placeholder:text-[#9a9d98] focus:border-[#C89B3C]"
                placeholder="Ex.: Infiltracao no quarto"
              />
            </label>

            <label className="grid gap-2 text-sm font-medium text-[#102A27]">
              Imovel
              <select
                name="imovel_id"
                defaultValue={casoEmEdicao?.imovel_id ?? ""}
                className="rounded-xl border border-[#E8DDCB] bg-white px-4 py-3 text-[#071E36] outline-none transition focus:border-[#C89B3C]"
              >
                <option value="">Sem imovel vinculado</option>
                {imoveis.map((imovel) => (
                  <option key={imovel.id} value={imovel.id}>
                    {nomeImovel(imovel)}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-2 text-sm font-medium text-[#102A27]">
              Proprietario
              <select
                name="proprietario_id"
                defaultValue={casoEmEdicao?.proprietario_id ?? ""}
                className="rounded-xl border border-[#E8DDCB] bg-white px-4 py-3 text-[#071E36] outline-none transition focus:border-[#C89B3C]"
              >
                <option value="">Sem proprietario vinculado</option>
                {proprietarios.map((proprietario) => (
                  <option key={proprietario.id} value={proprietario.id}>
                    {proprietario.nome}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-2 text-sm font-medium text-[#102A27]">
              Inquilino
              <select
                name="inquilino_id"
                defaultValue={casoEmEdicao?.inquilino_id ?? ""}
                className="rounded-xl border border-[#E8DDCB] bg-white px-4 py-3 text-[#071E36] outline-none transition focus:border-[#C89B3C]"
              >
                <option value="">Sem inquilino vinculado</option>
                {inquilinos.map((inquilino) => (
                  <option key={inquilino.id} value={inquilino.id}>
                    {inquilino.nome}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-2 text-sm font-medium text-[#102A27]">
              Responsavel
              <select
                name="responsavel_id"
                defaultValue={casoEmEdicao?.responsavel_id ?? ""}
                className="rounded-xl border border-[#E8DDCB] bg-white px-4 py-3 text-[#071E36] outline-none transition focus:border-[#C89B3C]"
              >
                <option value="">Sem responsavel</option>
                {corretores.map((corretor) => (
                  <option key={corretor.id} value={corretor.id}>
                    {corretor.nome}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-2 text-sm font-medium text-[#102A27]">
              Prioridade
              <select
                name="prioridade"
                defaultValue={casoEmEdicao?.prioridade ?? "media"}
                className="rounded-xl border border-[#E8DDCB] bg-white px-4 py-3 text-[#071E36] outline-none transition focus:border-[#C89B3C]"
              >
                {prioridades.map((prioridade) => (
                  <option key={prioridade} value={prioridade}>
                    {labelTexto(prioridade)}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-2 text-sm font-medium text-[#102A27]">
              Status
              <select
                name="status"
                defaultValue={casoEmEdicao?.status ?? "aberto"}
                className="rounded-xl border border-[#E8DDCB] bg-white px-4 py-3 text-[#071E36] outline-none transition focus:border-[#C89B3C]"
              >
                {statusCasos.map((status) => (
                  <option key={status} value={status}>
                    {labelTexto(status)}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-2 text-sm font-medium text-[#102A27]">
              Origem
              <input
                name="origem"
                defaultValue={casoEmEdicao?.origem ?? "manual"}
                className="rounded-xl border border-[#E8DDCB] px-4 py-3 text-[#071E36] outline-none transition placeholder:text-[#9a9d98] focus:border-[#C89B3C]"
                placeholder="manual, whatsapp, site..."
              />
            </label>

            <label className="grid gap-2 text-sm font-medium text-[#102A27]">
              Data prazo
              <input
                name="data_prazo"
                type="date"
                defaultValue={inputDate(casoEmEdicao?.data_prazo)}
                className="rounded-xl border border-[#E8DDCB] px-4 py-3 text-[#071E36] outline-none transition focus:border-[#C89B3C]"
              />
            </label>

            <label className="grid gap-2 text-sm font-medium text-[#102A27] md:col-span-3">
              Resumo
              <input
                name="resumo"
                defaultValue={casoEmEdicao?.resumo ?? ""}
                className="rounded-xl border border-[#E8DDCB] px-4 py-3 text-[#071E36] outline-none transition placeholder:text-[#9a9d98] focus:border-[#C89B3C]"
                placeholder="Resumo curto para listagem"
              />
            </label>

            <label className="grid gap-2 text-sm font-medium text-[#102A27] md:col-span-3">
              Descricao
              <textarea
                name="descricao"
                rows={3}
                defaultValue={casoEmEdicao?.descricao ?? ""}
                className="rounded-xl border border-[#E8DDCB] px-4 py-3 text-[#071E36] outline-none transition placeholder:text-[#9a9d98] focus:border-[#C89B3C]"
                placeholder="Descreva o contexto do caso"
              />
            </label>

            <label className="grid gap-2 text-sm font-medium text-[#102A27]">
              Risco
              <textarea
                name="risco"
                rows={3}
                defaultValue={casoEmEdicao?.risco ?? ""}
                className="rounded-xl border border-[#E8DDCB] px-4 py-3 text-[#071E36] outline-none transition placeholder:text-[#9a9d98] focus:border-[#C89B3C]"
                placeholder="Risco operacional ou juridico"
              />
            </label>

            <label className="grid gap-2 text-sm font-medium text-[#102A27]">
              Proxima acao
              <textarea
                name="proxima_acao"
                rows={3}
                defaultValue={casoEmEdicao?.proxima_acao ?? ""}
                className="rounded-xl border border-[#E8DDCB] px-4 py-3 text-[#071E36] outline-none transition placeholder:text-[#9a9d98] focus:border-[#C89B3C]"
                placeholder="Proximo movimento recomendado"
              />
            </label>

            <label className="grid gap-2 text-sm font-medium text-[#102A27]">
              Observacoes
              <textarea
                name="observacoes"
                rows={3}
                defaultValue={casoEmEdicao?.observacoes ?? ""}
                className="rounded-xl border border-[#E8DDCB] px-4 py-3 text-[#071E36] outline-none transition placeholder:text-[#9a9d98] focus:border-[#C89B3C]"
                placeholder="Observacoes internas"
              />
            </label>

            <div className="flex flex-wrap gap-3 md:col-span-3">
              <button
                type="submit"
                className="rounded-xl bg-[#071E36] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#0A2A4A]"
              >
                {casoEmEdicao ? "Salvar alteracoes" : "Criar caso"}
              </button>
              {casoEmEdicao ? (
                <Link
                  href="/dashboard/crm/manutencoes"
                  className="rounded-xl border border-[#E8DDCB] bg-white px-5 py-3 text-sm font-semibold text-[#071E36] transition hover:border-[#C89B3C]/45 hover:bg-[#C89B3C]/10"
                >
                  Cancelar edicao
                </Link>
              ) : null}
            </div>
          </form>
        </section>

        <section className="mt-6 rounded-3xl border border-[#E8DDCB] bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-[#071E36]">
                Casos operacionais
              </h2>
              <p className="mt-1 text-sm text-[#64736D]">
                Listagem real com filtros, edicao e exclusao logica.
              </p>
            </div>
            <form
              className="grid w-full gap-3 lg:grid-cols-4 xl:grid-cols-6"
              action="/dashboard/crm/manutencoes"
            >
              <select
                name="tipo"
                defaultValue={filtroTipo}
                className="rounded-xl border border-[#E8DDCB] bg-white px-3 py-2 text-sm text-[#071E36]"
              >
                <option value="">Todos os tipos</option>
                {tipos.map((tipo) => (
                  <option key={tipo} value={tipo}>
                    {labelTexto(tipo)}
                  </option>
                ))}
              </select>
              <select
                name="categoria"
                defaultValue={filtroCategoria}
                className="rounded-xl border border-[#E8DDCB] bg-white px-3 py-2 text-sm text-[#071E36]"
              >
                <option value="">Todas as categorias</option>
                {[...categoriasManutencao, ...categoriasConflito].map((categoria) => (
                  <option key={categoria} value={categoria}>
                    {labelTexto(categoria)}
                  </option>
                ))}
              </select>
              <select
                name="status"
                defaultValue={filtroStatus}
                className="rounded-xl border border-[#E8DDCB] bg-white px-3 py-2 text-sm text-[#071E36]"
              >
                <option value="">Todos os status</option>
                {statusCasos.map((status) => (
                  <option key={status} value={status}>
                    {labelTexto(status)}
                  </option>
                ))}
              </select>
              <select
                name="prioridade"
                defaultValue={filtroPrioridade}
                className="rounded-xl border border-[#E8DDCB] bg-white px-3 py-2 text-sm text-[#071E36]"
              >
                <option value="">Todas as prioridades</option>
                {prioridades.map((prioridade) => (
                  <option key={prioridade} value={prioridade}>
                    {labelTexto(prioridade)}
                  </option>
                ))}
              </select>
              <select
                name="risco"
                defaultValue={filtroRisco}
                className="rounded-xl border border-[#E8DDCB] bg-white px-3 py-2 text-sm text-[#071E36]"
              >
                <option value="">Todos os riscos</option>
                {opcoesRisco.map((risco) => (
                  <option key={risco} value={risco}>
                    {labelTexto(risco)}
                  </option>
                ))}
              </select>
              <select
                name="imovel_id"
                defaultValue={filtroImovel}
                className="rounded-xl border border-[#E8DDCB] bg-white px-3 py-2 text-sm text-[#071E36]"
              >
                <option value="">Todos os imoveis</option>
                {imoveis.map((imovel) => (
                  <option key={imovel.id} value={imovel.id}>
                    {nomeImovel(imovel)}
                  </option>
                ))}
              </select>
              <select
                name="inquilino_id"
                defaultValue={filtroInquilino}
                className="rounded-xl border border-[#E8DDCB] bg-white px-3 py-2 text-sm text-[#071E36]"
              >
                <option value="">Todos os inquilinos</option>
                {inquilinos.map((inquilino) => (
                  <option key={inquilino.id} value={inquilino.id}>
                    {inquilino.nome}
                  </option>
                ))}
              </select>
              <select
                name="proprietario_id"
                defaultValue={filtroProprietario}
                className="rounded-xl border border-[#E8DDCB] bg-white px-3 py-2 text-sm text-[#071E36]"
              >
                <option value="">Todos os proprietarios</option>
                {proprietarios.map((proprietario) => (
                  <option key={proprietario.id} value={proprietario.id}>
                    {proprietario.nome}
                  </option>
                ))}
              </select>
              <select
                name="responsavel_id"
                defaultValue={filtroResponsavel}
                className="rounded-xl border border-[#E8DDCB] bg-white px-3 py-2 text-sm text-[#071E36]"
              >
                <option value="">Todos os responsaveis</option>
                {corretores.map((corretor) => (
                  <option key={corretor.id} value={corretor.id}>
                    {corretor.nome}
                  </option>
                ))}
              </select>
              <label className="grid gap-1 text-xs font-semibold uppercase tracking-[0.12em] text-[#8B6827]">
                Inicio
                <input
                  name="periodo_inicio"
                  type="date"
                  defaultValue={filtroPeriodoInicio}
                  className="rounded-xl border border-[#E8DDCB] bg-white px-3 py-2 text-sm font-normal normal-case tracking-normal text-[#071E36]"
                />
              </label>
              <label className="grid gap-1 text-xs font-semibold uppercase tracking-[0.12em] text-[#8B6827]">
                Fim
                <input
                  name="periodo_fim"
                  type="date"
                  defaultValue={filtroPeriodoFim}
                  className="rounded-xl border border-[#E8DDCB] bg-white px-3 py-2 text-sm font-normal normal-case tracking-normal text-[#071E36]"
                />
              </label>
              <button
                type="submit"
                className="rounded-xl bg-[#071E36] px-4 py-2 text-sm font-semibold text-white"
              >
                Filtrar
              </button>
              <Link
                href="/dashboard/crm/manutencoes"
                className="rounded-xl border border-[#E8DDCB] bg-white px-4 py-2 text-center text-sm font-semibold text-[#071E36] transition hover:border-[#C89B3C]/45 hover:bg-[#C89B3C]/10"
              >
                Limpar
              </Link>
            </form>
          </div>

          <div className="mt-6 overflow-x-auto">
            <table className="w-full min-w-[1320px] text-left text-sm">
              <thead className="border-b border-[#E8DDCB] text-[#64736D]">
                <tr>
                  <th className="px-4 py-3 font-medium">Tipo</th>
                  <th className="px-4 py-3 font-medium">Titulo</th>
                  <th className="px-4 py-3 font-medium">Imovel</th>
                  <th className="px-4 py-3 font-medium">Inquilino</th>
                  <th className="px-4 py-3 font-medium">Proprietario</th>
                  <th className="px-4 py-3 font-medium">Prioridade</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Origem</th>
                  <th className="px-4 py-3 font-medium">Data</th>
                  <th className="px-4 py-3 font-medium">Responsavel</th>
                  <th className="px-4 py-3 font-medium">Resumo</th>
                  <th className="px-4 py-3 font-medium">UCE Memoria</th>
                  <th className="px-4 py-3 font-medium">Acoes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#eee7dc] text-[#102A27]">
                {casos.length === 0 ? (
                  <tr>
                    <td colSpan={13} className="px-4 py-10 text-center text-[#64736D]">
                      Nenhum caso encontrado.
                    </td>
                  </tr>
                ) : (
                  casos.map((caso) => (
                    <tr key={caso.id}>
                      <td className="px-4 py-4">
                        <div className="flex flex-col gap-2">
                          <span className="font-semibold text-[#071E36]">
                            {labelTexto(caso.tipo)}
                          </span>
                          <span className="rounded-full bg-[#F7F3ED] px-3 py-1 text-xs font-semibold text-[#64736D]">
                            {caso.categoria || "sem categoria"}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-4 font-medium text-[#071E36]">
                        {caso.titulo}
                      </td>
                      <td className="px-4 py-4">
                        {nomeImovel(imoveisPorId.get(caso.imovel_id ?? ""))}
                      </td>
                      <td className="px-4 py-4">
                        {inquilinosPorId.get(caso.inquilino_id ?? "") ?? "-"}
                      </td>
                      <td className="px-4 py-4">
                        {proprietariosPorId.get(caso.proprietario_id ?? "") ?? "-"}
                      </td>
                      <td className="px-4 py-4">
                        <span className={prioridadeClassName(caso.prioridade)}>
                          {labelTexto(caso.prioridade)}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClassName(caso.status)}`}
                        >
                          {labelTexto(caso.status)}
                        </span>
                      </td>
                      <td className="px-4 py-4">{caso.origem || "manual"}</td>
                      <td className="px-4 py-4">{formatarData(caso.data_abertura)}</td>
                      <td className="px-4 py-4">
                        {corretoresPorId.get(caso.responsavel_id ?? "") ?? "-"}
                      </td>
                      <td className="max-w-xs px-4 py-4 text-[#64736D]">
                        {caso.resumo || caso.descricao || "-"}
                      </td>
                      <td className="px-4 py-4">
                        {(() => {
                          const casoMemories = memoriesByTitle.get(caso.titulo) ?? [];
                          const principal =
                            casoMemories.find(
                              (memory) =>
                                memory.entity_type === "manutencao" ||
                                memory.entity_type === "conflito",
                            ) ?? casoMemories[0];

                          if (!principal) {
                            return (
                              <div className="rounded-2xl border border-dashed border-[#E8DDCB] bg-[#F7F3ED] p-3 text-xs text-[#64736D]">
                                Memoria pendente para novos registros.
                              </div>
                            );
                          }

                          return (
                            <div className="min-w-[220px] rounded-2xl border border-[#E8DDCB] bg-[#fffdfa] p-3 text-xs text-[#64736D]">
                              <p className="font-semibold text-[#071E36]">
                                memoria registrada
                              </p>
                              <p className="mt-1">
                                Entidade: {labelTexto(principal.entity_type)}{" "}
                                {principal.entity_label ? `- ${principal.entity_label}` : ""}
                              </p>
                              <p>Importancia: {principal.importance}</p>
                              <p>Sentimento: {principal.sentiment || "-"}</p>
                              <p>Origem: {principal.source || "-"}</p>
                              {casoMemories.length > 1 ? (
                                <p className="mt-1 font-semibold text-[#8B6827]">
                                  +{casoMemories.length - 1} relacionadas
                                </p>
                              ) : null}
                            </div>
                          );
                        })()}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-wrap gap-2">
                          <Link
                            href={`/dashboard/crm/manutencoes?edit=${caso.id}`}
                            className="rounded-full border border-[#E8DDCB] bg-white px-3 py-1 text-xs font-semibold text-[#071E36] transition hover:border-[#C89B3C]/45 hover:bg-[#C89B3C]/10"
                          >
                            Editar
                          </Link>
                          <form action={excluirCaso}>
                            <input type="hidden" name="id" value={caso.id} />
                            <ConfirmSubmitButton
                              message="Confirmar exclusao logica deste caso?"
                              className="rounded-full border border-red-100 bg-red-50 px-3 py-1 text-xs font-semibold text-red-700 transition hover:bg-red-100"
                            >
                              Excluir
                            </ConfirmSubmitButton>
                          </form>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        {imovelHistorico ? (
          <section className="mt-6 rounded-3xl border border-[#E8DDCB] bg-white p-6 shadow-sm sm:p-8">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <span className="rounded-full border border-[#C89B3C]/35 bg-[#C89B3C]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#8B6827]">
                  Historico anual do imovel
                </span>
                <h2 className="mt-4 text-2xl font-semibold text-[#071E36]">
                  {nomeImovel(imovelHistorico)}
                </h2>
                <p className="mt-1 text-sm text-[#64736D]">
                  Consolidado operacional de {anoHistorico} para manutencoes e conflitos.
                </p>
              </div>
              <span className="rounded-2xl border border-[#E8DDCB] bg-[#F7F3ED] px-4 py-3 text-sm font-semibold text-[#071E36]">
                Tempo medio de resolucao: placeholder
              </span>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-3 xl:grid-cols-6">
              {[
                ["Manutencoes", resumoHistoricoAnual.manutencoes],
                ["Conflitos", resumoHistoricoAnual.conflitos],
                ["Abertas", resumoHistoricoAnual.abertas],
                ["Resolvidas", resumoHistoricoAnual.resolvidas],
                ["Criticas", resumoHistoricoAnual.criticas],
                ["Total no ano", historicoAnual.length],
              ].map(([titulo, valor]) => (
                <article
                  key={String(titulo)}
                  className="rounded-2xl border border-[#E8DDCB] bg-[#fffdfa] p-4"
                >
                  <strong className="text-2xl font-bold text-[#071E36]">{valor}</strong>
                  <p className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#8B6827]">
                    {titulo}
                  </p>
                </article>
              ))}
            </div>

            <div className="mt-6 grid gap-4 xl:grid-cols-2">
              {historicoPorMes.map(({ mes, itens }) => (
                <article key={mes} className="rounded-2xl border border-[#E8DDCB] bg-[#F7F3ED] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="font-semibold text-[#071E36]">{mes}</h3>
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-[#64736D]">
                      {itens.length} registro{itens.length === 1 ? "" : "s"}
                    </span>
                  </div>
                  <div className="mt-4 space-y-3">
                    {itens.length === 0 ? (
                      <p className="rounded-xl border border-dashed border-[#E8DDCB] bg-white px-3 py-4 text-center text-xs text-[#64736D]">
                        Sem eventos registrados neste mes.
                      </p>
                    ) : (
                      itens.map((caso) => (
                        <div key={caso.id} className="rounded-xl bg-white p-3 text-sm">
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div>
                              <p className="font-semibold text-[#071E36]">
                                {formatarData(caso.data_abertura)} · {labelTexto(caso.tipo)}
                              </p>
                              <p className="mt-1 text-[#64736D]">
                                {caso.categoria || "sem categoria"} · {caso.resumo || caso.titulo}
                              </p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <span className={prioridadeClassName(caso.prioridade)}>
                                {labelTexto(caso.prioridade)}
                              </span>
                              <span
                                className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClassName(caso.status)}`}
                              >
                                {labelTexto(caso.status)}
                              </span>
                            </div>
                          </div>
                          <p className="mt-2 text-xs text-[#64736D]">
                            Responsavel: {corretoresPorId.get(caso.responsavel_id ?? "") ?? "-"}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </article>
              ))}
            </div>
          </section>
        ) : (
          <section className="mt-6 rounded-3xl border border-dashed border-[#E8DDCB] bg-white p-6 text-sm text-[#64736D] shadow-sm">
            Selecione um imovel nos filtros para visualizar o historico anual de
            manutencoes, conflitos, criticidade e linha do tempo mensal.
          </section>
        )}

        {casoDestaque ? (
          <section className="mt-6 grid gap-6 xl:grid-cols-4">
            {[
              ["Historico resumido", casoDestaque.descricao || casoDestaque.resumo || "-"],
              ["Proxima acao sugerida", casoDestaque.proxima_acao || "-"],
              ["Risco do caso", casoDestaque.risco || "-"],
              ["Observacoes", casoDestaque.observacoes || "-"],
            ].map(([titulo, conteudo]) => (
              <article
                key={titulo}
                className="rounded-3xl border border-[#E8DDCB] bg-white p-6 shadow-sm"
              >
                <h2 className="text-lg font-semibold text-[#071E36]">{titulo}</h2>
                <p className="mt-3 text-sm leading-6 text-[#64736D]">{conteudo}</p>
              </article>
            ))}
            <article className="rounded-3xl border border-[#E8DDCB] bg-white p-6 shadow-sm xl:col-span-4">
              <h2 className="text-lg font-semibold text-[#071E36]">
                UCE Memoria relacionada
              </h2>
              <p className="mt-3 text-sm leading-6 text-[#64736D]">
                Estrutura preparada para cruzar historico de inquilino,
                proprietario e imovel quando a UCE Memoria for integrada a este
                modulo.
              </p>
            </article>
          </section>
        ) : null}
      </div>
    </main>
  );
}
