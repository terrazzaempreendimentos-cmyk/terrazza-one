"use client";

import { useMemo, useState } from "react";
import { CalendarDays } from "lucide-react";

import { AgendaTask, TaskCard } from "./TaskCard";

const diasSemana = ["SEG", "TER", "QUA", "QUI", "SEX", "SÁB", "DOM"];

function parseDateKey(dateKey: string) {
  return new Date(`${dateKey}T00:00:00.000Z`);
}

function toDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function inicioSemana(dateKey: string) {
  const data = parseDateKey(dateKey);
  const diaSemana = data.getUTCDay();
  const diferencaParaSegunda = diaSemana === 0 ? -6 : 1 - diaSemana;

  data.setUTCDate(data.getUTCDate() + diferencaParaSegunda);

  return data;
}

function formatarDiaMes(dateKey: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "UTC",
  }).format(parseDateKey(dateKey));
}

function ordenarPorHora(tarefas: AgendaTask[]) {
  return [...tarefas].sort((a, b) => {
    const horaA = a.hora || "99:99";
    const horaB = b.hora || "99:99";

    return horaA.localeCompare(horaB);
  });
}

type AgendaSemanalProps = {
  tarefas: AgendaTask[];
  hoje: string;
};

export function AgendaSemanal({ tarefas, hoje }: AgendaSemanalProps) {
  const [diaSelecionado, setDiaSelecionado] = useState(hoje);

  const dias = useMemo(() => {
    const inicio = inicioSemana(hoje);

    return diasSemana.map((label, index) => {
      const data = new Date(inicio);
      data.setUTCDate(inicio.getUTCDate() + index);
      const dateKey = toDateKey(data);

      return {
        label,
        dateKey,
        diaMes: formatarDiaMes(dateKey),
        contador: tarefas.filter((tarefa) => tarefa.data === dateKey).length,
      };
    });
  }, [hoje, tarefas]);

  const tarefasSelecionadas = useMemo(
    () => ordenarPorHora(tarefas.filter((tarefa) => tarefa.data === diaSelecionado)),
    [diaSelecionado, tarefas],
  );

  const totalDaSemana = useMemo(
    () =>
      dias.reduce((total, dia) => {
        return total + dia.contador;
      }, 0),
    [dias],
  );

  return (
    <section className="mt-8 rounded-[2rem] border border-[#E8DDCB] bg-white/85 p-5 shadow-sm backdrop-blur-sm sm:p-6">
      <div className="flex flex-col gap-4 border-b border-[#E8DDCB]/70 pb-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#071E36] text-[#E1B866] shadow-lg shadow-[#071E36]/10">
            <CalendarDays size={20} strokeWidth={2.2} />
          </span>
          <div>
            <span className="rounded-full border border-[#C89B3C]/30 bg-[#C89B3C]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#8B6827]">
              Agenda semanal
            </span>
            <h2 className="mt-3 text-2xl font-semibold text-[#071E36]">
              Tarefas por dia
            </h2>
            <p className="mt-1 text-sm leading-6 text-[#64736D]">
              Selecione um dia para filtrar visualmente as tarefas já carregadas.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 text-sm font-semibold">
          <button
            type="button"
            className="rounded-xl border border-[#E8DDCB] bg-[#F7F3ED] px-3 py-2 text-[#64736D] transition hover:border-[#C89B3C]/35 hover:text-[#071E36]"
            aria-label="Semana anterior preparada para evolução futura"
          >
            ◀ Semana anterior
          </button>
          <button
            type="button"
            onClick={() => setDiaSelecionado(hoje)}
            className="rounded-xl border border-[#C89B3C]/35 bg-[#C89B3C]/10 px-3 py-2 text-[#8B6827] transition hover:bg-[#C89B3C]/15"
          >
            Semana Atual
          </button>
          <button
            type="button"
            className="rounded-xl border border-[#E8DDCB] bg-[#F7F3ED] px-3 py-2 text-[#64736D] transition hover:border-[#C89B3C]/35 hover:text-[#071E36]"
            aria-label="Semana seguinte preparada para evolução futura"
          >
            Semana seguinte ▶
          </button>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-7">
        {dias.map((dia) => {
          const isHoje = dia.dateKey === hoje;
          const isSelecionado = dia.dateKey === diaSelecionado;

          return (
            <button
              key={dia.dateKey}
              type="button"
              onClick={() => setDiaSelecionado(dia.dateKey)}
              className={`rounded-2xl border p-4 text-left shadow-sm transition duration-300 hover:scale-[1.01] hover:shadow-lg hover:shadow-[#071E36]/10 ${
                isHoje
                  ? "border-[#C89B3C]/50 bg-[#C89B3C]/15"
                  : "border-[#E8DDCB] bg-white"
              } ${
                isSelecionado
                  ? "ring-2 ring-[#C89B3C]/35"
                  : "ring-1 ring-transparent"
              }`}
              aria-pressed={isSelecionado}
            >
              <span
                className={`text-xs font-bold uppercase tracking-[0.18em] ${
                  isHoje ? "text-[#8B6827]" : "text-[#64736D]"
                }`}
              >
                {dia.label}
              </span>
              <div className="mt-3 flex items-end justify-between gap-2">
                <span className="text-sm font-semibold text-[#071E36]">
                  {dia.diaMes}
                </span>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                    isHoje
                      ? "bg-[#071E36] text-[#E1B866]"
                      : "bg-[#F7F3ED] text-[#071E36]"
                  }`}
                >
                  ({dia.contador})
                </span>
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-[#071E36]">
            {formatarDiaMes(diaSelecionado)} · {tarefasSelecionadas.length} tarefa
            {tarefasSelecionadas.length === 1 ? "" : "s"}
          </h3>
          <p className="mt-1 text-sm text-[#64736D]">
            Total carregado nesta semana: {totalDaSemana}
          </p>
        </div>
      </div>

      {tarefasSelecionadas.length === 0 ? (
        <p className="mt-5 rounded-2xl border border-dashed border-[#E8DDCB] bg-[#F7F3ED] px-4 py-10 text-center text-sm text-[#64736D]">
          Nenhuma tarefa cadastrada para este dia.
        </p>
      ) : (
        <div className="mt-5 grid gap-4 xl:grid-cols-2">
          {tarefasSelecionadas.map((tarefa) => (
            <TaskCard key={tarefa.id} tarefa={tarefa} />
          ))}
        </div>
      )}
    </section>
  );
}
