import {
  Bot,
  Brain,
  History,
  MessageSquarePlus,
  Send,
  Settings,
  Sparkles,
  WandSparkles,
} from "lucide-react";

const menuIa = [
  { label: "Novo atendimento", icon: MessageSquarePlus },
  { label: "Histórico", icon: History },
  { label: "Prompts", icon: WandSparkles },
  { label: "Memórias", icon: Brain },
  { label: "Configurações", icon: Settings },
];

const canaisFuturos = ["WhatsApp", "Site", "Instagram", "Facebook", "API Vista"];

export default function IaComercialPage() {
  return (
    <main className="min-h-screen bg-[#F7F3ED] px-6 py-10 sm:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="rounded-[2rem] border border-[#E8DDCB] bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-4">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#071E36] text-[#E1B866] shadow-lg shadow-[#071E36]/15">
                <Bot size={26} strokeWidth={2.2} />
              </span>
              <div>
                <span className="rounded-full border border-[#C89B3C]/35 bg-[#C89B3C]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#8B6827]">
                  Terrazza CRM
                </span>
                <h1 className="mt-4 text-4xl font-bold tracking-tight text-[#071E36]">
                  IA Comercial
                </h1>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-[#64736D]">
                  Arquitetura inicial da inteligência comercial que futuramente
                  atenderá WhatsApp, Site, Instagram, Facebook e API Vista.
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-[#E8DDCB] bg-[#F7F3ED] px-4 py-3 text-sm text-[#64736D]">
              <span className="block text-xs font-semibold uppercase tracking-[0.14em] text-[#8B6827]">
                Status
              </span>
              <strong className="mt-1 block text-[#071E36]">
                Arquitetura preparada
              </strong>
            </div>
          </div>

          <div className="mt-6 h-px bg-gradient-to-r from-[#C89B3C]/60 via-[#E8DDCB] to-transparent" />
        </header>

        <section className="mt-8 overflow-hidden rounded-[2rem] border border-[#E8DDCB] bg-white shadow-sm">
          <div className="grid min-h-[680px] lg:grid-cols-[300px_1fr]">
            <aside className="border-b border-[#E8DDCB] bg-[#071E36] p-5 text-white lg:border-b-0 lg:border-r">
              <div className="rounded-2xl border border-[#C89B3C]/25 bg-white/[0.04] p-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#C89B3C]/15 text-[#E1B866]">
                    <Sparkles size={19} />
                  </span>
                  <div>
                    <p className="text-sm font-semibold">Central IA</p>
                    <p className="text-xs text-white/55">Módulo comercial</p>
                  </div>
                </div>
              </div>

              <nav className="mt-5 grid gap-2">
                {menuIa.map((item, index) => {
                  const Icon = item.icon;

                  return (
                    <button
                      key={item.label}
                      type="button"
                      className={[
                        "flex items-center gap-3 rounded-2xl border px-4 py-3 text-left text-sm font-medium transition",
                        index === 0
                          ? "border-[#C89B3C]/45 bg-[#C89B3C]/15 text-white"
                          : "border-transparent text-white/68 hover:border-white/10 hover:bg-[#0A2A4A] hover:text-white",
                      ].join(" ")}
                    >
                      <Icon
                        size={17}
                        className={index === 0 ? "text-[#E1B866]" : "text-white/45"}
                      />
                      {item.label}
                    </button>
                  );
                })}
              </nav>

              <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#E1B866]">
                  Canais futuros
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {canaisFuturos.map((canal) => (
                    <span
                      key={canal}
                      className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/70"
                    >
                      {canal}
                    </span>
                  ))}
                </div>
              </div>
            </aside>

            <div className="flex flex-col bg-[#fffdfa]">
              <div className="border-b border-[#E8DDCB] px-6 py-4 sm:px-8">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#071E36] text-[#E1B866]">
                    <Bot size={19} />
                  </span>
                  <div>
                    <h2 className="font-semibold text-[#071E36]">
                      Atendimento comercial simulado
                    </h2>
                    <p className="text-sm text-[#64736D]">
                      Interface preparada para o futuro chat da Terrazza.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-1 items-center justify-center px-6 py-10 sm:px-8">
                <div className="w-full max-w-3xl">
                  <div className="rounded-[2rem] border border-[#E8DDCB] bg-white p-6 shadow-sm sm:p-8">
                    <div className="flex gap-4">
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#071E36] text-[#E1B866]">
                        <Bot size={20} />
                      </span>
                      <div className="text-[#071E36]">
                        <p className="text-lg font-semibold">Olá.</p>
                        <p className="mt-4 leading-7">
                          Sou a IA Comercial da Terrazza.
                        </p>
                        <p className="mt-4 leading-7 text-[#64736D]">
                          Em breve estarei integrada ao WhatsApp, Site e Vista.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-8 rounded-[1.75rem] border border-[#E8DDCB] bg-white p-3 shadow-sm">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                      <label className="sr-only" htmlFor="ia-message">
                        Mensagem para a IA Comercial
                      </label>
                      <textarea
                        id="ia-message"
                        rows={3}
                        placeholder="Digite uma mensagem para a futura IA Comercial..."
                        className="min-h-24 flex-1 resize-none rounded-2xl border border-transparent bg-[#F7F3ED] px-4 py-3 text-sm text-[#071E36] outline-none transition placeholder:text-[#9a9d98] focus:border-[#C89B3C]"
                      />
                      <button
                        type="button"
                        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#071E36] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#0A2A4A]"
                      >
                        Enviar
                        <Send size={16} />
                      </button>
                    </div>
                    <p className="mt-3 px-2 text-xs text-[#64736D]">
                      Campo apenas visual nesta sprint. Sem API, streaming ou
                      integração ativa.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
