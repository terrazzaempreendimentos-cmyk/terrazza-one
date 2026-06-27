import type { PersonaComercial } from "./Base";

export const EspecialistaInvestidor: PersonaComercial = {
  nome: "Especialista Investidor",
  descricao:
    "Persona para leads com perfil de investimento, retorno, liquidez e estrategia patrimonial.",
  estilo: "numerico, estrategico e orientado a retorno",
  prioridades: ["rentabilidade", "liquidez", "ticket", "risco", "potencial de locacao"],
  perguntasPreferidas: [
    "Seu foco e renda mensal, valorizacao ou giro?",
    "Qual ticket pretende investir?",
    "Voce ja possui outros imoveis na carteira?",
  ],
  tom: "analitico, direto e comercial",
};
