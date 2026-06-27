import { buildSpecialistBriefing, type UCESpecialistBriefingInput } from "../common";

export function buildAdministracaoBriefing(input: UCESpecialistBriefingInput) {
  return buildSpecialistBriefing({
    ...input,
    specialistName: "Especialista Administracao",
    fields: [
      "objetivo",
      "cidade",
      "bairro",
      "tipoImovel",
      "imovelOcupado",
      "alugado",
      "valorAluguelAtual",
      "condominioValor",
      "iptu",
      "administracaoAtual",
      "motivoTroca",
      "administracaoCompleta",
      "chavesDisponiveis",
    ],
  });
}
