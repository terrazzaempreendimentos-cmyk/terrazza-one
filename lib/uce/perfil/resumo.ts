import type { UCEPerfil } from "./types";

export function gerarResumoPerfil(perfil: Omit<UCEPerfil, "resumoPerfil">) {
  const sinais =
    perfil.sinaisDetectados.length > 0
      ? perfil.sinaisDetectados.map((sinal) => sinal.frase).join(", ")
      : "sem sinais textuais fortes";

  return [
    `Perfil principal: ${perfil.perfilPrincipal}.`,
    `Estilo de decisao: ${perfil.estiloDecisao}.`,
    `Urgencia: ${perfil.nivelUrgencia}.`,
    `Risco de perda: ${perfil.riscoPerda}.`,
    `Sinais: ${sinais}.`,
  ].join(" ");
}
