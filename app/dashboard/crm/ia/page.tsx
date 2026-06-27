import { revalidatePath } from "next/cache";
import Link from "next/link";
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

import { supabase } from "../../../../lib/supabase";

type Conhecimento = {
  id: string;
  categoria: string;
  titulo: string;
  conteudo: string;
  ativo: boolean | null;
  origem: string | null;
  palavras_chave: string | null;
  prioridade: string | null;
  fixado: boolean | null;
  created_at: string | null;
};

type Conversa = {
  id: string;
  mensagem_usuario: string;
  mensagem_ia: string | null;
  origem: string | null;
  created_at: string | null;
};

const menuIa = [
  { label: "Novo atendimento", icon: MessageSquarePlus },
  { label: "Histórico", icon: History },
  { label: "Prompts", icon: WandSparkles },
  { label: "Memórias", icon: Brain },
  { label: "Configurações", icon: Settings },
];

const canaisFuturos = ["WhatsApp", "Site", "Instagram", "Facebook", "API Vista"];

function textoBuscaConhecimento(conhecimento: Conhecimento) {
  return [
    conhecimento.categoria,
    conhecimento.titulo,
    conhecimento.palavras_chave,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function termosBusca(pergunta: string) {
  return pergunta
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .split(/\s+/)
    .map((termo) => termo.replace(/[^\w]/g, ""))
    .filter((termo) => termo.length >= 3);
}

function normalizarTexto(texto: string) {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function conhecimentosRelacionados(
  pergunta: string,
  conhecimentos: Conhecimento[],
) {
  const termos = termosBusca(pergunta);

  if (termos.length === 0) return [];

  return conhecimentos
    .map((conhecimento) => {
      const texto = normalizarTexto(textoBuscaConhecimento(conhecimento));
      const pontos = termos.reduce((total, termo) => {
        return texto.includes(termo) ? total + 1 : total;
      }, 0);

      return { conhecimento, pontos };
    })
    .filter((item) => item.pontos > 0)
    .sort((a, b) => {
      if (Number(b.conhecimento.fixado) !== Number(a.conhecimento.fixado)) {
        return Number(b.conhecimento.fixado) - Number(a.conhecimento.fixado);
      }

      return b.pontos - a.pontos;
    })
    .slice(0, 3)
    .map((item) => item.conhecimento);
}

function gerarRespostaSimulada(
  pergunta: string,
  conhecimentos: Conhecimento[],
) {
  const relacionados = conhecimentosRelacionados(pergunta, conhecimentos);

  if (relacionados.length === 0) {
    return [
      "Estou em modo MVP da IA Comercial da Terrazza.",
      "",
      "Consultei a Base de Conhecimento, mas ainda não há conteúdo interno suficiente sobre esse tema.",
      "",
      "Nesta fase eu não uso OpenAI, embeddings ou RAG real. O objetivo é validar o fluxo, o histórico e a arquitetura antes da conexão com o motor de IA definitivo.",
    ].join("\n");
  }

  const lista = relacionados
    .map(
      (conhecimento, index) =>
        `${index + 1}. ${conhecimento.categoria} — ${conhecimento.titulo}`,
    )
    .join("\n");

  return [
    "Estou em modo MVP da IA Comercial da Terrazza.",
    "",
    "Com base nos conhecimentos internos cadastrados, encontrei estes conteúdos relacionados:",
    lista,
    "",
    "Ainda não estou conectada à OpenAI. Esta resposta é simulada para validar o fluxo da Base de Conhecimento, histórico de conversas e arquitetura do CRM.",
  ].join("\n");
}

function resumoCurto(texto: string, limite = 180) {
  return texto.length > limite ? `${texto.slice(0, limite)}...` : texto;
}

function formatarDataHora(data: string | null) {
  if (!data) return "Agora";

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(data));
}

export default async function IaComercialPage() {
  async function enviarMensagem(formData: FormData) {
    "use server";

    const pergunta = String(formData.get("mensagem") ?? "").trim();

    if (!pergunta) {
      throw new Error("Digite uma mensagem para a IA Comercial.");
    }

    const { data: conversaCriada, error: conversaError } = await supabase
      .from("ia_conversas")
      .insert({
        mensagem_usuario: pergunta,
        origem: "manual",
      })
      .select("id")
      .single();

    if (conversaError || !conversaCriada) {
      throw new Error("Não foi possível salvar a mensagem da conversa.");
    }

    const { data: conhecimentosData, error: conhecimentosError } = await supabase
      .from("ia_conhecimento")
      .select(
        "id, categoria, titulo, conteudo, ativo, origem, palavras_chave, prioridade, fixado, created_at",
      )
      .eq("ativo", true);

    if (conhecimentosError) {
      throw new Error("Não foi possível consultar a Base de Conhecimento.");
    }

    const resposta = gerarRespostaSimulada(
      pergunta,
      (conhecimentosData ?? []) as Conhecimento[],
    );

    const { error: respostaError } = await supabase
      .from("ia_conversas")
      .update({ mensagem_ia: resposta })
      .eq("id", conversaCriada.id);

    if (respostaError) {
      throw new Error("Não foi possível salvar a resposta da IA Comercial.");
    }

    const { error: timelineError } = await supabase.from("timeline").insert({
      tipo: "ia",
      titulo: "Interação com IA Comercial",
      descricao: resumoCurto(pergunta),
      origem: "ia_comercial",
    });

    if (timelineError) {
      console.error("timelineError", timelineError);
    }

    revalidatePath("/dashboard/crm/ia");
    revalidatePath("/dashboard/crm/timeline");
  }

  const [conversasResult, conhecimentosResult] = await Promise.all([
    supabase
      .from("ia_conversas")
      .select("id, mensagem_usuario, mensagem_ia, origem, created_at")
      .order("created_at", { ascending: false })
      .limit(12),
    supabase
      .from("ia_conhecimento")
      .select(
        "id, categoria, titulo, conteudo, ativo, origem, palavras_chave, prioridade, fixado, created_at",
      )
      .eq("ativo", true)
      .order("created_at", { ascending: false })
      .limit(8),
  ]);

  const conversas = ((conversasResult.data ?? []) as Conversa[]).reverse();
  const conhecimentos = (conhecimentosResult.data ?? []) as Conhecimento[];
  const erroCarregamento = conversasResult.error || conhecimentosResult.error;

  return (
    <main className="min-h-screen bg-[#F7F3ED] px-6 py-10 sm:px-8">
      <div className="mx-auto max-w-7xl">
        <Link
          href="/dashboard"
          className="inline-flex rounded-xl border border-[#E8DDCB] bg-white px-4 py-2 text-sm font-medium text-[#071E36] transition hover:border-[#C89B3C]/45 hover:bg-[#C89B3C]/10"
        >
          ← Voltar ao Dashboard
        </Link>

        <header className="mt-8 rounded-[2rem] border border-[#E8DDCB] bg-white p-6 shadow-sm sm:p-8">
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
                  MVP funcional usando a Base de Conhecimento interna da Terrazza,
                  ainda sem OpenAI, WhatsApp, Vista ou integrações externas.
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-[#E8DDCB] bg-[#F7F3ED] px-4 py-3 text-sm text-[#64736D]">
              <span className="block text-xs font-semibold uppercase tracking-[0.14em] text-[#8B6827]">
                Status
              </span>
              <strong className="mt-1 block text-[#071E36]">MVP ativo</strong>
            </div>
          </div>
        </header>

        {erroCarregamento ? (
          <p className="mt-8 rounded-xl bg-[#fbebe7] px-4 py-3 text-sm text-[#8a2e1c]">
            Não foi possível carregar conversas ou conhecimentos ativos. Verifique
            se os SQLs da IA foram aplicados no Supabase.
          </p>
        ) : (
          <section className="mt-8 overflow-hidden rounded-[2rem] border border-[#E8DDCB] bg-white shadow-sm">
            <div className="grid min-h-[720px] xl:grid-cols-[280px_1fr_330px]">
              <aside className="border-b border-[#E8DDCB] bg-[#071E36] p-5 text-white xl:border-r xl:border-b-0">
                <div className="rounded-2xl border border-[#C89B3C]/25 bg-white/[0.04] p-4">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#C89B3C]/15 text-[#E1B866]">
                      <Sparkles size={19} />
                    </span>
                    <div>
                      <p className="text-sm font-semibold">Central IA</p>
                      <p className="text-xs text-white/55">Módulo comercial MVP</p>
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
                          className={
                            index === 0 ? "text-[#E1B866]" : "text-white/45"
                          }
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
                        Atendimento comercial MVP
                      </h2>
                      <p className="text-sm text-[#64736D]">
                        Respostas simuladas a partir da Base de Conhecimento.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex-1 space-y-5 overflow-y-auto px-6 py-8 sm:px-8">
                  {conversas.length === 0 ? (
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
                            Nesta fase MVP eu consulto a Base de Conhecimento
                            cadastrada e retorno uma resposta simulada.
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    conversas.map((conversa) => (
                      <div key={conversa.id} className="space-y-4">
                        <div className="ml-auto max-w-2xl rounded-[1.5rem] rounded-br-md bg-[#071E36] px-5 py-4 text-white shadow-sm">
                          <p className="whitespace-pre-line text-sm leading-6">
                            {conversa.mensagem_usuario}
                          </p>
                          <p className="mt-3 text-xs text-white/55">
                            {formatarDataHora(conversa.created_at)}
                          </p>
                        </div>

                        {conversa.mensagem_ia ? (
                          <div className="max-w-3xl rounded-[1.5rem] rounded-bl-md border border-[#E8DDCB] bg-white px-5 py-4 text-[#071E36] shadow-sm">
                            <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#8B6827]">
                              <Bot size={15} />
                              IA Comercial MVP
                            </div>
                            <p className="whitespace-pre-line text-sm leading-6">
                              {conversa.mensagem_ia}
                            </p>
                          </div>
                        ) : null}
                      </div>
                    ))
                  )}
                </div>

                <form
                  action={enviarMensagem}
                  className="border-t border-[#E8DDCB] bg-white p-4 sm:p-5"
                >
                  <div className="flex flex-col gap-3 rounded-[1.75rem] border border-[#E8DDCB] bg-[#F7F3ED] p-3 shadow-sm sm:flex-row sm:items-end">
                    <label className="sr-only" htmlFor="ia-message">
                      Mensagem para a IA Comercial
                    </label>
                    <textarea
                      id="ia-message"
                      name="mensagem"
                      rows={3}
                      required
                      placeholder="Pergunte algo sobre atendimento, locação, garantias, documentação..."
                      className="min-h-24 flex-1 resize-none rounded-2xl border border-transparent bg-white px-4 py-3 text-sm text-[#071E36] outline-none transition placeholder:text-[#9a9d98] focus:border-[#C89B3C]"
                    />
                    <button
                      type="submit"
                      className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#071E36] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#0A2A4A]"
                    >
                      Enviar
                      <Send size={16} />
                    </button>
                  </div>
                </form>
              </div>

              <aside className="border-t border-[#E8DDCB] bg-white p-5 xl:border-t-0 xl:border-l">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#C89B3C]/15 text-[#8B6827]">
                    <Brain size={19} />
                  </span>
                  <div>
                    <h2 className="font-semibold text-[#071E36]">
                      Base de Conhecimento
                    </h2>
                    <p className="text-sm text-[#64736D]">
                      Últimos conteúdos ativos
                    </p>
                  </div>
                </div>

                <div className="mt-5 grid gap-3">
                  {conhecimentos.length === 0 ? (
                    <p className="rounded-2xl border border-dashed border-[#E8DDCB] bg-[#F7F3ED] px-4 py-8 text-center text-sm text-[#64736D]">
                      Nenhum conhecimento ativo cadastrado.
                    </p>
                  ) : (
                    conhecimentos.map((conhecimento) => (
                      <article
                        key={conhecimento.id}
                        className="rounded-2xl border border-[#E8DDCB] bg-[#fffdfa] p-4 shadow-sm"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <span className="rounded-full border border-[#C89B3C]/25 bg-[#C89B3C]/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#8B6827]">
                            {conhecimento.categoria}
                          </span>
                          {conhecimento.fixado ? (
                            <span className="rounded-full bg-[#071E36] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#E1B866]">
                              Fixado
                            </span>
                          ) : null}
                        </div>
                        <h3 className="mt-3 font-semibold text-[#071E36]">
                          {conhecimento.titulo}
                        </h3>
                        <p className="mt-2 line-clamp-3 text-sm leading-6 text-[#64736D]">
                          {conhecimento.conteudo}
                        </p>
                        {conhecimento.palavras_chave ? (
                          <p className="mt-3 text-xs text-[#8B6827]">
                            {conhecimento.palavras_chave}
                          </p>
                        ) : null}
                      </article>
                    ))
                  )}
                </div>
              </aside>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
