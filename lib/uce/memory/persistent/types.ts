export type UCEMemoryEntityType =
  | "lead"
  | "proprietario"
  | "inquilino"
  | "imovel"
  | "corretor"
  | "atendimento"
  | "manutencao"
  | "conflito";

export type UCEMemoryType =
  | "preferencia"
  | "historico"
  | "conflito"
  | "manutencao"
  | "financeiro"
  | "juridico"
  | "comportamento"
  | "observacao"
  | "follow_up";

export type UCEMemory = {
  id: string;
  entity_type: UCEMemoryEntityType;
  entity_id: string | null;
  entity_label: string | null;
  memory_type: UCEMemoryType;
  title: string;
  content: string;
  sentiment: string | null;
  importance: number;
  source: string | null;
  tags: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export type UCEInteraction = {
  id: string;
  entity_type: UCEMemoryEntityType | null;
  entity_id: string | null;
  channel: string | null;
  direction: string | null;
  message: string;
  summary: string | null;
  intent: string | null;
  sentiment: string | null;
  status: string | null;
  created_at: string | null;
};

export type CreateUCEMemoryInput = {
  entity_type: UCEMemoryEntityType;
  entity_id?: string | null;
  entity_label?: string | null;
  memory_type: UCEMemoryType;
  title: string;
  content: string;
  sentiment?: string | null;
  importance?: number | null;
  source?: string | null;
  tags?: string | null;
};

export type CreateUCEInteractionInput = {
  entity_type?: UCEMemoryEntityType | null;
  entity_id?: string | null;
  channel?: string | null;
  direction?: string | null;
  message: string;
  summary?: string | null;
  intent?: string | null;
  sentiment?: string | null;
  status?: string | null;
};

export type UCEMemoryRetrievalInput = {
  entityType?: UCEMemoryEntityType;
  entityId?: string | null;
  tags?: string[];
  text?: string;
  limit?: number;
};

export type UCEMemorySummary = {
  resumo: string;
  pontosImportantes: string[];
  riscos: string[];
  pendencias: string[];
  ultimaInteracao: string | null;
  recomendacao: string;
};
