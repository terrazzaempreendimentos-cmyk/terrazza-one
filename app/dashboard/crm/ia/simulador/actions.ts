"use server";

import { requireUser } from "../../../../../lib/auth/require-user";
import type { UCEProcessResult } from "../../../../../lib/uce";
import { generateNaturalResponse, type UCELLMOutput } from "../../../../../lib/uce/llm";

export async function gerarRespostaOpenAIAssistida(input: {
  uceResult: UCEProcessResult;
  userMessage: string;
}): Promise<UCELLMOutput> {
  await requireUser();

  const { uceResult, userMessage } = input;

  return generateNaturalResponse({
    uceResult,
    userMessage,
    provider: "openai",
  });
}
