"use client";

import { FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import {
  Bot,
  ClipboardList,
  FileText,
  MessageCircle,
  Play,
  Send,
  Sparkles,
  Thermometer,
  UserRound,
} from "lucide-react";

import {
  gerarMensagemInicial,
  sugestaoPassagemCorretor,
  sugestaoProximaAcao,
  type TipoLeadSimulador,
} from "../../../../../lib/ia/fluxos";
import {
  obterLacunasPendentes,
  obterScriptQualificacao,
} from "../../../../../lib/ia/scriptsQualificacao";
import {
  atualizarContexto,
  calcularScore,
  camposPendentes,
  camposPreenchidos,
  criarContextoInicial,
  decidir,
  gerarBriefing,
  resumoContexto,
  type ConversationMemory,
  type LeadContext,
} from "../../../../../lib/ia/motor";

const tiposLead: Array<{ label: string; value: TipoLeadSimulador }> = [
  { label: "Proprietário", value: "proprietario" },
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

function ListaScript({
  titulo,
  itens,
  destaque,
}: {
  titulo: string;
  itens: string[];
  destaque?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-[#E8DDCB] bg-white px-4 py-3">
      <p className="text-sm font-semibold text-[#071E36]">{titulo}</p>
      <ul className="mt-3 grid gap-2 text-sm leading-6 text-[#64736D]">
        {itens.map((item) => (
          <li key={item} className="flex gap-2">
            <span
              className={
                destaque
                  ? "mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#C89B3C]"
                  : "mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#071E36]/35"
              }
            />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function SimuladorIaPage() {
  const [tipoLead, setTipoLead] = useState<TipoLeadSimulador>("proprietario");
  const [origem, setOrigem] = useState("instagram");
  const [cidade, setCidade] = useState("Maceió");
  const [canal, setCanal] = useState("whatsapp");
  const [simulacaoIniciada, setSimulacaoIniciada] = useState(false);

  const scriptAtivo = useMemo(
    () => obterScriptQualificacao(tipoLead),
    [tipoLead],
  );

  const contexto = useMemo<LeadContext>(
    () =>
      atualizarContexto(criarContextoInicial(), {
        tipoLead,
        cidade: cidade || null,
        objetivo: `Qualificar lead ${labelTexto(tipoLead)}`,
        origem,
        canal,
      }),
    [canal, cidade, origem, tipoLead],
  );

  const memoria = useMemo<ConversationMemory>(
    () => ({
      contexto,
      historico: [
        `Origem selecionada: ${labelTexto(origem)}`,
        `Canal selecionado: ${labelTexto(canal)}`,
        `Cidade informada: ${cidade || "não informada"}`,
      ],
    }),
    [canal, cidade, contexto, origem],
  );

  const decisaoMotor = useMemo(
    () => decidir(contexto, memoria, scriptAtivo),
    [contexto, memoria, scriptAtivo],
  );

  const scoreMotor = useMemo(() => calcularScore(contexto), [contexto]);

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
  const lacunasPendentes = useMemo(
    () => obterLacunasPendentes(tipoLead, cidade),
    [cidade, tipoLead],
  );
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
  const score = scoreMotor.score;
  const temperatura = scoreMotor.temperatura;
  const mensagemInicial = gerarMensagemInicial(tipoLead, origem);

  function iniciarSimulacao(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSimulacaoIniciada(true);
  }

  return (
    <main className="min-h-screen bg-[#F7F3ED] px-6 py-10 sm:px-8">
      <div className="mx-auto max-w-7xl">
        <Link
          href="/dashboard/crm/ia"
          className="inline-flex rounded-xl border border-[#E8DDCB] bg-white px-4 py-2 text-sm font-medium text-[#071E36] transition hover:border-[#C89B3C]/45 hover:bg-[#C89B3C]/10"
        >
          ← Voltar para IA Comercial
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
                  Teste fluxos de atendimento antes de conectar a IA ao WhatsApp.
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-[#E8DDCB] bg-[#F7F3ED] px-4 py-3 text-sm text-[#64736D]">
              <span className="block text-xs font-semibold uppercase tracking-[0.14em] text-[#8B6827]">
                Ambiente
              </span>
              <strong className="mt-1 block text-[#071E36]">
                Simulação interna
              </strong>
            </div>
          </div>
        </header>

        <section className="mt-8 grid gap-6 xl:grid-cols-[380px_1fr]">
          <div className="grid gap-6">
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
                    Cenário de teste
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
                    placeholder="Ex.: Maceió"
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

              <button
                type="submit"
                className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#071E36] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#0A2A4A]"
              >
                Iniciar simulação
                <Play size={16} />
              </button>
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
                    Condição de passagem
                  </p>
                  <p className="mt-2 leading-6 text-white/75">
                    {scriptAtivo.condicaoPassagemCorretor}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                  <p className="font-semibold text-[#E1B866]">
                    Próxima ação sugerida
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
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-[#E1B866]">
                  <MessageCircle size={19} />
                </span>
                <div>
                  <h2 className="font-semibold">Chat simulado</h2>
                  <p className="text-sm text-white/60">
                    Canal: {labelTexto(canal)} · Origem: {labelTexto(origem)}
                  </p>
                </div>
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
                      Escolha o cenário à esquerda e inicie o fluxo para ver
                      abordagem, script, score e briefing para o corretor.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="grid gap-5">
                  <div className="max-w-3xl rounded-[1.5rem] rounded-bl-md border border-[#E8DDCB] bg-white px-5 py-4 text-[#071E36] shadow-sm">
                    <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#8B6827]">
                      <Bot size={15} />
                      IA Comercial Terrazza
                    </div>
                    <p className="text-sm leading-6">{mensagemInicial}</p>
                  </div>

                  <div className="ml-auto max-w-2xl rounded-[1.5rem] rounded-br-md bg-[#071E36] px-5 py-4 text-white shadow-sm">
                    <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#E1B866]">
                      <UserRound size={15} />
                      Lead simulado
                    </div>
                    <p className="text-sm leading-6">
                      Olá! Vim pelo canal {labelTexto(canal)} e quero atendimento
                      em {cidade || "cidade ainda não informada"}.
                    </p>
                  </div>

                  <section className="rounded-[1.75rem] border border-[#E8DDCB] bg-white p-5 shadow-sm">
                    <div className="mb-4 flex items-center gap-3">
                      <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#C89B3C]/15 text-[#8B6827]">
                        <ClipboardList size={18} />
                      </span>
                      <div>
                        <h3 className="text-xl font-semibold text-[#071E36]">
                          Roteiro de qualificação
                        </h3>
                        <p className="text-sm text-[#64736D]">
                          A IA conversa naturalmente, mas segue este padrão.
                        </p>
                      </div>
                    </div>

                    <div className="grid gap-4 xl:grid-cols-2">
                      <ListaScript
                        titulo="Objetivo do script"
                        itens={[scriptAtivo.objetivo]}
                        destaque
                      />
                      <ListaScript
                        titulo="Critérios de score"
                        itens={scriptAtivo.criteriosScore}
                      />
                      <ListaScript
                        titulo="Perguntas obrigatórias"
                        itens={scriptAtivo.perguntasObrigatorias}
                        destaque
                      />
                      <ListaScript
                        titulo="Perguntas opcionais"
                        itens={scriptAtivo.perguntasOpcionais}
                      />
                    </div>

                    <div className="mt-4 rounded-2xl border border-[#C89B3C]/30 bg-[#C89B3C]/10 px-4 py-3 text-sm">
                      <p className="font-semibold text-[#071E36]">
                        Condição de passagem de bastão
                      </p>
                      <p className="mt-1 leading-6 text-[#64736D]">
                        {scriptAtivo.condicaoPassagemCorretor}
                      </p>
                    </div>
                  </section>

                  <section className="rounded-[1.75rem] border border-[#C89B3C]/35 bg-white p-5 shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h3 className="text-xl font-semibold text-[#071E36]">
                          Briefing para o corretor
                        </h3>
                        <p className="mt-1 text-sm text-[#64736D]">
                          Prévia do handoff gerado ao final da qualificação.
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
                          Resumo do lead
                        </p>
                        <p className="mt-1 text-[#64736D]">
                          Lead {labelTexto(tipoLead)} vindo de {labelTexto(origem)}
                          , canal {labelTexto(canal)}, com interesse inicial em{" "}
                          {cidade || "cidade não informada"}.
                        </p>
                      </div>
                      <div className="rounded-2xl bg-[#F7F3ED] px-4 py-3">
                        <p className="font-semibold text-[#071E36]">
                          Score e temperatura
                        </p>
                        <p className="mt-1 flex items-center gap-2 text-[#64736D]">
                          <Thermometer size={16} className="text-[#C89B3C]" />
                          {score}/100 · {temperatura}
                        </p>
                      </div>
                      <div className="rounded-2xl bg-[#F7F3ED] px-4 py-3">
                        <p className="font-semibold text-[#071E36]">
                          Informações coletadas
                        </p>
                        <p className="mt-1 text-[#64736D]">
                          Tipo de lead, origem, canal, cidade e intenção inicial
                          simulada.
                        </p>
                      </div>
                      <div className="rounded-2xl bg-[#F7F3ED] px-4 py-3">
                        <p className="font-semibold text-[#071E36]">
                          Lacunas pendentes
                        </p>
                        <ul className="mt-1 grid gap-1 text-[#64736D]">
                          {lacunasPendentes.map((lacuna) => (
                            <li key={lacuna}>• {lacuna}</li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-3 lg:grid-cols-2">
                      <div className="rounded-2xl border border-[#E8DDCB] bg-[#fffdfa] px-4 py-3 text-sm">
                        <p className="font-semibold text-[#071E36]">
                          Sugestão de próxima ação
                        </p>
                        <p className="mt-1 leading-6 text-[#64736D]">
                          {sugestaoProximaAcao(tipoLead)}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-[#E8DDCB] bg-[#fffdfa] px-4 py-3 text-sm">
                        <p className="font-semibold text-[#071E36]">
                          Sugestão de abordagem
                        </p>
                        <p className="mt-1 leading-6 text-[#64736D]">
                          {sugestaoPassagemCorretor(tipoLead)}
                        </p>
                      </div>
                    </div>
                  </section>

                  <section className="rounded-[1.75rem] border border-[#071E36]/10 bg-[#071E36] p-5 text-white shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <span className="rounded-full border border-[#C89B3C]/35 bg-[#C89B3C]/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#E1B866]">
                          Ferramenta de treinamento
                        </span>
                        <h3 className="mt-3 text-xl font-semibold">
                          Como a IA está pensando
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
                          Próxima pergunta
                        </p>
                        <p className="mt-1 leading-6 text-white/75">
                          {decisaoMotor.pergunta?.texto ||
                            "Sem próxima pergunta essencial."}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
                        <p className="font-semibold text-[#E1B866]">Tipo Lead</p>
                        <p className="mt-1 text-white/75">
                          {labelTexto(contexto.tipoLead || "não informado")}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
                        <p className="font-semibold text-[#E1B866]">Cidade</p>
                        <p className="mt-1 text-white/75">
                          {contexto.cidade || "Não informada"}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
                        <p className="font-semibold text-[#E1B866]">Bairro</p>
                        <p className="mt-1 text-white/75">
                          {contexto.bairro || "Não informado"}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
                        <p className="font-semibold text-[#E1B866]">Valor</p>
                        <p className="mt-1 text-white/75">
                          {contexto.valor || "Não informado"}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 md:col-span-2">
                        <p className="font-semibold text-[#E1B866]">Objetivo</p>
                        <p className="mt-1 leading-6 text-white/75">
                          {contexto.objetivo || "Não informado"}
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
                            : "Sem pendências essenciais"}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm">
                        <p className="font-semibold text-[#E1B866]">
                          Próxima decisão
                        </p>
                        <p className="mt-2 leading-6 text-white/75">
                          {decisaoMotor.proximoPasso}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm">
                        <p className="font-semibold text-[#E1B866]">
                          Objetivo atual
                        </p>
                        <p className="mt-2 leading-6 text-white/75">
                          {decisaoMotor.objetivoAtual}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm">
                        <p className="font-semibold text-[#E1B866]">Score</p>
                        <p className="mt-2 text-2xl font-bold text-white">
                          {score}/100
                        </p>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm">
                        <p className="font-semibold text-[#E1B866]">
                          Temperatura
                        </p>
                        <p className="mt-2 text-2xl font-bold text-white">
                          {temperatura}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 rounded-2xl border border-[#C89B3C]/25 bg-[#C89B3C]/10 px-4 py-3 text-sm">
                      <p className="font-semibold text-[#E1B866]">
                        Briefing gerado pelo motor
                      </p>
                      <p className="mt-2 whitespace-pre-line leading-6 text-white/75">
                        {briefingMotor}
                      </p>
                    </div>
                  </section>
                </div>
              )}
            </div>

            <div className="border-t border-[#E8DDCB] bg-white p-4">
              <div className="flex flex-col gap-3 rounded-[1.5rem] border border-[#E8DDCB] bg-[#F7F3ED] p-3 sm:flex-row sm:items-center">
                <input
                  disabled
                  placeholder="Campo reservado para respostas reais em sprint futura..."
                  className="min-h-11 flex-1 rounded-2xl border border-transparent bg-white px-4 py-3 text-sm text-[#071E36] outline-none placeholder:text-[#9a9d98]"
                />
                <button
                  type="button"
                  disabled
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#071E36]/40 px-5 py-3 text-sm font-semibold text-white"
                >
                  Enviar
                  <Send size={16} />
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
