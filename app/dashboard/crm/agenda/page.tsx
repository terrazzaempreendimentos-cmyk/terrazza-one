import Link from "next/link";
import { revalidatePath } from "next/cache";

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
  leadsPorId,
  proprietariosPorId,
  imoveisPorId,
  inquilinosPorId,
  corretoresPorId,
}: {
  tarefa: Tarefa;
  leadsPorId: Map<string, string>;
  proprietariosPorId: Map<string, string>;
  imoveisPorId: Map<string, Imovel>;
  inquilinosPorId: Map<string, string>;
  corretoresPorId: Map<string, string>;
}) {
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
    <article className="rounded-2xl border border-[#E8DDCB] bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-[#071E36]">{tarefa.titulo}</h3>
          <p className="mt-1 text-sm text-[#64736D]">
            {formatarData(tarefa.data)}
            {tarefa.hora ? ` às ${formatarHora(tarefa.hora)}` : ""}
          </p>
        </div>
        <span className="rounded-full bg-[#C89B3C]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-[#8B6827]">
          {labelTexto(tarefa.prioridade)}
        </span>
      </div>

      <div className="mt-4 flex flex-wrap gap-2 text-xs font-medium">
        <span className="rounded-full bg-[#071E36]/10 px-3 py-1 text-[#071E36]">
          {labelTexto(tarefa.tipo)}
        </span>
        <span className="rounded-full bg-[#F7F3ED] px-3 py-1 text-[#64736D]">
          {labelTexto(tarefa.status)}
        </span>
        <span className="rounded-full bg-[#F7F3ED] px-3 py-1 text-[#64736D]">
          {tarefa.origem || "manual"}
        </span>
      </div>

      {descricaoCurta(tarefa.descricao) ? (
        <p className="mt-4 text-sm leading-6 text-[#64736D]">
          {descricaoCurta(tarefa.descricao)}
        </p>
      ) : null}

      <div className="mt-4 grid gap-2 text-sm text-[#102A27]">
        <span>
          <strong className="font-semibold text-[#071E36]">Responsável:</strong>{" "}
          {tarefa.responsavel || "—"}
        </span>

        {vinculos.length > 0 ? (
          <div className="flex flex-wrap gap-2 pt-1">
            {vinculos.map(([label, nome]) => (
              <span
                key={`${label}-${nome}`}
                className="rounded-full border border-[#E8DDCB] px-3 py-1 text-xs text-[#64736D]"
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
  leadsPorId,
  proprietariosPorId,
  imoveisPorId,
  inquilinosPorId,
  corretoresPorId,
}: {
  titulo: string;
  tarefas: Tarefa[];
  leadsPorId: Map<string, string>;
  proprietariosPorId: Map<string, string>;
  imoveisPorId: Map<string, Imovel>;
  inquilinosPorId: Map<string, string>;
  corretoresPorId: Map<string, string>;
}) {
  return (
    <section className="rounded-2xl border border-[#E8DDCB] bg-white/70 p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-semibold text-[#071E36]">{titulo}</h2>
        <span className="rounded-full bg-[#C89B3C]/10 px-3 py-1 text-sm font-medium text-[#8B6827]">
          {tarefas.length}
        </span>
      </div>

      {tarefas.length === 0 ? (
        <p className="mt-5 rounded-xl bg-[#F7F3ED] px-4 py-8 text-center text-sm text-[#64736D]">
          Nenhuma tarefa neste bloco.
        </p>
      ) : (
        <div className="mt-5 grid gap-4">
          {tarefas.map((tarefa) => (
            <TarefaCard
              key={tarefa.id}
              tarefa={tarefa}
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

    const { error } = await supabase.from("tarefas").insert({
      titulo,
      descricao: valorOpcional(formData, "descricao"),
      tipo: valorTexto(formData, "tipo") || "tarefa",
      status: valorTexto(formData, "status") || "pendente",
      prioridade: valorTexto(formData, "prioridade") || "media",
      data: valorOpcional(formData, "data"),
      hora: valorOpcional(formData, "hora"),
      lead_id: valorOpcional(formData, "lead_id"),
      proprietario_id: valorOpcional(formData, "proprietario_id"),
      imovel_id: valorOpcional(formData, "imovel_id"),
      inquilino_id: valorOpcional(formData, "inquilino_id"),
      corretor_id: valorOpcional(formData, "corretor_id"),
      responsavel: valorOpcional(formData, "responsavel"),
      origem: valorTexto(formData, "origem") || "manual",
    });

    if (error) {
      throw new Error("Não foi possível salvar a tarefa.");
    }

    revalidatePath("/dashboard/crm/agenda");
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

        <div className="mt-8">
          <span className="rounded-full border border-[#C89B3C]/35 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#8B6827]">
            Terrazza CRM
          </span>
          <h1 className="mt-5 text-4xl font-bold text-[#071E36]">
            Agenda Inteligente
          </h1>
          <p className="mt-2 max-w-3xl text-[#64736D]">
            Tarefas, visitas, retornos e pendências comerciais da Terrazza CRM.
          </p>
        </div>

        <section className="mt-10 rounded-2xl border border-[#E8DDCB] bg-white p-6 shadow-sm sm:p-8">
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
              leadsPorId={leadsPorId}
              proprietariosPorId={proprietariosPorId}
              imoveisPorId={imoveisPorId}
              inquilinosPorId={inquilinosPorId}
              corretoresPorId={corretoresPorId}
            />
            <GrupoTarefas
              titulo="Próximas"
              tarefas={tarefasProximas}
              leadsPorId={leadsPorId}
              proprietariosPorId={proprietariosPorId}
              imoveisPorId={imoveisPorId}
              inquilinosPorId={inquilinosPorId}
              corretoresPorId={corretoresPorId}
            />
            <GrupoTarefas
              titulo="Pendentes sem data"
              tarefas={tarefasSemData}
              leadsPorId={leadsPorId}
              proprietariosPorId={proprietariosPorId}
              imoveisPorId={imoveisPorId}
              inquilinosPorId={inquilinosPorId}
              corretoresPorId={corretoresPorId}
            />
            <GrupoTarefas
              titulo="Concluídas"
              tarefas={tarefasConcluidas}
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
