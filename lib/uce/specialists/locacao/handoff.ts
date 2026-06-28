import { buildSpecialistHandoff, hasValue } from "../common";
import type { UCEContext } from "../../core/types";

function missingLocacaoFields(context: UCEContext) {
  return [
    !hasValue(context.fields.cidade) ? "cidade" : null,
    !hasValue(context.fields.bairro) ? "bairro" : null,
    !hasValue(context.fields.tipoImovel) ? "tipoImovel" : null,
    !hasValue(context.fields.valor) ? "valor" : null,
    !hasValue(context.fields.quartos) ? "quartos" : null,
    !hasValue(context.fields.pet) ? "pet" : null,
    !hasValue(context.fields.moradores) ? "moradores" : null,
    !hasValue(context.fields.prazoMudanca) ? "prazoMudanca" : null,
  ].filter(Boolean) as string[];
}

export function buildLocacaoHandoff({
  context,
  missingFields,
  score,
}: {
  context: UCEContext;
  missingFields: string[];
  score: number;
}) {
  const criticalMissing = missingLocacaoFields(context);

  return buildSpecialistHandoff({
    missingFields: criticalMissing,
    minimumScore: 70,
    handoffType: "especialista_locacao",
    readyReason: "Perfil de locacao completo para especialista continuar.",
    notReadyReason: "Ainda faltam dados criticos da locacao",
    score,
    optionalMissingFields: missingFields.filter(
      (field) => !criticalMissing.includes(field),
    ),
  });
}
