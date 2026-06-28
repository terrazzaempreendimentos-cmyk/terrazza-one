import type { UCEMatch } from "./types";

export function rankMatches(matches: UCEMatch[]) {
  return [...matches].sort((a, b) => {
    if (a.compatibility.score !== b.compatibility.score) {
      return b.compatibility.score - a.compatibility.score;
    }

    return b.compatibility.reasons.length - a.compatibility.reasons.length;
  });
}
