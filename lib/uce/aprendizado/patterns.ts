import type { UCEAprendizadoInput, UCEPadraoDetectado } from "./types";

type UCEPadraoRegra = UCEPadraoDetectado & {
  match: (input: UCEAprendizadoInput) => boolean;
};

function field(input: UCEAprendizadoInput, key: string) {
  return input.context.fields[key];
}

function hasHypothesis(input: UCEAprendizadoInput, term: string) {
  const normalized = term.toLowerCase();

  return (input.hypotheses ?? []).some((hypothesis) =>
    `${hypothesis.key} ${hypothesis.title} ${hypothesis.category}`
      .toLowerCase()
      .includes(normalized),
  );
}

export const aprendizadoPadroes: UCEPadraoRegra[] = [
  {
    id: "familia_busca_3_quartos",
    titulo: "Familia busca 3 quartos",
    descricao: "Perfil familiar com necessidade provavel de espaco e rotina.",
    categoria: "perfil",
    condicoes: ["perfil familia", "quartos >= 3"],
    confianca: 86,
    recomendacao: "Priorizar imoveis com 3 quartos ou mais e boa estrutura de bairro.",
    match: (input) =>
      input.perfilComportamental?.perfilPrincipal === "familia" ||
      Number(field(input, "quartos") ?? 0) >= 3,
  },
  {
    id: "investidor_busca_liquidez",
    titulo: "Investidor busca liquidez",
    descricao: "Cliente com sinais de investimento tende a valorizar retorno e saida.",
    categoria: "investimento",
    condicoes: ["perfil investidor", "hipotese investidor"],
    confianca: 88,
    recomendacao: "Focar em liquidez, valorizacao, renda potencial e riscos.",
    match: (input) =>
      input.perfilComportamental?.perfilPrincipal === "investidor" ||
      hasHypothesis(input, "investidor"),
  },
  {
    id: "inquilino_com_pet_precisa_flexibilidade",
    titulo: "Inquilino com pet precisa flexibilidade",
    descricao: "Pet pode restringir opcoes de locacao e condominio.",
    categoria: "locacao",
    condicoes: ["lead inquilino", "pet = true"],
    confianca: 82,
    recomendacao: "Filtrar opcoes que aceitam pet e antecipar regras de condominio.",
    match: (input) => input.context.leadType === "inquilino" && field(input, "pet") === true,
  },
  {
    id: "comprador_financiado_precisa_documentacao",
    titulo: "Comprador financiado precisa documentacao",
    descricao: "Compra financiada exige clareza sobre documentos, entrada e etapas.",
    categoria: "compra",
    condicoes: ["lead comprador", "financiamento = true"],
    confianca: 84,
    recomendacao: "Solicitar documentacao e explicar etapas de financiamento sem prometer aprovacao.",
    match: (input) =>
      input.context.leadType === "comprador" && field(input, "financiamento") === true,
  },
  {
    id: "proprietario_inseguro_precisa_seguranca",
    titulo: "Proprietario inseguro precisa seguranca",
    descricao: "Proprietario inseguro tende a precisar de prova de processo e protecao.",
    categoria: "administracao",
    condicoes: ["perfil proprietario_inseguro", "risco de perda medio ou alto"],
    confianca: 86,
    recomendacao: "Reforcar gestao profissional, garantias, vistoria e suporte juridico.",
    match: (input) =>
      input.perfilComportamental?.perfilPrincipal === "proprietario_inseguro" ||
      (input.context.leadType === "proprietario" &&
        input.perfilComportamental?.riscoPerda !== "baixo"),
  },
  {
    id: "urgencia_alta_exige_handoff_rapido",
    titulo: "Urgencia alta exige handoff rapido",
    descricao: "Atendimento urgente perde valor se o fluxo ficar longo.",
    categoria: "operacao",
    condicoes: ["urgencia alta", "estilo urgente"],
    confianca: 90,
    recomendacao: "Reduzir perguntas, priorizar acao rapida e acionar especialista.",
    match: (input) =>
      field(input, "urgencia") === "alta" ||
      input.perfilComportamental?.estiloDecisao === "urgente",
  },
  {
    id: "alto_padrao_exige_atendimento_consultivo",
    titulo: "Alto padrao exige atendimento consultivo",
    descricao: "Leads de alto padrao demandam curadoria e abordagem discreta.",
    categoria: "comercial",
    condicoes: ["perfil alto_padrao", "valor elevado"],
    confianca: 78,
    recomendacao: "Usar abordagem consultiva, poucas opcoes e justificativa de valor.",
    match: (input) =>
      input.perfilComportamental?.perfilPrincipal === "alto_padrao" ||
      Number(field(input, "valor") ?? 0) >= 1000000,
  },
  {
    id: "lead_sem_pressa_precisa_nutricao",
    titulo: "Lead sem pressa precisa nutricao",
    descricao: "Baixa urgencia pede acompanhamento e conteudo de apoio.",
    categoria: "relacionamento",
    condicoes: ["urgencia baixa", "sem pressa"],
    confianca: 76,
    recomendacao: "Criar follow-up, registrar memoria e nutrir o lead com opcoes compativeis.",
    match: (input) =>
      field(input, "urgencia") === "baixa" ||
      input.perfilComportamental?.nivelUrgencia === "baixa",
  },
];

export function detectarPadroesAprendizado(input: UCEAprendizadoInput) {
  return aprendizadoPadroes
    .filter((pattern) => pattern.match(input))
    .map((pattern) => ({
      id: pattern.id,
      titulo: pattern.titulo,
      descricao: pattern.descricao,
      categoria: pattern.categoria,
      condicoes: pattern.condicoes,
      confianca: pattern.confianca,
      recomendacao: pattern.recomendacao,
    }));
}
