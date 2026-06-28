import { buildSpecialistHandoff, hasValue } from "../common";
import type { UCEContext } from "../../core/types";

function missingCompradorFields(context: UCEContext) {
  return [
    !hasValue(context.fields.cidade) && !hasValue(context.fields.bairro)
      ? "cidade_ou_bairro"
      : null,
    !hasValue(context.fields.tipoImovel) ? "tipoImovel" : null,
    !hasValue(context.fields.valor) ? "valor" : null,
    !hasValue(context.fields.entradaDisponivel) ? "entradaDisponivel" : null,
    !hasValue(context.fields.financiamento) ? "financiamento" : null,
    !hasValue(context.fields.fgts) ? "fgts" : null,
    !hasValue(context.fields.quartos) ? "quartos" : null,
    !hasValue(context.fields.vagas) ? "vagas" : null,
    !hasValue(context.fields.urgencia) && !hasValue(context.fields.prazoCompra)
      ? "urgencia_ou_prazo"
      : null,
  ].filter(Boolean) as string[];
}

export function buildCompradorHandoff({
  context,
  missingFields,
  score,
}: {
  context: UCEContext;
  missingFields: string[];
  score: number;
}) {
  const criticalMissing = missingCompradorFields(context);

  return buildSpecialistHandoff({
    missingFields: criticalMissing,
    minimumScore: 70,
    handoffType: "especialista_venda",
    readyReason: "Briefing de compra completo para especialista em vendas.",
    notReadyReason: "Ainda faltam dados criticos do comprador",
    score,
    optionalMissingFields: missingFields.filter(
      (field) => !criticalMissing.includes(field),
    ),
  });
}
