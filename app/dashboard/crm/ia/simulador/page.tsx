"use client";

import { FormEvent, KeyboardEvent, useMemo, useState } from "react";
import Link from "next/link";
import {
  Bot,
  FileText,
  MessageCircle,
  Play,
  RotateCcw,
  Send,
  Sparkles,
  Thermometer,
  UserRound,
} from "lucide-react";

import {
  gerarMensagemInicial,
  type TipoLeadSimulador,
} from "../../../../../lib/ia/fluxos";
import { obterScriptQualificacao } from "../../../../../lib/ia/scriptsQualificacao";
import {
  atualizarContexto,
  calcularScore,
  camposPendentes,
  camposPreenchidos,
  criarContextoInicial,
  descobrirProximaPergunta,
  gerarBriefing,
  processarTurno,
  resumoContexto,
  type ChatMessage,
  type LeadContext,
} from "../../../../../lib/ia/motor";

const tiposLead: Array<{ label: string; value: TipoLeadSimulador }> = [
  { label: "Proprietario", value: "proprietario" },
  { label: "Inquilino", value: "inquilino" },
  { label: "Comprador", value: "comprador" },
  { label: "Vendedor", value: "vendedor" },
  { label: "Corretor parceiro", value: "corretor_parceiro" },
];

const origens = [
  "facebook",
  "instagram",
  "qr_code_placa",
  "site",
  "portal",
  "manual",
];

const canais = ["whatsapp", "site", "instagram", "facebook"];

function labelTexto(valor: string) {
  return valor.replaceAll("_", " ");
}

function temperaturaClassName(temperatura: string) {
  switch (temperatura) {
    case "quente":
      return "bg-red-50 text-red-700 ring-red-100";
    case "morno":
      return "bg-amber-50 text-amber-700 ring-amber-100";
    default:
      return "bg-sky-50 text-sky-700 ring-sky-100";
  }
}

