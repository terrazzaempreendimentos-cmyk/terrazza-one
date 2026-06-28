import { demoMatchEntities } from "./engine";
import { rankMatches } from "./ranking";
import { calculateCompatibility } from "./score";
import type { UCEMatch, UCEMatchEntity, UCEMatchInput } from "./types";

function isCompatiblePair(source: UCEMatchEntity, target: UCEMatchEntity) {
  if (source.id === target.id) return false;

  const sourceWantsProperty = ["lead", "comprador", "inquilino"].includes(source.type);
  const targetIsPropertyOwner = ["imovel", "proprietario"].includes(target.type);
  const sourceIsPropertyOwner = ["imovel", "proprietario"].includes(source.type);
  const targetWantsProperty = ["lead", "comprador", "inquilino"].includes(target.type);

  return (sourceWantsProperty && targetIsPropertyOwner) || (sourceIsPropertyOwner && targetWantsProperty);
}

export function findMatches(input: UCEMatchInput): UCEMatch[] {
  const candidates = input.candidates ?? demoMatchEntities;
  const source: UCEMatchEntity = {
    ...input,
    label: input.label || "Entrada UCE",
  };

  const matches = candidates
    .filter((candidate) => isCompatiblePair(source, candidate))
    .map<UCEMatch>((candidate) => ({
      id: `${source.id}-${candidate.id}`,
      source,
      target: candidate,
      compatibility: calculateCompatibility(source, candidate),
    }))
    .filter((match) => match.compatibility.score > 0);

  return rankMatches(matches).slice(0, input.limit ?? 5);
}
