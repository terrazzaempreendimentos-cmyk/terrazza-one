import Link from "next/link";
import { revalidatePath } from "next/cache";
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
} from "lucide-react";

import { AgendaSemanal } from "../../../../components/crm/AgendaSemanal";
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

function nomeImovel(imovel: Imovel | undefined) {
  if (!imovel) return null;

  return [imovel.tipo, imovel.cidade, imovel.bairro].filter(Boolean).join(" • ");
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
          <AgendaSemanal tarefas={tarefas} hoje={hoje} />
        )}
      </div>
    </main>
  );
}
