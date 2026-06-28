import type { UCEContext, UCENextQuestion } from "../core/types";
import { getNextSpecialistQuestion } from "../specialists";

const realEstateQuestions: UCENextQuestion[] = [
  {
    field: "objetivo",
    text: "Qual é seu principal objetivo agora: alugar, comprar, vender, administrar ou anunciar?",
    reason: "Objetivo define o fluxo comercial.",
  },
  { field: "cidade", text: "Em qual cidade?", reason: "Cidade orienta mercado e disponibilidade." },
  { field: "bairro", text: "Tem algum bairro ou região de preferência?", reason: "Bairro qualifica aderência." },
  { field: "tipoImovel", text: "Qual tipo de imóvel faz mais sentido?", reason: "Tipo do imóvel direciona busca." },
  { field: "valor", text: "Qual faixa de valor você tem em mente?", reason: "Valor define viabilidade." },
  { field: "quartos", text: "Quantos quartos você precisa?", reason: "Quartos indicam perfil de uso." },
  { field: "pet", text: "Você possui pet?", reason: "Pet afeta aderência do imóvel." },
  { field: "urgencia", text: "Existe alguma urgência ou prazo importante?", reason: "Prazo define prioridade." },
  { field: "documentacao", text: "Você já possui documentação organizada?", reason: "Documentação indica prontidão." },
];

function isFilled(value: unknown) {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.trim().length > 0;

  return true;
}

export function getNextSmartQuestion(context: UCEContext) {
  if (context.metadata.handoffReady === true) {
    return null;
  }

  if (context.domain === "real_estate") {
    return getNextSpecialistQuestion(context);
  }

  const questions = realEstateQuestions;

  if (
    context.fields.urgencia === "indefinida" &&
    !isFilled(context.fields.prazoMudanca)
  ) {
    return {
      field: "urgencia",
      text: "Perfeito. Qual seria o prazo ideal? Pode ser uma data, um mês ou uma quantidade de dias.",
      reason: "Usuário confirmou urgência, mas ainda falta prazo específico.",
    };
  }

  return questions.find((question) => !isFilled(context.fields[question.field])) ?? null;
}
