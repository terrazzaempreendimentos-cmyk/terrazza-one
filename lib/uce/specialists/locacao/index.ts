import { locacaoPersona } from "./persona";
import { locacaoRoteiro } from "./roteiro";
import { locacaoQuestions } from "./questions";
import { locacaoClosingMessage } from "./closing";
import { buildLocacaoBriefing } from "./briefing";
import { buildLocacaoHandoff } from "./handoff";
import type { UCESpecialistConfig } from "../common";

export const locacaoSpecialist: UCESpecialistConfig = {
  id: "locacao",
  persona: locacaoPersona,
  roteiro: locacaoRoteiro,
  questions: locacaoQuestions,
  knowledge: {
    dominios: ["Locacao", "Garantias", "Condominio", "Bairros"],
    categories: ["comercial", "garantias", "documentacao", "bairros", "scripts"],
    tags: ["locacao", "inquilino", "garantias", "documentacao", "bairros"],
  },
  closingMessage: locacaoClosingMessage,
  handoffType: "especialista_locacao",
  buildBriefing: buildLocacaoBriefing,
  buildHandoff: buildLocacaoHandoff,
};

export * from "./persona";
export * from "./roteiro";
export * from "./questions";
export * from "./closing";
export * from "./briefing";
export * from "./handoff";
