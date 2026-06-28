import { camposPendentes } from "./memoria";
import type { HipoteseIA } from "./inferencia";
import type { LeadContext, LeadTemperature } from "./tipos";
import type {
  UCEAprendizadoResult,
  UCEMatch,
  UCEKnowledgeResult,
  UCEPerfil,
  UCERecommendation,
} from "../../uce";

function valorTexto(valor: unknown) {
  if (valor === null || valor === undefined || valor === "") return "Nao informado";
  if (typeof valor === "boolean") return valor ? "Sim" : "Nao";

  return String(valor);
}

export function gerarBriefing({
  contexto,
  score,
  temperatura,
  sugestao,
  hipotesesComerciais = [],
  alertasComerciais,
  knowledgeResults = [],
  knowledgeSummary,
  correspondenceMatches = [],
  correspondenceRecommendations = [],
  perfilComportamental,
  aprendizado,
}: {
  contexto: LeadContext;
  score: number;
  temperatura: LeadTemperature;
  sugestao: string;
  hipotesesComerciais?: HipoteseIA[];
  knowledgeResults?: UCEKnowledgeResult[];
  knowledgeSummary?: string;
  correspondenceMatches?: UCEMatch[];
  correspondenceRecommendations?: UCERecommendation[];
  perfilComportamental?: UCEPerfil;
  aprendizado?: UCEAprendizadoResult;
  alertasComerciais?: {
    objecaoDetectada: string | null;
    riscoComercial: string | null;
    precisaCorretorHumano: boolean;
    respostaComercialSugerida: string | null;
  } | null;
}) {
  const pendencias = camposPendentes(contexto, [
    "bairro",
    "tipoImovel",
    "valor",
    "urgencia",
  ]);

  return [
    `Cliente ${contexto.tipoLead ?? "sem tipo definido"}.`,
    `Cidade: ${valorTexto(contexto.cidade)}`,
    `Bairro: ${valorTexto(contexto.bairro)}`,
    `Tipo de imovel: ${valorTexto(contexto.tipoImovel)}`,
    `Area aproximada: ${
      contexto.areaM2 ? `${contexto.areaM2}m²` : valorTexto(contexto.areaM2)
    }`,
    `Valor: ${valorTexto(contexto.valor)}`,
    `Pet: ${valorTexto(contexto.pet)}`,
    `Mudanca: ${valorTexto(contexto.prazoMudanca)}`,
    `Documentacao: ${valorTexto(contexto.documentacao)}`,
    `Observacao documentacao: ${valorTexto(contexto.documentacaoObservacao)}`,
    `Temperatura: ${temperatura}`,
    `Score: ${score}`,
    "Hipoteses Comerciais:",
    hipotesesComerciais.length > 0
      ? hipotesesComerciais
          .map(
            (hipotese) =>
              `- ${hipotese.titulo} (${hipotese.confianca}%): ${hipotese.descricao}`,
          )
          .join("\n")
      : "- Sem hipoteses comerciais relevantes ainda.",
    "Alertas Comerciais:",
    alertasComerciais?.objecaoDetectada
      ? [
          `- Objecao: ${alertasComerciais.objecaoDetectada}`,
          `- Risco: ${alertasComerciais.riscoComercial ?? "baixo"}`,
          `- Precisa corretor humano: ${
            alertasComerciais.precisaCorretorHumano ? "sim" : "nao"
          }`,
          alertasComerciais.respostaComercialSugerida
            ? `- Conducao sugerida: ${alertasComerciais.respostaComercialSugerida}`
            : null,
        ]
          .filter(Boolean)
          .join("\n")
      : "- Nenhum alerta comercial detectado.",
    "Base consultada pelo UCE:",
    knowledgeResults.length > 0
      ? knowledgeResults
          .map(
            (result) =>
              `- ${result.item.title} (${result.item.category}, prioridade ${result.item.priority}): ${result.item.content}`,
          )
          .join("\n")
      : knowledgeSummary ?? "- Nenhuma base proprietaria relevante encontrada.",
    "Correspondencias encontradas:",
    correspondenceMatches.length > 0
      ? correspondenceMatches
          .map(
            (match) =>
              `- ${match.target.label}: ${match.compatibility.score}% (${match.compatibility.reasons
                .map((reason) => reason.label)
                .join(", ")})`,
          )
          .join("\n")
      : "- Nenhuma correspondencia relevante encontrada.",
    "Sugestoes de correspondencia:",
    correspondenceRecommendations.length > 0
      ? correspondenceRecommendations.map((recommendation) => `- ${recommendation.message}`).join("\n")
      : "- Sem sugestoes automaticas no momento.",
    "Perfil comportamental:",
    perfilComportamental
      ? [
          `- Perfil principal: ${perfilComportamental.perfilPrincipal}`,
          `- Estilo de decisao: ${perfilComportamental.estiloDecisao}`,
          `- Risco de perda: ${perfilComportamental.riscoPerda}`,
          `- Sinais: ${
            perfilComportamental.sinaisDetectados.length > 0
              ? perfilComportamental.sinaisDetectados
                  .map((sinal) => sinal.frase)
                  .join(", ")
              : "sem sinais fortes"
          }`,
          `- Recomendacoes: ${
            perfilComportamental.recomendacoes.length > 0
              ? perfilComportamental.recomendacoes
                  .map((recomendacao) => recomendacao.texto)
                  .join(" | ")
              : "seguir abordagem consultiva"
          }`,
          `- Resumo: ${perfilComportamental.resumoPerfil}`,
        ].join("\n")
      : "- Perfil comportamental ainda nao calculado.",
    "Aprendizado UCE:",
    aprendizado
      ? [
          `- Padroes: ${
            aprendizado.padroesDetectados.length > 0
              ? aprendizado.padroesDetectados
                  .map((padrao) => `${padrao.titulo} (${padrao.confianca}%)`)
                  .join(", ")
              : "sem padroes fortes"
          }`,
          `- Insights: ${
            aprendizado.insights.length > 0
              ? aprendizado.insights.map((insight) => insight.titulo).join(", ")
              : "sem insights relevantes"
          }`,
          `- Recomendacoes: ${
            aprendizado.recomendacoes.length > 0
              ? aprendizado.recomendacoes
                  .map((recomendacao) => recomendacao.titulo)
                  .join(", ")
              : "sem recomendacoes adicionais"
          }`,
          `- Metricas: confianca ${aprendizado.metricas.nivelConfianca}, complexidade ${aprendizado.metricas.complexidadeAtendimento}, prioridade ${aprendizado.metricas.prioridadeOperacional}, humano ${aprendizado.metricas.necessidadeHumano}, relacionamento ${aprendizado.metricas.potencialRelacionamento}`,
          `- Resumo: ${aprendizado.resumoAprendizado}`,
        ].join("\n")
      : "- Aprendizado ainda nao calculado.",
    `Pendencias: ${
      pendencias.length > 0 ? pendencias.join(", ") : "Sem pendencias essenciais"
    }`,
    `Sugestao: ${sugestao}`,
  ].join("\n");
}
