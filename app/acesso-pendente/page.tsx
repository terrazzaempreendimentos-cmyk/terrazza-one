import { redirect } from "next/navigation";

import { logout } from "../login/actions";
import { getAccessState } from "../../lib/auth/access-profile";

export default async function AcessoPendentePage() {
  const access = await getAccessState();

  if (access.status === "unauthenticated") {
    redirect("/login");
  }

  if (access.status === "active_profile") {
    redirect("/dashboard");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F7F3ED] px-5 py-10">
      <section className="w-full max-w-lg rounded-[2rem] border border-[#E8DDCB] bg-white p-8 text-center shadow-2xl shadow-[#071E36]/10 sm:p-12">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8B6827]">
          Terrazza · CRM Imobiliario
        </p>
        <h1 className="mt-4 text-3xl font-bold tracking-tight text-[#071E36]">
          Acesso pendente
        </h1>
        <p className="mt-4 text-sm leading-7 text-[#64736D]">
          Sua identidade foi confirmada, mas o acesso ao ambiente operacional
          ainda não está disponível. Solicite a liberação ao responsável pelo
          sistema.
        </p>

        <form action={logout} className="mt-8">
          <button
            type="submit"
            className="inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-[#071E36] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#0A2A4A] focus:outline-none focus:ring-2 focus:ring-[#C89B3C] focus:ring-offset-2"
          >
            Sair
          </button>
        </form>
      </section>
    </main>
  );
}
