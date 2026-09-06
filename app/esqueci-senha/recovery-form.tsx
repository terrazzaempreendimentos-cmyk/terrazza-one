"use client";

import { useActionState } from "react";

import {
  solicitarRecuperacaoSenha,
  type ForgotPasswordState,
} from "./actions";

const INITIAL_STATE = {
  submitted: false,
  message: "",
} satisfies ForgotPasswordState;

export function RecoveryForm() {
  const [state, formAction, pending] = useActionState(
    solicitarRecuperacaoSenha,
    INITIAL_STATE,
  );

  return (
    <form action={formAction} className="mt-8 grid gap-5">
      <label
        className="grid gap-2 text-sm font-semibold text-[#102A27]"
        htmlFor="email"
      >
        E-mail
        <input
          id="email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          required
          maxLength={254}
          disabled={pending}
          className="rounded-xl border border-[#E8DDCB] bg-white px-4 py-3 font-normal text-[#071E36] outline-none transition placeholder:text-[#8A9691] focus:border-[#C89B3C] focus:ring-2 focus:ring-[#C89B3C]/15 disabled:cursor-wait disabled:bg-[#F7F3ED]"
          placeholder="seuemail@exemplo.com"
        />
      </label>

      <div
        aria-live="polite"
        aria-atomic="true"
        className={
          state.message
            ? "rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
            : "sr-only"
        }
      >
        {state.message}
      </div>

      <button
        type="submit"
        disabled={pending || state.submitted}
        className="inline-flex min-h-12 items-center justify-center rounded-xl bg-[#071E36] px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-[#071E36]/15 transition hover:bg-[#0A2A4A] focus:outline-none focus:ring-2 focus:ring-[#C89B3C] focus:ring-offset-2 disabled:cursor-wait disabled:opacity-70"
      >
        {pending ? "Enviando..." : state.submitted ? "Solicitacao enviada" : "Enviar link de recuperacao"}
      </button>
    </form>
  );
}
