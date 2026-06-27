import { buildSpecialistBriefing, type UCESpecialistBriefingInput } from "../common";

export function buildCompradorBriefing(input: UCESpecialistBriefingInput) {
  return buildSpecialistBriefing({
    ...input,
    specialistName: "Especialista Comprador",
    fields: [
      "objetivo",
      "cidade",
      "bairro",
      "tipoImovel",
      "valor",
      "financiamento",
      "fgts",
      "entradaDisponivel",
      "quartos",
      "garagem",
      "condominioAceita",
      "prazoCompra",
    ],
  });
}
