import Link from "next/link";
import { revalidatePath } from "next/cache";
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  FilePenLine,
  FileWarning,
  Home,
  KeyRound,
  MessageCircle,
  Phone,
  RotateCcw,
  UsersRound,
} from "lucide-react";

import { supabase } from "../../../../lib/supabase";

type Lead = {
  id: string;
  nome: string;
};

type Proprietario = {
  id: string;
  nome: string;
};

type Imovel = {
  id: string;
  tipo: string | null;
  cidade: string | null;
  bairro: string | null;
};

type Inquilino = {
  id: string;
  nome: string;
};

type Corretor = {
  id: string;
  nome: string;
};

type Tarefa = {
  id: string;
  titulo: string;
  descricao: string | null;
  tipo: string | null;
  status: string | null;
  prioridade: string | null;
  data: string | null;
  hora: string | null;
  lead_id: string | null;
  proprietario_id: string | null;
  imovel_id: string | null;
  inquilino_id: string | null;
  corretor_id: string | null;
  responsavel: string | null;
  origem: string | null;
};

const tiposTarefa = [
  "tarefa",
  "ligacao",
  "mensagem",
  "visita",
  "avaliacao_imovel",
  "reuniao",
  "pendencia_documental",
  "assinatura",
  "entrega_chaves",
  "follow_up",
];

const statusTarefa = ["pendente", "em_andamento", "concluida", "cancelada"];

const prioridades = ["baixa", "media", "alta", "urgente"];

const iconesPorTipo = {
  tarefa: ClipboardList,
  ligacao: Phone,
  mensagem: MessageCircle,
  visita: Home,
  avaliacao_imovel: ClipboardList,
  reuniao: UsersRound,
  pendencia_documental: FileWarning,
  assinatura: FilePenLine,
  entrega_chaves: KeyRound,
  follow_up: RotateCcw,
};

function corPrioridade(prioridade: string | null) {
  switch (prioridade) {
    case "baixa":
      return {
        barra: "bg-emerald-500",
        badge: "bg-emerald-50 text-emerald-700 ring-emerald-100",
      };
    case "alta":
      return {
        barra: "bg-orange-500",
        badge: "bg-orange-50 text-orange-700 ring-orange-100",
      };
    case "urgente":
      return {
        barra: "bg-red-500",
        badge: "bg-red-50 text-red-700 ring-red-100",
      };
    case "media":
    default:
      return {
        barra: "bg-sky-500",
        badge: "bg-sky-50 text-sky-700 ring-sky-100",
      };
  }
}

function corStatus(status: string | null) {
  switch (status) {
    case "pendente":
      return "bg-amber-50 text-amber-700 ring-amber-100";
    case "em_andamento":
      return "bg-sky-50 text-sky-700 ring-sky-100";
    case "concluida":
      return "bg-emerald-50 text-emerald-700 ring-emerald-100";
    case "cancelada":
      return "bg-slate-100 text-slate-600 ring-slate-200";
    default:
      return "bg-[#F7F3ED] text-[#64736D] ring-[#E8DDCB]";
  }
}

function iniciaisResponsavel(nome: string | null) {
  if (!nome) return "TZ";

  return nome
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte[0])
    .join("")
    .toUpperCase();
}

function valorTexto(formData: FormData, campo: string) {
  return String(formData.get(campo) ?? "").trim();
}

function valorOpcional(formData: FormData, campo: string) {
  const valor = valorTexto(formData, campo);

  return valor || null;
}

function uuidOpcional(formData: FormData, campo: string) {
  const valor = valorTexto(formData, campo);

  return valor === "" ? null : valor;
}

function labelTexto(valor: string | null) {
  if (!valor) return "—";

  return valor.replaceAll("_", " ");
}

function dataHoje() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
  }).format(new Date());
}

function formatarData(data: string | null) {
  if (!data) return "Sem data";

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(new Date(`${data}T00:00:00.000Z`));
}

