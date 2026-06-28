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
      "areaM2",
      "quartos",
      "vagas",
      "ocupacao",
      "alugado",
      "valor",
      "valorAluguelAtual",
      "condominioValor",
      "iptu",
      "documentacao",
      "urgencia",
      "administracaoAtual",
      "motivoTroca",
      "administracaoCompleta",
      "chavesDisponiveis",
    ],
  });
}
