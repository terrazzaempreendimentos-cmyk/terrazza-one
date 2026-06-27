import { possuiInformacao } from "./memoria";
import type { LeadContext, NextQuestion } from "./tipos";

const ordemPerguntas: NextQuestion[] = [
  {
    campo: "cidade",
    texto: "Em qual cidade voce deseja atendimento?",
    motivo: "Cidade ainda nao preenchida.",
  },
  {
    campo: "bairro",
    texto: "Tem algum bairro ou regiao de preferencia?",
    motivo: "Bairro ainda nao preenchido.",
  },
  {
    campo: "tipoImovel",
    texto: "Qual tipo de imovel faz mais sentido para voce?",
    motivo: "Tipo do imovel ainda nao preenchido.",
  },
  {
    campo: "valor",
    texto: "Qual faixa de valor voce tem em mente?",
    motivo: "Faixa de valor ainda nao preenchida.",
  },
  {
    campo: "objetivo",
    texto: "Qual e seu principal objetivo neste atendimento?",
    motivo: "Objetivo comercial ainda nao preenchido.",
  },
  {
    campo: "urgencia",
    texto: "Existe alguma urgencia ou prazo importante?",
    motivo: "Urgencia ainda nao preenchida.",
  },
  {
    campo: "pet",
    texto: "Voce possui pet?",
    motivo: "Informacao sobre pet ainda nao preenchida.",
  },
  {
    campo: "financiamento",
    texto: "Voce pretende usar financiamento?",
    motivo: "Financiamento ainda nao informado.",
  },
  {
    campo: "fgts",
    texto: "Voce pretende usar FGTS?",
    motivo: "FGTS ainda nao informado.",
  },
  {
    campo: "documentacao",
    texto: "Voce ja possui documentacao ou credito organizado?",
    motivo: "Documentacao ainda nao informada.",
  },
];

export function descobrirProximaPergunta(contexto: LeadContext) {
  return (
    ordemPerguntas.find((pergunta) => !possuiInformacao(contexto, pergunta.campo)) ??
    null
  );
}
