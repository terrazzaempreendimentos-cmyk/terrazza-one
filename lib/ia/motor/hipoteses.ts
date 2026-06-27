import type { HipoteseComercial, LeadContext } from "./tipos";

function possuiObjetivo(contexto: LeadContext, termos: string[]) {
  const objetivo = contexto.objetivo?.toLowerCase() ?? "";

  return termos.some((termo) => objetivo.includes(termo));
}

export function gerarHipoteses(contexto: LeadContext): HipoteseComercial[] {
  const hipoteses: HipoteseComercial[] = [];

  if (
    possuiObjetivo(contexto, ["alugar", "locar", "locacao"]) ||
    contexto.tipoLead === "inquilino"
  ) {
    hipoteses.push({
      chave: "lead_locacao",
      titulo: "Lead de locacao",
      descricao: "O atendimento parece conectado a busca ou oferta para locacao.",
      confianca: contexto.bairro && contexto.valor ? 86 : 66,
    });
  }

  if (
    possuiObjetivo(contexto, ["comprar", "compra"]) ||
    contexto.tipoLead === "comprador"
  ) {
    hipoteses.push({
      chave: "lead_compra",
      titulo: "Lead de compra",
      descricao: "Ha sinais de interesse em compra e avaliacao financeira.",
      confianca: contexto.financiamento !== null || contexto.fgts ? 84 : 62,
    });
  }

  if ((contexto.quartos ?? 0) >= 2 || contexto.pet === true) {
    hipoteses.push({
      chave: "perfil_familiar",
      titulo: "Perfil familiar",
      descricao: "Quartos ou pet indicam necessidade de imovel para rotina familiar.",
      confianca: contexto.quartos && contexto.pet !== null ? 82 : 64,
    });
  }

  if (
    contexto.urgencia?.includes("urgente") ||
    contexto.urgencia?.includes("imediato") ||
    contexto.urgencia?.includes("30")
  ) {
    hipoteses.push({
      chave: "alta_urgencia",
      titulo: "Alta urgencia",
      descricao: "O prazo informado sugere atendimento prioritario.",
      confianca: 88,
    });
  }

  if (
    contexto.tipoLead === "proprietario" ||
    possuiObjetivo(contexto, [
      "administrar",
      "administracao",
      "anunciar",
      "captar",
      "captacao",
      "locar",
      "locacao",
    ])
  ) {
    hipoteses.push({
      chave: "potencial_administracao",
      titulo: "Potencial de administracao",
      descricao: "Pode existir oportunidade de captacao e administracao de imovel.",
      confianca: contexto.bairro && contexto.tipoImovel ? 82 : 68,
    });
  }

  if (contexto.financiamento === true || contexto.fgts === true) {
    hipoteses.push({
      chave: "precisa_financiamento",
      titulo: "Precisa de financiamento",
      descricao: "O lead pode exigir apoio consultivo sobre credito, FGTS ou simulacao.",
      confianca: contexto.fgts ? 86 : 76,
    });
  }

  if ((contexto.valor ?? 0) >= 7000 || (contexto.valor ?? 0) >= 700000) {
    hipoteses.push({
      chave: "lead_alto_padrao",
      titulo: "Lead alto padrao",
      descricao: "A faixa de valor indica potencial para atendimento premium.",
      confianca: 78,
    });
  }

  return hipoteses.sort((a, b) => b.confianca - a.confianca);
}
