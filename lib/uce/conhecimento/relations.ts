export const knowledgeRelations: Record<string, string[]> = {
  "Ponta Verde": ["Maceio", "Turismo", "Airbnb", "Alto padrao", "Venda", "Locacao"],
  Maceio: ["Alagoas", "Orla", "Mercado", "Bairros"],
  Turismo: ["Temporada", "Airbnb", "Investimento"],
  Airbnb: ["Temporada", "Turismo", "Administracao"],
  "Alto padrao": ["Venda", "Locacao", "Mercado"],
  "Seguro Fianca": ["Garantias", "Locacao", "Maximiza", "Analise cadastral"],
  Garantias: ["Locacao", "Seguro Fianca", "Caucao", "Fiador"],
  Locacao: ["Garantias", "Condominio", "Bairros", "Analise cadastral"],
  Maximiza: ["Analise cadastral", "Garantias", "Locacao"],
  "Analise cadastral": ["Garantias", "Locacao", "Documentacao"],
};

export function expandKnowledgeRelations(terms: string[], depth = 2) {
  const visited = new Set<string>();
  const queue = terms.filter(Boolean).map((term) => ({ term, depth: 0 }));

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current || visited.has(current.term) || current.depth > depth) continue;

    visited.add(current.term);

    for (const related of knowledgeRelations[current.term] ?? []) {
      if (!visited.has(related)) {
        queue.push({ term: related, depth: current.depth + 1 });
      }
    }
  }

  return Array.from(visited);
}
