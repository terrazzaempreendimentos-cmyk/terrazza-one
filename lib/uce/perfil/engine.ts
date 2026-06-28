import type { UCEContext, UCEHypothesis, UCEMessage } from "../core/types";
import { classificarPerfilComportamental } from "./classificador";
import { obterRecomendacoesPerfil } from "./recomendacoes";
import { gerarResumoPerfil } from "./resumo";
import type { UCEPerfil } from "./types";

export function analisarPerfilComportamental(
  context: UCEContext,
  messages: UCEMessage[],
  hypotheses: UCEHypothesis[],
): UCEPerfil {
  const classification = classificarPerfilComportamental(
    context,
    messages,
    hypotheses,
  );
  const recomendacoes = obterRecomendacoesPerfil({
    perfilPrincipal: classification.perfilPrincipal,
    perfisSecundarios: classification.perfisSecundarios,
    estiloDecisao: classification.estiloDecisao,
  });
  const baseProfile = {
    ...classification,
    recomendacoes,
  };

  return {
    ...baseProfile,
    resumoPerfil: gerarResumoPerfil(baseProfile),
  };
}
