import type { LeadContext } from "./tipos";

export type HipoteseCategoria =
  | "familia"
  | "perfilFinanceiro"
  | "administracao"
  | "compra"
  | "locacao"
  | "investidor"
  | "urgencia"
  | "perfilImovel";

export type HipoteseIA = {
  titulo: string;
  descricao: string;
  confianca: number;
  categoria: HipoteseCategoria;
};

function objetivoEh(contexto: LeadContext, objetivo: string) {
  return contexto.objetivo?.toLowerCase() === objetivo;
}

export function gerarInferenciasComerciais(contexto: LeadContext): HipoteseIA[] {
  const hipoteses: HipoteseIA[] = [];
  const tipoImovel = contexto.tipoImovel?.toLowerCase() ?? "";
  const valor = contexto.valor ?? 0;

  if (tipoImovel.includes("casa")) {
    hipoteses.push({
      titulo: "Provavel familia",
      descricao: "Casa costuma indicar busca por mais espaco, rotina familiar ou privacidade.",
      confianca: 70,
      categoria: "familia",
    });
  }

  if (tipoImovel.includes("apartamento")) {
    hipoteses.push({
      titulo: "Perfil urbano",
      descricao: "Apartamento sugere preferencia por praticidade, localizacao e estrutura de condominio.",
      confianca: 60,
      categoria: "perfilImovel",
    });
  }

  if ((contexto.quartos ?? 0) >= 3) {
    hipoteses.push({
      titulo: "Provavel familia",
      descricao: "Tres ou mais quartos indicam necessidade familiar ou maior composicao residencial.",
      confianca: 85,
      categoria: "familia",
    });
  }

  if (tipoImovel.includes("casa") && contexto.pet === true) {
    hipoteses.push({
      titulo: "Necessidade de quintal",
      descricao: "Casa com pet sugere valorizacao de area externa e liberdade para animais.",
      confianca: 90,
      categoria: "perfilImovel",
    });
  }

  if (valor > 5000) {
    hipoteses.push({
      titulo: "Alto padrao",
      descricao: "Valor acima de 5 mil indica possivel atendimento premium e criterios mais seletivos.",
      confianca: 70,
      categoria: "perfilFinanceiro",
    });
  }

  if (objetivoEh(contexto, "administracao")) {
    hipoteses.push({
      titulo: "Grande potencial de captacao",
      descricao: "Objetivo de administracao indica oportunidade forte para gestao completa do imovel.",
      confianca: 95,
      categoria: "administracao",
    });
  }

  if (objetivoEh(contexto, "compra")) {
    hipoteses.push({
      titulo: "Cliente comprador",
      descricao: "Objetivo de compra pede abordagem consultiva sobre credito, timing e aderencia ao estoque.",
      confianca: 82,
      categoria: "compra",
    });
  }

  if (objetivoEh(contexto, "locacao")) {
    hipoteses.push({
      titulo: "Cliente locatario",
      descricao: "Objetivo de locacao exige velocidade, clareza de bairro, valor, quartos, pet e prazo.",
      confianca: 82,
      categoria: "locacao",
    });
  }

  if (contexto.urgencia === "alta") {
    hipoteses.push({
      titulo: "Necessidade de mudanca rapida",
      descricao: "Urgencia alta indica lead sensivel a velocidade de retorno e opcoes objetivas.",
      confianca: 88,
      categoria: "urgencia",
    });
  }

  return hipoteses.sort((a, b) => b.confianca - a.confianca);
}

export function contarHipotesesConfirmadas(hipoteses: HipoteseIA[]) {
  return hipoteses.filter((hipotese) => hipotese.confianca >= 85).length;
}
