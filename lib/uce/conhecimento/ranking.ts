import type {
  UCEConhecimentoConsulta,
  UCEConhecimentoItem,
  UCEConhecimentoResultado,
} from "./types";

function normalize(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function includesNormalized(source: string, term: string) {
  return normalize(source).includes(normalize(term));
}

function addScore(
  condition: boolean,
  score: number,
  reason: string,
  current: { score: number; motivos: string[] },
) {
  if (!condition) return;

  current.score += score;
  current.motivos.push(reason);
}

export function rankKnowledgeItem(
  item: UCEConhecimentoItem,
  query: UCEConhecimentoConsulta,
): UCEConhecimentoResultado {
  const current = {
    score: Math.max(0, item.prioridade),
    motivos: [`prioridade:${item.prioridade}`],
  };
  const text = query.texto?.trim();

  if (text) {
    const terms = normalize(text)
      .split(/\s+/)
      .filter((term) => term.length >= 3);

    addScore(includesNormalized(item.titulo, text), 45, "titulo", current);
    addScore(includesNormalized(item.conteudo, text), 20, "conteudo", current);

    for (const term of terms) {
      addScore(includesNormalized(item.titulo, term), 12, `titulo:${term}`, current);
      addScore(includesNormalized(item.conteudo, term), 6, `conteudo:${term}`, current);
      addScore(
        item.tags.some((tag) => includesNormalized(tag, term)),
        10,
        `tag:${term}`,
        current,
      );
    }
  }

  addScore(Boolean(query.dominio && item.dominio === query.dominio), 35, "dominio", current);
  addScore(
    Boolean(query.dominios?.includes(item.dominio)),
    30,
    "dominios_permitidos",
    current,
  );
  addScore(
    Boolean(query.categoria && includesNormalized(item.categoria, query.categoria)),
    25,
    "categoria",
    current,
  );
  addScore(
    Boolean(query.cidade && item.cidade && includesNormalized(item.cidade, query.cidade)),
    18,
    "cidade",
    current,
  );
  addScore(
    Boolean(query.bairro && item.bairro && includesNormalized(item.bairro, query.bairro)),
    22,
    "bairro",
    current,
  );

  for (const tag of query.tags ?? []) {
    addScore(
      item.tags.some((itemTag) => includesNormalized(itemTag, tag)) ||
        item.relacionamentos.some((relation) => includesNormalized(relation, tag)),
      14,
      `tag:${tag}`,
      current,
    );
  }

  return {
    item,
    score: current.score,
    motivos: current.motivos,
  };
}

export function rankKnowledgeResults(
  items: UCEConhecimentoItem[],
  query: UCEConhecimentoConsulta,
) {
  return items
    .map((item) => rankKnowledgeItem(item, query))
    .filter((result) => result.score > itemMinimumScore(query))
    .sort((a, b) => b.score - a.score);
}

function itemMinimumScore(query: UCEConhecimentoConsulta) {
  return query.texto || query.tags?.length || query.dominio || query.dominios?.length
    ? 20
    : 0;
}
