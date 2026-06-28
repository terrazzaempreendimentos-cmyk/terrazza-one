import type { UCEAprendizadoInput, UCEInsight, UCEPadraoDetectado } from "./types";

export function gerarInsightsAprendizado(
  input: UCEAprendizadoInput,
  padroes: UCEPadraoDetectado[],
): UCEInsight[] {
  const insights: UCEInsight[] = [];
  const perfil = input.perfilComportamental;

  if (perfil?.perfilPrincipal === "familia" || padroes.some((p) => p.id === "familia_busca_3_quartos")) {
    insights.push({
      id: "insight-familia-3-quartos",
      titulo: "Perfil familiar identificado",
      descricao: "Priorizar imoveis com 3 quartos ou mais, rotina pratica e bairro conveniente.",
      prioridade: "medio",
    });
  }

  if (perfil?.nivelUrgencia === "alta" || padroes.some((p) => p.id === "urgencia_alta_exige_handoff_rapido")) {
    insights.push({
      id: "insight-urgencia-alta",
      titulo: "Urgencia alta",
      descricao: "Evitar excesso de opcoes e priorizar acao rapida.",
      prioridade: "alto",
    });
  }

  if (perfil?.perfilPrincipal === "proprietario_inseguro") {
    insights.push({
      id: "insight-proprietario-inseguro",
      titulo: "Proprietario inseguro",
      descricao: "Reforcar seguranca, garantias e gestao profissional.",
      prioridade: "alto",
    });
  }

  if (perfil?.perfilPrincipal === "investidor" || padroes.some((p) => p.id === "investidor_busca_liquidez")) {
    insights.push({
      id: "insight-investidor",
      titulo: "Cliente investidor",
      descricao: "Destacar liquidez, potencial de valorizacao e retorno.",
      prioridade: "alto",
    });
  }

  if ((input.correspondencias ?? []).some((match) => match.compatibility.score >= 75)) {
    insights.push({
      id: "insight-correspondencia-forte",
      titulo: "Correspondencia forte encontrada",
      descricao: "Ha oportunidade compativel para apresentar ou encaminhar ao especialista.",
      prioridade: "alto",
    });
  }

  return insights;
}
