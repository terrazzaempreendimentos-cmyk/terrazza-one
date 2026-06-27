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
  "valor",
  "pet",
  "financiamento",
  "fgts",
  "urgencia",
  "objetivo",
  "prazoMudanca",
  "documentacao",
  "documentacaoObservacao",
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
    Object.prototype.hasOwnProperty.call(informacoes, "pet")
      ? informacoes.pet
        ? "pet registrado"
        : "sem pet registrado"
      : null,
    informacoes.urgencia ? `urgencia ${informacoes.urgencia}` : null,
  ].filter(Boolean);

  if (partes.length === 0) {
    return "Entendi. Vou organizar isso com cuidado para nao perder o contexto.";
  }

  return `Perfeito, registrei ${partes.join(", ")}.`;
}

function respostaNatural({
  informacoesExtraidas,
  proximaPergunta,
  podePassarCorretor,
  sugestao,
}: {
  informacoesExtraidas: ExtractedInfo;
  proximaPergunta: NextQuestion | null;
  podePassarCorretor: boolean;
  sugestao: string;
}) {
  const confirmacao = resumoDoQueEntendeu(informacoesExtraidas);
  const transicoes = [
    "Otimo, isso ja ajuda bastante.",
    "Excelente, com essas informacoes ja consigo avancar.",
    "Agora so preciso confirmar mais um ponto.",
    "Perfeito, entendi o caminho.",
  ];
  const index = Object.keys(informacoesExtraidas).length % transicoes.length;

  if (podePassarCorretor) {
    return `${confirmacao} ${transicoes[index]} Ja tenho base para preparar o atendimento com um especialista da Terrazza. Proximo passo sugerido: ${sugestao}`;
  }

  if (proximaPergunta) {
    return `${confirmacao} ${transicoes[index]} ${proximaPergunta.texto}`;
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
    }),
    respostaIa: respostaNatural({
      informacoesExtraidas,
      proximaPergunta,
      podePassarCorretor,
      sugestao: script.proximaAcaoSugerida,
    }),
    estadoCognitivo: definirEstadoCognitivo(contexto, uceResult.score),
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
    temporalDebug: uceResult.temporalDebug,
    qualificado,
    motivoQualificacao,
    podePassarCorretor,
  };
}