function novaMensagem(autor: ChatMessage["autor"], texto: string): ChatMessage {
  return {
    id: `${autor}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    autor,
    texto,
  };
}

function contextoConfigurado({
  tipoLead,
  origem,
  cidade,
  canal,
}: {
  tipoLead: TipoLeadSimulador;
  origem: string;
  cidade: string;
  canal: string;
}) {
  return atualizarContexto(criarContextoInicial(), {
    tipoLead,
    cidade: cidade || null,
    objetivo: `Qualificar lead ${labelTexto(tipoLead)}`,
    origem,
    canal,
  });
}

export default function SimuladorIaPage() {
  const [tipoLead, setTipoLead] = useState<TipoLeadSimulador>("proprietario");
  const [origem, setOrigem] = useState("instagram");
  const [cidade, setCidade] = useState("Maceio");
  const [canal, setCanal] = useState("whatsapp");
  const [simulacaoIniciada, setSimulacaoIniciada] = useState(false);
  const [mensagem, setMensagem] = useState("");
  const [mensagens, setMensagens] = useState<ChatMessage[]>([]);
  const [contexto, setContexto] = useState<LeadContext>(() =>
    contextoConfigurado({
      tipoLead: "proprietario",
      origem: "instagram",
      cidade: "Maceio",
      canal: "whatsapp",
    }),
  );
  const [briefingVisivel, setBriefingVisivel] = useState(false);

  const scriptAtivo = useMemo(
    () => obterScriptQualificacao(tipoLead),
    [tipoLead],
  );
  const scoreMotor = useMemo(() => calcularScore(contexto), [contexto]);
  const camposPreenchidosMotor = useMemo(
    () => camposPreenchidos(contexto),
    [contexto],
  );
  const camposPendentesMotor = useMemo(
    () =>
      camposPendentes(contexto, [
        "tipoLead",
        "cidade",
        "bairro",
        "tipoImovel",
        "valor",
        "objetivo",
      ]),
    [contexto],
  );
  const proximaPergunta = useMemo(
    () => descobrirProximaPergunta(contexto),
    [contexto],
  );
  const briefingMotor = useMemo(
    () =>
      gerarBriefing({
        contexto,
        score: scoreMotor.score,
        temperatura: scoreMotor.temperatura,
        sugestao: scriptAtivo.proximaAcaoSugerida,
      }),
    [contexto, scoreMotor.score, scoreMotor.temperatura, scriptAtivo],
  );

  function iniciarSimulacao(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const contextoInicial = contextoConfigurado({
      tipoLead,
      origem,
      cidade,
      canal,
    });
    const perguntaInicial = descobrirProximaPergunta(contextoInicial);
    const textoInicial = [
      gerarMensagemInicial(tipoLead, origem),
      perguntaInicial ? perguntaInicial.texto : null,
    ]
      .filter(Boolean)
      .join("\n\n");

    setContexto(contextoInicial);
    setMensagens([novaMensagem("ia", textoInicial)]);
    setSimulacaoIniciada(true);
    setMensagem("");
    setBriefingVisivel(false);
  }

  function reiniciarSimulacao() {
    setSimulacaoIniciada(false);
    setMensagens([]);
    setMensagem("");
    setBriefingVisivel(false);
    setContexto(
      contextoConfigurado({
        tipoLead,
        origem,
        cidade,
        canal,
      }),
    );
  }

  function enviarMensagem() {
    const texto = mensagem.trim();

    if (!texto || !simulacaoIniciada) return;

    const resultado = processarTurno({
      mensagemUsuario: texto,
      contextoAtual: contexto,
      tipoLead,
      origem,
      canal,
    });

    setMensagens((mensagensAtuais) => [
      ...mensagensAtuais,
      novaMensagem("usuario", texto),
      novaMensagem("ia", resultado.respostaIa),
    ]);
    setContexto(resultado.contexto);
    setMensagem("");
  }

  function enviarFormulario(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    enviarMensagem();
  }

  function enviarComEnter(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      enviarMensagem();
    }
  }

  const score = scoreMotor.score;
  const temperatura = scoreMotor.temperatura;

  return (
    <main className="min-h-screen bg-[#F7F3ED] px-6 py-10 sm:px-8">
      <div className="mx-auto max-w-7xl">
        <Link
          href="/dashboard/crm/ia"
          className="inline-flex rounded-xl border border-[#E8DDCB] bg-white px-4 py-2 text-sm font-medium text-[#071E36] transition hover:border-[#C89B3C]/45 hover:bg-[#C89B3C]/10"
        >
          Voltar para IA Comercial
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
                  Simulador da IA Comercial
                </h1>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-[#64736D]">
                  Teste conversas por turnos antes de conectar a IA ao WhatsApp.
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-[#E8DDCB] bg-[#F7F3ED] px-4 py-3 text-sm text-[#64736D]">
              <span className="block text-xs font-semibold uppercase tracking-[0.14em] text-[#8B6827]">
                Ambiente
              </span>
              <strong className="mt-1 block text-[#071E36]">
                Conversa por turnos
              </strong>
            </div>
          </div>
        </header>

        <section className="mt-8 grid gap-6 xl:grid-cols-[380px_1fr]">
          <div className="grid content-start gap-6">
            <form
              onSubmit={iniciarSimulacao}
              className="rounded-[2rem] border border-[#E8DDCB] bg-white p-6 shadow-sm"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#071E36] text-[#E1B866]">
                  <Sparkles size={20} />
                </span>
                <div>
                  <h2 className="text-xl font-semibold text-[#071E36]">
                    Cenario de teste
                  </h2>
                  <p className="text-sm text-[#64736D]">
                    Configure o atendimento simulado.
                  </p>
                </div>
              </div>

              <div className="mt-6 grid gap-5">
                <label className="grid gap-2 text-sm font-medium text-[#102A27]">
                  Tipo de lead
                  <select
                    value={tipoLead}
                    onChange={(event) =>
                      setTipoLead(event.target.value as TipoLeadSimulador)
                    }
                    className="rounded-xl border border-[#E8DDCB] bg-white px-4 py-3 text-[#071E36] outline-none transition focus:border-[#C89B3C]"
                  >
                    {tiposLead.map((tipo) => (
                      <option key={tipo.value} value={tipo.value}>
                        {tipo.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="grid gap-2 text-sm font-medium text-[#102A27]">
                  Origem
                  <select
                    value={origem}
                    onChange={(event) => setOrigem(event.target.value)}
                    className="rounded-xl border border-[#E8DDCB] bg-white px-4 py-3 text-[#071E36] outline-none transition focus:border-[#C89B3C]"
                  >
                    {origens.map((item) => (
                      <option key={item} value={item}>
                        {labelTexto(item)}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="grid gap-2 text-sm font-medium text-[#102A27]">
                  Cidade
                  <input
                    value={cidade}
                    onChange={(event) => setCidade(event.target.value)}
                    className="rounded-xl border border-[#E8DDCB] px-4 py-3 text-[#071E36] outline-none transition placeholder:text-[#9a9d98] focus:border-[#C89B3C]"
                    placeholder="Ex.: Maceio"
                  />
                </label>

                <label className="grid gap-2 text-sm font-medium text-[#102A27]">
                  Canal
                  <select
                    value={canal}
                    onChange={(event) => setCanal(event.target.value)}
                    className="rounded-xl border border-[#E8DDCB] bg-white px-4 py-3 text-[#071E36] outline-none transition focus:border-[#C89B3C]"
                  >
                    {canais.map((item) => (
                      <option key={item} value={item}>
                        {labelTexto(item)}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="mt-6 grid gap-3">
                <button
                  type="submit"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#071E36] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#0A2A4A]"
                >
                  Iniciar simulacao
                  <Play size={16} />
                </button>
                <button
                  type="button"
                  onClick={reiniciarSimulacao}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[#E8DDCB] bg-white px-5 py-3 text-sm font-semibold text-[#071E36] transition hover:border-[#C89B3C]/45 hover:bg-[#C89B3C]/10"
                >
                  Reiniciar simulacao
                  <RotateCcw size={16} />
                </button>
              </div>
            </form>

            <aside className="rounded-[2rem] border border-[#C89B3C]/35 bg-[#071E36] p-6 text-white shadow-sm">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 text-[#E1B866]">
                  <FileText size={20} />
                </span>
                <div>
                  <h2 className="text-xl font-semibold">Script ativo</h2>
                  <p className="text-sm text-white/60">{labelTexto(tipoLead)}</p>
                </div>
              </div>

              <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#E1B866]">
                  Objetivo
                </p>
                <p className="mt-2 text-sm leading-6 text-white/75">
                  {scriptAtivo.objetivo}
                </p>
              </div>

              <div className="mt-4 grid gap-3 text-sm">
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                  <p className="font-semibold text-[#E1B866]">
                    Condicao de passagem
                  </p>
                  <p className="mt-2 leading-6 text-white/75">
                    {scriptAtivo.condicaoPassagemCorretor}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                  <p className="font-semibold text-[#E1B866]">
                    Proxima acao sugerida
                  </p>
                  <p className="mt-2 leading-6 text-white/75">
                    {scriptAtivo.proximaAcaoSugerida}
                  </p>
                </div>
              </div>
            </aside>
          </div>

          <div className="overflow-hidden rounded-[2rem] border border-[#E8DDCB] bg-white shadow-sm">
            <div className="border-b border-[#E8DDCB] bg-[#071E36] px-6 py-5 text-white">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-[#E1B866]">
                    <MessageCircle size={19} />
                  </span>
                  <div>
                    <h2 className="font-semibold">Chat simulado</h2>
                    <p className="text-sm text-white/60">
                      Canal: {labelTexto(canal)} | Origem: {labelTexto(origem)}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setBriefingVisivel(true)}
                  className="rounded-xl border border-[#C89B3C]/35 bg-[#C89B3C]/15 px-4 py-2 text-sm font-semibold text-[#E1B866] transition hover:bg-[#C89B3C]/20"
                >
                  Gerar briefing final
                </button>
              </div>
            </div>

            <div className="min-h-[620px] bg-[#fffdfa] px-5 py-6 sm:px-8">
              {!simulacaoIniciada ? (
                <div className="flex min-h-[520px] items-center justify-center">
                  <div className="max-w-md rounded-[2rem] border border-dashed border-[#E8DDCB] bg-white p-6 text-center shadow-sm">
                    <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#C89B3C]/15 text-[#8B6827]">
                      <Bot size={22} />
                    </span>
                    <h3 className="mt-4 text-lg font-semibold text-[#071E36]">
                      Pronto para simular
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-[#64736D]">
                      Inicie a simulacao e responda as perguntas como se fosse
                      um cliente real.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="grid gap-5">
                  <div className="grid gap-4">
                    {mensagens.map((item) => (
                      <div
                        key={item.id}
                        className={
                          item.autor === "usuario"
                            ? "ml-auto max-w-2xl rounded-[1.5rem] rounded-br-md bg-[#071E36] px-5 py-4 text-white shadow-sm"
                            : "max-w-3xl rounded-[1.5rem] rounded-bl-md border border-[#E8DDCB] bg-white px-5 py-4 text-[#071E36] shadow-sm"
                        }
                      >
                        <div
                          className={
                            item.autor === "usuario"
                              ? "mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#E1B866]"
                              : "mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#8B6827]"
                          }
                        >
                          {item.autor === "usuario" ? (
                            <UserRound size={15} />
                          ) : (
                            <Bot size={15} />
                          )}
                          {item.autor === "usuario"
                            ? "Lead simulado"
                            : "IA Comercial Terrazza"}
                        </div>
                        <p className="whitespace-pre-line text-sm leading-6">
                          {item.texto}
                        </p>
                      </div>
                    ))}
                  </div>

                  <section className="rounded-[1.75rem] border border-[#C89B3C]/35 bg-white p-5 shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h3 className="text-xl font-semibold text-[#071E36]">
                          Briefing para o corretor
                        </h3>
                        <p className="mt-1 text-sm text-[#64736D]">
                          Atualizado a cada turno da conversa.
                        </p>
                      </div>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] ring-1 ${temperaturaClassName(
                          temperatura,
                        )}`}
                      >
                        {temperatura}
                      </span>
                    </div>

                    <div className="mt-5 grid gap-3 text-sm md:grid-cols-2">
                      <div className="rounded-2xl bg-[#F7F3ED] px-4 py-3">
                        <p className="font-semibold text-[#071E36]">
                          Score e temperatura
                        </p>
                        <p className="mt-1 flex items-center gap-2 text-[#64736D]">
                          <Thermometer size={16} className="text-[#C89B3C]" />
                          {score}/100 | {temperatura}
                        </p>
                      </div>
                      <div className="rounded-2xl bg-[#F7F3ED] px-4 py-3">
                        <p className="font-semibold text-[#071E36]">
                          Lacunas pendentes
                        </p>
                        <p className="mt-1 text-[#64736D]">
                          {camposPendentesMotor.length > 0
                            ? camposPendentesMotor.join(", ")
                            : "Sem pendencias essenciais"}
                        </p>
                      </div>
                    </div>

                    {briefingVisivel ? (
                      <div className="mt-4 rounded-2xl border border-[#E8DDCB] bg-[#fffdfa] px-4 py-3 text-sm">
                        <p className="font-semibold text-[#071E36]">
                          Briefing final
                        </p>
                        <p className="mt-2 whitespace-pre-line leading-6 text-[#64736D]">
                          {briefingMotor}
                        </p>
                      </div>
                    ) : null}
                  </section>

                  <section className="rounded-[1.75rem] border border-[#071E36]/10 bg-[#071E36] p-5 text-white shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <span className="rounded-full border border-[#C89B3C]/35 bg-[#C89B3C]/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#E1B866]">
                          Ferramenta de treinamento
                        </span>
                        <h3 className="mt-3 text-xl font-semibold">
                          Como a IA esta pensando
                        </h3>
                        <p className="mt-1 text-sm text-white/60">
                          Estado cognitivo do motor antes de qualquer OpenAI.
                        </p>
                      </div>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] ring-1 ${temperaturaClassName(
                          temperatura,
                        )}`}
                      >
                        {temperatura}
                      </span>
                    </div>

                    <div className="mt-5 grid gap-3 text-sm md:grid-cols-2">
                      <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
                        <p className="font-semibold text-[#E1B866]">
                          Estado atual
                        </p>
                        <p className="mt-1 leading-6 text-white/75">
                          {resumoContexto(contexto)}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
                        <p className="font-semibold text-[#E1B866]">
                          Proxima pergunta
                        </p>
                        <p className="mt-1 leading-6 text-white/75">
                          {proximaPergunta?.texto ||
                            "Sem proxima pergunta essencial."}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
                        <p className="font-semibold text-[#E1B866]">Tipo Lead</p>
                        <p className="mt-1 text-white/75">
                          {labelTexto(contexto.tipoLead || "nao informado")}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
                        <p className="font-semibold text-[#E1B866]">Cidade</p>
                        <p className="mt-1 text-white/75">
                          {contexto.cidade || "Nao informada"}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
                        <p className="font-semibold text-[#E1B866]">Bairro</p>
                        <p className="mt-1 text-white/75">
                          {contexto.bairro || "Nao informado"}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
                        <p className="font-semibold text-[#E1B866]">Valor</p>
                        <p className="mt-1 text-white/75">
                          {contexto.valor || "Nao informado"}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 md:col-span-2">
                        <p className="font-semibold text-[#E1B866]">Objetivo</p>
                        <p className="mt-1 leading-6 text-white/75">
                          {contexto.objetivo || "Nao informado"}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-3 lg:grid-cols-2">
                      <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm">
                        <p className="font-semibold text-[#E1B866]">
                          Campos preenchidos
                        </p>
                        <p className="mt-2 leading-6 text-white/75">
                          {camposPreenchidosMotor.length > 0
                            ? camposPreenchidosMotor.join(", ")
                            : "Nenhum campo preenchido"}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm">
                        <p className="font-semibold text-[#E1B866]">
                          Campos pendentes
                        </p>
                        <p className="mt-2 leading-6 text-white/75">
                          {camposPendentesMotor.length > 0
                            ? camposPendentesMotor.join(", ")
                            : "Sem pendencias essenciais"}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm">
                        <p className="font-semibold text-[#E1B866]">
                          Proxima decisao
                        </p>
                        <p className="mt-2 leading-6 text-white/75">
                          {proximaPergunta?.texto ||
                            "Preparar passagem para especialista."}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm">
                        <p className="font-semibold text-[#E1B866]">
                          Objetivo atual
                        </p>
                        <p className="mt-2 leading-6 text-white/75">
                          {proximaPergunta
                            ? `Coletar ${proximaPergunta.campo}.`
                            : "Preparar briefing final."}
                        </p>
                      </div>
                    </div>
                  </section>
                </div>
              )}
            </div>

            <form
              onSubmit={enviarFormulario}
              className="border-t border-[#E8DDCB] bg-white p-4"
            >
              <div className="flex flex-col gap-3 rounded-[1.5rem] border border-[#E8DDCB] bg-[#F7F3ED] p-3 sm:flex-row sm:items-end">
                <textarea
                  value={mensagem}
                  onChange={(event) => setMensagem(event.target.value)}
                  onKeyDown={enviarComEnter}
                  disabled={!simulacaoIniciada}
                  rows={2}
                  placeholder={
                    simulacaoIniciada
                      ? "Responda como cliente. Enter envia, Shift+Enter quebra linha..."
                      : "Inicie a simulacao para conversar..."
                  }
                  className="min-h-16 flex-1 resize-none rounded-2xl border border-transparent bg-white px-4 py-3 text-sm text-[#071E36] outline-none transition placeholder:text-[#9a9d98] focus:border-[#C89B3C] disabled:cursor-not-allowed disabled:bg-white/60"
                />
                <button
                  type="submit"
                  disabled={!simulacaoIniciada || !mensagem.trim()}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#071E36] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#0A2A4A] disabled:cursor-not-allowed disabled:bg-[#071E36]/40"
                >
                  Enviar
                  <Send size={16} />
                </button>
              </div>
            </form>
          </div>
        </section>
      </div>
    </main>
  );
}
