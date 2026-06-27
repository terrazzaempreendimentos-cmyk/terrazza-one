import { vendedorPersona } from "./persona";
import { vendedorRoteiro } from "./roteiro";
import { vendedorQuestions } from "./questions";
import { vendedorClosingMessage } from "./closing";
import { buildVendedorBriefing } from "./briefing";
import { buildVendedorHandoff } from "./handoff";
import type { UCESpecialistConfig } from "../common";

export const vendedorSpecialist: UCESpecialistConfig = {
  id: "vendedor",
  persona: vendedorPersona,
  roteiro: vendedorRoteiro,
  questions: vendedorQuestions,
  closingMessage: vendedorClosingMessage,
  handoffType: "especialista_venda",
  buildBriefing: buildVendedorBriefing,
  buildHandoff: buildVendedorHandoff,
};

export * from "./persona";
export * from "./roteiro";
export * from "./questions";
export * from "./closing";
export * from "./briefing";
export * from "./handoff";
