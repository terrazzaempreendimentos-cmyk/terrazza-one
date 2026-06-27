import type {
  UCEBriefing,
  UCEContext,
  UCEHypothesis,
  UCETemperature,
} from "../core/types";

function publicFields(context: UCEContext) {
  return {
    tipoLead: context.leadType,
    objetivo: context.fields.objetivo,
    cidade: context.fields.cidade,
    bairro: context.fields.bairro,
    tipoImovel: context.fields.tipoImovel,
    valor: context.fields.valor,
    quartos: context.fields.quartos,
    pet: context.fields.pet,
    urgencia: context.fields.urgencia,
    prazoMudanca: context.fields.prazoMudanca,
    documentacao: context.fields.documentacao,
  };
}

export function generateUCEBriefing({
  context,
  hypotheses,
  pendingFields,
  score,
  temperature,
}: {
  context: UCEContext;
  hypotheses: UCEHypothesis[];
  pendingFields: string[];
  score: number;
  temperature: UCETemperature;
}): UCEBriefing {
  const fields = publicFields(context);
  const summary = [
    `Lead ${context.leadType ?? "sem tipo definido"}.`,
    `Objetivo: ${fields.objetivo ?? "nao informado"}.`,
    `Local: ${fields.cidade ?? "cidade nao informada"}${
      fields.bairro ? `, ${fields.bairro}` : ""
    }.`,
    `Score UCE: ${score}/100 (${temperature}).`,
  ].join(" ");

  return {
    summary,
    fields,
    hypotheses,
    pendingFields,
  };
}
