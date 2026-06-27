import type {
  UCECommercialStrategy,
  UCEContext,
  UCEHypothesis,
} from "../core/types";

function text(value: unknown) {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function hypothesisIncludes(hypotheses: UCEHypothesis[], term: string) {
  const normalized = text(term);

  return hypotheses.some(
    (hypothesis) =>
      text(hypothesis.key).includes(normalized) ||
      text(hypothesis.title).includes(normalized) ||
      text(hypothesis.category).includes(normalized),
  );
}

const strategies: Record<UCECommercialStrategy["id"], Omit<UCECommercialStrategy, "reason">> = {
  modo_consultivo: {
    id: "modo_consultivo",
    name: "Modo consultivo",
    description: "Conduz o lead com curadoria, educacao e construcao de confianca.",
    whenToUse: "Cliente sem pressa, pesquisando ou com baixa clareza de decisao.",
    tone: "Calmo, educativo e sem pressao.",
    nextBestAction: "Entender criterios, oferecer curadoria e manter relacionamento ativo.",
    risk: "baixo",
    suggestedMessage:
      "Sem problema. Vou te ajudar a comparar com calma e entender o que realmente faz sentido para voce.",
  },
  modo_conversao: {
    id: "modo_conversao",
    name: "Modo conversao",
    description: "Acelera o atendimento quando ha urgencia ou alto potencial de fechamento.",
    whenToUse: "Lead com urgencia alta, prazo curto ou score elevado.",
    tone: "Objetivo, seguro e orientado a proximo passo.",
    nextBestAction: "Oferecer 2 ou 3 opcoes e tentar agendar visita rapidamente.",
    risk: "medio",
    suggestedMessage:
      "Entendi a urgencia. Vou priorizar opcoes aderentes e ja deixar um caminho pratico para visita.",
  },
  modo_captacao: {
    id: "modo_captacao",
    name: "Modo captacao",
    description: "Valoriza seguranca, avaliacao e potencial do imovel do proprietario.",
    whenToUse: "Proprietario deseja anunciar, alugar ou captar imovel.",
    tone: "Consultivo, firme e especialista.",
    nextBestAction: "Coletar dados do imovel e preparar avaliacao/captacao.",
    risk: "medio",
    suggestedMessage:
      "A Terrazza pode te apoiar com avaliacao, posicionamento e uma administracao mais segura do imovel.",
  },
  modo_administracao: {
    id: "modo_administracao",
    name: "Modo administracao",
    description: "Foca em gestao completa, garantia, analise cadastral e tranquilidade.",
    whenToUse: "Proprietario busca administracao, locacao ou seguranca operacional.",
    tone: "Seguro, institucional e premium.",
    nextBestAction: "Explicar beneficios da administracao e acionar especialista.",
    risk: "medio",
    suggestedMessage:
      "Nosso foco e reduzir risco para o proprietario, da analise cadastral ao acompanhamento do contrato.",
  },
  modo_reengajamento: {
    id: "modo_reengajamento",
    name: "Modo reengajamento",
    description: "Recupera leads frios ou indecisos com baixo atrito.",
    whenToUse: "Lead frio, indeciso ou sem resposta clara.",
    tone: "Leve, util e respeitoso.",
    nextBestAction: "Fazer pergunta simples e oferecer resumo das possibilidades.",
    risk: "baixo",
    suggestedMessage:
      "Posso te mandar uma selecao objetiva para voce avaliar sem compromisso?",
  },
  modo_alto_padrao: {
    id: "modo_alto_padrao",
    name: "Modo alto padrao",
    description: "Atendimento seletivo para lead com maior potencial financeiro.",
    whenToUse: "Valor alto, imovel premium ou sinais de alto padrao.",
    tone: "Elegante, discreto e preciso.",
    nextBestAction: "Entender criterios finos e oferecer atendimento personalizado.",
    risk: "medio",
    suggestedMessage:
      "Para esse perfil, vale fazermos uma curadoria mais precisa e discreta, alinhada aos seus criterios.",
  },
  modo_investidor: {
    id: "modo_investidor",
    name: "Modo investidor",
    description: "Conduz conversa com foco em liquidez, retorno e risco.",
    whenToUse: "Lead menciona investimento, renda, rentabilidade ou patrimonio.",
    tone: "Analitico, direto e orientado a numeros.",
    nextBestAction: "Mapear objetivo financeiro, horizonte e tolerancia a risco.",
    risk: "medio",
    suggestedMessage:
      "Vamos olhar isso como decisao patrimonial: liquidez, retorno esperado e risco operacional.",
  },
  modo_juridico_cauteloso: {
    id: "modo_juridico_cauteloso",
    name: "Modo juridico cauteloso",
    description: "Evita parecer definitivo e encaminha pontos sensiveis para humano.",
    whenToUse: "Duvida juridica, documental, garantia, fiador ou financiamento sensivel.",
    tone: "Cuidadoso, claro e responsavel.",
    nextBestAction: "Registrar duvida e acionar especialista humano.",
    risk: "alto",
    suggestedMessage:
      "Esse ponto merece uma analise cuidadosa. Vou registrar e encaminhar para um especialista da equipe.",
  },
};

export function selectCommercialStrategy(
  context: UCEContext,
  hypotheses: UCEHypothesis[],
): UCECommercialStrategy {
  const objective = text(context.fields.objetivo);
  const urgency = text(context.fields.urgencia);
  const leadType = text(context.leadType);
  const value = Number(context.fields.valor ?? 0);
  const documentation = text(context.fields.documentacao);
  const lastMessage = text(context.memory.at(-1)?.content);

  let id: UCECommercialStrategy["id"] = "modo_reengajamento";
  let reason = "Ainda ha poucos sinais comerciais; manter abordagem leve.";

  if (
    lastMessage.includes("juridic") ||
    lastMessage.includes("contrato") ||
    lastMessage.includes("document") ||
    lastMessage.includes("fiador") ||
    documentation.includes("duvida")
  ) {
    id = "modo_juridico_cauteloso";
    reason = "Ha sinal documental/juridico que exige cautela e possivel humano.";
  } else if (value > 5000 || hypothesisIncludes(hypotheses, "alto")) {
    id = "modo_alto_padrao";
    reason = "Valor ou hipotese indica potencial de alto padrao.";
  } else if (lastMessage.includes("invest") || objective.includes("invest")) {
    id = "modo_investidor";
    reason = "Lead demonstra intencao patrimonial ou de investimento.";
  } else if (
    leadType === "proprietario" &&
    (objective.includes("locacao") ||
      objective.includes("administracao") ||
      objective.includes("captacao"))
  ) {
    id = "modo_administracao";
    reason = "Proprietario com interesse em locacao/administracao.";
  } else if (objective.includes("captacao")) {
    id = "modo_captacao";
    reason = "Objetivo aponta oportunidade de captacao.";
  } else if (urgency === "alta") {
    id = "modo_conversao";
    reason = "Urgencia alta pede velocidade e encaminhamento pratico.";
  } else if (
    urgency === "baixa" ||
    lastMessage.includes("so pesquisando") ||
    lastMessage.includes("estou pesquisando") ||
    lastMessage.includes("sem pressa")
  ) {
    id = "modo_consultivo";
    reason = "Cliente demonstra baixa pressa; melhor conduzir com curadoria.";
  } else if (objective) {
    id = "modo_consultivo";
    reason = "Objetivo existe, mas ainda pede qualificacao consultiva.";
  }

  return {
    ...strategies[id],
    reason,
  };
}
