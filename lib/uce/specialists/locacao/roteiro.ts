import type { UCESpecialistRoute } from "../common";

export const locacaoRoteiro: UCESpecialistRoute = {
  objective: "Alugar imovel como inquilino",
  flow: [
    "localizar busca",
    "entender tipo e valor",
    "mapear moradores e pet",
    "confirmar requisitos",
    "preparar atendimento de locacao",
  ],
  neverAsk: ["fgts", "financiamento"],
  inferenceFocus: ["familia", "urgencia", "aderencia a condominio"],
};
