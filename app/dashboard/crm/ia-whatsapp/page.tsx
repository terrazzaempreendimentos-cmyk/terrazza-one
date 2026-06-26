const indicadores = [
  {
    titulo: "Status da IA",
    valor: "Preparando",
    detalhe: "Módulo visual pronto para a futura camada conversacional.",
    icone: "◌",
  },
  {
    titulo: "Número conectado",
    valor: "Em breve",
    detalhe: "Integração WhatsApp ainda não configurada.",
    icone: "☎",
  },
  {
    titulo: "Mensagens hoje",
    valor: "0",
    detalhe: "Aguardando ativação da automação.",
    icone: "✉",
  },
  {
    titulo: "Leads criados",
    valor: "0",
    detalhe: "Leads serão gerados pela IA em uma próxima sprint.",
    icone: "✦",
  },
  {
    titulo: "Próximas automações",
    valor: "5",
    detalhe: "Qualificação, agenda, follow-up, alertas e repasse comercial.",
    icone: "⚙",
  },
];

const fluxoArquitetura = [
  "Cliente",
  "WhatsApp",
  "IA",
  "Terrazza CRM",
  "Agenda Inteligente",
  "Timeline",
  "Kanban",
  "Corretor",
  "Vista ERP",
];

export default function IaWhatsappPage() {
  return (
    <main className="min-h-screen bg-[#F7F3ED] px-6 py-10 sm:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="overflow-hidden rounded-[2rem] border border-[#E8DDCB] bg-white shadow-sm">
          <section className="relative bg-[#071E36] px-6 py-10 text-white sm:px-10">
            <div className="absolute right-8 top-8 h-28 w-28 rounded-full border border-[#C89B3C]/30 bg-[#C89B3C]/10 blur-xl" />
            <div className="relative">
              <span className="rounded-full border border-[#C89B3C]/40 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#E1B866]">
                Terrazza CRM
              </span>
              <h1 className="mt-5 text-4xl font-bold tracking-tight">
                IA WhatsApp
              </h1>
              <p className="mt-3 max-w-2xl text-base leading-7 text-white/72">
                Central de inteligência conversacional da Terrazza CRM.
              </p>
            </div>
          </section>

          <section className="grid gap-4 border-b border-[#E8DDCB] bg-[#fffdfa] p-6 sm:p-8 lg:grid-cols-5">
            {indicadores.map((indicador) => (
              <article
                key={indicador.titulo}
                className="rounded-2xl border border-[#E8DDCB] bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-lg hover:shadow-[#071E36]/10"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="rounded-full bg-[#C89B3C]/10 px-3 py-1 text-lg text-[#8B6827]">
                    {indicador.icone}
                  </span>
                  <span className="h-2 w-2 rounded-full bg-[#C89B3C]" />
                </div>
                <p className="mt-5 text-sm font-semibold uppercase tracking-[0.12em] text-[#64736D]">
                  {indicador.titulo}
                </p>
                <strong className="mt-2 block text-2xl text-[#071E36]">
                  {indicador.valor}
                </strong>
                <p className="mt-3 text-sm leading-6 text-[#64736D]">
                  {indicador.detalhe}
                </p>
              </article>
            ))}
          </section>

          <section className="p-6 sm:p-8">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <span className="rounded-full border border-[#C89B3C]/35 bg-[#C89B3C]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#8B6827]">
                  Arquitetura
                </span>
                <h2 className="mt-4 text-2xl font-bold text-[#071E36]">
                  Fluxo preparado para a futura automação
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-[#64736D]">
                  Estrutura visual do caminho da conversa até a operação interna,
                  sem backend, API ou integração ativa nesta etapa.
                </p>
              </div>
            </div>

            <div className="mt-8 rounded-3xl border border-[#E8DDCB] bg-[#F7F3ED] p-5 sm:p-7">
              <div className="grid gap-3 md:grid-cols-9 md:items-center">
                {fluxoArquitetura.map((etapa, index) => (
                  <div key={etapa} className="grid gap-3 md:block">
                    <div className="rounded-2xl border border-[#E8DDCB] bg-white px-4 py-5 text-center shadow-sm">
                      <span className="mx-auto flex h-9 w-9 items-center justify-center rounded-full bg-[#071E36] text-sm font-bold text-[#E1B866]">
                        {index + 1}
                      </span>
                      <p className="mt-3 text-sm font-semibold text-[#071E36]">
                        {etapa}
                      </p>
                    </div>

                    {index < fluxoArquitetura.length - 1 ? (
                      <div className="flex justify-center text-[#C89B3C] md:hidden">
                        ↓
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>

              <div className="mt-6 hidden items-center justify-between px-10 text-[#C89B3C] md:flex">
                {fluxoArquitetura.slice(0, -1).map((etapa) => (
                  <span key={etapa} aria-hidden="true" className="text-xl">
                    ↓
                  </span>
                ))}
              </div>
            </div>

            <div className="mt-8 rounded-3xl border border-[#C89B3C]/30 bg-[#071E36] p-6 text-white shadow-sm">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#E1B866]">
                    Módulo em preparação
                  </p>
                  <h3 className="mt-2 text-xl font-semibold">
                    Infraestrutura visual pronta para a IA conversacional.
                  </h3>
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-white/70">
                    Esta sprint deixa a central posicionada no CRM para receber
                    futuramente conexão WhatsApp, criação automática de leads,
                    tarefas inteligentes e atualização da timeline.
                  </p>
                </div>
                <span className="rounded-full border border-[#C89B3C]/40 bg-[#C89B3C]/10 px-4 py-2 text-sm font-semibold text-[#E1B866]">
                  Apenas visual
                </span>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
