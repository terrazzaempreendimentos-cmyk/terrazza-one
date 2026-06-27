import type { UCEContext, UCEMemorySnapshot, UCEMessage } from "../core/types";

function valueText(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "boolean") return value ? "sim" : "nao";

  return String(value);
}

export function summarizeMemory(snapshot: UCEMemorySnapshot) {
  const parts = [
    snapshot.fields.objetivo ? `objetivo ${snapshot.fields.objetivo}` : null,
    snapshot.fields.cidade ? `em ${snapshot.fields.cidade}` : null,
    snapshot.fields.bairro ? `bairro ${snapshot.fields.bairro}` : null,
    snapshot.fields.valor ? `ate R$ ${snapshot.fields.valor}` : null,
    snapshot.fields.tipoImovel ? `tipo ${snapshot.fields.tipoImovel}` : null,
  ].filter(Boolean);

  return parts.length > 0
    ? `Na ultima conversa voce indicou ${parts.join(", ")}.`
    : "Temos um historico anterior, mas ainda com poucas informacoes qualificadas.";
}

export function createMemorySnapshot(
  context: UCEContext,
  messages: UCEMessage[],
): UCEMemorySnapshot {
  const snapshot = {
    leadType: context.leadType,
    fields: { ...context.fields },
    messages,
    summary: "",
    createdAt: new Date().toISOString(),
  };

  return {
    ...snapshot,
    summary: summarizeMemory(snapshot),
  };
}

export function mergeMemory(
  oldMemory: UCEMemorySnapshot | null,
  newMemory: UCEMemorySnapshot,
): UCEMemorySnapshot {
  if (!oldMemory) return newMemory;

  return {
    ...newMemory,
    fields: {
      ...oldMemory.fields,
      ...newMemory.fields,
    },
    messages: [...oldMemory.messages, ...newMemory.messages],
    summary: summarizeMemory({
      ...newMemory,
      fields: {
        ...oldMemory.fields,
        ...newMemory.fields,
      },
    }),
  };
}

export function generateReturnGreeting(memory: UCEMemorySnapshot) {
  const bairro = valueText(memory.fields.bairro);
  const valor = valueText(memory.fields.valor);
  const tipo = valueText(memory.fields.tipoImovel);
  const local = bairro ? ` na ${bairro}` : "";
  const faixa = valor ? ` ate R$ ${valor}` : "";
  const tipoTexto = tipo ? ` ${tipo}` : "";

  return `Na ultima conversa voce procurava${tipoTexto}${local}${faixa}. Isso continua igual?`;
}
