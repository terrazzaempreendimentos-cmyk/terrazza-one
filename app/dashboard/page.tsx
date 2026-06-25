import Link from "next/link";

import { supabase } from "../../lib/supabase";

export default async function DashboardPage() {
  const [
    proprietarios,
    imoveis,
    atendimentos,
    corretores,
  ] = await Promise.all([
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
      icon: "⌂",
      href: "/dashboard/proprietarios",
    },
    {
      title: "Imóveis",
      subtitle: "Imóveis cadastrados",
      value: imoveis.count ?? 0,
      icon: "⌘",
      href: "/dashboard/imoveis",
    },
    {
      title: "Atendimentos",
      subtitle: "Atendimentos realizados",
      value: atendimentos.count ?? 0,
      icon: "◌",
    },
    {
      title: "Corretores",
      subtitle: "Corretores ativos",
      value: corretores.count ?? 0,
      icon: "♙",
    },
  ];

  return (
    <main className="min-h-screen bg-[#f7f3ed] px-8 py-10">
      <h1 className="text-4xl font-bold text-[#143d2c]">
        Terrazza One
      </h1>

      <p className="mt-2 text-[#5f6f65]">
        Painel interno da Terrazza Soluções Imobiliárias.
      </p>

      <section className="mt-10 grid gap-6 md:grid-cols-4">
        {cards.map((card) => {
          const content = (
            <>
              <div className="flex items-start justify-between gap-4">
                <p className="text-sm font-medium text-[#6b746c]">{card.title}</p>
                <span
                  aria-hidden="true"
                  className="flex size-9 items-center justify-center rounded-xl bg-[#edf2ed] text-lg text-[#143d2c]"
                >
                  {card.icon}
                </span>
              </div>
              <strong className="mt-5 block text-4xl text-[#143d2c]">
                {card.value}
              </strong>
              <p className="mt-2 text-sm text-[#6b746c]">{card.subtitle}</p>
            </>
          );

          const className =
            "rounded-2xl border border-[#dfd4c2] bg-white p-6 shadow-sm transition duration-200 hover:scale-[1.02] hover:shadow-md";

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
    </main>
  );
}
