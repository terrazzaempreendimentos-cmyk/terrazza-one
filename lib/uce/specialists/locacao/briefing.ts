import { buildSpecialistBriefing, type UCESpecialistBriefingInput } from "../common";

export function buildLocacaoBriefing(input: UCESpecialistBriefingInput) {
  return buildSpecialistBriefing({
    ...input,
    specialistName: "Especialista Locacao",
    fields: [
      "objetivo",
      "cidade",
      "bairro",
      "tipoImovel",
      "valor",
      "quartos",
      "pet",
      "moradores",
      "garagem",
      "condominioAceita",
      "prazoMudanca",
    ],
  });
}
