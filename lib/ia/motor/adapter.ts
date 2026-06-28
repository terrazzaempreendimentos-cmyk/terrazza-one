import type { TipoLeadSimulador } from "../fluxos";
import { obterScriptQualificacao } from "../scriptsQualificacao";
import { sugerirRespostaComercial } from "../comercial";
import { selecionarPersona } from "../personas";
import { processUCE, type UCEContext, type UCEHypothesis } from "../../uce";
import { gerarBriefing } from "./briefing";
import { calcularConfiancaCampos } from "./confianca";
import { avaliarQualificacao, definirEstadoCognitivo } from "./estado";
import { gerarHipoteses } from "./hipoteses";
import { gerarInferenciasComerciais, type HipoteseIA } from "./inferencia";
import type {
  CampoPergunta,
  ExtractedInfo,
  LeadContext,
  MotorTurnResult,
  NextQuestion,
} from "./tipos";

const camposLegados: Array<keyof LeadContext> = [
  "cidade",
  "bairro",
  "tipoImovel",
  "quartos",
  "banheiros",
  "areaM2",
  "valor",
  "pet",
  "financiamento",
  "fgts",
  "urgencia",
  "objetivo",
  "prazoMudanca",
  "documentacao",
  "documentacaoObservacao",
  "entradaDisponivel",
  "garagem",
  "vagas",
  "condominioAceita",
  "prazoCompra",
  "valorEsperado",
  "motivoVenda",
  "imovelFinanciado",
  "imovelOcupado",
  "jaAnunciou",
  "exclusividade",
  "moradores",
  "alugado",
  "valorAluguelAtual",
  "condominioValor",
  "iptu",
  "administracaoAtual",
  "motivoTroca",
  "administracaoCompleta",
  "chavesDisponiveis",
  "destinoCaptacao",
  "finalidadeAnuncio",
  "ocupacao",
];

function leadContextToUCE({
  contexto,
  tipoLead,
  origem,
  canal,
}: {
  contexto: LeadContext;
  tipoLead: TipoLeadSimulador;
  origem: string;
  canal: string;
}): UCEContext {
  const fields = camposLegados.reduce<Record<string, unknown>>((acc, field) => {
    acc[field] = contexto[field];

    return acc;
  }, {});

  return {
    domain: "real_estate",
    leadType: tipoLead,
    channel: canal,
    origin: origem,
    fields,
    memory: [],
    lastQuestionField: contexto.ultimaPerguntaCampo,
    activeQuestion: contexto.ultimaPerguntaCampo
      ? {
          field: contexto.ultimaPerguntaCampo,
          text: "",
          reason: "Campo herdado da ultima pergunta do motor legado.",
        }
      : null,
    metadata: {
      legacyContext: contexto,
      handoffReady: contexto.handoffReady,
      activeSpecialist: contexto.especialistaAtivo ?? undefined,
    },
  };
}

