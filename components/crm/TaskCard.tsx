"use client";

import { useState } from "react";
import {
  AlertTriangle,
  CalendarDays,
  Clock3,
  ClipboardList,
  FileText,
  Handshake,
  Home,
  Mail,
  MoreHorizontal,
  Phone,
  Timer,
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
  ligacao: {
    label: "Ligação",
    emoji: "📞",
    icon: Phone,
    badge: "bg-emerald-50 text-emerald-700 ring-emerald-100",
    accent: "bg-emerald-500",
  },
  visita: {
    label: "Visita",
    emoji: "🏠",
    icon: Home,
    badge: "bg-sky-50 text-sky-700 ring-sky-100",
    accent: "bg-sky-500",
  },
  contrato: {
    label: "Contrato",
    emoji: "📄",
    icon: FileText,
    badge: "bg-[#C89B3C]/10 text-[#8B6827] ring-[#C89B3C]/25",
    accent: "bg-[#C89B3C]",
  },
  assinatura: {
    label: "Contrato",
    emoji: "📄",
    icon: FileText,
    badge: "bg-[#C89B3C]/10 text-[#8B6827] ring-[#C89B3C]/25",
    accent: "bg-[#C89B3C]",
  },
  reuniao: {
    label: "Reunião",
    emoji: "🤝",
    icon: Handshake,
    badge: "bg-violet-50 text-violet-700 ring-violet-100",
    accent: "bg-violet-500",
  },
  email: {
    label: "E-mail",
    emoji: "📧",
    icon: Mail,
    badge: "bg-indigo-50 text-indigo-700 ring-indigo-100",
    accent: "bg-indigo-500",
  },
  mensagem: {
    label: "Mensagem",
    emoji: "📧",
    icon: Mail,
    badge: "bg-indigo-50 text-indigo-700 ring-indigo-100",
    accent: "bg-indigo-500",
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

function montarDataPrazo(tarefa: AgendaTask) {
  if (!tarefa.data) return null;

  const hora = tarefa.hora?.slice(0, 5) || "23:59";
  const prazo = new Date(`${tarefa.data}T${hora}:00`);

  if (Number.isNaN(prazo.getTime())) return null;

  return prazo;
}

function diferencaEmDias(inicio: Date, fim: Date) {
  const inicioDia = new Date(
    inicio.getFullYear(),
    inicio.getMonth(),
    inicio.getDate(),
  );
  const fimDia = new Date(fim.getFullYear(), fim.getMonth(), fim.getDate());

  return Math.round((fimDia.getTime() - inicioDia.getTime()) / 86_400_000);
}

function prazoInteligente(tarefa: AgendaTask, agora: Date | null) {
  const prazo = montarDataPrazo(tarefa);
  const statusFinalizado =
    tarefa.status === "concluida" || tarefa.status === "cancelada";

  if (!prazo) {
    return {
      rotulo: "Prazo",
      valor: "Sem prazo",
      atrasada: false,
      proxima: false,
    };
  }

  if (!agora) {
    return {
      rotulo: "Começa em",
      valor: "Calculando...",
      atrasada: false,
      proxima: false,
    };
  }

  const diferencaMs = prazo.getTime() - agora.getTime();
  const diferencaMinutos = Math.ceil(diferencaMs / 60_000);

  if (diferencaMs < 0 && !statusFinalizado) {
    return {
      rotulo: "Alerta",
      valor: "Tarefa em atraso",
      atrasada: true,
      proxima: false,
    };
  }

  if (statusFinalizado) {
    return {
      rotulo: "Status",
      valor: tarefa.status === "concluida" ? "Concluída" : "Cancelada",
      atrasada: false,
      proxima: false,
    };
  }

  const dias = diferencaEmDias(agora, prazo);

  if (dias === 1) {
    return {
      rotulo: "Começa em",
      valor: "Amanhã",
      atrasada: false,
      proxima: false,
    };
  }

  if (dias > 1) {
    return {
      rotulo: "Começa em",
      valor: `Em ${dias} dias`,
      atrasada: false,
      proxima: false,
    };
  }

  if (diferencaMinutos <= 1) {
    return {
      rotulo: "Começa em",
      valor: "Agora",
      atrasada: false,
      proxima: true,
    };
  }

  if (diferencaMinutos < 60) {
    return {
      rotulo: "Começa em",
      valor: `${diferencaMinutos} minutos`,
      atrasada: false,
      proxima: diferencaMinutos < 30,
    };
  }

  const horas = Math.ceil(diferencaMinutos / 60);

  return {
    rotulo: "Começa em",
    valor: `${horas} hora${horas === 1 ? "" : "s"}`,
    atrasada: false,
    proxima: false,
  };
}

export function TaskCard({ tarefa }: { tarefa: AgendaTask }) {
  const [agora] = useState(() => new Date());
  const tipo =
    tipoConfig[tarefa.tipo as keyof typeof tipoConfig] ?? {
      label: labelTexto(tarefa.tipo),
      emoji: "📌",
      icon: ClipboardList,
      badge: "bg-[#071E36]/10 text-[#071E36] ring-[#071E36]/10",
      accent: "bg-[#071E36]",
    };
  const prioridade = prioridadeConfig(tarefa.prioridade);
  const prazo = prazoInteligente(tarefa, agora);
  const IconeTipo = tipo.icon;

  const estadoCard = prazo.atrasada
    ? "border-red-200 bg-red-50/80 shadow-red-900/5"
    : prazo.proxima
      ? "animate-pulse border-[#C89B3C] bg-white shadow-[#C89B3C]/15"
      : "border-[#E8DDCB] bg-white shadow-[#071E36]/5";

  const barraLateral = prazo.atrasada ? "bg-red-500" : prioridade.accent;

  return (
    <article
      className={`group relative cursor-pointer overflow-hidden rounded-3xl border p-5 shadow-sm transition duration-300 hover:scale-[1.01] hover:border-[#C89B3C]/45 hover:shadow-xl active:scale-[0.99] ${estadoCard}`}
    >
      <span
        aria-hidden="true"
        className={`absolute inset-y-0 left-0 w-[5px] ${barraLateral}`}
      />

      <div className="flex flex-wrap items-start justify-between gap-4 pl-2">
        <div className="flex min-w-0 flex-1 gap-4">
          <span
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-lg text-white shadow-sm ${tipo.accent}`}
            aria-hidden="true"
          >
            {tipo.emoji}
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
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 uppercase tracking-[0.12em] ring-1 ${tipo.badge}`}
              >
                <IconeTipo size={13} />
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

        <button
          type="button"
          aria-label="Abrir menu da tarefa"
          className="rounded-full border border-[#E8DDCB] bg-white/80 p-2 text-[#64736D] shadow-sm transition hover:border-[#C89B3C]/45 hover:bg-[#C89B3C]/10 hover:text-[#071E36] active:scale-95"
        >
          <MoreHorizontal size={18} />
        </button>
      </div>

      <div className="mt-5 grid gap-3 pl-2 text-sm text-[#64736D] sm:grid-cols-3">
        <div className="flex items-center gap-2 rounded-2xl bg-[#F7F3ED] px-3 py-2">
          <CalendarDays size={16} className="text-[#C89B3C]" />
          <span>{formatarData(tarefa.data)}</span>
        </div>
        <div className="flex items-center gap-2 rounded-2xl bg-[#F7F3ED] px-3 py-2">
          <Clock3 size={16} className="text-[#C89B3C]" />
          <span>{formatarHora(tarefa.hora)}</span>
        </div>
        <div
          className={`flex items-center gap-2 rounded-2xl px-3 py-2 font-semibold ${
            prazo.atrasada
              ? "bg-red-100 text-red-700"
              : prazo.proxima
                ? "bg-[#C89B3C]/15 text-[#8B6827]"
                : "bg-[#071E36]/5 text-[#071E36]"
          }`}
        >
          {prazo.atrasada ? <AlertTriangle size={16} /> : <Timer size={16} />}
          <span>
            <span className="font-medium opacity-75">{prazo.rotulo}: </span>
            {prazo.valor}
          </span>
        </div>
      </div>

      {prazo.atrasada ? (
        <p className="mt-4 pl-2 text-sm font-semibold text-red-700">
          Tarefa em atraso
        </p>
      ) : null}

      <div className="mt-5 grid gap-3 border-t border-[#E8DDCB]/70 pt-4 pl-2 text-xs sm:grid-cols-3">
        <div>
          <p className="font-semibold uppercase tracking-[0.14em] text-[#64736D]">
            Origem
          </p>
          <p className="mt-1 font-semibold text-[#071E36]">
            {tarefa.origem || "manual"}
          </p>
        </div>
        <div>
          <p className="font-semibold uppercase tracking-[0.14em] text-[#64736D]">
            Status
          </p>
          <p className="mt-1 font-semibold text-[#071E36]">
            {labelTexto(tarefa.status)}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#071E36] text-xs font-bold text-[#E1B866] shadow-sm">
            {iniciaisResponsavel(tarefa.responsavel)}
          </span>
          <div>
            <p className="font-semibold uppercase tracking-[0.14em] text-[#64736D]">
              Responsável
            </p>
            <p className="mt-1 font-semibold text-[#071E36]">
              {tarefa.responsavel || "Sem responsável"}
            </p>
          </div>
        </div>
      </div>
    </article>
  );
}
