function normalize(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function includesAny(value: string, terms: string[]) {
  return terms.some((term) => value.includes(normalize(term)));
}

function exactAny(value: string, terms: string[]) {
  return terms.some((term) => value.trim() === normalize(term));
}

export type TemporalInterpretation = {
  urgency: "alta" | "media" | "baixa" | "indefinida";
  deadlineText: string | null;
  confidence: number;
  reason: string;
  recognizedExpression: string | null;
  asksForSpecificDeadline: boolean;
};

export function interpretTemporalExpression(text: string): TemporalInterpretation {
  const value = normalize(text);

  const negative = [
    "nao",
    "nao tenho",
    "sem pressa",
    "nao tenho urgencia",
    "sem urgencia",
    "posso esperar",
    "sem prazo",
    "depois vejo",
    "qualquer dia",
    "sem data",
    "sem previsao",
    "calma",
    "nao e urgente",
    "urgencia baixa",
    "qualquer epoca",
    "quando aparecer",
    "quando surgir",
    "mais para frente",
    "ano que vem",
  ];
  const positiveWithoutDate = [
    "sim",
    "tenho",
    "tenho sim",
    "e urgente",
    "urgente",
    "preciso logo",
    "quanto antes",
    "o mais rapido possivel",
    "o quanto antes",
    "o mais breve possivel",
    "o mais cedo possivel",
    "preciso resolver",
    "preciso mudar logo",
  ];
  const high = [
    "hoje",
    "amanha",
    "esta semana",
    "esse mes",
    "este mes",
    "ate esse mes",
    "ate este mes",
    "ate junho",
    "antes de junho",
    "ate julho",
    "antes de julho",
    "ate agosto",
    "antes de agosto",
    "em julho",
    "em agosto",
    "30 dias",
    "15 dias",
    "20 dias",
    "10 dias",
    "7 dias",
    "uma semana",
    "duas semanas",
    "mes que vem",
    "proximo mes",
    "no inicio do mes",
    "no comeco do mes",
    "ate o final do mes",
    "fim do mes",
  ];
  const medium = [
    "45 dias",
    "60 dias",
    "2 meses",
    "dois meses",
    "ate setembro",
    "ate outubro",
    "esse semestre",
  ];

  const negativeExpression = negative.find((term) => value.includes(normalize(term)));
  if (negativeExpression) {
    return {
      urgency: "baixa",
      deadlineText: null,
      confidence: 98,
      reason: "Resposta indica ausencia de urgencia ou prazo flexivel.",
      recognizedExpression: negativeExpression,
      asksForSpecificDeadline: false,
    };
  }

  const highExpression = high.find((term) => value.includes(normalize(term)));
  if (highExpression) {
    return {
      urgency: "alta",
      deadlineText: text,
      confidence: 96,
      reason: "Expressao temporal com prazo curto reconhecida.",
      recognizedExpression: highExpression,
      asksForSpecificDeadline: false,
    };
  }

  const mediumExpression = medium.find((term) => value.includes(normalize(term)));
  if (mediumExpression) {
    return {
      urgency: "media",
      deadlineText: text,
      confidence: 95,
      reason: "Expressao temporal indica prazo intermediario.",
      recognizedExpression: mediumExpression,
      asksForSpecificDeadline: false,
    };
  }

  const positiveExpression = positiveWithoutDate.find((term) =>
    exactAny(value, [term]),
  );
  if (positiveExpression || includesAny(value, positiveWithoutDate.slice(3))) {
    return {
      urgency: "indefinida",
      deadlineText: null,
      confidence: 92,
      reason: "Usuario confirmou urgencia, mas ainda nao informou prazo especifico.",
      recognizedExpression: positiveExpression ?? "urgencia sem prazo",
      asksForSpecificDeadline: true,
    };
  }

  return {
    urgency: "indefinida",
    deadlineText: null,
    confidence: 20,
    reason: "Nenhuma temporalidade clara encontrada.",
    recognizedExpression: null,
    asksForSpecificDeadline: false,
  };
}
