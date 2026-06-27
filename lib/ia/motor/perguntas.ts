import { possuiInformacao } from "./memoria";
import type { LeadContext, NextQuestion } from "./tipos";

const perguntaObjetivo: NextQuestion = {
  campo: "objetivo",
  texto:
    "Qual e seu principal objetivo agora: alugar, comprar, vender, administrar ou anunciar um imovel?",
  motivo: "Objetivo comercial ainda nao preenchido.",
};

const perguntasBase: Record<string, NextQuestion> = {
  cidade: {
    campo: "cidade",
    texto: "Em qual cidade voce deseja atendimento?",
    motivo: "Cidade ainda nao preenchida.",
  },
  bairro: {
    campo: "bairro",
    texto: "Tem algum bairro ou regiao de preferencia?",
    motivo: "Bairro ainda nao preenchido.",
  },
  tipoImovel: {
    campo: "tipoImovel",
    texto: "Qual tipo de imovel faz mais sentido para voce?",
    motivo: "Tipo do imovel ainda nao preenchido.",
  },
  valor: {
    campo: "valor",
    texto: "Qual faixa de valor voce tem em mente?",
    motivo: "Faixa de valor ainda nao preenchida.",
  },
  quartos: {
    campo: "quartos",
    texto: "Quantos quartos voce precisa?",
    motivo: "Quantidade de quartos ainda nao preenchida.",
  },
  urgencia: {
    campo: "urgencia",
    texto: "Existe alguma urgencia ou prazo importante?",
    motivo: "Urgencia ainda nao preenchida.",
  },
  pet: {
    campo: "pet",
    texto: "Voce possui pet?",
    motivo: "Informacao sobre pet ainda nao preenchida.",
  },
  financiamento: {
    campo: "financiamento",
    texto: "Voce pretende usar financiamento?",
    motivo: "Financiamento ainda nao informado.",
  },
  fgts: {
    campo: "fgts",
    texto: "Voce pretende usar FGTS?",
    motivo: "FGTS ainda nao informado.",
  },
  documentacao: {
    campo: "documentacao",
    texto: "Voce ja possui documentacao ou credito organizado?",
    motivo: "Documentacao ainda nao informada.",
  },
};

function perguntasPorContexto(contexto: LeadContext) {
  if (!possuiInformacao(contexto, "objetivo")) return [perguntaObjetivo];

  if (contexto.tipoLead === "comprador" || contexto.objetivo === "compra") {
    return [
      perguntasBase.cidade,
      perguntasBase.bairro,
      perguntasBase.tipoImovel,
      perguntasBase.quartos,
      perguntasBase.valor,
      perguntasBase.financiamento,
      perguntasBase.fgts,
      perguntasBase.urgencia,
      perguntasBase.documentacao,
    ];
  }

  if (contexto.tipoLead === "inquilino" || contexto.objetivo === "locacao") {
    return [
      perguntasBase.cidade,
      perguntasBase.bairro,
      perguntasBase.tipoImovel,
      perguntasBase.quartos,
      perguntasBase.valor,
      perguntasBase.pet,
      perguntasBase.urgencia,
      perguntasBase.documentacao,
    ];
  }

  if (
    contexto.tipoLead === "proprietario" ||
    contexto.objetivo === "administracao" ||
    contexto.objetivo === "captacao"
  ) {
    return [
      perguntasBase.cidade,
      perguntasBase.bairro,
      perguntasBase.tipoImovel,
      perguntasBase.valor,
      perguntasBase.urgencia,
      perguntasBase.documentacao,
    ];
  }

  if (contexto.tipoLead === "vendedor" || contexto.objetivo === "venda") {
    return [
      perguntasBase.cidade,
      perguntasBase.bairro,
      perguntasBase.tipoImovel,
      perguntasBase.valor,
      perguntasBase.urgencia,
      perguntasBase.documentacao,
    ];
  }

  return [
    perguntasBase.cidade,
    perguntasBase.bairro,
    perguntasBase.tipoImovel,
    perguntasBase.valor,
    perguntasBase.urgencia,
  ];
}

export function descobrirProximaPergunta(contexto: LeadContext) {
  return (
    perguntasPorContexto(contexto).find(
      (pergunta) => !possuiInformacao(contexto, pergunta.campo),
    ) ?? null
  );
}
