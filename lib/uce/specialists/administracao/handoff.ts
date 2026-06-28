import { buildSpecialistHandoff, hasValue } from "../common";
import type { UCEContext } from "../../core/types";

function missingAdministracaoFields(context: UCEContext) {
  return [
    !hasValue(context.fields.cidade) && !hasValue(context.fields.bairro)
      ? "cidade_ou_bairro"
      : null,
    !hasValue(context.fields.tipoImovel) ? "tipoImovel" : null,
    !hasValue(context.fields.areaM2) ? "areaM2" : null,
    !hasValue(context.fields.quartos) ? "quartos" : null,
    !hasValue(context.fields.vagas) ? "vagas" : null,
    !hasValue(context.fields.ocupacao) ? "ocupacao" : null,
    !hasValue(context.fields.valorAluguelAtual) ? "valorAluguelAtual" : null,
    !hasValue(context.fields.condominioValor) ? "condominioValor" : null,
    !hasValue(context.fields.iptu) ? "iptu" : null,
    !hasValue(context.fields.documentacao) ? "documentacao" : null,
    !hasValue(context.fields.urgencia) ? "urgencia" : null,
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
    notReadyReason: "Ainda faltam dados críticos da administração",
    score,
    optionalMissingFields: missingFields.filter(
      (field) => !criticalMissing.includes(field),
    ),
  });
}
