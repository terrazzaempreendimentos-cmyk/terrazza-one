import type { UCEKnowledgeResult } from "./types";

export function formatKnowledgeForPrompt(results: UCEKnowledgeResult[]) {
  if (results.length === 0) {
    return "Nenhum conhecimento proprietario relevante encontrado.";
  }

  return results
    .map((result, index) => {
      const { item } = result;

      return [
        `# ${index + 1}. ${item.title}`,
        `Dominio: ${item.domain}`,
        `Categoria: ${item.category}`,
        `Tags: ${item.tags.length > 0 ? item.tags.join(", ") : "sem tags"}`,
        `Prioridade: ${item.priority}`,
        `Fonte: ${item.source.title}`,
        `Conteudo: ${item.content}`,
      ].join("\n");
    })
    .join("\n\n---\n\n");
}
