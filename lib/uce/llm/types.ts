import type { UCEProcessResult } from "../core";

export type UCELLMProvider = "openai" | "mock";

export type UCELLMGuardrailResult = {
  valid: boolean;
  violations: string[];
  safeText: string | null;
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
};
