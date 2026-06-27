import {
  Bot,
  Building2,
  CalendarCheck2,
  Clock3,
  Cpu,
  MessageCircle,
  PencilLine,
  Sparkles,
  UserRound,
} from "lucide-react";

import type { TimelineItemData, TimelineOrigem } from "../../lib/timeline";

const origemConfig: Record<
  Exclude<TimelineOrigem, "todos">,
  {
    icon: typeof CalendarCheck2;
    badge: string;
    iconBox: string;
  }
> = {
  agenda: {
    icon: CalendarCheck2,
    badge: "border-[#C89B3C]/30 bg-[#C89B3C]/10 text-[#8B6827]",
    iconBox: "bg-[#C89B3C] text-white",
  },
  whatsapp: {
    icon: MessageCircle,
    badge: "border-emerald-100 bg-emerald-50 text-emerald-700",
    iconBox: "bg-emerald-500 text-white",
  },
  ia: {
    icon: Bot,
    badge: "border-violet-100 bg-violet-50 text-violet-700",
    iconBox: "bg-violet-500 text-white",
  },
  manual: {
    icon: PencilLine,
    badge: "border-slate-200 bg-slate-100 text-slate-700",
    iconBox: "bg-slate-500 text-white",
  },
  vista: {
    icon: Building2,
    badge: "border-sky-100 bg-sky-50 text-sky-700",
    iconBox: "bg-sky-500 text-white",
  },
  sistema: {
    icon: Cpu,
    badge: "border-[#071E36]/10 bg-[#071E36]/10 text-[#071E36]",
    iconBox: "bg-[#071E36] text-[#E1B866]",
  },
};

function renderTipoIcone(tipo: string | null) {
  const tipoNormalizado = (tipo || "").toLowerCase();

  if (tipoNormalizado.includes("tarefa")) return <CalendarCheck2 size={13} />;
  if (tipoNormalizado.includes("mensagem")) return <MessageCircle size={13} />;
  if (tipoNormalizado.includes("ia")) return <Bot size={13} />;
  if (tipoNormalizado.includes("sistema")) return <Cpu size={13} />;

  return <Sparkles size={13} />;
}

export function TimelineItem({ evento }: { evento: TimelineItemData }) {
  const origem = origemConfig[evento.origemNormalizada];
  const IconeOrigem = origem.icon;

  return (
    <article className="group relative overflow-hidden rounded-3xl border border-[#E8DDCB] bg-white p-5 shadow-sm transition duration-300 hover:scale-[1.005] hover:border-[#C89B3C]/45 hover:shadow-xl hover:shadow-[#071E36]/10">
      <span
        aria-hidden="true"
        className="absolute inset-y-0 left-0 w-[5px] bg-[#C89B3C]"
      />

      <div className="flex flex-wrap items-start justify-between gap-4 pl-2">
        <div className="flex min-w-0 flex-1 gap-4">
          <span
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl shadow-sm ${origem.iconBox}`}
          >
            <IconeOrigem size={21} strokeWidth={2.2} />
          </span>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em]">
              <span
                className={`rounded-full border px-3 py-1 ${origem.badge}`}
              >
                {evento.origemLabel}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[#E8DDCB] bg-[#F7F3ED] px-3 py-1 text-[#64736D]">
                {renderTipoIcone(evento.tipo)}
                {evento.tipoLabel}
              </span>
            </div>

            <h3 className="mt-3 text-xl font-semibold leading-tight text-[#071E36]">
              {evento.titulo || "Evento sem título"}
            </h3>
          </div>
        </div>

        <div className="rounded-2xl border border-[#E8DDCB] bg-[#F7F3ED] px-3 py-2 text-right">
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-[#64736D]">
            <Clock3 size={13} />
            Hora
          </p>
          <p className="mt-1 font-semibold text-[#071E36]">{evento.hora}</p>
        </div>
      </div>

      {evento.descricaoResumo ? (
        <p className="mt-5 pl-2 text-sm leading-6 text-[#102A27]">
          {evento.descricaoResumo}
        </p>
      ) : (
        <p className="mt-5 pl-2 text-sm leading-6 text-[#64736D]">
          Evento registrado sem descrição detalhada.
        </p>
      )}

      <div className="mt-5 grid gap-3 border-t border-[#E8DDCB]/70 pt-4 pl-2 text-sm md:grid-cols-3">
        <div>
          <p className="font-semibold uppercase tracking-[0.14em] text-[#64736D]">
            Responsável
          </p>
          <p className="mt-1 flex items-center gap-2 font-semibold text-[#071E36]">
            <UserRound size={15} className="text-[#C89B3C]" />
            {evento.responsavel}
          </p>
        </div>
        <div>
          <p className="font-semibold uppercase tracking-[0.14em] text-[#64736D]">
            Origem
          </p>
          <p className="mt-1 font-semibold text-[#071E36]">
            {evento.origem || evento.origemLabel}
          </p>
        </div>
        <div>
          <p className="font-semibold uppercase tracking-[0.14em] text-[#64736D]">
            Data
          </p>
          <p className="mt-1 font-semibold text-[#071E36]">{evento.dataCurta}</p>
        </div>
      </div>

      {evento.vinculos.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-2 pl-2">
          {evento.vinculos.map((vinculo) => (
            <span
              key={`${evento.id}-${vinculo.label}-${vinculo.nome}`}
              className="rounded-full border border-[#E8DDCB] bg-[#fffdfa] px-3 py-1 text-xs font-medium text-[#64736D]"
            >
              {vinculo.label}: {vinculo.nome}
            </span>
          ))}
        </div>
      ) : null}
    </article>
  );
}
