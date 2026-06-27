import type { UCEContext, UCENextQuestion } from "../core/types";

const realEstateQuestions: UCENextQuestion[] = [
  {
    field: "objetivo",
    text: "Qual e seu principal objetivo agora: alugar, comprar, vender, administrar ou anunciar?",
    reason: "Objetivo define o fluxo comercial.",
  },
  { field: "cidade", text: "Em qual cidade?", reason: "Cidade orienta mercado e disponibilidade." },
  { field: "bairro", text: "Tem algum bairro ou regiao de preferencia?", reason: "Bairro qualifica aderencia." },
  { field: "tipoImovel", text: "Qual tipo de imovel faz mais sentido?", reason: "Tipo do imovel direciona busca." },
  { field: "valor", text: "Qual faixa de valor voce tem em mente?", reason: "Valor define viabilidade." },
  { field: "quartos", text: "Quantos quartos voce precisa?", reason: "Quartos indicam perfil de uso." },
  { field: "pet", text: "Voce possui pet?", reason: "Pet afeta aderencia do imovel." },
  { field: "urgencia", text: "Existe alguma urgencia ou prazo importante?", reason: "Prazo define prioridade." },
  { field: "documentacao", text: "Voce ja possui documentacao organizada?", reason: "Documentacao indica prontidao." },
];

function isFilled(value: unknown) {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.trim().length > 0;

  return true;
}

export function getNextSmartQuestion(context: UCEContext) {
  const questions = context.domain === "real_estate" ? realEstateQuestions : realEstateQuestions;

  return questions.find((question) => !isFilled(context.fields[question.field])) ?? null;
}
