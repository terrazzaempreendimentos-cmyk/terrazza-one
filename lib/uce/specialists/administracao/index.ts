import { administracaoPersona } from "./persona";
import { administracaoRoteiro } from "./roteiro";
import { administracaoQuestions } from "./questions";
import { administracaoClosingMessage } from "./closing";
import { buildAdministracaoBriefing } from "./briefing";
import { buildAdministracaoHandoff } from "./handoff";
import type { UCESpecialistConfig } from "../common";

export const administracaoSpecialist: UCESpecialistConfig = {
  id: "administracao",
  persona: administracaoPersona,
  roteiro: administracaoRoteiro,
  questions: administracaoQuestions,
  knowledge: {
    dominios: ["Administracao", "Condominio", "Juridico", "Garantias"],
    categories: ["comercial", "garantias", "juridico", "documentacao", "bairros", "scripts"],
    tags: ["administracao", "proprietario", "garantias", "juridico", "bairros", "manutencao"],
  },
  closingMessage: administracaoClosingMessage,
  handoffType: "especialista_administracao",
  buildBriefing: buildAdministracaoBriefing,
  buildHandoff: buildAdministracaoHandoff,
};

export * from "./persona";
export * from "./roteiro";
export * from "./questions";
export * from "./closing";
export * from "./briefing";
export * from "./handoff";
