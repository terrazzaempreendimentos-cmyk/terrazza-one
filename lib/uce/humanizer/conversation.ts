import type { UCEProcessResult } from "../core";
import { buildClosingGuidelines } from "./closing";
import { buildConfirmationGuidelines } from "./confirmations";
import { buildToneGuidelines } from "./tone";
import { buildTransitionGuidelines } from "./transitions";

const MEMORY_FIELDS = [
  "objetivo",
  "cidade",
  "bairro",
  "tipoImovel",
  "valor",
  "quartos",
  "vagas",
  "garagem",
  "pet",
  "moradores",
  "urgencia",
  "ocupacao",
  "documentacao",
];

function hasValue(value: unknown) {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.trim().length > 0;

  return true;
}

function formatMemoryAnchors(uceResult: UCEProcessResult) {
  const anchors = MEMORY_FIELDS
    .map((field) => [field, uceResult.context.fields[field]] as const)
    .filter(([, value]) => hasValue(value))
    .map(([field, value]) => `- ${field}: ${String(value)}`);

  if (anchors.length === 0) {
    return "Ainda não há informações anteriores suficientes para mencionar.";
  }

  return anchors.join("\n");
}

function buildQuestionRewriteGuidelines() {
  return [
    "Reescreva a pergunta decidida pelo UCE sem mudar o campo solicitado.",
    "Evite pergunta seca de formulário.",
    "Exemplos:",
    '- Troque "Você possui pet?" por "Existe algum pet que também fará parte da mudança?"',
    '- Troque "Quantas pessoas vão morar?" por "Quantas pessoas irão morar no imóvel?"',
    '- Troque "Qual o número de quartos?" por "Quantos quartos você considera ideais?"',
    "Se a pergunta do UCE for sobre garagem e o cliente já citou garagem, trate como requisito essencial.",
  ].join("\n");
}

export function buildHumanizerPromptSection(uceResult: UCEProcessResult) {
  return [
    "# Humanização cognitiva",
    "O UCE decide o que perguntar. A OpenAI humaniza como perguntar.",
    "",
    "## Estilo",
    buildToneGuidelines(),
    "",
    "## Transições",
    buildTransitionGuidelines(),
    "",
    "## Confirmação inteligente",
    buildConfirmationGuidelines(),
    "",
    "## Memória conversacional",
    "Nunca esqueça informações anteriores. Sempre que natural, demonstre memória.",
    "Âncoras de memória disponíveis:",
    formatMemoryAnchors(uceResult),
    "",
    "Exemplos de memória:",
    "- Considerando o bairro e o orçamento que você informou...",
    "- Como serão cinco moradores...",
    "- Levando em conta que você deseja garagem...",
    "",
    "## Evitar formulário",
    buildQuestionRewriteGuidelines(),
    "",
    "## Encerramento",
    buildClosingGuidelines(),
  ].join("\n");
}
