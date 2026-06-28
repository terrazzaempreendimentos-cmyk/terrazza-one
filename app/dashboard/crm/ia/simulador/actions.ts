"use server";

import type { UCEProcessResult } from "../../../../../lib/uce";
import { generateNaturalResponse, type UCELLMOutput } from "../../../../../lib/uce/llm";

export async function gerarRespostaOpenAIAssistida({
  uceResult,
  userMessage,
}: {
  uceResult: UCEProcessResult;
  userMessage: string;
}): Promise<UCELLMOutput> {
  return generateNaturalResponse({
    uceResult,
    userMessage,
    provider: "openai",
  });
}
