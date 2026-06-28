import type { UCEProcessResult } from "../core";

export type UCELLMProvider = "openai" | "mock";

export type UCELLMGuardrailSeverity = "low" | "medium" | "high";

export type UCELLMGuardrailResult = {
  approved: boolean;
  reasons: string[];
  severity: UCELLMGuardrailSeverity;
  safeText: string | null;
};

export type UCELLMReport = {
  provider: UCELLMProvider;
  model: string;
  usedOpenAI: boolean;
  fallbackUsed: boolean;
  guardrailsApproved: boolean;
  guardrailReasons: string[];
  estimatedInputTokens: number;
  estimatedOutputTokens: number;
  estimatedTotalTokens: number;
  promptBudget: number;
  latencyMs: number | null;
};

export type UCELLMInput = {
  uceResult: UCEProcessResult;
  userMessage?: string;
  provider?: UCELLMProvider;
  prompt?: string;
  model?: string;
};

export type UCELLMOutput = {
  text: string;
  provider: UCELLMProvider;
  prompt: string;
  simulated: boolean;
  openaiUsed: boolean;
  fallbackUsed: boolean;
  model: string;
  error: string | null;
  guardrails: UCELLMGuardrailResult;
  report: UCELLMReport;
};
