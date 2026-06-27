import { buildSpecialistBriefing, type UCESpecialistBriefingInput } from "../common";

export function buildCaptacaoBriefing(input: UCESpecialistBriefingInput) {
  return buildSpecialistBriefing({
    ...input,
    specialistName: "Especialista Captacao",
    fields: ["objetivo", "destinoCaptacao"],
  });
}
