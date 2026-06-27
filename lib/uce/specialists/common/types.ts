import type {
  UCEBriefing,
  UCEContext,
  UCEHandoffDecision,
  UCEHandoffType,
  UCEHypothesis,
  UCENextQuestion,
  UCETemperature,
} from "../../core/types";

export type UCESpecialistId =
  | "comprador"
  | "vendedor"
  | "locacao"
  | "administracao"
  | "captacao";

export type UCESpecialistPersona = {
  id: UCESpecialistId;
  label: string;
  objective: string;
  tone: string;
  initialMessage: string;
};

export type UCESpecialistRoute = {
  objective: string;
  flow: string[];
  neverAsk: string[];
  inferenceFocus: string[];
};

export type UCESpecialistBriefingInput = {
  context: UCEContext;
  hypotheses: UCEHypothesis[];
  pendingFields: string[];
  score: number;
  temperature: UCETemperature;
};

export type UCESpecialistConfig = {
  id: UCESpecialistId;
  persona: UCESpecialistPersona;
  roteiro: UCESpecialistRoute;
  questions: UCENextQuestion[];
  closingMessage: string;
  handoffType: UCEHandoffType;
  buildBriefing: (input: UCESpecialistBriefingInput) => UCEBriefing;
  buildHandoff: (input: {
    context: UCEContext;
    missingFields: string[];
    score: number;
  }) => UCEHandoffDecision;
};
