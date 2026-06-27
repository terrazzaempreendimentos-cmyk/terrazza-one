import type { UCEKnowledgeQuery, UCEKnowledgeResult } from "./types";

function normalize(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function textTerms(text?: string | null) {
  if (!text) return [];

  return normalize(text)
    .split(/\s+/)
    .map((term) => term.trim())
    .filter((term) => term.length >= 3);
}

function includesAny(value: string, terms: string[]) {
  const normalized = normalize(value);

  return terms.some((term) => normalized.includes(term));
}

export function rankKnowledgeResults(
  results: UCEKnowledgeResult[],
  query: UCEKnowledgeQuery,
): UCEKnowledgeResult[] {
  const terms = textTerms(query.text);
  const queryTags = (query.tags ?? []).map(normalize);

  return results
    .map((result) => {
      const matchedBy = new Set(result.matchedBy);
      let score = result.score;

      if (query.category && result.item.category === query.category) {
        score += 20;
        matchedBy.add("category");
      }

      const itemTags = result.item.tags.map(normalize);
      const tagMatches = queryTags.filter((tag) => itemTags.includes(tag));
      if (tagMatches.length > 0) {
        score += tagMatches.length * 15;
        matchedBy.add("tag");
      }

      if (terms.length > 0 && includesAny(result.item.title, terms)) {
        score += 12;
        matchedBy.add("title");
      }

      if (terms.length > 0 && includesAny(result.item.content, terms)) {
        score += 8;
        matchedBy.add("content");
      }

      if (result.item.priority > 0) {
        score += result.item.priority;
        matchedBy.add("priority");
      }

      return {
        ...result,
        score,
        matchedBy: Array.from(matchedBy),
      };
    })
    .sort((a, b) => b.score - a.score);
}
