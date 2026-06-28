import type { UCEKnowledgeResult } from "../knowledge";
import { formatKnowledgeForPrompt } from "../knowledge";
import type { UCELLMProvider, UCELLMReport } from "./types";

export function estimateTextTokens(text: string) {
  return Math.ceil(text.length / 4);
}

export function trimKnowledgeForBudget(
  knowledgeResults: UCEKnowledgeResult[],
  maxTokens: number,
) {
  const selected: UCEKnowledgeResult[] = [];
  let totalTokens = 0;

  for (const result of knowledgeResults) {
    const itemTokens = estimateTextTokens(formatKnowledgeForPrompt([result]));

    if (totalTokens + itemTokens > maxTokens) break;

    selected.push(result);
    totalTokens += itemTokens;
  }

  return selected;
}

export function buildBudgetReport({
  provider,
  model,
  prompt,
  outputText = "",
  promptBudget,
  usedOpenAI,
  fallbackUsed,
  guardrailsApproved,
  guardrailReasons,
  latencyMs = null,
}: {
  provider: UCELLMProvider;
  model: string;
  prompt: string;
  outputText?: string;
  promptBudget: number;
  usedOpenAI: boolean;
  fallbackUsed: boolean;
  guardrailsApproved: boolean;
  guardrailReasons: string[];
  latencyMs?: number | null;
}): UCELLMReport {
  const estimatedInputTokens = estimateTextTokens(prompt);
  const estimatedOutputTokens = estimateTextTokens(outputText);

  return {
    provider,
    model,
    usedOpenAI,
    fallbackUsed,
    guardrailsApproved,
    guardrailReasons,
    estimatedInputTokens,
    estimatedOutputTokens,
    estimatedTotalTokens: estimatedInputTokens + estimatedOutputTokens,
    promptBudget,
    latencyMs,
  };
}
