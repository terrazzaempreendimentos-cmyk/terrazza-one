import Link from "next/link";

import { supabase } from "../../lib/supabase";

export default async function DashboardPage() {
  const [proprietarios, imoveis, atendimentos, corretores] = await Promise.all([
    supabase.from("proprietarios").select("id", { count: "exact", head: true }),
    supabase.from("imoveis").select("id", { count: "exact", head: true }),
    supabase.from("atendimentos").select("id", { count: "exact", head: true }),
    supabase.from("corretores").select("id", { count: "exact", head: true }),
  ]);

  const cards = [
    {
      title: "Proprietários",
      subtitle: "Proprietários cadastrados",
      value: proprietarios.count ?? 0,
      icon: "P",
      href: "/dashboard/proprietarios",
    },
    {
      title: "Imóveis",
      subtitle: "Imóveis cadastrados",
      value: imoveis.count ?? 0,
      icon: "I",
      href: "/dashboard/imoveis",
    },
    {
      title: "Atendimentos",
      subtitle: "Atendimentos realizados",
      value: atendimentos.count ?? 0,
      icon: "A",
    },
    {
      title: "Corretores",
      subtitle: "Corretores ativos",
      value: corretores.count ?? 0,
      icon: "C",
    },
  ];

  return (
    <main className="min-h-screen bg-[#F7F3ED] px-6 py-10 sm:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="rounded-[2rem] border border-[#E8DDCB] bg-white p-8 shadow-sm">
          <span className="rounded-full border border-[#C89B3C]/35 bg-[#C89B3C]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-[#8B6827]">
            Terrazza One
          </span>
          <h1 className="mt-5 text-4xl font-bold tracking-tight text-[#071E36]">
            Bom dia, Eduardo.
          </h1>
          <p className="mt-2 max-w-2xl text-[#64736D]">
            Visão operacional da Terrazza Soluções Imobiliárias.
          </p>
        </header>

        <section className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {cards.map((card) => {
            const content = (
              <>
                <div className="flex items-start justify-between gap-4">
                  <p className="text-sm font-semibold text-[#102A27]">
                    {card.title}
                  </p>
                  <span
                    aria-hidden="true"
                    className="flex size-10 items-center justify-center rounded-2xl border border-[#C89B3C]/30 bg-[#C89B3C]/10 text-sm font-bold text-[#8B6827]"
                  >
                    {card.icon}
                  </span>
                </div>
                <strong className="mt-6 block text-4xl text-[#071E36]">
                  {card.value}
                </strong>
                <p className="mt-2 text-sm text-[#64736D]">{card.subtitle}</p>
              </>
            );

            const className =
              "rounded-2xl border border-[#E8DDCB] bg-white p-6 shadow-sm transition duration-200 hover:scale-[1.02] hover:border-[#C89B3C]/45 hover:shadow-lg hover:shadow-[#071E36]/10";

            return card.href ? (
              <Link key={card.title} href={card.href} className={className}>
                {content}
              </Link>
            ) : (
              <div key={card.title} className={className}>
                {content}
              </div>
            );
          })}
        </section>

        <section className="mt-8 overflow-hidden rounded-[2rem] border border-[#C89B3C]/35 bg-[#071E36] p-8 text-white shadow-xl shadow-[#071E36]/15">
          <div className="max-w-3xl">
            <span className="rounded-full border border-[#E1B866]/40 bg-[#E1B866]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-[#E1B866]">
              Inteligência Comercial
            </span>
            <h2 className="mt-5 text-2xl font-semibold">Central IA</h2>
            <p className="mt-3 leading-7 text-white/75">
              Em breve, a Terrazza CRM irá destacar leads prioritários, imóveis
              sem retorno e oportunidades comerciais.
            </p>
          </div>
          <div className="mt-8 h-1.5 w-28 rounded-full bg-[#C89B3C]" />
        </section>
      </div>
    </main>
  );
}
