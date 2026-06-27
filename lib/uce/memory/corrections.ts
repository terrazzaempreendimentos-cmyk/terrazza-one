function normalize(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function detectCorrection(text: string) {
  const normalized = normalize(text);
  const isCorrection = [
    "na verdade",
    "corrigindo",
    "melhor dizendo",
    "nao e",
    "quis dizer",
    "trocar para",
    "prefiro",
  ].some((term) => normalized.includes(term));

  if (!isCorrection) {
    return {
      isCorrection: false,
      targetField: null,
      newValue: null,
      confidence: 0,
      reason: "Nenhum sinal de correcao encontrado.",
    };
  }

  if (normalized.includes("casa")) {
    return {
      isCorrection,
      targetField: "tipoImovel",
      newValue: "casa",
      confidence: 85,
      reason: "Correcao indica preferencia por casa.",
    };
  }

  if (normalized.includes("apartamento")) {
    return {
      isCorrection,
      targetField: "tipoImovel",
      newValue: "apartamento",
      confidence: 85,
      reason: "Correcao indica preferencia por apartamento.",
    };
  }

  if (normalized.includes("aracaju")) {
    return {
      isCorrection,
      targetField: "cidade",
      newValue: "Aracaju",
      confidence: 90,
      reason: "Correcao indica cidade Aracaju.",
    };
  }

  if (normalized.includes("maceio")) {
    return {
      isCorrection,
      targetField: "cidade",
      newValue: "Maceio",
      confidence: 90,
      reason: "Correcao indica cidade Maceio.",
    };
  }

  return {
    isCorrection,
    targetField: null,
    newValue: null,
    confidence: 45,
    reason: "Ha sinal de correcao, mas sem campo claro.",
  };
}
