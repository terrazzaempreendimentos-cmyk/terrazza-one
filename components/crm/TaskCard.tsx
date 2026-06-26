import {
  CalendarDays,
  Clock3,
  ClipboardList,
  FilePenLine,
  Home,
  MessageCircle,
  Phone,
  UsersRound,
} from "lucide-react";

export type AgendaTask = {
  id: string;
  titulo: string;
  descricao: string | null;
  tipo: string | null;
  status: string | null;
  prioridade: string | null;
  data: string | null;
  hora: string | null;
  responsavel: string | null;
  origem: string | null;
};

const tipoConfig = {
  visita: {
    label: "Visita",
    icon: Home,
    badge: "bg-sky-50 text-sky-700 ring-sky-100",
    accent: "bg-sky-500",
  },
  reuniao: {
    label: "Reunião",
    icon: UsersRound,
    badge: "bg-violet-50 text-violet-700 ring-violet-100",
    accent: "bg-violet-500",
  },
  ligacao: {
    label: "Ligação",
    icon: Phone,
    badge: "bg-emerald-50 text-emerald-700 ring-emerald-100",
    accent: "bg-emerald-500",
  },
  contrato: {
    label: "Contrato",
    icon: FilePenLine,
    badge: "bg-[#C89B3C]/10 text-[#8B6827] ring-[#C89B3C]/25",
    accent: "bg-[#C89B3C]",
  },
  assinatura: {
    label: "Contrato",
    icon: FilePenLine,
    badge: "bg-[#C89B3C]/10 text-[#8B6827] ring-[#C89B3C]/25",
    accent: "bg-[#C89B3C]",
  },
  mensagem: {
    label: "Mensagem",
    icon: MessageCircle,
    badge: "bg-slate-100 text-slate-700 ring-slate-200",
    accent: "bg-slate-400",
  },
} as const;

function labelTexto(valor: string | null) {
  if (!valor) return "—";

  return valor.replaceAll("_", " ");
}

function formatarData(data: string | null) {
  if (!data) return "Sem data";

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(new Date(`${data}T00:00:00.000Z`));
}

function formatarHora(hora: string | null) {
  if (!hora) return "Sem hora";

  return hora.slice(0, 5);
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

function prioridadeConfig(prioridade: string | null) {
  switch (prioridade) {
    case "urgente":
      return {
        label: "Urgente",
        badge: "bg-red-50 text-red-700 ring-red-100",
        accent: "bg-red-500",
      };
    case "alta":
      return {
        label: "Alta",
        badge: "bg-[#C89B3C]/10 text-[#8B6827] ring-[#C89B3C]/25",
        accent: "bg-[#C89B3C]",
      };
    case "baixa":
      return {
        label: "Baixa",
        badge: "bg-slate-100 text-slate-600 ring-slate-200",
        accent: "bg-slate-400",
      };
    case "media":
    default:
      return {
        label: "Média",
        badge: "bg-sky-50 text-sky-700 ring-sky-100",
        accent: "bg-sky-500",
      };
  }
}

function statusBadge(status: string | null) {
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

export function TaskCard({ tarefa }: { tarefa: AgendaTask }) {
  const tipo =
    tipoConfig[tarefa.tipo as keyof typeof tipoConfig] ?? {
      label: labelTexto(tarefa.tipo),
      icon: ClipboardList,
      badge: "bg-[#071E36]/10 text-[#071E36] ring-[#071E36]/10",
      accent: "bg-[#071E36]",
    };
  const prioridade = prioridadeConfig(tarefa.prioridade);
  const IconeTipo = tipo.icon;

  return (
    <article className="group relative cursor-pointer overflow-hidden rounded-3xl border border-[#E8DDCB] bg-white p-5 shadow-sm transition duration-300 hover:scale-[1.01] hover:border-[#C89B3C]/35 hover:shadow-xl hover:shadow-[#071E36]/10">
      <span
        aria-hidden="true"
        className={`absolute inset-y-0 left-0 w-[5px] ${prioridade.accent}`}
      />

      <div className="flex flex-wrap items-start justify-between gap-4 pl-2">
        <div className="flex min-w-0 flex-1 gap-4">
          <span
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-white shadow-sm ${tipo.accent}`}
          >
            <IconeTipo size={19} strokeWidth={2.2} />
          </span>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-lg font-semibold leading-tight text-[#071E36]">
                {tarefa.titulo}
              </h3>
              <span
                className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] ring-1 ${statusBadge(
                  tarefa.status,
                )}`}
              >
                {labelTexto(tarefa.status)}
              </span>
            </div>

            <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
              <span
                className={`rounded-full px-3 py-1 uppercase tracking-[0.12em] ring-1 ${tipo.badge}`}
              >
                {tipo.label}
              </span>
              <span
                className={`rounded-full px-3 py-1 uppercase tracking-[0.12em] ring-1 ${prioridade.badge}`}
              >
                {prioridade.label}
              </span>
            </div>
          </div>
        </div>

        <span className="rounded-full border border-[#C89B3C]/30 bg-[#C89B3C]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#8B6827]">
          {tarefa.origem || "manual"}
        </span>
      </div>

      <div className="mt-5 grid gap-3 pl-2 text-sm text-[#64736D] sm:grid-cols-2">
        <div className="flex items-center gap-2 rounded-2xl bg-[#F7F3ED] px-3 py-2">
          <CalendarDays size={16} className="text-[#C89B3C]" />
          <span>{formatarData(tarefa.data)}</span>
        </div>
        <div className="flex items-center gap-2 rounded-2xl bg-[#F7F3ED] px-3 py-2">
          <Clock3 size={16} className="text-[#C89B3C]" />
          <span>{formatarHora(tarefa.hora)}</span>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-[#E8DDCB]/70 pt-4 pl-2">
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
    </article>
  );
}
