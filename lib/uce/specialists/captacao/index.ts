import { captacaoPersona } from "./persona";
import { captacaoRoteiro } from "./roteiro";
import { captacaoQuestions } from "./questions";
import { captacaoClosingMessage } from "./closing";
import { buildCaptacaoBriefing } from "./briefing";
import { buildCaptacaoHandoff } from "./handoff";
import type { UCESpecialistConfig } from "../common";

export const captacaoSpecialist: UCESpecialistConfig = {
  id: "captacao",
  persona: captacaoPersona,
  roteiro: captacaoRoteiro,
  questions: captacaoQuestions,
  knowledge: {
    categories: ["comercial", "scripts", "bairros", "objecoes"],
    tags: ["captacao", "venda", "locacao", "anuncio", "bairros"],
  },
  closingMessage: captacaoClosingMessage,
  handoffType: "atendimento_humano",
  buildBriefing: buildCaptacaoBriefing,
  buildHandoff: buildCaptacaoHandoff,
};

export * from "./persona";
export * from "./roteiro";
export * from "./questions";
export * from "./closing";
export * from "./briefing";
export * from "./handoff";
