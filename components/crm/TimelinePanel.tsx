"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";

import {
  agruparTimelinePorData,
  filtrarTimelineItems,
  filtrosTimeline,
  TimelineItemData,
  TimelineOrigem,
} from "../../lib/timeline";
import { TimelineItem } from "./TimelineItem";

export function TimelinePanel({ eventos }: { eventos: TimelineItemData[] }) {
  const [filtro, setFiltro] = useState<TimelineOrigem>("todos");
  const [busca, setBusca] = useState("");

  const eventosFiltrados = useMemo(
    () => filtrarTimelineItems(eventos, filtro, busca),
    [busca, eventos, filtro],
  );

  const grupos = useMemo(
    () => agruparTimelinePorData(eventosFiltrados),
    [eventosFiltrados],
  );

  return (
    <section className="mt-10">
      <style>
        {`
          @keyframes terrazzaTimelineFade {
            from {
              opacity: 0;
              transform: translateY(10px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
        `}
      </style>

      <div className="rounded-[2rem] border border-[#E8DDCB] bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-[#071E36]">
              Eventos registrados
            </h2>
            <p className="mt-1 text-sm text-[#64736D]">
              Timeline preparada para Agenda, IA, WhatsApp, Vista ERP e Sistema.
            </p>
          </div>

          <div className="relative w-full xl:max-w-sm">
            <Search
              size={17}
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#64736D]"
            />
            <input
              value={busca}
              onChange={(event) => setBusca(event.target.value)}
              placeholder="Pesquisar eventos"
              className="w-full rounded-2xl border border-[#E8DDCB] bg-[#F7F3ED] py-3 pr-4 pl-11 text-sm text-[#071E36] outline-none transition placeholder:text-[#8d9994] focus:border-[#C89B3C]"
            />
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {filtrosTimeline.map((item) => {
            const ativo = filtro === item.valor;

            return (
              <button
                key={item.valor}
                type="button"
                onClick={() => setFiltro(item.valor)}
                className={`rounded-full border px-4 py-2 text-sm font-semibold transition hover:scale-[1.01] active:scale-95 ${
                  ativo
                    ? "border-[#C89B3C]/45 bg-[#C89B3C]/15 text-[#8B6827]"
                    : "border-[#E8DDCB] bg-white text-[#64736D] hover:border-[#C89B3C]/35 hover:text-[#071E36]"
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </div>

      {grupos.length === 0 ? (
        <p className="mt-8 rounded-2xl border border-dashed border-[#E8DDCB] bg-white px-4 py-12 text-center text-sm text-[#64736D] shadow-sm">
          Nenhum evento encontrado para este filtro.
        </p>
      ) : (
        <div className="mt-8 grid gap-8">
          {grupos.map((grupo) => (
            <section
              key={grupo.data}
              className="relative"
              style={{
                animation: "terrazzaTimelineFade 360ms ease-out both",
              }}
            >
              <div className="sticky top-4 z-10 mb-4 inline-flex rounded-full border border-[#C89B3C]/35 bg-[#071E36] px-4 py-2 text-sm font-semibold text-[#E1B866] shadow-lg shadow-[#071E36]/10">
                {grupo.data}
              </div>

              <div className="relative pl-6">
                <div
                  aria-hidden="true"
                  className="absolute top-0 bottom-0 left-0 w-px bg-[#C89B3C]/45"
                />

                <div className="grid gap-4">
                  {grupo.eventos.map((evento) => (
                    <div key={evento.id} className="relative pl-5">
                      <span
                        aria-hidden="true"
                        className="absolute top-7 left-[-7px] h-3.5 w-3.5 rounded-full border-2 border-[#C89B3C] bg-white shadow-sm"
                      />
                      <TimelineItem evento={evento} />
                    </div>
                  ))}
                </div>
              </div>
            </section>
          ))}
        </div>
      )}
    </section>
  );
}
