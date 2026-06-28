import { buildSpecialistHandoff, hasValue } from "../common";
import type { UCEContext } from "../../core/types";

function missingAdministracaoFields(context: UCEContext) {
  return [
    !hasValue(context.fields.cidade) ? "cidade" : null,
    !hasValue(context.fields.bairro) ? "bairro" : null,
    !hasValue(context.fields.tipoImovel) ? "tipoImovel" : null,
    !hasValue(context.fields.imovelOcupado) ? "imovelOcupado" : null,
    !hasValue(context.fields.alugado) ? "alugado" : null,
  ].filter(Boolean) as string[];
}

export function buildAdministracaoHandoff({
  context,
  missingFields,
  score,
}: {
  context: UCEContext;
  missingFields: string[];
  score: number;
}) {
  const criticalMissing = missingAdministracaoFields(context);

  return buildSpecialistHandoff({
    missingFields: criticalMissing,
    minimumScore: 65,
    handoffType: "especialista_administracao",
    readyReason: "Briefing patrimonial completo para especialista continuar.",
    notReadyReason: "Ainda faltam dados criticos da administracao",
    score,
    optionalMissingFields: missingFields.filter(
      (field) => !criticalMissing.includes(field),
    ),
  });
}
