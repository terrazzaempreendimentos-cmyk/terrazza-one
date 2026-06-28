import { generateFallbackResponse } from "./fallback";
import { validateLLMOutput } from "./guardrails";
import { buildLLMPrompt } from "./promptBuilder";
import type { UCELLMInput, UCELLMOutput } from "./types";

function simulateNaturalText(input: UCELLMInput) {
  const { uceResult } = input;

  if (
    uceResult.conversationStatus === "handoff_pronto" ||
    uceResult.conversationStatus === "encerrado"
  ) {
    return generateFallbackResponse(uceResult);
  }

  if (uceResult.decision.nextQuestion) {
    return uceResult.decision.nextQuestion.text;
  }

  return generateFallbackResponse(uceResult);
}

export function generateNaturalResponse(input: UCELLMInput): UCELLMOutput {
  const prompt = input.prompt ?? buildLLMPrompt(input.uceResult);
  const provider = input.provider ?? "mock";
  const simulatedText = simulateNaturalText(input);
  const draftOutput = {
    text: simulatedText,
    provider,
    prompt,
    simulated: true,
    guardrails: {
      valid: true,
      violations: [],
      safeText: null,
    },
  };
  const guardrails = validateLLMOutput(draftOutput, input.uceResult);

  return {
    ...draftOutput,
    text: guardrails.valid
      ? draftOutput.text
      : guardrails.safeText ?? generateFallbackResponse(input.uceResult),
    guardrails,
  };
}
