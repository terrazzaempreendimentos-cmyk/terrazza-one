import { buildSpecialistHandoff, hasValue } from "../common";
import type { UCEContext } from "../../core/types";

function missingVendedorFields(context: UCEContext) {
  return [
    !hasValue(context.fields.cidade) ? "cidade" : null,
    !hasValue(context.fields.bairro) ? "bairro" : null,
    !hasValue(context.fields.tipoImovel) ? "tipoImovel" : null,
    !hasValue(context.fields.valorEsperado) ? "valorEsperado" : null,
    !hasValue(context.fields.motivoVenda) ? "motivoVenda" : null,
    !hasValue(context.fields.imovelFinanciado) ? "imovelFinanciado" : null,
    !hasValue(context.fields.documentacao) ? "documentacao" : null,
    !hasValue(context.fields.imovelOcupado) ? "imovelOcupado" : null,
    !hasValue(context.fields.urgencia) ? "urgencia" : null,
    !hasValue(context.fields.jaAnunciou) ? "jaAnunciou" : null,
    !hasValue(context.fields.exclusividade) ? "exclusividade" : null,
  ].filter(Boolean) as string[];
}

export function buildVendedorHandoff({
  context,
  score,
}: {
  context: UCEContext;
  missingFields: string[];
  score: number;
}) {
  return buildSpecialistHandoff({
    missingFields: missingVendedorFields(context),
    minimumScore: 65,
    handoffType: "especialista_venda",
    readyReason: "Briefing de venda completo para avaliacao comercial.",
    notReadyReason: "Ainda faltam dados criticos da venda",
    score,
  });
}
