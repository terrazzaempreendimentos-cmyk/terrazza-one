import { compradorPersona } from "./persona";
import { compradorRoteiro } from "./roteiro";
import { compradorQuestions } from "./questions";
import { compradorClosingMessage } from "./closing";
import { buildCompradorBriefing } from "./briefing";
import { buildCompradorHandoff } from "./handoff";
import type { UCESpecialistConfig } from "../common";

export const compradorSpecialist: UCESpecialistConfig = {
  id: "comprador",
  persona: compradorPersona,
  roteiro: compradorRoteiro,
  questions: compradorQuestions,
  knowledge: {
    dominios: ["Venda", "Financiamento", "Bairros", "Mercado"],
    categories: ["comercial", "financeiro", "documentacao", "bairros", "faq"],
    tags: ["compra", "comprador", "financiamento", "fgts", "bairros"],
  },
  closingMessage: compradorClosingMessage,
  handoffType: "especialista_venda",
  buildBriefing: buildCompradorBriefing,
  buildHandoff: buildCompradorHandoff,
};

export * from "./persona";
export * from "./roteiro";
export * from "./questions";
export * from "./closing";
export * from "./briefing";
export * from "./handoff";