function etiquetaData(data: string | null, hoje: string) {
  if (!data) return "Sem data";

  const dataTarefa = new Date(`${data}T00:00:00.000Z`);
  const dataHoje = new Date(`${hoje}T00:00:00.000Z`);
  const diferencaDias = Math.round(
    (dataTarefa.getTime() - dataHoje.getTime()) / 86_400_000,
  );

  if (diferencaDias === 0) return "Hoje";
  if (diferencaDias === 1) return "Amanhã";
  if (diferencaDias > 1 && diferencaDias <= 7) return "Esta semana";

  return formatarData(data);
}

function corEtiquetaData(data: string | null, hoje: string) {
  const etiqueta = etiquetaData(data, hoje);

  switch (etiqueta) {
    case "Hoje":
      return "border-[#C89B3C]/30 bg-[#C89B3C]/10 text-[#8B6827]";
    case "Amanhã":
      return "border-sky-100 bg-sky-50 text-sky-700";
    case "Esta semana":
      return "border-[#071E36]/10 bg-[#071E36]/5 text-[#071E36]";
    case "Sem data":
      return "border-slate-200 bg-slate-50 text-slate-500";
    default:
      return "border-[#E8DDCB] bg-white text-[#64736D]";
  }
}

function formatarHora(hora: string | null) {
  if (!hora) return "";

  return hora.slice(0, 5);
}

function descricaoCurta(descricao: string | null) {
  if (!descricao) return null;

  return descricao.length > 140 ? `${descricao.slice(0, 140)}...` : descricao;
}

function nomeImovel(imovel: Imovel | undefined) {
  if (!imovel) return null;

  return [imovel.tipo, imovel.cidade, imovel.bairro].filter(Boolean).join(" • ");
}

function TarefaCard({
  tarefa,
  hoje,
  leadsPorId,
  proprietariosPorId,
  imoveisPorId,
  inquilinosPorId,
  corretoresPorId,
}: {
  tarefa: Tarefa;
  hoje: string;
  leadsPorId: Map<string, string>;
  proprietariosPorId: Map<string, string>;
  imoveisPorId: Map<string, Imovel>;
  inquilinosPorId: Map<string, string>;
  corretoresPorId: Map<string, string>;
}) {
  const IconeTipo =
    iconesPorTipo[tarefa.tipo as keyof typeof iconesPorTipo] ?? ClipboardList;
  const prioridade = corPrioridade(tarefa.prioridade);

  const vinculos = [
    tarefa.lead_id ? ["Lead", leadsPorId.get(tarefa.lead_id)] : null,
    tarefa.proprietario_id
      ? ["Proprietário", proprietariosPorId.get(tarefa.proprietario_id)]
      : null,
    tarefa.imovel_id ? ["Imóvel", nomeImovel(imoveisPorId.get(tarefa.imovel_id))] : null,
    tarefa.inquilino_id
      ? ["Inquilino", inquilinosPorId.get(tarefa.inquilino_id)]
      : null,
    tarefa.corretor_id ? ["Corretor", corretoresPorId.get(tarefa.corretor_id)] : null,
  ].filter((vinculo): vinculo is string[] => Boolean(vinculo?.[1]));

  return (
    <article className="group relative cursor-pointer overflow-hidden rounded-3xl border border-[#E8DDCB] bg-white p-5 shadow-sm transition duration-200 hover:scale-[1.01] hover:border-[#C89B3C]/35 hover:shadow-xl hover:shadow-[#071E36]/10">
      <span
        aria-hidden="true"
        className={`absolute inset-y-0 left-0 w-[5px] ${prioridade.barra}`}
      />

      <div className="flex flex-wrap items-start justify-between gap-4 pl-2">
        <div className="flex min-w-0 flex-1 gap-4">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[#E8DDCB] bg-[#F7F3ED] text-[#071E36] transition group-hover:border-[#C89B3C]/40 group-hover:bg-[#C89B3C]/10">
            <IconeTipo size={19} strokeWidth={2.2} />
          </span>
          <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-semibold leading-tight text-[#071E36]">
              {tarefa.titulo}
            </h3>
            <span
              className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] ring-1 ${corStatus(
                tarefa.status,
              )}`}
            >
              {labelTexto(tarefa.status)}
            </span>
          </div>
          <p
            className={`mt-3 inline-flex rounded-full border px-3 py-1 text-sm font-medium ${corEtiquetaData(
              tarefa.data,
              hoje,
            )}`}
          >
            {etiquetaData(tarefa.data, hoje)}
            {tarefa.hora ? ` às ${formatarHora(tarefa.hora)}` : ""}
          </p>
        </div>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] ring-1 ${prioridade.badge}`}
        >
          {labelTexto(tarefa.prioridade)}
        </span>
      </div>

      <div className="mt-5 flex flex-wrap gap-2 pl-2 text-xs font-medium">
        <span className="rounded-full bg-[#071E36]/10 px-3 py-1 text-[#071E36]">
          {labelTexto(tarefa.tipo)}
        </span>
        <span className="rounded-full bg-[#F7F3ED] px-3 py-1 text-[#64736D]">
          {tarefa.origem || "manual"}
        </span>
      </div>

      {descricaoCurta(tarefa.descricao) ? (
        <p className="mt-5 pl-2 text-sm leading-6 text-[#64736D]">
          {descricaoCurta(tarefa.descricao)}
        </p>
      ) : null}

      <div className="mt-5 grid gap-4 border-t border-[#E8DDCB]/70 pt-4 pl-2 text-sm text-[#102A27]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#071E36] text-xs font-bold text-[#E1B866] shadow-sm">
              {iniciaisResponsavel(tarefa.responsavel)}
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#64736D]">
                Responsável
              </p>
              <p className="font-semibold text-[#071E36]">
                {tarefa.responsavel || "Sem responsável"}
              </p>
            </div>
          </div>

          <span className="text-xs font-medium text-[#C89B3C] opacity-0 transition group-hover:opacity-100">
            Ver detalhes →
          </span>
        </div>

        {vinculos.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {vinculos.map(([label, nome]) => (
              <span
                key={`${label}-${nome}`}
                className="rounded-full border border-[#E8DDCB] bg-[#fffdfa] px-3 py-1 text-xs font-medium text-[#64736D]"
              >
                {label}: {nome}
              </span>
            ))}
          </div>
        ) : null}
      </div>
    </article>
  );
}

