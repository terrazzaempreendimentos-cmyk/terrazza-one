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
    { title: "Proprietários", value: proprietarios.count ?? 0 },
    { title: "Imóveis", value: imoveis.count ?? 0 },
    { title: "Atendimentos", value: atendimentos.count ?? 0 },
    { title: "Corretores", value: corretores.count ?? 0 },
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
        {cards.map((card) => (
          <div
            key={card.title}
            className="rounded-2xl border border-[#dfd4c2] bg-white p-6 shadow-sm"
          >
            <p className="text-sm text-[#6b746c]">{card.title}</p>
            <strong className="mt-3 block text-4xl text-[#143d2c]">
              {card.value}
            </strong>
          </div>
        ))}
      </section>
    </main>
  );
}