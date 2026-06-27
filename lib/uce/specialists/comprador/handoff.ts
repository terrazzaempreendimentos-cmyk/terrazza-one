import { buildSpecialistHandoff, hasValue } from "../common";
import type { UCEContext } from "../../core/types";

function missingCompradorFields(context: UCEContext) {
  return [
    !hasValue(context.fields.cidade) ? "cidade" : null,
    !hasValue(context.fields.bairro) ? "bairro" : null,
    !hasValue(context.fields.tipoImovel) ? "tipoImovel" : null,
    !hasValue(context.fields.valor) ? "valor" : null,
    !hasValue(context.fields.financiamento) ? "financiamento" : null,
    !hasValue(context.fields.fgts) ? "fgts" : null,
    !hasValue(context.fields.entradaDisponivel) ? "entradaDisponivel" : null,
    !hasValue(context.fields.quartos) ? "quartos" : null,
    !hasValue(context.fields.garagem) ? "garagem" : null,
    !hasValue(context.fields.condominioAceita) ? "condominioAceita" : null,
    !hasValue(context.fields.prazoCompra) ? "prazoCompra" : null,
  ].filter(Boolean) as string[];
}

export function buildCompradorHandoff({
  context,
  score,
}: {
  context: UCEContext;
  missingFields: string[];
  score: number;
}) {
  return buildSpecialistHandoff({
    missingFields: missingCompradorFields(context),
    minimumScore: 70,
    handoffType: "especialista_venda",
    readyReason: "Briefing de compra completo para especialista em vendas.",
    notReadyReason: "Ainda faltam dados criticos do comprador",
    score,
  });
}
