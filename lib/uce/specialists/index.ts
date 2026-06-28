import type { UCEContext, UCENextQuestion } from "../core/types";
import { administracaoSpecialist } from "./administracao";
import { captacaoSpecialist } from "./captacao";
import { compradorSpecialist } from "./comprador";
import { locacaoSpecialist } from "./locacao";
import { vendedorSpecialist } from "./vendedor";
import { hasValue, text } from "./common";
import type { UCESpecialistConfig, UCESpecialistId } from "./common";

export const uceSpecialists: Record<UCESpecialistId, UCESpecialistConfig> = {
  comprador: compradorSpecialist,
  vendedor: vendedorSpecialist,
  locacao: locacaoSpecialist,
  administracao: administracaoSpecialist,
  captacao: captacaoSpecialist,
};

export function selectUCESpecialist(context: UCEContext): UCESpecialistConfig {
  const active = context.metadata.activeSpecialist;

  if (typeof active === "string" && active in uceSpecialists) {
    return uceSpecialists[active as UCESpecialistId];
  }

  const objective = text(context.fields.objetivo);
  const leadType = text(context.leadType);

  if (objective === "captacao" || objective.includes("anunciar")) {
    return captacaoSpecialist;
  }

  if (objective === "compra" || leadType === "comprador") {
    return compradorSpecialist;
  }

  if (objective === "venda" || leadType === "vendedor") {
    return vendedorSpecialist;
  }

  if (objective === "locacao" || leadType === "inquilino") {
    return locacaoSpecialist;
  }

  if (objective === "administracao" || leadType === "proprietario") {
    return administracaoSpecialist;
  }

  return captacaoSpecialist;
}

export function getSpecialistPendingFields(
  context: UCEContext,
  specialist = selectUCESpecialist(context),
) {
  return specialist.questions
    .map((question) => question.field)
    .filter((field) => {
      if (
        (field === "cidade" || field === "bairro") &&
        (hasValue(context.fields.cidade) || hasValue(context.fields.bairro))
      ) {
        return false;
      }

      return !hasValue(context.fields[field]);
    });
}

export function getNextSpecialistQuestion(
  context: UCEContext,
  specialist = selectUCESpecialist(context),
): UCENextQuestion | null {
  if (context.metadata.handoffReady === true) return null;

  if (
    context.fields.urgencia === "indefinida" &&
    !hasValue(context.fields.prazoMudanca)
  ) {
    return {
      field: "prazoMudanca",
      text: "Qual seria o prazo ideal? Pode ser uma data, um mes ou uma quantidade de dias.",
      reason: "Urgencia confirmada, mas ainda falta prazo especifico.",
    };
  }

  return (
    specialist.questions.find((question) => {
      if (
        (question.field === "cidade" || question.field === "bairro") &&
        (hasValue(context.fields.cidade) || hasValue(context.fields.bairro))
      ) {
        return false;
      }

      return !hasValue(context.fields[question.field]);
    }) ?? null
  );
}

export * from "./common";
export * from "./comprador";
export * from "./vendedor";
export * from "./locacao";
export * from "./administracao";
export * from "./captacao";
