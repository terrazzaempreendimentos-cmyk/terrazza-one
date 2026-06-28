import type { LeadContext, LeadTemperature } from "../../ia/motor";
import type { UCEBriefing, UCEConversationStatus } from "../../uce";

export type N8NUCEChannel =
  | "whatsapp"
  | "instagram"
  | "facebook"
  | "site"
  | "manual";

export type N8NUCEOrigin =
  | "facebook"
  | "instagram"
  | "qr_code_placa"
  | "site"
  | "portal"
  | "manual"
  | "whatsapp";

export type N8NUCELeadType =
  | "proprietario"
  | "inquilino"
  | "comprador"
  | "vendedor"
  | "corretor_parceiro"
  | "desconhecido";

export type N8NUCEResponseMode = "uce_puro" | "openai_assistida";

export type N8NUCEActionType =
  | "notify_human"
  | "create_lead"
  | "create_timeline_event";

export type N8NUCEAction = {
  type: N8NUCEActionType;
  label: string;
};

export type N8NUCELLMSummary = {
  usedOpenAI: boolean;
  fallbackUsed: boolean;
  guardrailsApproved: boolean;
  estimatedTotalTokens: number;
  model: string | null;
};

export type N8NUCERequest = {
  conversationId?: string;
  message: string;
  channel: N8NUCEChannel;
  origin: N8NUCEOrigin;
  leadType: N8NUCELeadType;
  city?: string;
  responseMode: N8NUCEResponseMode;
  context?: Partial<LeadContext>;
};

export type N8NUCEResponse = {
  ok: true;
  conversationId: string;
  reply: string;
  conversationStatus: UCEConversationStatus;
  specialist: string;
  score: number;
  temperature: LeadTemperature;
  handoffReady: boolean;
  nextQuestion: string | null;
  context: LeadContext;
  briefing: UCEBriefing;
  knowledgeSummary: string;
  llm: N8NUCELLMSummary;
  actions: N8NUCEAction[];
};

export type N8NUCEErrorResponse = {
  ok: false;
  error: string;
};
