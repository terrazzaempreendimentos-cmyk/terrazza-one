export const HUMANIZER_FORBIDDEN_REPETITION = [
  "Perfeito",
  "Excelente",
  "Entendi",
  "Ótimo",
];

export const HUMANIZER_TRANSITIONS = [
  "Agora quero entender um pouco melhor...",
  "Só mais uma informação importante...",
  "Isso ajuda bastante.",
  "Estamos quase finalizando.",
  "Com essas informações consigo refinar bastante a busca.",
  "Vou apenas confirmar mais um detalhe.",
  "Para deixar seu atendimento mais preciso...",
  "Considerando o que você já informou...",
];

export function buildTransitionGuidelines() {
  return [
    "Varie naturalmente as aberturas. Não comece todas as respostas com a mesma palavra.",
    `Evite repetir em sequência: ${HUMANIZER_FORBIDDEN_REPETITION.join(", ")}.`,
    "Use transições curtas e consultivas quando fizer sentido.",
    "Exemplos de transição permitidos:",
    ...HUMANIZER_TRANSITIONS.map((transition) => `- ${transition}`),
  ].join("\n");
}
