import type {
  UCEContext,
  UCEFieldConfidence,
  UCEProcessInput,
  UCEProcessResult,
} from "./types";
import { generateUCEBriefing } from "../briefing";
import {
  evaluateCommercialAwareness,
  generateBrokerMentorBriefing,
  selectCommercialStrategy,
} from "../commercial";
import { getNextSmartQuestion } from "../flow";
import { generateHypotheses } from "../inference";
import { interpretContextualAnswer } from "../interpreters/contextual";
import { interpretTemporalExpression } from "../interpreters/temporal";
import { detectCorrection } from "../memory";
import { calculateUCEScore } from "../score";

const requiredFields = [
  "objetivo",
  "cidade",
  "bairro",
  "tipoImovel",
  "valor",
  "quartos",
  "pet",
  "urgencia",
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

  const cities = [
    ["maceio", "Maceio"],
    ["aracaju", "Aracaju"],
    ["recife", "Recife"],
    ["joao pessoa", "Joao Pessoa"],
    ["salvador", "Salvador"],
  ];
  const bairros = [
    ["ponta verde", "Ponta Verde"],
    ["jatiuca", "Jatiuca"],
    ["pajucara", "Pajucara"],
    ["farol", "Farol"],
    ["gruta", "Gruta"],
    ["stella maris", "Stella Maris"],
    ["jardins", "Jardins"],
    ["atalaia", "Atalaia"],
    ["farolandia", "Farolandia"],
  ];

  const city = cities.find(([key]) => text.includes(key));
  if (city) fields.cidade = city[1];

  const bairro = bairros.find(([key]) => text.includes(key));
  if (bairro) fields.bairro = bairro[1];

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

function isFilled(value: unknown) {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.trim().length > 0;

  return true;
}

function pendingFields(context: UCEContext) {
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
    interpretedFields.push(
      fieldConfidence(
        contextual.field,
        contextual.value,
        contextual.confidence,
        contextual.reason,
      ),
    );
  }

  const temporal = interpretTemporalExpression(input.message);
  if (temporal.urgency !== "indefinida") {
    fields.urgencia = temporal.urgency;
    fields.prazoMudanca = temporal.deadlineText;
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

  const generalFields = parseGeneralRealEstateFields(input.message);
  Object.entries(generalFields).forEach(([field, value]) => {
    fields[field] = value;
    interpretedFields.push(
      fieldConfidence(field, value, 82, "Informacao extraida por regras gerais UCE."),
    );
  });

  const contextBeforeQuestion: UCEContext = {
    ...input.context,
    fields,
    memory: [
      ...input.context.memory,
      { role: "user", content: input.message, createdAt: new Date().toISOString() },
    ],
  };
  const nextQuestion = getNextSmartQuestion(contextBeforeQuestion);
  const context: UCEContext = {
    ...contextBeforeQuestion,
    activeQuestion: nextQuestion,
    lastQuestionField: nextQuestion?.field ?? null,
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
  const status =
    missing.length === 0 && score >= 75
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
    commercialStrategy,
    commercialAwareness,
    brokerMentorBriefing,
  };
}
