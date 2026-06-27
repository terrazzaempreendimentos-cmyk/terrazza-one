import type {
  UCEContext,
  UCEFieldConfidence,
  UCEProcessInput,
  UCEProcessResult,
  UCETemporalDebug,
} from "./types";
import { generateUCEBriefing } from "../briefing";
import {
  evaluateCommercialAwareness,
  generateBrokerMentorBriefing,
  selectCommercialStrategy,
} from "../commercial";
import {
  getNextSmartQuestion,
  isQualifiedForHandoff,
  shouldHandoff,
} from "../flow";
import { generateHypotheses } from "../inference";
import { interpretContextualAnswer } from "../interpreters/contextual";
import { interpretTemporalExpression } from "../interpreters/temporal";
import { detectCorrection } from "../memory";
import { calculateUCEScore } from "../score";
import { detectarBairro, detectarCidade } from "../domain";
import {
  getSpecialistPendingFields,
  selectUCESpecialist,
  type UCESpecialistConfig,
} from "../specialists";

const requiredFields = [
  "objetivo",
  "cidade",
  "bairro",
  "tipoImovel",
  "valor",
  "quartos",
  "pet",
  "urgencia",
  "documentacao",
];

function normalize(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function has(text: string, terms: string[]) {
  return terms.some((term) => text.includes(term));
}

function parseMoney(text: string) {
  const mil = text.match(/(\d+(?:[.,]\d+)?)\s*mil/);
  if (mil?.[1]) {
    return Math.round(Number(mil[1].replace(",", ".")) * 1000);
  }

  const currency = text.match(/(?:r\$\s*)?(\d{1,3}(?:\.\d{3})+|\d{4,6}|\d{3,6})(?:,\d{2})?/);
  if (!currency?.[1]) return null;

  return Number(currency[1].replace(/\./g, ""));
}

function parseNumberWords(text: string) {
  if (has(text, ["1 quarto", "um quarto", "uma suite"])) return 1;
  if (has(text, ["2 quartos", "dois quartos", "duas suites"])) return 2;
  if (has(text, ["3 quartos", "tres quartos"])) return 3;
  if (has(text, ["4 quartos", "quatro quartos"])) return 4;

  const match = text.match(/(\d+)\s*(quarto|quartos|suite|suites)/);

  return match?.[1] ? Number(match[1]) : null;
}

function parseGeneralRealEstateFields(message: string) {
  const text = normalize(message);
  const fields: Record<string, unknown> = {};

  if (has(text, ["alugar", "aluguel", "locacao", "locar"])) {
    fields.objetivo = "locacao";
  } else if (has(text, ["administrar", "administracao"])) {
    fields.objetivo = "administracao";
  } else if (has(text, ["anunciar", "captar", "captacao"])) {
    fields.objetivo = "captacao";
  } else if (has(text, ["vender", "venda"])) {
    fields.objetivo = "venda";
  } else if (has(text, ["comprar", "compra"])) {
    fields.objetivo = "compra";
  }

  const city = detectarCidade(message);
  if (city) fields.cidade = city;

  const bairro = detectarBairro(message);
  if (bairro) fields.bairro = bairro;

  if (has(text, ["apartamento", "apto"])) fields.tipoImovel = "apartamento";
  if (has(text, ["casa"])) fields.tipoImovel = "casa";
  if (has(text, ["sala"])) fields.tipoImovel = "sala";
  if (has(text, ["terreno"])) fields.tipoImovel = "terreno";
  if (has(text, ["lote"])) fields.tipoImovel = "lote";
  if (has(text, ["comercial"])) fields.tipoImovel = "comercial";

  const quartos = parseNumberWords(text);
  if (quartos) fields.quartos = quartos;

  const valor = parseMoney(text);
  if (valor) fields.valor = valor;

  if (has(text, ["cachorro", "gato", "tenho pet"])) fields.pet = true;
  if (has(text, ["sem pet", "nao tenho pet"])) fields.pet = false;

  if (has(text, ["financiamento", "financiado", "vou financiar"])) {
    fields.financiamento = true;
  }
  if (has(text, ["a vista", "à vista"])) fields.financiamento = false;
  if (has(text, ["fgts"])) fields.fgts = true;

  return fields;
}

function specialistSnapshot(specialist: UCESpecialistConfig) {
  return {
    id: specialist.id,
    label: specialist.persona.label,
    objective: specialist.persona.objective,
  };
}

function parseBooleanAnswer(text: string) {
  if (has(text, ["sim", "tenho", "preciso", "aceito", "considero", "quero"])) {
    return true;
  }

  if (has(text, ["nao", "sem", "nao tenho", "dispenso"])) {
    return false;
  }

  return null;
}

function parseActiveQuestionValue(field: string, message: string) {
  const text = normalize(message);
  const moneyFields = [
    "valor",
    "valorEsperado",
    "valorAluguelAtual",
    "condominioValor",
    "iptu",
    "entradaDisponivel",
  ];
  const booleanFields = [
    "financiamento",
    "fgts",
    "garagem",
    "condominioAceita",
    "imovelFinanciado",
    "documentacao",
    "imovelOcupado",
    "jaAnunciou",
    "exclusividade",
    "alugado",
    "administracaoAtual",
    "administracaoCompleta",
    "chavesDisponiveis",
    "pet",
  ];

  if (field === "destinoCaptacao") {
    if (has(text, ["venda", "vender"])) return "venda";
    if (has(text, ["locacao", "aluguel", "alugar", "locar"])) return "locacao";
  }

  if (field === "quartos" || field === "moradores") {
    return parseNumberWords(text);
  }

  if (moneyFields.includes(field)) {
    return parseMoney(text);
  }

  if (booleanFields.includes(field)) {
    return parseBooleanAnswer(text);
  }

  return message.trim().length > 0 ? message.trim() : null;
}

function isFilled(value: unknown) {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.trim().length > 0;

  return true;
}

function pendingFields(context: UCEContext) {
  if (context.domain === "real_estate") {
    return getSpecialistPendingFields(context);
  }

  return requiredFields.filter((field) => !isFilled(context.fields[field]));
}

function fieldConfidence(
  field: string,
  value: unknown,
  confidence: number,
  reason: string,
): UCEFieldConfidence {
  return { field, value, confidence, reason };
}

export function processUCE(input: UCEProcessInput): UCEProcessResult {
  const fields = { ...input.context.fields };
  const interpretedFields: UCEFieldConfidence[] = [];
  const correction = detectCorrection(input.message);
  let temporalDebug: UCETemporalDebug = {
    activeQuestionField:
      input.context.activeQuestion?.field ?? input.context.lastQuestionField,
    filledField: null,
    savedValue: null,
    confidence: 0,
    decisionReason: "Nenhuma decisao temporal aplicada neste turno.",
    recognizedExpression: null,
  };

  if (input.context.metadata.handoffReady === true) {
    const specialist = selectUCESpecialist(input.context);
    const context: UCEContext = {
      ...input.context,
      activeQuestion: null,
      lastQuestionField: null,
      memory: [
        ...input.context.memory,
        { role: "user", content: input.message, createdAt: new Date().toISOString() },
      ],
    };
    const missing = pendingFields(context);
    const hypotheses = generateHypotheses(context);
    const { score, temperature } = calculateUCEScore(context, hypotheses);
    const commercialStrategy = selectCommercialStrategy(context, hypotheses);
    const commercialAwareness = evaluateCommercialAwareness(
      context,
      score,
      hypotheses,
      commercialStrategy,
    );
    const brokerMentorBriefing = generateBrokerMentorBriefing(
      context,
      hypotheses,
      commercialStrategy,
      commercialAwareness,
    );
    const briefing = generateUCEBriefing({
      context,
      hypotheses,
      pendingFields: missing,
      score,
      temperature,
    });
    const schedulingIntent = normalize(input.message).includes("agendar");
    const closingMessage = schedulingIntent
      ? "Esse atendimento ja esta pronto para encaminhamento. O proximo passo e o especialista confirmar disponibilidade e seguir com o atendimento."
      : specialist.closingMessage;

    return {
      context,
      interpretedFields,
      correction,
      decision: {
        nextQuestion: null,
        status: "ready_for_handoff",
        reason: "Atendimento ja qualificado; novas mensagens nao reabrem o fluxo.",
      },
      score,
      temperature,
      hypotheses,
      briefing,
      handoff: {
        canHandoff: true,
        reason: "Atendimento ja estava pronto para passagem humana.",
        handoffType: specialist.handoffType,
        missingCriticalFields: [],
        optionalMissingFields: missing,
      },
      closingMessage,
      conversationStatus: "encerrado",
      temporalDebug,
      commercialStrategy,
      commercialAwareness,
      brokerMentorBriefing,
      specialist: specialistSnapshot(specialist),
    };
  }

  if (correction.targetField) {
    fields[correction.targetField] = correction.newValue;
    interpretedFields.push(
      fieldConfidence(
        correction.targetField,
        correction.newValue,
        correction.confidence,
        correction.reason,
      ),
    );
  }

  const contextual = interpretContextualAnswer({
    text: input.message,
    context: input.context,
  });
  if (contextual.field) {
    fields[contextual.field] = contextual.value;
    const metadata =
      "metadata" in contextual
        ? (contextual.metadata as {
            deadlineText?: string | null;
            recognizedExpression?: string | null;
            asksForSpecificDeadline?: boolean;
            documentacaoObservacao?: string | null;
          })
        : null;

    if (contextual.field === "urgencia") {
      if (metadata?.deadlineText) {
        fields.prazoMudanca = metadata.deadlineText;
      }

      temporalDebug = {
        activeQuestionField:
          input.context.activeQuestion?.field ?? input.context.lastQuestionField,
        filledField: "urgencia",
        savedValue: contextual.value,
        confidence: contextual.confidence,
        decisionReason: contextual.reason,
        recognizedExpression: metadata?.recognizedExpression ?? null,
      };
    }

    if (contextual.field === "documentacao" && metadata?.documentacaoObservacao) {
      fields.documentacaoObservacao = metadata.documentacaoObservacao;
    }

    interpretedFields.push(
      fieldConfidence(
        contextual.field,
        contextual.value,
        contextual.confidence,
        contextual.reason,
      ),
    );

    if (contextual.field === "urgencia" && metadata?.deadlineText) {
      interpretedFields.push(
        fieldConfidence(
          "prazoMudanca",
          metadata.deadlineText,
          contextual.confidence,
          "Prazo textual preservado pela resposta contextual de urgencia.",
        ),
      );
    }

    if (contextual.field === "documentacao" && metadata?.documentacaoObservacao) {
      interpretedFields.push(
        fieldConfidence(
          "documentacaoObservacao",
          metadata.documentacaoObservacao,
          contextual.confidence,
          "Observacao preservada a partir da resposta de documentacao.",
        ),
      );
    }
  }

  const generalFields = parseGeneralRealEstateFields(input.message);
  const activeField =
    input.context.activeQuestion?.field ?? input.context.lastQuestionField;
  const messageChangesObjective =
    Boolean(generalFields.objetivo) &&
    activeField !== "objetivo" &&
    activeField !== "destinoCaptacao";
  if (!contextual.field && activeField && !messageChangesObjective) {
    const activeValue = parseActiveQuestionValue(activeField, input.message);

    if (activeValue !== null) {
      fields[activeField] = activeValue;
      interpretedFields.push(
        fieldConfidence(
          activeField,
          activeValue,
          80,
          "Informacao extraida a partir da pergunta ativa do especialista.",
        ),
      );
    }
  }

  const temporal = interpretTemporalExpression(input.message);
  const contextualHandledUrgency = contextual.field === "urgencia";
  const contextualHandledAnotherField =
    Boolean(contextual.field) && contextual.field !== "urgencia";
  if (
    !contextualHandledUrgency &&
    !contextualHandledAnotherField &&
    (temporal.urgency !== "indefinida" || temporal.asksForSpecificDeadline)
  ) {
    fields.urgencia = temporal.urgency;
    fields.prazoMudanca = temporal.deadlineText;
    temporalDebug = {
      activeQuestionField:
        input.context.activeQuestion?.field ?? input.context.lastQuestionField,
      filledField: "urgencia",
      savedValue: temporal.urgency,
      confidence: temporal.confidence,
      decisionReason: temporal.reason,
      recognizedExpression: temporal.recognizedExpression,
    };
    interpretedFields.push(
      fieldConfidence("urgencia", temporal.urgency, temporal.confidence, temporal.reason),
      fieldConfidence(
        "prazoMudanca",
        temporal.deadlineText,
        temporal.confidence,
        "Prazo textual preservado pela UCE.",
      ),
    );
  }

  Object.entries(generalFields).forEach(([field, value]) => {
    fields[field] = value;
    interpretedFields.push(
      fieldConfidence(field, value, 82, "Informacao extraida por regras gerais UCE."),
    );
  });

  if (fields.destinoCaptacao === "venda") {
    fields.objetivo = "venda";
  }

  if (fields.destinoCaptacao === "locacao") {
    fields.objetivo = "administracao";
  }

  const preliminaryContext: UCEContext = {
    ...input.context,
    fields,
    metadata: {
      ...input.context.metadata,
      activeSpecialist: undefined,
    },
  };
  const specialist = selectUCESpecialist(preliminaryContext);
  const activeSpecialist = specialist.id;

  const contextBeforeQuestion: UCEContext = {
    ...input.context,
    fields,
    memory: [
      ...input.context.memory,
      { role: "user", content: input.message, createdAt: new Date().toISOString() },
    ],
    metadata: {
      ...input.context.metadata,
      activeSpecialist,
    },
  };
  const preliminaryMissing = pendingFields(contextBeforeQuestion);
  const hypotheses = generateHypotheses(contextBeforeQuestion);
  const { score, temperature } = calculateUCEScore(
    contextBeforeQuestion,
    hypotheses,
  );
  const qualified = isQualifiedForHandoff(
    contextBeforeQuestion,
    score,
    contextBeforeQuestion.leadType,
  );
  let nextQuestion = qualified ? null : getNextSmartQuestion(contextBeforeQuestion);
  let context: UCEContext = {
    ...contextBeforeQuestion,
    activeQuestion: nextQuestion,
    lastQuestionField: nextQuestion?.field ?? null,
    metadata: {
      ...contextBeforeQuestion.metadata,
      handoffReady: qualified || contextBeforeQuestion.metadata.handoffReady === true,
    },
  };
  const missing = pendingFields(context);
  const commercialStrategy = selectCommercialStrategy(context, hypotheses);
  const commercialAwareness = evaluateCommercialAwareness(
    context,
    score,
    hypotheses,
    commercialStrategy,
  );
  const brokerMentorBriefing = generateBrokerMentorBriefing(
    context,
    hypotheses,
    commercialStrategy,
    commercialAwareness,
  );
  const briefing = generateUCEBriefing({
    context,
    hypotheses,
    pendingFields: missing,
    score,
    temperature,
  });
  const handoff = qualified
    ? shouldHandoff(context, score, preliminaryMissing, hypotheses)
    : shouldHandoff(context, score, missing, hypotheses);
  const closingMessage = qualified
    ? specialist.closingMessage
    : null;

  if (qualified) {
    nextQuestion = null;
    context = {
      ...context,
      activeQuestion: null,
      lastQuestionField: null,
      metadata: {
        ...context.metadata,
        handoffReady: true,
      },
    };
  }

  const conversationStatus = qualified
    ? "handoff_pronto"
    : handoff.canHandoff
      ? "qualificado"
      : "coletando";
  const status =
    qualified
      ? "ready_for_handoff"
      : missing.length <= 1 || score >= 65
        ? "ready_for_briefing"
        : "collecting";

  return {
    context,
    interpretedFields,
    correction,
    decision: {
      nextQuestion,
      status,
      reason:
        status === "collecting"
          ? "Ainda existem campos essenciais para qualificar."
          : "Contexto suficiente para consolidar briefing comercial.",
    },
    score,
    temperature,
    hypotheses,
    briefing,
    handoff,
    closingMessage,
    conversationStatus,
    temporalDebug,
    commercialStrategy,
    commercialAwareness,
    brokerMentorBriefing,
    specialist: specialistSnapshot(specialist),
  };
}
