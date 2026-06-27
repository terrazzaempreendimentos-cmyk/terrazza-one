import { buildSpecialistHandoff, hasValue } from "../common";
import type { UCEContext } from "../../core/types";

export function buildCaptacaoHandoff({
  context,
  score,
}: {
  context: UCEContext;
  missingFields: string[];
  score: number;
}) {
  return buildSpecialistHandoff({
    missingFields: !hasValue(context.fields.destinoCaptacao)
      ? ["destinoCaptacao"]
      : [],
    minimumScore: 0,
    handoffType: "atendimento_humano",
    readyReason: "Destino da captacao identificado para redirecionamento.",
    notReadyReason: "Ainda falta definir se o anuncio e para venda ou locacao",
    score,
  });
}
