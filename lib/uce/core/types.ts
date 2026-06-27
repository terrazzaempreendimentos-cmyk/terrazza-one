export type UCEDomain =
  | "real_estate"
  | "auctions"
  | "insurance"
  | "legal"
  | "generic";

export type UCETemperature = "frio" | "morno" | "quente";

export type UCEMessage = {
  role: "user" | "assistant" | "system";
  content: string;
  createdAt?: string;
};

export type UCENextQuestion = {
  field: string;
  text: string;
  reason: string;
};

export type UCEFieldConfidence = {
  field: string;
  value: unknown;
  confidence: number;
  reason: string;
};

export type UCEHypothesis = {
  key: string;
  title: string;
  description: string;
  confidence: number;
  category: string;
  evidence: string[];
};

export type UCEDecision = {
  nextQuestion: UCENextQuestion | null;
  status: "collecting" | "ready_for_briefing" | "ready_for_handoff";
  reason: string;
};

export type UCEBriefing = {
  summary: string;
  fields: Record<string, unknown>;
  hypotheses: UCEHypothesis[];
  pendingFields: string[];
};

export type UCEContext = {
  domain: UCEDomain;
  leadType: string | null;
  channel: string | null;
  origin: string | null;
  fields: Record<string, unknown>;
  memory: UCEMessage[];
  lastQuestionField: string | null;
  activeQuestion: UCENextQuestion | null;
  metadata: Record<string, unknown>;
};

export type UCEConversationState = {
  context: UCEContext;
  messages: UCEMessage[];
};

export type UCEProcessInput = {
  message: string;
  context: UCEContext;
};

export type UCEProcessResult = {
  context: UCEContext;
  interpretedFields: UCEFieldConfidence[];
  correction: {
    isCorrection: boolean;
    targetField: string | null;
    newValue: unknown;
    confidence: number;
    reason: string;
  };
  decision: UCEDecision;
  score: number;
  temperature: UCETemperature;
  hypotheses: UCEHypothesis[];
  briefing: UCEBriefing;
};
