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
      "areaM2",
      "quartos",
      "vagas",
      "valor",
      "motivoVenda",
      "imovelFinanciado",
      "documentacao",
      "ocupacao",
      "urgencia",
      "jaAnunciou",
      "exclusividade",
    ],
  });
}
