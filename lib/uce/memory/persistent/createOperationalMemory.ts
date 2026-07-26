import { createMemory } from "./repository";
import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  CreateUCEMemoryInput,
  UCEMemory,
  UCEMemoryEntityType,
  UCEMemoryType,
} from "./types";

type OperationalEntity = {
  entityType: UCEMemoryEntityType;
  entityId?: string | null;
  entityLabel?: string | null;
};

export type CreateOperationalMemoryFromMaintenanceInput = {
  tipo: "manutencao" | "conflito" | string;
  categoria?: string | null;
  titulo: string;
  resumo?: string | null;
  descricao?: string | null;
  status?: string | null;
  prioridade?: string | null;
  proximaAcao?: string | null;
  relatedEntities?: OperationalEntity[];
};

function normalizeMemoryType(tipo: string): UCEMemoryType {
  return tipo === "conflito" ? "conflito" : "manutencao";
}

function normalizeEntityType(tipo: string): UCEMemoryEntityType {
  return tipo === "conflito" ? "conflito" : "manutencao";
}

function getSentiment(prioridade?: string | null) {
  return ["alta", "critica"].includes(prioridade ?? "") ? "negativo" : "neutro";
}

function getImportance(prioridade?: string | null) {
  if (prioridade === "critica") return 5;
  if (prioridade === "alta") return 4;
  if (prioridade === "media") return 3;
  if (prioridade === "baixa") return 2;

  return 3;
}

function buildContent(input: CreateOperationalMemoryFromMaintenanceInput) {
  return [
    input.resumo ? `Resumo: ${input.resumo}` : null,
    input.descricao ? `Descricao: ${input.descricao}` : null,
    input.status ? `Status: ${input.status}` : null,
    input.prioridade ? `Prioridade: ${input.prioridade}` : null,
    input.proximaAcao ? `Proxima acao: ${input.proximaAcao}` : null,
  ]
    .filter(Boolean)
    .join("\n");
}

function buildTags(input: CreateOperationalMemoryFromMaintenanceInput) {
  return [input.tipo, input.categoria, input.status, input.prioridade]
    .filter(Boolean)
    .join(",");
}

function buildMemoryInput(
  input: CreateOperationalMemoryFromMaintenanceInput,
  entity: OperationalEntity,
): CreateUCEMemoryInput {
  return {
    entity_type: entity.entityType,
    entity_id: entity.entityId ?? null,
    entity_label: entity.entityLabel ?? input.titulo,
    memory_type: normalizeMemoryType(input.tipo),
    title: input.titulo,
    content: buildContent(input),
    sentiment: getSentiment(input.prioridade),
    importance: getImportance(input.prioridade),
    source: "crm_manutencoes",
    tags: buildTags(input),
  };
}

export async function createOperationalMemoryFromMaintenance(
  client: SupabaseClient,
  input: CreateOperationalMemoryFromMaintenanceInput,
) {
  const primaryEntity: OperationalEntity = {
    entityType: normalizeEntityType(input.tipo),
    entityLabel: input.titulo,
  };
  const entities = [
    primaryEntity,
    ...(input.relatedEntities ?? []).filter((entity) => entity.entityId),
  ];
  const memories: UCEMemory[] = [];

  for (const entity of entities) {
    memories.push(await createMemory(client, buildMemoryInput(input, entity)));
  }

  return memories;
}
