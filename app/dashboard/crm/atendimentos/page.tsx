import {
  Clock3,
  MessageCircle,
  MessageSquareText,
  ShieldCheck,
} from "lucide-react";

const resumoAtendimentos = [
  { titulo: "Abertos", valor: 8, detalhe: "Conversas em triagem", icon: MessageSquareText },
  { titulo: "Aguardando corretor", valor: 3, detalhe: "Handoff pendente", icon: ShieldCheck },
  { titulo: "Aguardando cliente", valor: 5, detalhe: "Retorno solicitado", icon: Clock3 },
  { titulo: "Concluídos", valor: 14, detalhe: "Atendimentos finalizados", icon: MessageCircle },
];

const atendimentos = [
  {
    cliente: "Mariana Alves",
    origem: "WhatsApp",
    status: "aguardando corretor",
    especialista: "Locação",
    responsavel: "Equipe comercial",
  },
  {
    cliente: "Carlos Henrique",
    origem: "Instagram",
    status: "aguardando cliente",
    especialista: "Compra",
    responsavel: "Plantão Terrazza",
  },
  {
    cliente: "Ana Paula",
    origem: "Site",
    status: "aberto",
    especialista: "Administração",
    responsavel: "A definir",
  },
];

export default function AtendimentosPage() {
  return (
    <main className="min-h-screen bg-[#F7F3ED] px-6 py-10 sm:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="rounded-[2rem] border border-[#E8DDCB] bg-white p-6 shadow-sm sm:p-8">
          <span className="rounded-full border border-[#C89B3C]/35 bg-[#C89B3C]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#8B6827]">
            Terrazza CRM
          </span>
          <h1 className="mt-5 text-4xl font-bold tracking-tight text-[#071E36]">
            Atendimentos
          </h1>
          <p className="mt-2 max-w-3xl leading-6 text-[#64736D]">
            Central futura dos atendimentos humanos e automatizados da Terrazza.
          </p>
        </header>

        <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {resumoAtendimentos.map((card) => {
            const Icon = card.icon;

            return (
              <article
                key={card.titulo}
                className="rounded-3xl border border-[#E8DDCB] bg-white p-5 shadow-sm"
              >
                <div className="flex items-center justify-between gap-4">
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#071E36] text-[#E1B866]">
                    <Icon size={20} strokeWidth={2.2} />
                  </span>
                  <strong className="text-3xl font-bold text-[#071E36]">
                    {card.valor}
                  </strong>
                </div>
                <h2 className="mt-4 text-sm font-semibold uppercase tracking-[0.14em] text-[#071E36]">
                  {card.titulo}
                </h2>
                <p className="mt-1 text-sm text-[#64736D]">{card.detalhe}</p>
              </article>
            );
          })}
        </section>

        <section className="mt-6 rounded-3xl border border-[#E8DDCB] bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-[#071E36]">
                Fila operacional
              </h2>
              <p className="mt-1 text-sm text-[#64736D]">
                Placeholder premium para a futura união de WhatsApp, site, Instagram e atendimento manual.
              </p>
            </div>
            <span className="w-fit rounded-full bg-[#C89B3C]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#8B6827]">
              Dados simulados
            </span>
          </div>

          <div className="mt-6 overflow-x-auto">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead className="border-b border-[#E8DDCB] text-[#64736D]">
                <tr>
                  <th className="px-4 py-3 font-medium">Cliente</th>
                  <th className="px-4 py-3 font-medium">Origem</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Especialista UCE sugerido</th>
                  <th className="px-4 py-3 font-medium">Responsável</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#eee7dc] text-[#102A27]">
                {atendimentos.map((atendimento) => (
                  <tr key={atendimento.cliente}>
                    <td className="px-4 py-4 font-semibold text-[#071E36]">
                      {atendimento.cliente}
                    </td>
                    <td className="px-4 py-4">{atendimento.origem}</td>
                    <td className="px-4 py-4">
                      <span className="rounded-full bg-[#F7F3ED] px-3 py-1 text-xs font-semibold text-[#8B6827]">
                        {atendimento.status}
                      </span>
                    </td>
                    <td className="px-4 py-4">{atendimento.especialista}</td>
                    <td className="px-4 py-4">{atendimento.responsavel}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
