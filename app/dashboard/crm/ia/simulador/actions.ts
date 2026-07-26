"use server";

import { requireActiveProfile } from "../../../../../lib/auth/access-profile";
import type { UCEProcessResult } from "../../../../../lib/uce";
import { generateNaturalResponse, type UCELLMOutput } from "../../../../../lib/uce/llm";

export async function gerarRespostaOpenAIAssistida(input: {
  uceResult: UCEProcessResult;
  userMessage: string;
}): Promise<UCELLMOutput> {
  await requireActiveProfile();

  const { uceResult, userMessage } = input;

  return generateNaturalResponse({
    uceResult,
    userMessage,
    provider: "openai",
  });
}