function uceToLeadContext({
  contextoAtual,
  uceContext,
  tipoLead,
  origem,
  canal,
}: {
  contextoAtual: LeadContext;
  uceContext: UCEContext;
  tipoLead: TipoLeadSimulador;
  origem: string;
  canal: string;
}): LeadContext {
  return {
    ...contextoAtual,
    tipoLead,
    origem,
    canal,
    cidade: (uceContext.fields.cidade as string | null) ?? null,
    bairro: (uceContext.fields.bairro as string | null) ?? null,
    tipoImovel: (uceContext.fields.tipoImovel as string | null) ?? null,
    quartos: (uceContext.fields.quartos as number | null) ?? null,
    banheiros: (uceContext.fields.banheiros as number | null) ?? null,
    areaM2: (uceContext.fields.areaM2 as number | null) ?? null,
    valor: (uceContext.fields.valor as number | null) ?? null,
    pet:
      typeof uceContext.fields.pet === "boolean"
        ? uceContext.fields.pet
        : contextoAtual.pet,
    financiamento:
      typeof uceContext.fields.financiamento === "boolean"
        ? uceContext.fields.financiamento
        : contextoAtual.financiamento,
    fgts:
      typeof uceContext.fields.fgts === "boolean"
        ? uceContext.fields.fgts
        : contextoAtual.fgts,
    urgencia: (uceContext.fields.urgencia as string | null) ?? null,
    objetivo: (uceContext.fields.objetivo as string | null) ?? null,
    prazoMudanca: (uceContext.fields.prazoMudanca as string | null) ?? null,
    documentacao:
      typeof uceContext.fields.documentacao === "boolean"
        ? uceContext.fields.documentacao
        : contextoAtual.documentacao,
    documentacaoObservacao:
      (uceContext.fields.documentacaoObservacao as string | null) ?? null,
    entradaDisponivel:
      (uceContext.fields.entradaDisponivel as number | boolean | null) ?? null,
    garagem:
      typeof uceContext.fields.garagem === "boolean"
        ? uceContext.fields.garagem
        : contextoAtual.garagem,
    vagas: (uceContext.fields.vagas as number | null) ?? null,
    condominioAceita:
      typeof uceContext.fields.condominioAceita === "boolean"
        ? uceContext.fields.condominioAceita
        : contextoAtual.condominioAceita,
    prazoCompra: (uceContext.fields.prazoCompra as string | null) ?? null,
    valorEsperado: (uceContext.fields.valorEsperado as number | null) ?? null,
    motivoVenda: (uceContext.fields.motivoVenda as string | null) ?? null,
    imovelFinanciado:
      typeof uceContext.fields.imovelFinanciado === "boolean"
        ? uceContext.fields.imovelFinanciado
        : contextoAtual.imovelFinanciado,
    imovelOcupado:
      typeof uceContext.fields.imovelOcupado === "boolean"
        ? uceContext.fields.imovelOcupado
        : contextoAtual.imovelOcupado,
    jaAnunciou:
      typeof uceContext.fields.jaAnunciou === "boolean"
        ? uceContext.fields.jaAnunciou
        : contextoAtual.jaAnunciou,
    exclusividade:
      typeof uceContext.fields.exclusividade === "boolean"
        ? uceContext.fields.exclusividade
        : contextoAtual.exclusividade,
    moradores: (uceContext.fields.moradores as number | null) ?? null,
    alugado:
      typeof uceContext.fields.alugado === "boolean"
        ? uceContext.fields.alugado
        : contextoAtual.alugado,
    valorAluguelAtual:
      (uceContext.fields.valorAluguelAtual as number | null) ?? null,
    condominioValor:
      (uceContext.fields.condominioValor as number | null) ?? null,
    iptu: (uceContext.fields.iptu as number | null) ?? null,
    administracaoAtual:
      typeof uceContext.fields.administracaoAtual === "boolean"
        ? uceContext.fields.administracaoAtual
        : contextoAtual.administracaoAtual,
    motivoTroca: (uceContext.fields.motivoTroca as string | null) ?? null,
    administracaoCompleta:
      typeof uceContext.fields.administracaoCompleta === "boolean"
        ? uceContext.fields.administracaoCompleta
        : contextoAtual.administracaoCompleta,
    chavesDisponiveis:
      typeof uceContext.fields.chavesDisponiveis === "boolean"
        ? uceContext.fields.chavesDisponiveis
        : contextoAtual.chavesDisponiveis,
    destinoCaptacao:
      (uceContext.fields.destinoCaptacao as string | null) ?? null,
    finalidadeAnuncio:
      (uceContext.fields.finalidadeAnuncio as string | null) ?? null,
    ocupacao: (uceContext.fields.ocupacao as string | null) ?? null,
    especialistaAtivo:
      typeof uceContext.metadata.activeSpecialist === "string"
        ? uceContext.metadata.activeSpecialist
        : contextoAtual.especialistaAtivo,
    handoffReady:
      uceContext.metadata.handoffReady === true || contextoAtual.handoffReady,
    ultimaPerguntaCampo: (uceContext.lastQuestionField as CampoPergunta | null) ?? null,
  };
}

