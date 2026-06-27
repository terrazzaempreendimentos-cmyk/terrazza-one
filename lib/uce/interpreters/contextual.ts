import type { UCEContext } from "../core/types";
import { interpretTemporalExpression } from "./temporal";

function normalize(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function has(text: string, terms: string[]) {
  return terms.some((term) => text.includes(term));
}

function numberFromText(text: string) {
  if (has(text, ["1", "um", "uma"])) return 1;
  if (has(text, ["2", "dois", "duas"])) return 2;
  if (has(text, ["3", "tres"])) return 3;
  if (has(text, ["4", "quatro"])) return 4;

  return null;
}

export function interpretContextualAnswer(input: {
  text: string;
  context: UCEContext;
}) {
  const text = normalize(input.text);
  const field = input.context.activeQuestion?.field ?? input.context.lastQuestionField;

  if (!field) {
    return {
      field: null,
      value: null,
      confidence: 0,
      reason: "Sem pergunta ativa para interpretar resposta curta.",
    };
  }

  if (field === "pet") {
    if (has(text, ["sim", "tenho", "tenho cachorro", "tenho gato", "cachorro", "gato"])) {
      return { field, value: true, confidence: 95, reason: "Resposta curta positiva para pet." };
    }

    if (has(text, ["nao", "não", "sem pet"])) {
      return { field, value: false, confidence: 95, reason: "Resposta curta negativa para pet." };
    }
  }

  if (field === "quartos") {
    const value = numberFromText(text);
    if (value) return { field, value, confidence: 90, reason: "Numero de quartos informado." };
  }

  if (field === "urgencia") {
    const temporal = interpretTemporalExpression(input.text);
    if (temporal.confidence >= 90 || temporal.asksForSpecificDeadline) {
      return {
        field,
        value: temporal.urgency,
        confidence: temporal.confidence,
        reason: temporal.reason,
        metadata: {
          deadlineText: temporal.deadlineText,
          recognizedExpression: temporal.recognizedExpression,
          asksForSpecificDeadline: temporal.asksForSpecificDeadline,
        },
      };
    }
  }

  if (field === "documentacao") {
    if (
      has(text, [
        "sim",
        "tenho",
        "tenho sim",
        "tenho documentacao",
        "documentos ok",
        "credito aprovado",
        "renda comprovada",
        "ficha ok",
      ])
    ) {
      return {
        field,
        value: true,
        confidence: 96,
        reason: "Resposta positiva para documentacao.",
      };
    }

    if (
      has(text, [
        "nao",
        "nao tenho",
        "ainda nao",
        "estou providenciando",
        "falta documentacao",
        "nao organizei",
        "nao sei",
      ])
    ) {
      return {
        field,
        value: false,
        confidence: 96,
        reason: text.includes("nao sei")
          ? "Cliente nao soube informar a documentacao."
          : "Resposta negativa para documentacao.",
        metadata: {
          documentacaoObservacao: text.includes("nao sei")
            ? "cliente nao soube informar"
            : null,
        },
      };
    }
  }

  if (field === "financiamento") {
    if (has(text, ["sim", "financiado", "financiamento"])) {
      return { field, value: true, confidence: 90, reason: "Financiamento confirmado." };
    }

    if (has(text, ["nao", "a vista", "à vista"])) {
      return { field, value: false, confidence: 90, reason: "Financiamento negado ou pagamento a vista." };
    }
  }

  if (field === "fgts") {
    if (has(text, ["tenho fgts", "vou usar", "sim"])) {
      return { field, value: true, confidence: 90, reason: "Uso de FGTS confirmado." };
    }

    if (has(text, ["nao tenho fgts", "nao", "não"])) {
      return { field, value: false, confidence: 90, reason: "Uso de FGTS negado." };
    }
  }

  if (field === "objetivo" && has(text, ["talvez", "depende"])) {
    return {
      field,
      value: "indefinido",
      confidence: 45,
      reason: "Resposta indica incerteza de objetivo.",
    };
  }

  return {
    field: null,
    value: null,
    confidence: 0,
    reason: "Resposta contextual nao interpretada por regra.",
  };
}
