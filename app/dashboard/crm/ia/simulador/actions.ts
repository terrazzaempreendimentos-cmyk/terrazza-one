"use server";

import { requirePermission } from "../../../../../lib/auth/access-profile";
import type { UCEProcessResult } from "../../../../../lib/uce";
import { generateNaturalResponse, type UCELLMOutput } from "../../../../../lib/uce/llm";

export async function gerarRespostaOpenAIAssistida(input: {
  uceResult: UCEProcessResult;
  userMessage: string;
}): Promise<UCELLMOutput> {
  await requirePermission("ia.usar");

  const { uceResult, userMessage } = input;

  return generateNaturalResponse({
    uceResult,
    userMessage,
    provider: "openai",
  });
}
