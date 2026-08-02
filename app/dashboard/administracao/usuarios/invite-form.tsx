"use client";

import { useActionState } from "react";
import { convidarNovoUsuario, type InviteState } from "./invite-actions";

export function InviteForm({ people }: { people: { id: string; nome: string }[] }) {
  const [state, action, pending] = useActionState(
    convidarNovoUsuario,
    { status: "idle" } satisfies InviteState,
  );

  return (
    <form action={action} className="mt-6 rounded-3xl border border-[#E8DDCB] bg-white p-5">
      <h2 className="text-xl font-bold text-[#071E36]">Convidar novo usuário</h2>
      <fieldset disabled={pending} className="mt-4 grid gap-3 sm:grid-cols-2">
        <input required type="email" name="email" placeholder="E-mail" className="rounded-xl border p-3" />
        <select name="papel" defaultValue="atendimento" className="rounded-xl border p-3">
          <option value="administrador">Administrador</option>
          <option value="gestor">Gestor</option>
          <option value="corretor">Corretor</option>
          <option value="atendimento">Atendimento</option>
        </select>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="ativo" value="true" defaultChecked /> Acesso ativo
        </label>
        <select name="pessoa_id" className="rounded-xl border p-3">
          <option value="">Sem Pessoa</option>
          {people.map((person) => <option key={person.id} value={person.id}>{person.nome}</option>)}
        </select>
      </fieldset>
      {state.message ? <p role="alert" className="mt-3 text-sm text-red-700">{state.message}</p> : null}
      <button disabled={pending} className="mt-4 rounded-xl bg-[#071E36] px-4 py-3 font-semibold text-white">
        {pending ? "Enviando convite..." : "Enviar convite"}
      </button>
    </form>
  );
}
