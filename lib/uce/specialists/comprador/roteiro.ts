import type { UCESpecialistRoute } from "../common";

export const compradorRoteiro: UCESpecialistRoute = {
  objective: "Comprar imovel",
  flow: [
    "identificar localizacao",
    "entender perfil do imovel",
    "qualificar capacidade financeira",
    "entender prazo",
    "preparar briefing de vendas",
  ],
  neverAsk: ["pet", "aceita pet", "administracao", "aluguel atual"],
  inferenceFocus: ["primeiro imovel", "investidor", "familia", "alto padrao"],
};
