import type { LeadContext, NextQuestion } from "./tipos";
import { possuiInformacao } from "./memoria";

const ordemPerguntas: NextQuestion[] = [
  {
    campo: "cidade",
    texto: "Em qual cidade você deseja atendimento?",
    motivo: "Cidade ainda não preenchida.",
  },
  {
    campo: "bairro",
    texto: "Tem algum bairro ou região de preferência?",
    motivo: "Bairro ainda não preenchido.",
  },
  {
    campo: "tipoImovel",
    texto: "Qual tipo de imóvel faz mais sentido para você?",
    motivo: "Tipo do imóvel ainda não preenchido.",
  },
  {
    campo: "valor",
    texto: "Qual faixa de valor você tem em mente?",
    motivo: "Faixa de valor ainda não preenchida.",
  },
  {
    campo: "objetivo",
    texto: "Qual é seu principal objetivo neste atendimento?",
    motivo: "Objetivo comercial ainda não preenchido.",
  },
  {
    campo: "urgencia",
    texto: "Existe alguma urgência ou prazo importante?",
    motivo: "Urgência ainda não preenchida.",
  },
  {
    campo: "pet",
    texto: "Você possui pet?",
    motivo: "Informação sobre pet ainda não preenchida.",
  },
  {
    campo: "financiamento",
    texto: "Você pretende usar financiamento?",
    motivo: "Financiamento ainda não informado.",
  },
  {
    campo: "fgts",
    texto: "Você pretende usar FGTS?",
    motivo: "FGTS ainda não informado.",
  },
  {
    campo: "documentacao",
    texto: "Você já possui documentação ou crédito organizado?",
    motivo: "Documentação ainda não informada.",
  },
];

export function descobrirProximaPergunta(contexto: LeadContext) {
  return (
    ordemPerguntas.find((pergunta) => !possuiInformacao(contexto, pergunta.campo)) ??
    null
  );
}