function GrupoTarefas({
  titulo,
  tarefas,
  hoje,
  leadsPorId,
  proprietariosPorId,
  imoveisPorId,
  inquilinosPorId,
  corretoresPorId,
}: {
  titulo: string;
  tarefas: Tarefa[];
  hoje: string;
  leadsPorId: Map<string, string>;
  proprietariosPorId: Map<string, string>;
  imoveisPorId: Map<string, Imovel>;
  inquilinosPorId: Map<string, string>;
  corretoresPorId: Map<string, string>;
}) {
  return (
    <section className="rounded-3xl border border-[#E8DDCB] bg-white/80 p-5 shadow-sm backdrop-blur-sm">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-semibold text-[#071E36]">{titulo}</h2>
        <span className="rounded-full border border-[#C89B3C]/25 bg-[#C89B3C]/10 px-3 py-1 text-sm font-semibold text-[#8B6827]">
          {tarefas.length}
        </span>
      </div>

      {tarefas.length === 0 ? (
        <p className="mt-5 rounded-2xl border border-dashed border-[#E8DDCB] bg-[#F7F3ED] px-4 py-10 text-center text-sm text-[#64736D]">
          Nenhuma tarefa neste bloco.
        </p>
      ) : (
        <div className="mt-5 grid gap-4">
          {tarefas.map((tarefa) => (
            <TarefaCard
              key={tarefa.id}
              tarefa={tarefa}
              hoje={hoje}
              leadsPorId={leadsPorId}
              proprietariosPorId={proprietariosPorId}
              imoveisPorId={imoveisPorId}
              inquilinosPorId={inquilinosPorId}
              corretoresPorId={corretoresPorId}
            />
          ))}
        </div>
      )}
    </section>
  );
}

export default async function AgendaPage() {
  async function cadastrarTarefa(formData: FormData) {
    "use server";

    const titulo = valorTexto(formData, "titulo");

    if (!titulo) {
      throw new Error("O título da tarefa é obrigatório.");
    }

    const status = valorTexto(formData, "status") || "pendente";
    const tipo = valorTexto(formData, "tipo") || "tarefa";
    const descricao = valorOpcional(formData, "descricao");
    const leadId = uuidOpcional(formData, "lead_id");
    const proprietarioId = uuidOpcional(formData, "proprietario_id");
    const inquilinoId = uuidOpcional(formData, "inquilino_id");
    const imovelId = uuidOpcional(formData, "imovel_id");
    const corretorId = uuidOpcional(formData, "corretor_id");
    const origem = valorTexto(formData, "origem") || "manual";

    const { error } = await supabase.from("tarefas").insert({
      titulo,
      descricao,
      tipo,
      status,
      prioridade: valorTexto(formData, "prioridade") || "media",
      data: valorOpcional(formData, "data"),
      hora: valorOpcional(formData, "hora"),
      lead_id: leadId,
      proprietario_id: proprietarioId,
      imovel_id: imovelId,
      inquilino_id: inquilinoId,
      corretor_id: corretorId,
      responsavel: valorOpcional(formData, "responsavel"),
      origem,
    });

    if (error) {
      throw new Error("Não foi possível salvar a tarefa.");
    }

    const eventoTimeline =
      status === "concluida"
        ? {
            tipo: "tarefa_concluida",
            titulo: "Tarefa concluída.",
          }
        : {
            tipo: "tarefa_criada",
            titulo: "Tarefa criada.",
          };

    const timelinePayload = {
      tipo: eventoTimeline.tipo,
      titulo: eventoTimeline.titulo,
      descricao: descricao || titulo,
      lead_id: leadId,
      proprietario_id: proprietarioId,
      inquilino_id: inquilinoId,
      imovel_id: imovelId,
      corretor_id: corretorId,
      origem,
    };

    const { error: timelineError } = await supabase
      .from("timeline")
      .insert(timelinePayload);

    if (timelineError) {
      console.error("timelineError", timelineError);

      throw new Error(
        `Não foi possível registrar a tarefa na timeline: ${
          timelineError.message || "erro desconhecido"
        }`,
      );
    }

    revalidatePath("/dashboard/crm/agenda");
    revalidatePath("/dashboard/crm/timeline");
  }

  const [
    tarefasResult,
    leadsResult,
    proprietariosResult,
    imoveisResult,
    inquilinosResult,
    corretoresResult,
  ] = await Promise.all([
    supabase
      .from("tarefas")
      .select(
        "id, titulo, descricao, tipo, status, prioridade, data, hora, lead_id, proprietario_id, imovel_id, inquilino_id, corretor_id, responsavel, origem",
      )
      .order("data", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: false }),
    supabase.from("leads").select("id, nome").order("nome", { ascending: true }),
    supabase
      .from("proprietarios")
      .select("id, nome")
      .order("nome", { ascending: true }),
    supabase
      .from("imoveis")
      .select("id, tipo, cidade, bairro")
      .order("created_at", { ascending: false }),
    supabase
      .from("inquilinos")
      .select("id, nome")
      .order("nome", { ascending: true }),
    supabase
      .from("corretores")
      .select("id, nome")
      .order("nome", { ascending: true }),
  ]);

  const tarefas = (tarefasResult.data ?? []) as Tarefa[];
  const leads = (leadsResult.data ?? []) as Lead[];
  const proprietarios = (proprietariosResult.data ?? []) as Proprietario[];
  const imoveis = (imoveisResult.data ?? []) as Imovel[];
  const inquilinos = (inquilinosResult.data ?? []) as Inquilino[];
  const corretores = (corretoresResult.data ?? []) as Corretor[];

  const leadsPorId = new Map(leads.map((lead) => [lead.id, lead.nome]));
  const proprietariosPorId = new Map(
    proprietarios.map((proprietario) => [proprietario.id, proprietario.nome]),
  );
  const imoveisPorId = new Map(imoveis.map((imovel) => [imovel.id, imovel]));
  const inquilinosPorId = new Map(
    inquilinos.map((inquilino) => [inquilino.id, inquilino.nome]),
  );
  const corretoresPorId = new Map(
    corretores.map((corretor) => [corretor.id, corretor.nome]),
  );

  const hoje = dataHoje();
  const tarefasAbertas = tarefas.filter((tarefa) => tarefa.status !== "concluida");
  const tarefasHoje = tarefasAbertas.filter((tarefa) => tarefa.data === hoje);
  const tarefasProximas = tarefasAbertas.filter(
    (tarefa) => tarefa.data && tarefa.data !== hoje,
  );
  const tarefasSemData = tarefasAbertas.filter((tarefa) => !tarefa.data);
  const tarefasConcluidas = tarefas.filter((tarefa) => tarefa.status === "concluida");
  const cardsResumo = [
    {
      titulo: "Hoje",
      valor: tarefasHoje.length,
      descricao: "Compromissos do dia",
      icone: CalendarDays,
      cor: "bg-[#071E36] text-[#E1B866]",
    },
    {
      titulo: "Próximas",
      valor: tarefasProximas.length,
      descricao: "Agenda futura",
      icone: ClipboardList,
      cor: "bg-sky-50 text-sky-700",
    },
    {
      titulo: "Pendentes",
      valor: tarefasSemData.length,
      descricao: "Sem data definida",
      icone: AlertTriangle,
      cor: "bg-amber-50 text-amber-700",
    },
    {
      titulo: "Concluídas",
      valor: tarefasConcluidas.length,
      descricao: "Finalizadas",
      icone: CheckCircle2,
      cor: "bg-emerald-50 text-emerald-700",
    },
  ];

  const erroCarregamento =
    tarefasResult.error ||
    leadsResult.error ||
    proprietariosResult.error ||
    imoveisResult.error ||
    inquilinosResult.error ||
    corretoresResult.error;

  return (
    <main className="min-h-screen bg-[#F7F3ED] px-6 py-10 sm:px-8">
      <div className="mx-auto max-w-7xl">
        <Link
          href="/dashboard"
          className="inline-flex rounded-xl border border-[#E8DDCB] bg-white px-4 py-2 text-sm font-medium text-[#071E36] transition hover:border-[#C89B3C]/45 hover:bg-[#C89B3C]/10"
        >
          ← Voltar ao Dashboard
        </Link>

        <header className="mt-8 rounded-[2rem] border border-[#E8DDCB] bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-4">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#071E36] text-[#E1B866] shadow-lg shadow-[#071E36]/15">
                <CalendarDays size={25} strokeWidth={2.2} />
              </span>
              <div>
                <span className="rounded-full border border-[#C89B3C]/35 bg-[#C89B3C]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#8B6827]">
                  Terrazza CRM
                </span>
                <h1 className="mt-4 text-4xl font-bold tracking-tight text-[#071E36]">
                  Agenda Inteligente
                </h1>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-[#64736D]">
                  Tarefas, visitas, retornos e pendências comerciais organizadas
                  em uma visão operacional premium.
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-[#E8DDCB] bg-[#F7F3ED] px-4 py-3 text-sm text-[#64736D]">
              <span className="block text-xs font-semibold uppercase tracking-[0.14em] text-[#8B6827]">
                Visão
              </span>
              <strong className="mt-1 block text-[#071E36]">
                Comercial e Operacional
              </strong>
            </div>
          </div>

          <div className="mt-6 h-px bg-gradient-to-r from-[#C89B3C]/60 via-[#E8DDCB] to-transparent" />
        </header>

        <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {cardsResumo.map((card) => {
            const IconeResumo = card.icone;

            return (
              <article
                key={card.titulo}
                className="rounded-3xl border border-[#E8DDCB] bg-white p-5 shadow-sm transition duration-200 hover:scale-[1.01] hover:border-[#C89B3C]/35 hover:shadow-xl hover:shadow-[#071E36]/10"
              >
                <div className="flex items-center justify-between gap-4">
                  <span
                    className={`flex h-11 w-11 items-center justify-center rounded-2xl ${card.cor}`}
                  >
                    <IconeResumo size={20} strokeWidth={2.2} />
                  </span>
                  <strong className="text-3xl font-bold text-[#071E36]">
                    {card.valor}
                  </strong>
                </div>
                <h2 className="mt-4 text-sm font-semibold uppercase tracking-[0.14em] text-[#071E36]">
                  {card.titulo}
                </h2>
                <p className="mt-1 text-sm text-[#64736D]">{card.descricao}</p>
              </article>
            );
          })}
        </section>

        <section className="mt-6 rounded-3xl border border-[#E8DDCB] bg-white p-6 shadow-sm sm:p-8">
          <h2 className="text-xl font-semibold text-[#071E36]">
            Nova tarefa
          </h2>

          <form action={cadastrarTarefa} className="mt-6 grid gap-5 md:grid-cols-3">
            <label className="grid gap-2 text-sm font-medium text-[#102A27]">
              Título
              <input
                name="titulo"
                required
                className="rounded-xl border border-[#E8DDCB] px-4 py-3 text-[#071E36] outline-none transition placeholder:text-[#9a9d98] focus:border-[#C89B3C]"
                placeholder="Ex.: Retornar lead do WhatsApp"
              />
            </label>

            <label className="grid gap-2 text-sm font-medium text-[#102A27]">
              Tipo
              <select
                name="tipo"
                defaultValue="tarefa"
                className="rounded-xl border border-[#E8DDCB] bg-white px-4 py-3 text-[#071E36] outline-none transition focus:border-[#C89B3C]"
              >
                {tiposTarefa.map((tipo) => (
                  <option key={tipo} value={tipo}>
                    {labelTexto(tipo)}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-2 text-sm font-medium text-[#102A27]">
              Status
              <select
                name="status"
                defaultValue="pendente"
                className="rounded-xl border border-[#E8DDCB] bg-white px-4 py-3 text-[#071E36] outline-none transition focus:border-[#C89B3C]"
              >
                {statusTarefa.map((status) => (
                  <option key={status} value={status}>
                    {labelTexto(status)}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-2 text-sm font-medium text-[#102A27]">
              Prioridade
              <select
                name="prioridade"
                defaultValue="media"
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
              Data
              <input
                name="data"
                type="date"
                className="rounded-xl border border-[#E8DDCB] px-4 py-3 text-[#071E36] outline-none transition focus:border-[#C89B3C]"
              />
            </label>

            <label className="grid gap-2 text-sm font-medium text-[#102A27]">
              Hora
              <input
                name="hora"
                type="time"
                className="rounded-xl border border-[#E8DDCB] px-4 py-3 text-[#071E36] outline-none transition focus:border-[#C89B3C]"
              />
            </label>

            <label className="grid gap-2 text-sm font-medium text-[#102A27]">
              Lead
              <select
                name="lead_id"
                defaultValue=""
                className="rounded-xl border border-[#E8DDCB] bg-white px-4 py-3 text-[#071E36] outline-none transition focus:border-[#C89B3C]"
              >
                <option value="">Sem lead vinculado</option>
                {leads.map((lead) => (
                  <option key={lead.id} value={lead.id}>
                    {lead.nome}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-2 text-sm font-medium text-[#102A27]">
              Proprietário
              <select
                name="proprietario_id"
                defaultValue=""
                className="rounded-xl border border-[#E8DDCB] bg-white px-4 py-3 text-[#071E36] outline-none transition focus:border-[#C89B3C]"
              >
                <option value="">Sem proprietário vinculado</option>
                {proprietarios.map((proprietario) => (
                  <option key={proprietario.id} value={proprietario.id}>
                    {proprietario.nome}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-2 text-sm font-medium text-[#102A27]">
              Imóvel
              <select
                name="imovel_id"
                defaultValue=""
                className="rounded-xl border border-[#E8DDCB] bg-white px-4 py-3 text-[#071E36] outline-none transition focus:border-[#C89B3C]"
              >
                <option value="">Sem imóvel vinculado</option>
                {imoveis.map((imovel) => (
                  <option key={imovel.id} value={imovel.id}>
                    {nomeImovel(imovel) || "Imóvel sem identificação"}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-2 text-sm font-medium text-[#102A27]">
              Inquilino
              <select
                name="inquilino_id"
                defaultValue=""
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
              Corretor
              <select
                name="corretor_id"
                defaultValue=""
                className="rounded-xl border border-[#E8DDCB] bg-white px-4 py-3 text-[#071E36] outline-none transition focus:border-[#C89B3C]"
              >
                <option value="">Sem corretor vinculado</option>
                {corretores.map((corretor) => (
                  <option key={corretor.id} value={corretor.id}>
                    {corretor.nome}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-2 text-sm font-medium text-[#102A27]">
              Responsável
              <input
                name="responsavel"
                className="rounded-xl border border-[#E8DDCB] px-4 py-3 text-[#071E36] outline-none transition placeholder:text-[#9a9d98] focus:border-[#C89B3C]"
                placeholder="Pessoa responsável"
              />
            </label>

            <label className="grid gap-2 text-sm font-medium text-[#102A27]">
              Origem
              <input
                name="origem"
                defaultValue="manual"
                className="rounded-xl border border-[#E8DDCB] px-4 py-3 text-[#071E36] outline-none transition placeholder:text-[#9a9d98] focus:border-[#C89B3C]"
                placeholder="manual"
              />
            </label>

            <label className="grid gap-2 text-sm font-medium text-[#102A27] md:col-span-3">
              Descrição
              <textarea
                name="descricao"
                rows={4}
                className="rounded-xl border border-[#E8DDCB] px-4 py-3 text-[#071E36] outline-none transition placeholder:text-[#9a9d98] focus:border-[#C89B3C]"
                placeholder="Contexto, combinados, próximos passos..."
              />
            </label>

            <div className="md:col-span-3">
              <button
                type="submit"
                className="rounded-xl bg-[#071E36] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#0A2A4A]"
              >
                Salvar Tarefa
              </button>
            </div>
          </form>
        </section>

        {erroCarregamento ? (
          <p className="mt-6 rounded-xl bg-[#fbebe7] px-4 py-3 text-sm text-[#8a2e1c]">
            Não foi possível carregar todos os dados da agenda. Verifique se a tabela
            tarefas já foi criada.
          </p>
        ) : (
          <div className="mt-8 grid gap-6 xl:grid-cols-2">
            <GrupoTarefas
              titulo="Hoje"
              tarefas={tarefasHoje}
              hoje={hoje}
              leadsPorId={leadsPorId}
              proprietariosPorId={proprietariosPorId}
              imoveisPorId={imoveisPorId}
              inquilinosPorId={inquilinosPorId}
              corretoresPorId={corretoresPorId}
            />
            <GrupoTarefas
              titulo="Próximas"
              tarefas={tarefasProximas}
              hoje={hoje}
              leadsPorId={leadsPorId}
              proprietariosPorId={proprietariosPorId}
              imoveisPorId={imoveisPorId}
              inquilinosPorId={inquilinosPorId}
              corretoresPorId={corretoresPorId}
            />
            <GrupoTarefas
              titulo="Pendentes sem data"
              tarefas={tarefasSemData}
              hoje={hoje}
              leadsPorId={leadsPorId}
              proprietariosPorId={proprietariosPorId}
              imoveisPorId={imoveisPorId}
              inquilinosPorId={inquilinosPorId}
              corretoresPorId={corretoresPorId}
            />
            <GrupoTarefas
              titulo="Concluídas"
              tarefas={tarefasConcluidas}
              hoje={hoje}
              leadsPorId={leadsPorId}
              proprietariosPorId={proprietariosPorId}
              imoveisPorId={imoveisPorId}
              inquilinosPorId={inquilinosPorId}
              corretoresPorId={corretoresPorId}
            />
          </div>
        )}
      </div>
    </main>
  );
}
