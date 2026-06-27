import type { UCEContext, UCEHypothesis } from "../core/types";

function getString(context: UCEContext, field: string) {
  const value = context.fields[field];

  return typeof value === "string" ? value.toLowerCase() : "";
}

function getNumber(context: UCEContext, field: string) {
  const value = context.fields[field];

  return typeof value === "number" ? value : 0;
}

export function generateHypotheses(context: UCEContext): UCEHypothesis[] {
  const hypotheses: UCEHypothesis[] = [];
  const tipoImovel = getString(context, "tipoImovel");
  const objetivo = getString(context, "objetivo");
  const quartos = getNumber(context, "quartos");
  const valor = getNumber(context, "valor");

  if (quartos >= 3 || tipoImovel.includes("casa")) {
    hypotheses.push({
      key: "perfil_familiar",
      title: "Perfil familiar",
      description: "Sinais de necessidade residencial com mais espaco.",
      confidence: quartos >= 3 ? 85 : 70,
      category: "familia",
      evidence: ["tipoImovel/quartos"],
    });
  }

  if (valor > 5000) {
    hypotheses.push({
      key: "perfil_alto_padrao",
      title: "Perfil alto padrao",
      description: "Valor informado sugere atendimento premium.",
      confidence: 70,
      category: "perfilFinanceiro",
      evidence: ["valor acima de 5 mil"],
    });
  }

  if (objetivo === "administracao" || objetivo === "captacao") {
    hypotheses.push({
      key: "potencial_administracao",
      title: "Potencial de administracao",
      description: "Objetivo sugere oportunidade de captacao ou gestao completa.",
      confidence: 95,
      category: "administracao",
      evidence: ["objetivo"],
    });
  }

  if (objetivo === "locacao") {
    hypotheses.push({
      key: "lead_locacao",
      title: "Lead de locacao",
      description: "Cliente ligado a busca ou oferta de locacao.",
      confidence: 82,
      category: "locacao",
      evidence: ["objetivo"],
    });
  }

  if (objetivo === "compra") {
    hypotheses.push({
      key: "lead_compra",
      title: "Lead de compra",
      description: "Cliente comprador com necessidade de qualificacao financeira.",
      confidence: 82,
      category: "compra",
      evidence: ["objetivo"],
    });
  }

  if (context.fields.urgencia === "alta") {
    hypotheses.push({
      key: "urgencia_alta",
      title: "Urgencia alta",
      description: "Prazo exige velocidade de atendimento.",
      confidence: 88,
      category: "urgencia",
      evidence: ["urgencia"],
    });
  }

  if (context.fields.pet === true && tipoImovel.includes("casa")) {
    hypotheses.push({
      key: "precisa_quintal",
      title: "Precisa de quintal",
      description: "Casa com pet sugere valorizacao de area externa.",
      confidence: 90,
      category: "perfilImovel",
      evidence: ["pet", "tipoImovel"],
    });
  }

  if (context.fields.financiamento === true || context.fields.fgts === true) {
    hypotheses.push({
      key: "perfil_primeiro_imovel",
      title: "Possivel primeiro imovel",
      description: "Uso de financiamento ou FGTS pode indicar compra orientada.",
      confidence: 72,
      category: "compra",
      evidence: ["financiamento/fgts"],
    });
  }

  return hypotheses.sort((a, b) => b.confidence - a.confidence);
}
