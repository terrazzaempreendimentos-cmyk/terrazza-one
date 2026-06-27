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
    !hasValue(context.fields.garagem) ? "garagem" : null,
    !hasValue(context.fields.condominioAceita) ? "condominioAceita" : null,
    !hasValue(context.fields.prazoMudanca) ? "prazoMudanca" : null,
  ].filter(Boolean) as string[];
}

export function buildLocacaoHandoff({
  context,
  score,
}: {
  context: UCEContext;
  missingFields: string[];
  score: number;
}) {
  return buildSpecialistHandoff({
    missingFields: missingLocacaoFields(context),
    minimumScore: 70,
    handoffType: "especialista_locacao",
    readyReason: "Perfil de locacao completo para especialista continuar.",
    notReadyReason: "Ainda faltam dados criticos da locacao",
    score,
  });
}
