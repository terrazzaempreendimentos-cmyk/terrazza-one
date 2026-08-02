import Image from "next/image";
import { redirect } from "next/navigation";

import { safeDashboardRedirect } from "../../lib/auth/dashboard-redirect";
import { getOptionalUser } from "../../lib/auth/require-user";
import { LoginForm } from "./login-form";

type SearchParams = Record<string, string | string[] | undefined>;

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const user = await getOptionalUser();

  if (user) {
    redirect("/dashboard");
  }

  const params = (await searchParams) ?? {};
  const redirectTo = safeDashboardRedirect(firstParam(params.redirectTo));
  const initialMessage = firstParam(params.error) === "invite" ? "Link de convite invalido ou expirado." : "";

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#F7F3ED] px-5 py-10">
      <div className="absolute -left-24 top-16 h-72 w-72 rounded-full bg-[#C89B3C]/10 blur-3xl" />
      <div className="absolute -right-20 bottom-10 h-80 w-80 rounded-full bg-[#071E36]/10 blur-3xl" />

      <section className="relative grid w-full max-w-5xl overflow-hidden rounded-[2rem] border border-[#E8DDCB] bg-white shadow-2xl shadow-[#071E36]/10 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="flex flex-col justify-between bg-[#071E36] p-8 text-white sm:p-10">
          <div>
            <Image
              src="/terrazza-logo.png"
              alt="Terrazza Solucoes Imobiliarias"
              width={900}
              height={520}
              priority
              className="h-auto w-full max-w-xs rounded-2xl object-contain"
            />
            <span className="mt-8 inline-flex rounded-full border border-[#C89B3C]/40 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#E1B866]">
              CRM Imobiliario
            </span>
            <h1 className="mt-5 text-3xl font-bold tracking-tight sm:text-4xl">
              Operacao imobiliaria em um unico lugar.
            </h1>
            <p className="mt-4 max-w-md text-sm leading-7 text-white/70">
              Acesso interno ao ambiente comercial e operacional da Terrazza.
            </p>
          </div>

          <p className="mt-12 text-xs uppercase tracking-[0.14em] text-white/40">
            Acesso restrito a equipe autorizada
          </p>
        </div>

        <div className="flex items-center p-7 sm:p-12">
          <div className="w-full">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8B6827]">
              Terrazza
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-[#071E36]">
              Entrar no CRM
            </h2>
            <p className="mt-3 text-sm leading-6 text-[#64736D]">
              Use o e-mail e a senha fornecidos pela administracao.
            </p>

            <LoginForm redirectTo={redirectTo} initialMessage={initialMessage} />
          </div>
        </div>
      </section>
    </main>
  );
}
