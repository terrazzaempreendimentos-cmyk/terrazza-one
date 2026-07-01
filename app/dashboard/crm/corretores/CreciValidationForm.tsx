"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type CorretorFormData = {
  id: string;
  origem?: string;
  sourceId?: string;
  nome: string;
  telefone: string;
  email: string;
  creci: string;
  ativo: boolean;
};

type CreciExistente = {
  id: string;
  creci: string;
};

type Props = {
  action: (formData: FormData) => void | Promise<void>;
  corretor: CorretorFormData;
  crecisAtivos: CreciExistente[];
};

function normalizarCreci(value: string) {
  return value.trim().toUpperCase().replace(/\s+/g, "");
}

export function CreciValidationForm({ action, corretor, crecisAtivos }: Props) {
  const [creci, setCreci] = useState(corretor.creci);
  const [touched, setTouched] = useState(false);

  const creciDuplicado = useMemo(() => {
    const atual = normalizarCreci(creci);
    if (!atual) return false;

    return crecisAtivos.some(
      (item) => item.id !== corretor.id && normalizarCreci(item.creci) === atual,
    );
  }, [corretor.id, creci, crecisAtivos]);

  const mostrarErro = touched && creciDuplicado;

  return (
    <form
      action={action}
      className="mt-6 grid gap-5 md:grid-cols-4"
      onSubmit={(event) => {
        setTouched(true);
        if (creciDuplicado) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={corretor.id} />
      <input type="hidden" name="origem" value={corretor.origem ?? "pessoas"} />
      <input type="hidden" name="source_id" value={corretor.sourceId ?? corretor.id} />
      <label className="grid gap-2 text-sm font-medium text-[#102A27]">
        Nome
        <input
          name="nome"
          required
          defaultValue={corretor.nome}
          className="rounded-xl border border-[#E8DDCB] px-4 py-3 text-[#071E36] outline-none transition placeholder:text-[#9a9d98] focus:border-[#C89B3C]"
          placeholder="Nome completo"
        />
      </label>

      <label className="grid gap-2 text-sm font-medium text-[#102A27]">
        Telefone
        <input
          name="telefone"
          type="tel"
          defaultValue={corretor.telefone}
          className="rounded-xl border border-[#E8DDCB] px-4 py-3 text-[#071E36] outline-none transition placeholder:text-[#9a9d98] focus:border-[#C89B3C]"
          placeholder="(00) 00000-0000"
        />
      </label>

      <label className="grid gap-2 text-sm font-medium text-[#102A27]">
        E-mail
        <input
          name="email"
          type="email"
          defaultValue={corretor.email}
          className="rounded-xl border border-[#E8DDCB] px-4 py-3 text-[#071E36] outline-none transition placeholder:text-[#9a9d98] focus:border-[#C89B3C]"
          placeholder="nome@exemplo.com"
        />
      </label>

      <label className="grid gap-2 text-sm font-medium text-[#102A27]">
        CRECI
        <input
          name="creci"
          value={creci}
          onBlur={() => {
            setTouched(true);
            setCreci((current) => current.trim());
          }}
          onChange={(event) => setCreci(event.target.value)}
          aria-invalid={mostrarErro}
          aria-describedby={mostrarErro ? "creci-error" : undefined}
          className={`rounded-xl border px-4 py-3 text-[#071E36] outline-none transition placeholder:text-[#9a9d98] focus:border-[#C89B3C] ${
            mostrarErro
              ? "border-red-300 bg-red-50/50 focus:border-red-400"
              : "border-[#E8DDCB]"
          }`}
          placeholder="CRECI"
        />
        {mostrarErro ? (
          <span id="creci-error" className="text-xs font-medium text-red-700">
            Ja existe um corretor ativo cadastrado com este CRECI.
          </span>
        ) : (
          <span className="text-xs text-[#64736D]">
            O CRECI e normalizado sem espacos antes da validacao.
          </span>
        )}
      </label>

      <label className="flex items-center gap-3 self-end rounded-xl border border-[#E8DDCB] px-4 py-3 text-sm font-medium text-[#102A27]">
        <input
          name="ativo"
          type="checkbox"
          defaultChecked={corretor.ativo}
          className="size-4 accent-[#C89B3C]"
        />
        Corretor ativo
      </label>

      <div className="md:col-span-4">
        <button
          type="submit"
          disabled={creciDuplicado}
          className="rounded-xl bg-[#071E36] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#0A2A4A] disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600"
        >
          {corretor.id ? "Salvar alteracoes" : "Salvar Corretor"}
        </button>
        {corretor.id ? (
          <Link
            href="/dashboard/corretores"
            className="ml-3 inline-flex rounded-xl border border-[#E8DDCB] bg-white px-5 py-3 text-sm font-semibold text-[#071E36] transition hover:border-[#C89B3C]/45 hover:bg-[#C89B3C]/10"
          >
            Cancelar edicao
          </Link>
        ) : null}
      </div>
    </form>
  );
}
