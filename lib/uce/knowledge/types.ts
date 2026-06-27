export type UCEKnowledgeDomain =
  | "real_estate"
  | "auctions"
  | "insurance"
  | "legal"
  | "generic";

export type UCEKnowledgeCategory =
  | "institucional"
  | "comercial"
  | "territorial"
  | "juridico"
  | "financeiro"
  | "scripts"
  | "objecoes"
  | "garantias"
  | "documentacao"
  | "bairros"
  | "imoveis"
  | "faq";

export type UCEKnowledgeSource = {
  id: string;
  title: string;
  type: "manual" | "document" | "database" | "system" | "external";
  url?: string | null;
  updatedAt?: string | null;
};

export type UCEKnowledgeItem = {
  id: string;
  domain: UCEKnowledgeDomain;
  category: UCEKnowledgeCategory;
  title: string;
  content: string;
  tags: string[];
  priority: number;
  source: UCEKnowledgeSource;
  active: boolean;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type UCEKnowledgeQuery = {
  domain?: UCEKnowledgeDomain | null;
  category?: UCEKnowledgeCategory | null;
  tags?: string[];
  text?: string | null;
  limit?: number;
};

export type UCEKnowledgeResult = {
  item: UCEKnowledgeItem;
  score: number;
  matchedBy: Array<"domain" | "category" | "tag" | "title" | "content" | "priority">;
};
