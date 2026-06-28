import { conhecimentoItems } from "./engine";
import { expandKnowledgeRelations } from "./relations";
import { rankKnowledgeResults } from "./ranking";
import type { UCEConhecimentoConsulta } from "./types";

function normalize(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function matchesText(source: string, value?: string | null) {
  if (!value?.trim()) return true;

  return normalize(source).includes(normalize(value));
}

export function searchKnowledge(query: UCEConhecimentoConsulta = {}) {
  const relationTerms = expandKnowledgeRelations([
    query.bairro ?? "",
    query.cidade ?? "",
    ...(query.tags ?? []),
  ]);
  const enrichedQuery: UCEConhecimentoConsulta = {
    ...query,
    tags: Array.from(new Set([...(query.tags ?? []), ...relationTerms])),
  };
  const filtered = conhecimentoItems.filter((item) => {
    if (query.dominio && item.dominio !== query.dominio) return false;
    if (query.dominios?.length && !query.dominios.includes(item.dominio)) return false;
    if (query.categoria && !matchesText(item.categoria, query.categoria)) return false;
    if (query.cidade && item.cidade && !matchesText(item.cidade, query.cidade)) return false;
    if (query.bairro && item.bairro && !matchesText(item.bairro, query.bairro)) return false;

    return true;
  });

  return rankKnowledgeResults(filtered, enrichedQuery).slice(0, query.limite ?? 8);
}
