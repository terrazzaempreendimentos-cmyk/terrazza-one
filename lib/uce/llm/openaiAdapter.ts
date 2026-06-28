import OpenAI from "openai";
import { generateFallbackResponse } from "./fallback";
import { validateLLMOutput } from "./guardrails";
import { buildLLMPrompt } from "./promptBuilder";
import type { UCELLMInput, UCELLMOutput } from "./types";

const DEFAULT_MODEL = "gpt-4o-mini";

let openaiClient: OpenAI | null = null;

function getOpenAIClient() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY nao configurada.");
  }

  if (!openaiClient) {
    openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  return openaiClient;
}

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

function buildOutput({
  text,
  input,
  prompt,
  provider,
  simulated,
  openaiUsed,
  fallbackUsed,
  error,
}: {
  text: string;
  input: UCELLMInput;
  prompt: string;
  provider: "openai" | "mock";
  simulated: boolean;
  openaiUsed: boolean;
  fallbackUsed: boolean;
  error: string | null;
}): UCELLMOutput {
  const draftOutput = {
    text,
    provider,
    prompt,
    simulated,
    openaiUsed,
    fallbackUsed,
    model: input.model ?? DEFAULT_MODEL,
    error,
    guardrails: {
      valid: true,
      violations: [],
      safeText: null,
    },
  };
  const guardrails = validateLLMOutput(draftOutput, input.uceResult);
  const shouldFallback = fallbackUsed || !guardrails.valid;

  return {
    ...draftOutput,
    text: shouldFallback
      ? guardrails.safeText ?? generateFallbackResponse(input.uceResult)
      : draftOutput.text,
    fallbackUsed: shouldFallback,
    guardrails,
  };
}

export async function generateNaturalResponse(
  input: UCELLMInput,
): Promise<UCELLMOutput> {
  const prompt = input.prompt ?? buildLLMPrompt(input.uceResult);
  const provider = input.provider ?? "mock";

  if (provider !== "openai") {
    return buildOutput({
      text: simulateNaturalText(input),
      input,
      prompt,
      provider,
      simulated: true,
      openaiUsed: false,
      fallbackUsed: false,
      error: null,
    });
  }

  try {
    const client = getOpenAIClient();
    const response = await client.responses.create({
      model: input.model ?? DEFAULT_MODEL,
      input: prompt,
      temperature: 0.4,
      max_output_tokens: 220,
    });
    const text = response.output_text?.trim();

    if (!text) {
      throw new Error("OpenAI retornou resposta vazia.");
    }

    return buildOutput({
      text,
      input,
      prompt,
      provider,
      simulated: false,
      openaiUsed: true,
      fallbackUsed: false,
      error: null,
    });
  } catch (error) {
    return buildOutput({
      text: generateFallbackResponse(input.uceResult),
      input,
      prompt,
      provider,
      simulated: false,
      openaiUsed: false,
      fallbackUsed: true,
      error: error instanceof Error ? error.message : "Falha desconhecida na OpenAI.",
    });
  }
}
