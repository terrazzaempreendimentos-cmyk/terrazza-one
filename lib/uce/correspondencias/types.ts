export type UCEMatchEntityType =
  | "lead"
  | "imovel"
  | "comprador"
  | "inquilino"
  | "proprietario";

export type UCEMatchObjective =
  | "compra"
  | "venda"
  | "locacao"
  | "administracao"
  | "captacao"
  | "investimento"
  | "temporada";

export type UCEMatchProfile =
  | "familiar"
  | "investidor"
  | "alto_padrao"
  | "economico"
  | "turistico"
  | "misto";

export type UCEMatchEntity = {
  id: string;
  type: UCEMatchEntityType;
  label: string;
  cidade?: string | null;
  bairro?: string | null;
  tipoImovel?: string | null;
  valor?: number | null;
  areaM2?: number | null;
  quartos?: number | null;
  banheiros?: number | null;
  vagas?: number | null;
  pet?: boolean | null;
  objetivo?: UCEMatchObjective | string | null;
  financiamento?: boolean | null;
  fgts?: boolean | null;
  urgencia?: string | null;
  perfil?: UCEMatchProfile | string | null;
  proprietarioId?: string | null;
};

export type UCECompatibility = {
  score: number;
  level: "baixa" | "media" | "alta";
  reasons: UCERecommendationReason[];
};

export type UCERecommendationReason = {
  criterion: string;
  label: string;
  weight: number;
};

export type UCEMatch = {
  id: string;
  source: UCEMatchEntity;
  target: UCEMatchEntity;
  compatibility: UCECompatibility;
};

export type UCERecommendation = {
  id: string;
  message: string;
  priority: "baixa" | "media" | "alta";
  matches: UCEMatch[];
};

export type UCEMatchInput = UCEMatchEntity & {
  candidates?: UCEMatchEntity[];
  limit?: number;
};
