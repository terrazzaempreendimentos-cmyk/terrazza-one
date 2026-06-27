import type { UCESpecialistRoute } from "../common";

export const administracaoRoteiro: UCESpecialistRoute = {
  objective: "Administrar imovel",
  flow: [
    "identificar imovel",
    "entender ocupacao e aluguel atual",
    "mapear custos",
    "entender administracao atual",
    "preparar handoff patrimonial",
  ],
  neverAsk: ["fgts", "financiamento"],
  inferenceFocus: ["troca de administradora", "captacao", "gestao completa"],
};
