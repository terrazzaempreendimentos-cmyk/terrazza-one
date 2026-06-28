import type {
  UCEBriefing,
  UCEContext,
  UCEHypothesis,
  UCETemperature,
} from "../core/types";
import type { UCEKnowledgeResult } from "../knowledge/types";
import type { UCEMatch, UCERecommendation } from "../correspondencias/types";
import type { UCEPerfil } from "../perfil/types";
import { selectUCESpecialist } from "../specialists";

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
    documentacaoObservacao: context.fields.documentacaoObservacao,
  };
}

export function generateUCEBriefing({
  context,
  hypotheses,
  pendingFields,
  score,
  temperature,
  knowledgeResults = [],
  knowledgeSummary = "",
  correspondenceMatches = [],
  correspondenceRecommendations = [],
  perfilComportamental,
}: {
  context: UCEContext;
  hypotheses: UCEHypothesis[];
  pendingFields: string[];
  score: number;
  temperature: UCETemperature;
  knowledgeResults?: UCEKnowledgeResult[];
  knowledgeSummary?: string;
  correspondenceMatches?: UCEMatch[];
  correspondenceRecommendations?: UCERecommendation[];
  perfilComportamental?: UCEPerfil;
}): UCEBriefing {
  const specialist = selectUCESpecialist(context);

  if (context.domain === "real_estate") {
    const briefing = specialist.buildBriefing({
      context,
      hypotheses,
      pendingFields,
      score,
      temperature,
    });

    return {
      ...briefing,
      knowledgeResults,
      knowledgeSummary,
      correspondenceMatches,
      correspondenceRecommendations,
      perfilComportamental,
    };
  }

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
    knowledgeResults,
    knowledgeSummary,
    correspondenceMatches,
    correspondenceRecommendations,
    perfilComportamental,
  };
}
