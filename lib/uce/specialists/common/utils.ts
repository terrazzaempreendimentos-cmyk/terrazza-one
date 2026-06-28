import type { UCEContext } from "../../core/types";
import type { UCESpecialistBriefingInput } from "./types";

export function hasValue(value: unknown) {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.trim().length > 0;

  return true;
}

export function text(value: unknown) {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function publicFields(context: UCEContext, fields: string[]) {
  return fields.reduce<Record<string, unknown>>((acc, field) => {
    acc[field] = context.fields[field];

    return acc;
  }, {});
}

export function buildSpecialistBriefing(
  input: UCESpecialistBriefingInput & {
    specialistName: string;
    fields: string[];
  },
) {
  const fields = publicFields(input.context, input.fields);
  const summary = [
    `${input.specialistName}.`,
    `Objetivo: ${input.context.fields.objetivo ?? "nao informado"}.`,
    `Local: ${input.context.fields.cidade ?? "cidade nao informada"}${
      input.context.fields.bairro ? `, ${input.context.fields.bairro}` : ""
    }.`,
    `Score UCE: ${input.score}/100 (${input.temperature}).`,
  ].join(" ");

  return {
    summary,
    fields,
    hypotheses: input.hypotheses,
    pendingFields: input.pendingFields,
  };
}

export function buildSpecialistHandoff({
  missingFields,
  minimumScore,
  handoffType,
  readyReason,
  notReadyReason,
  score,
  optionalMissingFields = [],
}: {
  missingFields: string[];
  minimumScore: number;
  handoffType: import("../../core/types").UCEHandoffType;
  readyReason: string;
  notReadyReason: string;
  score: number;
  optionalMissingFields?: string[];
}) {
  void score;

  const canHandoff = missingFields.length === 0;

  return {
    canHandoff,
    reason: canHandoff
      ? readyReason
      : `${notReadyReason}: ${
          missingFields.length > 0
            ? missingFields.join(", ")
            : `score abaixo de ${minimumScore}`
        }.`,
    handoffType: canHandoff ? handoffType : "atendimento_humano",
    missingCriticalFields: missingFields,
    optionalMissingFields,
  };
}
