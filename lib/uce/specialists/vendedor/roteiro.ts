import type { UCESpecialistRoute } from "../common";

export const vendedorRoteiro: UCESpecialistRoute = {
  objective: "Vender imovel",
  flow: [
    "localizar imovel",
    "entender produto e valor esperado",
    "avaliar contexto juridico e ocupacao",
    "entender urgencia e historico de anuncio",
    "preparar avaliacao comercial",
  ],
  neverAsk: ["pet", "aceita pet"],
  inferenceFocus: ["urgencia de venda", "posicionamento de preco", "exclusividade"],
};
