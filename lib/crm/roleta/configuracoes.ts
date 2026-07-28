import {
  isLeadEntryChannel,
  isLeadObjective,
  type LeadEntryChannel,
  type LeadFunnelStage,
  type LeadObjective,
} from "../leads/catalogs";

export const ROLETA_WEIGHT_MIN = 1;
export const ROLETA_WEIGHT_MAX = 10;
export const ROLETA_CAPACITY_MIN = 1;
export const ROLETA_CAPACITY_MAX = 100;
export const ROLETA_NOTES_MAX_LENGTH = 1000;
export const ROLETA_AUTOMATIC_CRITERION = "roleta_automatica" as const;

export const ROLETA_ACTIVE_LOAD_STAGES = Object.freeze([
  "atendimento",
  "visita_avaliacao",
  "proposta",
  "negociacao",
  "documentacao",
] as const satisfies readonly LeadFunnelStage[]);

export type RouletteActiveLoadStage = (typeof ROLETA_ACTIVE_LOAD_STAGES)[number];

export type BrokerOperationalConfiguration = Readonly<{
  id: string;
  pessoa_id: string;
  participa_roleta: boolean;
  disponivel: boolean;
  peso: number;
  capacidade_atendimentos: number | null;
  cidades: readonly string[];
  objetivos_imobiliarios: readonly LeadObjective[];
  canais: readonly LeadEntryChannel[];
  observacoes: string | null;
  created_at: string;
  updated_at: string;
}>;

export function isRouletteWeight(value: unknown): value is number {
  return Number.isInteger(value) && Number(value) >= ROLETA_WEIGHT_MIN && Number(value) <= ROLETA_WEIGHT_MAX;
}

export function isRouletteCapacity(value: unknown): value is number | null {
  return value === null || (Number.isInteger(value) && Number(value) >= ROLETA_CAPACITY_MIN && Number(value) <= ROLETA_CAPACITY_MAX);
}

export function isValidCityFilter(values: unknown): values is string[] {
  return isUniqueStringArray(values, (value) => value.trim() === value, true);
}

export function isValidObjectiveFilter(values: unknown): values is LeadObjective[] {
  return isUniqueStringArray(values, isLeadObjective);
}

export function isValidChannelFilter(values: unknown): values is LeadEntryChannel[] {
  return isUniqueStringArray(values, isLeadEntryChannel);
}

export function filterAcceptsValue(
  filter: readonly string[],
  value: string | null | undefined,
  caseInsensitive = false,
) {
  if (filter.length === 0) return true;
  if (!value) return false;
  const candidate = value.trim();
  if (!candidate) return false;
  return filter.some((item) => caseInsensitive
    ? item.toLocaleLowerCase("pt-BR") === candidate.toLocaleLowerCase("pt-BR")
    : item === candidate);
}

function isUniqueStringArray<T extends string>(
  values: unknown,
  validator: (value: string) => boolean,
  caseInsensitive = false,
): values is T[] {
  if (!Array.isArray(values) || !values.every((value) => typeof value === "string" && value.length > 0 && validator(value))) return false;
  const normalized = values.map((value) => caseInsensitive ? value.toLocaleLowerCase("pt-BR") : value);
  return new Set(normalized).size === values.length;
}

