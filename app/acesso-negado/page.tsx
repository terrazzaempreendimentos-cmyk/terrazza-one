import Link from "next/link";
import { redirect } from "next/navigation";

import { getAccessState } from "../../lib/auth/access-profile";
import { logout } from "../login/actions";

export default async function AcessoNegadoPage() {
  const access = await getAccessState();

  if (access.status === "unauthenticated") {
    redirect("/login");
  }

  if (access.status !== "active_profile") {
    redirect("/acesso-pendente");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F7F3ED] px-5 py-10">
      <section className="w-full max-w-lg rounded-[2rem] border border-[#E8DDCB] bg-white p-8 text-center shadow-2xl shadow-[#071E36]/10 sm:p-12">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8B6827]">
          Terrazza · CRM Imobiliário
        </p>
        <h1 className="mt-4 text-3xl font-bold tracking-tight text-[#071E36]">
          Acesso não autorizado
        </h1>
        <p className="mt-4 text-sm leading-7 text-[#64736D]">
          Você não possui permissão para acessar esta área.
        </p>

        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          <Link
            href="/dashboard"
            className="inline-flex min-h-12 items-center justify-center rounded-xl border border-[#C89B3C]/45 px-5 py-3 text-sm font-semibold text-[#071E36] transition hover:bg-[#F7F3ED] focus:outline-none focus:ring-2 focus:ring-[#C89B3C] focus:ring-offset-2"
          >
            Voltar ao dashboard
          </Link>
          <form action={logout}>
            <button
              type="submit"
              className="inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-[#071E36] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#0A2A4A] focus:outline-none focus:ring-2 focus:ring-[#C89B3C] focus:ring-offset-2"
            >
              Sair
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
