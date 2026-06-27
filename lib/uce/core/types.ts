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

export type UCECommercialStrategy = {
  id:
    | "modo_consultivo"
    | "modo_conversao"
    | "modo_captacao"
    | "modo_administracao"
    | "modo_reengajamento"
    | "modo_alto_padrao"
    | "modo_investidor"
    | "modo_juridico_cauteloso";
  name: string;
  description: string;
  whenToUse: string;
  tone: string;
  nextBestAction: string;
  risk: "baixo" | "medio" | "alto";
  suggestedMessage: string;
  reason: string;
};

export type UCECommercialAwareness = {
  conversionChance: number;
  financialPotential: "baixo" | "medio" | "alto";
  leadEffort: "baixo" | "medio" | "alto";
  urgencyLevel: string;
  commercialRisk: "baixo" | "medio" | "alto";
  shouldEscalateToHuman: boolean;
  reason: string;
};

export type UCEBrokerMentorBriefing = {
  summary: string;
  psychologicalProfile: string;
  probableObjections: string[];
  bestApproach: string;
  phrasesToUse: string[];
  phrasesToAvoid: string[];
  nextBestAction: string;
  riskAlerts: string[];
};

export type UCEMemorySnapshot = {
  leadType: string | null;
  fields: Record<string, unknown>;
  messages: UCEMessage[];
  summary: string;
  createdAt: string;
};

export type UCEAcademyScenario = {
  id: string;
  title: string;
  description: string;
  leadType: string;
  startingMessage: string;
  expectedFields: string[];
  expectedStrategy: UCECommercialStrategy["id"];
  expectedRisks: string[];
  expectedHandoff: string;
};

export type UCEAcademyEvaluation = {
  score: number;
  passed: boolean;
  missingFields: string[];
  wrongStrategy: boolean;
  recommendations: string[];
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
  commercialStrategy: UCECommercialStrategy;
  commercialAwareness: UCECommercialAwareness;
  brokerMentorBriefing: UCEBrokerMentorBriefing;
};
