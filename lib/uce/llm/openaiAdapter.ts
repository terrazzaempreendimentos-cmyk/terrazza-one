import OpenAI from "openai";
import { generateFallbackResponse } from "./fallback";
import { validateLLMOutput } from "./guardrails";
import { buildLLMPrompt, DEFAULT_LLM_TOKEN_BUDGET } from "./promptBuilder";
import { buildBudgetReport } from "./tokenBudget";
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
  latencyMs,
}: {
  text: string;
  input: UCELLMInput;
  prompt: string;
  provider: "openai" | "mock";
  simulated: boolean;
  openaiUsed: boolean;
  fallbackUsed: boolean;
  error: string | null;
  latencyMs: number | null;
}): UCELLMOutput {
  const model = input.model ?? DEFAULT_MODEL;
  const draftOutput = {
    text,
    provider,
    prompt,
    simulated,
    openaiUsed,
    fallbackUsed,
    model,
    error,
    guardrails: {
      approved: true,
      reasons: [],
      severity: "low" as const,
      safeText: null,
    },
    report: buildBudgetReport({
      provider,
      model,
      prompt,
      outputText: text,
      promptBudget: DEFAULT_LLM_TOKEN_BUDGET,
      usedOpenAI: openaiUsed,
      fallbackUsed,
      guardrailsApproved: true,
      guardrailReasons: [],
      latencyMs,
    }),
  };
  const guardrails = validateLLMOutput(draftOutput, input.uceResult);
  const shouldFallback = fallbackUsed || !guardrails.approved;
  const finalText = shouldFallback
    ? guardrails.safeText ??
      generateFallbackResponse(input.uceResult, "guardrail_reprovado")
    : draftOutput.text;
  const finalFallbackUsed = shouldFallback;

  return {
    ...draftOutput,
    text: finalText,
    fallbackUsed: finalFallbackUsed,
    guardrails,
    report: buildBudgetReport({
      provider,
      model,
      prompt,
      outputText: finalText,
      promptBudget: DEFAULT_LLM_TOKEN_BUDGET,
      usedOpenAI: openaiUsed,
      fallbackUsed: finalFallbackUsed,
      guardrailsApproved: guardrails.approved,
      guardrailReasons: guardrails.reasons,
      latencyMs,
    }),
  };
}

export async function generateNaturalResponse(
  input: UCELLMInput,
): Promise<UCELLMOutput> {
  const startedAt = Date.now();
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
      latencyMs: Date.now() - startedAt,
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
      latencyMs: Date.now() - startedAt,
    });
  } catch (error) {
    return buildOutput({
      text: generateFallbackResponse(input.uceResult, "erro_openai"),
      input,
      prompt,
      provider,
      simulated: false,
      openaiUsed: false,
      fallbackUsed: true,
      error: error instanceof Error ? error.message : "Falha desconhecida na OpenAI.",
      latencyMs: Date.now() - startedAt,
    });
  }
}
