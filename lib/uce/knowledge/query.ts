import { knowledgeItems } from "./repository";
import { rankKnowledgeResults } from "./ranking";
import type { UCEKnowledgeItem, UCEKnowledgeQuery, UCEKnowledgeResult } from "./types";

function normalize(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function hasTextMatch(item: UCEKnowledgeItem, text?: string | null) {
  if (!text?.trim()) return true;

  const terms = normalize(text)
    .split(/\s+/)
    .map((term) => term.trim())
    .filter((term) => term.length >= 3);

  if (terms.length === 0) return true;

  const searchable = normalize(
    [item.title, item.content, item.tags.join(" ")].join(" "),
  );

  return terms.some((term) => searchable.includes(term));
}

function hasTagMatch(item: UCEKnowledgeItem, tags?: string[]) {
  if (!tags || tags.length === 0) return true;

  const itemTags = item.tags.map(normalize);

  return tags.map(normalize).some((tag) => itemTags.includes(tag));
}

export function queryKnowledge(query: UCEKnowledgeQuery): UCEKnowledgeResult[] {
  const filtered = knowledgeItems.filter((item) => {
    if (!item.active) return false;
    if (query.domain && item.domain !== query.domain) return false;
    if (query.category && item.category !== query.category) return false;
    if (!hasTagMatch(item, query.tags)) return false;
    if (!hasTextMatch(item, query.text)) return false;

    return true;
  });

  const results = filtered.map<UCEKnowledgeResult>((item) => ({
    item,
    score: query.domain && item.domain === query.domain ? 10 : 0,
    matchedBy: query.domain && item.domain === query.domain ? ["domain"] : [],
  }));

  return rankKnowledgeResults(results, query).slice(0, query.limit ?? 10);
}
