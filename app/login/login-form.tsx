"use client";

import { useActionState } from "react";

import { login, type LoginState } from "./actions";

export function LoginForm({ redirectTo, initialMessage = "" }: { redirectTo: string; initialMessage?: string }) {
  const [state, formAction, pending] = useActionState(login, { message: initialMessage });

  return (
    <form action={formAction} className="mt-8 grid gap-5">
      <input type="hidden" name="redirectTo" value={redirectTo} />

      <label className="grid gap-2 text-sm font-semibold text-[#102A27]" htmlFor="email">
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

      <label className="grid gap-2 text-sm font-semibold text-[#102A27]" htmlFor="password">
        Senha
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          disabled={pending}
          className="rounded-xl border border-[#E8DDCB] bg-white px-4 py-3 font-normal text-[#071E36] outline-none transition focus:border-[#C89B3C] focus:ring-2 focus:ring-[#C89B3C]/15 disabled:cursor-wait disabled:bg-[#F7F3ED]"
        />
      </label>

      <div
        aria-live="polite"
        aria-atomic="true"
        className={state.message ? "rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" : "sr-only"}
      >
        {state.message}
      </div>

      <button
        type="submit"
        disabled={pending}
        className="inline-flex min-h-12 items-center justify-center rounded-xl bg-[#071E36] px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-[#071E36]/15 transition hover:bg-[#0A2A4A] focus:outline-none focus:ring-2 focus:ring-[#C89B3C] focus:ring-offset-2 disabled:cursor-wait disabled:opacity-70"
      >
        {pending ? "Entrando..." : "Entrar"}
      </button>
    </form>
  );
}
