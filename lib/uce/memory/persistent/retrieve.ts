import { searchMemories } from "./repository";
import type { SupabaseClient } from "@supabase/supabase-js";

import type { UCEMemory, UCEMemoryRetrievalInput } from "./types";

function normalize(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function scoreMemory(memory: UCEMemory, input: UCEMemoryRetrievalInput) {
  const haystack = normalize(
    [memory.title, memory.content, memory.entity_label, memory.tags]
      .filter(Boolean)
      .join(" "),
  );

  let score = memory.importance ?? 1;

  if (input.entityType && memory.entity_type === input.entityType) score += 4;
  if (input.entityId && memory.entity_id === input.entityId) score += 5;

  for (const tag of input.tags ?? []) {
    if (haystack.includes(normalize(tag))) score += 2;
  }

  if (input.text) {
    for (const term of normalize(input.text).split(/\s+/)) {
      if (term.length >= 3 && haystack.includes(term)) score += 1;
    }
  }

  return score;
}

export async function retrieveRelevantMemory(
  client: SupabaseClient,
  input: UCEMemoryRetrievalInput,
) {
  const memories = await searchMemories(client, {
    ...input,
    limit: Math.max(input.limit ?? 20, 20),
  });

  return memories
    .map((memory) => ({ memory, score: scoreMemory(memory, input) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, input.limit ?? 10)
    .map((item) => item.memory);
}
