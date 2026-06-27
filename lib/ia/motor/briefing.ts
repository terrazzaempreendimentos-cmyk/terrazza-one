import { camposPendentes } from "./memoria";
import type { HipoteseIA } from "./inferencia";
import type { LeadContext, LeadTemperature } from "./tipos";

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
}: {
  contexto: LeadContext;
  score: number;
  temperatura: LeadTemperature;
  sugestao: string;
  hipotesesComerciais?: HipoteseIA[];
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
    `Valor: ${valorTexto(contexto.valor)}`,
    `Pet: ${valorTexto(contexto.pet)}`,
    `Mudanca: ${valorTexto(contexto.prazoMudanca)}`,
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
    `Pendencias: ${
      pendencias.length > 0 ? pendencias.join(", ") : "Sem pendencias essenciais"
    }`,
    `Sugestao: ${sugestao}`,
  ].join("\n");
}
