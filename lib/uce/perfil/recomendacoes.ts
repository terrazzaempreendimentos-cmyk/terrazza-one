import type {
  UCEEstiloDecisao,
  UCEPerfilComportamental,
  UCEPerfilRecomendacao,
} from "./types";

export const recomendacoesPorPerfil: UCEPerfilRecomendacao[] = [
  {
    id: "perfil-inseguro",
    titulo: "Conduzir com seguranca",
    texto:
      "Evitar pressao. Reforcar seguranca, etapas do processo e suporte da Terrazza.",
    prioridade: "alta",
    estiloDecisao: "inseguro",
  },
  {
    id: "perfil-urgente",
    titulo: "Ser objetivo",
    texto:
      "Ser objetivo, apresentar poucas opcoes compativeis e tentar agendar visita rapidamente.",
    prioridade: "alta",
    estiloDecisao: "urgente",
  },
  {
    id: "perfil-investidor",
    titulo: "Focar em retorno",
    texto:
      "Focar em liquidez, rentabilidade, potencial de valorizacao e riscos.",
    prioridade: "alta",
    perfil: "investidor",
    estiloDecisao: "investidor",
  },
  {
    id: "proprietario-inseguro",
    titulo: "Reforcar gestao profissional",
    texto:
      "Reforcar gestao profissional, analise cadastral, garantia locaticia e acompanhamento juridico.",
    prioridade: "alta",
    perfil: "proprietario_inseguro",
  },
  {
    id: "familia",
    titulo: "Priorizar rotina familiar",
    texto:
      "Valorizar seguranca, escola, mobilidade, condominio e adequacao para filhos ou pet.",
    prioridade: "media",
    perfil: "familia",
  },
  {
    id: "comparador",
    titulo: "Organizar comparativos",
    texto:
      "Comparar poucas alternativas com criterios objetivos para reduzir dispersao.",
    prioridade: "media",
    estiloDecisao: "comparador",
  },
  {
    id: "vendedor-teste",
    titulo: "Validar motivacao real",
    texto:
      "Confirmar se ha intencao real de vender ou apenas teste de mercado antes de investir energia comercial.",
    prioridade: "media",
    perfil: "vendedor_teste_mercado",
  },
];

export function obterRecomendacoesPerfil({
  perfilPrincipal,
  perfisSecundarios,
  estiloDecisao,
}: {
  perfilPrincipal: UCEPerfilComportamental;
  perfisSecundarios: UCEPerfilComportamental[];
  estiloDecisao: UCEEstiloDecisao;
}) {
  const perfis = new Set([perfilPrincipal, ...perfisSecundarios]);

  return recomendacoesPorPerfil
    .filter(
      (recomendacao) =>
        (recomendacao.perfil && perfis.has(recomendacao.perfil)) ||
        recomendacao.estiloDecisao === estiloDecisao,
    )
    .slice(0, 4);
}
