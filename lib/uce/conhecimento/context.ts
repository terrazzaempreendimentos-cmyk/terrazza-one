import { expandKnowledgeRelations } from "./relations";
import { searchKnowledge } from "./search";
import type {
  UCEConhecimentoContext,
  UCEConhecimentoContextInput,
  UCEConhecimentoDominio,
} from "./types";

export const specialistKnowledgeDomains: Record<string, UCEConhecimentoDominio[]> = {
  comprador: ["Venda", "Financiamento", "Bairros", "Mercado"],
  vendedor: ["Venda", "Mercado", "Imoveis", "Bairros"],
  locacao: ["Locacao", "Garantias", "Condominio", "Bairros"],
  administracao: ["Administracao", "Condominio", "Juridico", "Garantias"],
  captacao: ["Venda", "Locacao", "Comercial", "Mercado"],
};

export function buildKnowledgeContext(
  input: UCEConhecimentoContextInput = {},
): UCEConhecimentoContext {
  const dominios =
    input.dominios ??
    (input.especialista ? specialistKnowledgeDomains[input.especialista] : undefined);
  const resultados = searchKnowledge({
    ...input,
    dominios,
    limite: input.maxItens ?? input.limite ?? 6,
  });
  const relacoes = expandKnowledgeRelations([
    input.bairro ?? "",
    input.cidade ?? "",
    ...(input.tags ?? []),
  ]);

  return {
    consulta: {
      ...input,
      dominios,
    },
    resultados,
    relacoes,
    resumo: formatKnowledgeContext(resultados),
  };
}

function formatKnowledgeContext(resultados: ReturnType<typeof searchKnowledge>) {
  if (resultados.length === 0) {
    return "Nenhum conhecimento relevante encontrado para a consulta.";
  }

  return resultados
    .map((result) =>
      [
        `Titulo: ${result.item.titulo}`,
        `Dominio: ${result.item.dominio}`,
        `Categoria: ${result.item.categoria}`,
        `Prioridade: ${result.item.prioridade}`,
        `Conteudo: ${result.item.conteudo}`,
      ].join("\n"),
    )
    .join("\n\n");
}
