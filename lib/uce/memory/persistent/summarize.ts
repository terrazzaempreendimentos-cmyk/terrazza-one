import type { UCEInteraction, UCEMemory, UCEMemorySummary } from "./types";

function byRecentDate<T extends { created_at: string | null }>(items: T[]) {
  return [...items].sort(
    (a, b) =>
      new Date(b.created_at ?? 0).getTime() -
      new Date(a.created_at ?? 0).getTime(),
  );
}

function byImportance(memories: UCEMemory[]) {
  return [...memories].sort((a, b) => {
    if (a.importance !== b.importance) return b.importance - a.importance;

    return (
      new Date(b.created_at ?? 0).getTime() -
      new Date(a.created_at ?? 0).getTime()
    );
  });
}

function uniqueNonEmpty(items: Array<string | null | undefined>, limit = 5) {
  return Array.from(
    new Set(items.map((item) => item?.trim()).filter(Boolean) as string[]),
  ).slice(0, limit);
}

export function summarizeEntityMemory(
  memories: UCEMemory[],
  interactions: UCEInteraction[],
): UCEMemorySummary {
  const relevantMemories = byImportance(memories);
  const recentInteractions = byRecentDate(interactions);
  const lastInteraction = recentInteractions[0] ?? null;

  const pontosImportantes = uniqueNonEmpty(
    relevantMemories
      .filter((memory) => memory.importance >= 3)
      .map((memory) => `${memory.title}: ${memory.content}`),
  );

  const riscos = uniqueNonEmpty(
    relevantMemories
      .filter(
        (memory) =>
          memory.memory_type === "conflito" ||
          memory.memory_type === "juridico" ||
          memory.sentiment === "negativo",
      )
      .map((memory) => `${memory.title}: ${memory.content}`),
  );

  const pendencias = uniqueNonEmpty([
    ...relevantMemories
      .filter((memory) => memory.memory_type === "follow_up")
      .map((memory) => `${memory.title}: ${memory.content}`),
    ...recentInteractions
      .filter((interaction) => interaction.status !== "resolvido")
      .map((interaction) => interaction.summary ?? interaction.message),
  ]);

  const resumoBase = relevantMemories
    .slice(0, 3)
    .map((memory) => memory.title)
    .join("; ");

  const resumo =
    resumoBase ||
    (lastInteraction?.summary ?? lastInteraction?.message) ||
    "Nenhuma memoria persistente relevante registrada ainda.";

  const recomendacao =
    riscos.length > 0
      ? "Revisar riscos antes de prosseguir e envolver especialista humano quando necessario."
      : pendencias.length > 0
        ? "Priorizar pendencias e confirmar proximos passos com a pessoa atendida."
        : "Usar o historico como contexto inicial e seguir com atendimento padrao.";

  return {
    resumo,
    pontosImportantes,
    riscos,
    pendencias,
    ultimaInteracao: lastInteraction?.summary ?? lastInteraction?.message ?? null,
    recomendacao,
  };
}