function hypothesesToLegacy(hypotheses: UCEHypothesis[]): HipoteseIA[] {
  return hypotheses.map((hypothesis) => ({
    titulo: hypothesis.title,
    descricao: hypothesis.description,
    confianca: hypothesis.confidence,
    categoria: hypothesis.category as HipoteseIA["categoria"],
  }));
}

function extractedToLegacy(
  interpretedFields: Array<{ field: string; value: unknown }>,
): ExtractedInfo {
  return interpretedFields.reduce<ExtractedInfo>((acc, item) => {
    if (camposLegados.includes(item.field as keyof LeadContext)) {
      return {
        ...acc,
        [item.field]: item.value,
      };
    }

    return acc;
  }, {});
}

function nextQuestionToLegacy(
  question: UCEContext["activeQuestion"],
): NextQuestion | null {
  if (!question) return null;

  return {
    campo: question.field as CampoPergunta,
    texto: question.text,
    motivo: question.reason,
  };
}

function resumoDoQueEntendeu(informacoes: ExtractedInfo) {
  const partes = [
    informacoes.objetivo ? `objetivo de ${informacoes.objetivo}` : null,
    informacoes.cidade ? `cidade ${informacoes.cidade}` : null,
    informacoes.bairro ? `bairro ${informacoes.bairro}` : null,
    informacoes.tipoImovel ? `imovel ${informacoes.tipoImovel}` : null,
    informacoes.quartos ? `${informacoes.quartos} quarto(s)` : null,
    informacoes.valor ? `faixa de valor ${informacoes.valor}` : null,
    informacoes.areaM2 ? `area aproximada ${informacoes.areaM2}m2` : null,
    Object.prototype.hasOwnProperty.call(informacoes, "pet")
      ? informacoes.pet
        ? "pet registrado"
        : "sem pet registrado"
      : null,
    informacoes.urgencia ? `urgencia ${informacoes.urgencia}` : null,
  ].filter(Boolean);

  if (partes.length === 0) {
    return "Entendi.";
  }

  return `Perfeito, registrei ${partes.join(", ")}.`;
}

function respostaNatural({
  informacoesExtraidas,
  proximaPergunta,
  podePassarCorretor,
  sugestao,
  closingMessage,
}: {
  informacoesExtraidas: ExtractedInfo;
  proximaPergunta: NextQuestion | null;
  podePassarCorretor: boolean;
  sugestao: string;
  closingMessage?: string | null;
}) {
  const confirmacao = resumoDoQueEntendeu(informacoesExtraidas);
  const hasNewInfo = Object.keys(informacoesExtraidas).length > 0;

  if (podePassarCorretor) {
    if (closingMessage) {
      return hasNewInfo
        ? `${confirmacao} ${closingMessage}`
        : closingMessage;
    }

    return `${confirmacao} Ja tenho base para preparar o atendimento com um especialista da Terrazza. Proximo passo sugerido: ${sugestao}`;
  }

  if (proximaPergunta) {
    return hasNewInfo
      ? `${confirmacao} ${proximaPergunta.texto}`
      : proximaPergunta.texto;
  }

  return `${confirmacao} Vou consolidar essas informacoes e preparar o melhor encaminhamento comercial.`;
}

