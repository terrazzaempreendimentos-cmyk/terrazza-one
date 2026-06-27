import type { UCESpecialistRoute } from "../common";

export const captacaoRoteiro: UCESpecialistRoute = {
  objective: "Anunciar imovel",
  flow: [
    "identificar se o anuncio e para venda ou locacao",
    "redirecionar para vendedor ou administracao",
  ],
  neverAsk: ["pet", "aceita pet", "fgts", "financiamento"],
  inferenceFocus: ["venda", "locacao", "captacao"],
};
