import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  CreateUCEInteractionInput,
  CreateUCEMemoryInput,
  UCEInteraction,
  UCEMemory,
  UCEMemoryEntityType,
  UCEMemoryRetrievalInput,
} from "./types";

function sanitizeSearchTerm(term: string) {
  return term.replace(/[%,]/g, " ").trim();
}

export async function createMemory(
  client: SupabaseClient,
  input: CreateUCEMemoryInput,
) {
  const { data, error } = await client
    .from("uce_memories")
    .insert({
      entity_type: input.entity_type,
      entity_id: input.entity_id ?? null,
      entity_label: input.entity_label ?? null,
      memory_type: input.memory_type,
      title: input.title,
      content: input.content,
      sentiment: input.sentiment ?? null,
      importance: input.importance ?? 1,
      source: input.source ?? "manual",
      tags: input.tags ?? null,
    })
    .select("*")
    .single();

  if (error) throw error;

  return data as UCEMemory;
}

export async function createInteraction(
  client: SupabaseClient,
  input: CreateUCEInteractionInput,
) {
  const { data, error } = await client
    .from("uce_interactions")
    .insert({
      entity_type: input.entity_type ?? null,
      entity_id: input.entity_id ?? null,
      channel: input.channel ?? null,
      direction: input.direction ?? null,
      message: input.message,
      summary: input.summary ?? null,
      intent: input.intent ?? null,
      sentiment: input.sentiment ?? null,
      status: input.status ?? "registrado",
    })
    .select("*")
    .single();

  if (error) throw error;

  return data as UCEInteraction;
}

export async function getMemoriesByEntity(
  client: SupabaseClient,
  entityType: UCEMemoryEntityType,
  entityId?: string | null,
  limit = 30,
) {
  let query = client
    .from("uce_memories")
    .select("*")
    .eq("entity_type", entityType)
    .order("importance", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);

  if (entityId) {
    query = query.eq("entity_id", entityId);
  }

  const { data, error } = await query;

  if (error) throw error;

  return (data ?? []) as UCEMemory[];
}

export async function getInteractionsByEntity(
  client: SupabaseClient,
  entityType: UCEMemoryEntityType,
  entityId?: string | null,
  limit = 30,
) {
  let query = client
    .from("uce_interactions")
    .select("*")
    .eq("entity_type", entityType)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (entityId) {
    query = query.eq("entity_id", entityId);
  }

  const { data, error } = await query;

  if (error) throw error;

  return (data ?? []) as UCEInteraction[];
}

export async function searchMemories(
  client: SupabaseClient,
  input: UCEMemoryRetrievalInput = {},
) {
  const limit = input.limit ?? 25;
  let query = client
    .from("uce_memories")
    .select("*")
    .order("importance", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);

  if (input.entityType) {
    query = query.eq("entity_type", input.entityType);
  }

  if (input.entityId) {
    query = query.eq("entity_id", input.entityId);
  }

  if (input.text) {
    const term = sanitizeSearchTerm(input.text);

    if (term) {
      query = query.or(
        `title.ilike.%${term}%,content.ilike.%${term}%,entity_label.ilike.%${term}%`,
      );
    }
  }

  for (const tag of input.tags ?? []) {
    const normalizedTag = sanitizeSearchTerm(tag);

    if (normalizedTag) {
      query = query.ilike("tags", `%${normalizedTag}%`);
    }
  }

  const { data, error } = await query;

  if (error) throw error;

  return (data ?? []) as UCEMemory[];
}
