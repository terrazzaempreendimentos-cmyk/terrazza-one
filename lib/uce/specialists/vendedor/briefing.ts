import { buildSpecialistBriefing, type UCESpecialistBriefingInput } from "../common";

export function buildVendedorBriefing(input: UCESpecialistBriefingInput) {
  return buildSpecialistBriefing({
    ...input,
    specialistName: "Especialista Venda",
    fields: [
      "objetivo",
      "cidade",
      "bairro",
      "tipoImovel",
      "valorEsperado",
      "motivoVenda",
      "imovelFinanciado",
      "documentacao",
      "imovelOcupado",
      "urgencia",
      "jaAnunciou",
      "exclusividade",
    ],
  });
}
