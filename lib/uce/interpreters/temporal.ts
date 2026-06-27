function normalize(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function interpretTemporalExpression(text: string) {
  const value = normalize(text);

  const high = [
    "hoje",
    "amanha",
    "esta semana",
    "esse mes",
    "este mes",
    "antes de julho",
    "ate julho",
    "em julho",
    "30 dias",
    "urgente",
    "quanto antes",
  ];
  const medium = ["semana que vem", "mes que vem", "60 dias", "dois meses"];
  const low = ["sem pressa", "depois das ferias"];

  if (high.some((term) => value.includes(term))) {
    return {
      urgency: "alta" as const,
      deadlineText: text,
      confidence: 90,
      reason: "Expressao temporal indica necessidade rapida.",
    };
  }

  if (medium.some((term) => value.includes(term))) {
    return {
      urgency: "media" as const,
      deadlineText: text,
      confidence: 80,
      reason: "Expressao temporal indica prazo intermediario.",
    };
  }

  if (low.some((term) => value.includes(term))) {
    return {
      urgency: "baixa" as const,
      deadlineText: text,
      confidence: 85,
      reason: "Expressao temporal indica baixa pressa.",
    };
  }

  return {
    urgency: "indefinida" as const,
    deadlineText: null,
    confidence: 20,
    reason: "Nenhuma temporalidade clara encontrada.",
  };
}