export function processarTurno({
  mensagemUsuario,
  contextoAtual,
  tipoLead,
  origem,
  canal,
}: {
  mensagemUsuario: string;
  contextoAtual: LeadContext;
  tipoLead: TipoLeadSimulador;
  origem: string;
  canal: string;
}): MotorTurnResult {
  const uceResult = processUCE({
    message: mensagemUsuario,
    context: leadContextToUCE({ contexto: contextoAtual, tipoLead, origem, canal }),
  });
  const contexto = uceToLeadContext({
    contextoAtual,
    uceContext: uceResult.context,
    tipoLead,
    origem,
    canal,
  });
  const informacoesExtraidas = extractedToLegacy(uceResult.interpretedFields);
  const proximaPergunta = nextQuestionToLegacy(uceResult.decision.nextQuestion);
  const inferenciasComerciais = [
    ...hypothesesToLegacy(uceResult.hypotheses),
    ...gerarInferenciasComerciais(contexto),
  ];
  const leituraComercial = sugerirRespostaComercial(
    mensagemUsuario,
    contexto,
    inferenciasComerciais,
  );
  const script = obterScriptQualificacao(tipoLead);
  const { qualificado, podePassarCorretor, motivoQualificacao } =
    avaliarQualificacao(contexto, uceResult.score);
  const handoffQualificado = uceResult.handoff.canHandoff;

  return {
    contexto,
    informacoesExtraidas,
    camposPendentes: uceResult.briefing.pendingFields as Array<keyof LeadContext>,
    proximaPergunta,
    score: uceResult.score,
    temperatura: uceResult.temperature,
    briefing: gerarBriefing({
      contexto,
      score: uceResult.score,
      temperatura: uceResult.temperature,
      sugestao: script.proximaAcaoSugerida,
      hipotesesComerciais: inferenciasComerciais,
      alertasComerciais: leituraComercial,
      knowledgeResults: uceResult.knowledgeResults,
      knowledgeSummary: uceResult.knowledgeSummary,
      correspondenceMatches: uceResult.correspondenceMatches,
      correspondenceRecommendations: uceResult.correspondenceRecommendations,
      perfilComportamental: uceResult.perfilComportamental,
      aprendizado: uceResult.aprendizado,
    }),
    respostaIa: respostaNatural({
      informacoesExtraidas,
      proximaPergunta,
      podePassarCorretor: handoffQualificado || podePassarCorretor,
      sugestao: script.proximaAcaoSugerida,
      closingMessage: uceResult.closingMessage,
    }),
    estadoCognitivo: handoffQualificado
      ? "pronto_para_corretor"
      : definirEstadoCognitivo(contexto, uceResult.score),
    confiancaCampos: calcularConfiancaCampos(contexto, informacoesExtraidas),
    hipoteses: gerarHipoteses(contexto),
    inferenciasComerciais,
    personaAtiva: selecionarPersona(contexto),
    objecaoDetectada: leituraComercial.objecaoDetectada,
    respostaComercialSugerida: leituraComercial.respostaComercialSugerida,
    proximaPerguntaComercial: leituraComercial.proximaPerguntaSugerida,
    riscoComercial: leituraComercial.riscoComercial,
    precisaCorretorHumano: leituraComercial.precisaCorretorHumano,
    leituraComercial: leituraComercial.leituraComercial,
    commercialStrategy: uceResult.commercialStrategy,
    commercialAwareness: uceResult.commercialAwareness,
    brokerMentorBriefing: uceResult.brokerMentorBriefing,
    handoff: uceResult.handoff,
    closingMessage: uceResult.closingMessage,
    conversationStatus: uceResult.conversationStatus,
    temporalDebug: uceResult.temporalDebug,
    specialist: uceResult.specialist,
    knowledgeResults: uceResult.knowledgeResults,
    knowledgeSummary: uceResult.knowledgeSummary,
    correspondenceMatches: uceResult.correspondenceMatches,
    correspondenceRecommendations: uceResult.correspondenceRecommendations,
    perfilComportamental: uceResult.perfilComportamental,
    aprendizado: uceResult.aprendizado,
    uceResult,
    qualificado: handoffQualificado || qualificado,
    motivoQualificacao: handoffQualificado
      ? uceResult.handoff.reason
      : motivoQualificacao,
    podePassarCorretor: handoffQualificado || podePassarCorretor,
  };
}
