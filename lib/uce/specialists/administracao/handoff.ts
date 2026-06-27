import { buildSpecialistHandoff, hasValue } from "../common";
import type { UCEContext } from "../../core/types";

function missingAdministracaoFields(context: UCEContext) {
  return [
    !hasValue(context.fields.cidade) ? "cidade" : null,
    !hasValue(context.fields.bairro) ? "bairro" : null,
    !hasValue(context.fields.tipoImovel) ? "tipoImovel" : null,
    !hasValue(context.fields.imovelOcupado) ? "imovelOcupado" : null,
    !hasValue(context.fields.alugado) ? "alugado" : null,
    !hasValue(context.fields.valorAluguelAtual) ? "valorAluguelAtual" : null,
    !hasValue(context.fields.condominioValor) ? "condominioValor" : null,
    !hasValue(context.fields.iptu) ? "iptu" : null,
    !hasValue(context.fields.administracaoAtual) ? "administracaoAtual" : null,
    !hasValue(context.fields.motivoTroca) ? "motivoTroca" : null,
    !hasValue(context.fields.administracaoCompleta) ? "administracaoCompleta" : null,
    !hasValue(context.fields.chavesDisponiveis) ? "chavesDisponiveis" : null,
  ].filter(Boolean) as string[];
}

export function buildAdministracaoHandoff({
  context,
  score,
}: {
  context: UCEContext;
  missingFields: string[];
  score: number;
}) {
  return buildSpecialistHandoff({
    missingFields: missingAdministracaoFields(context),
    minimumScore: 65,
    handoffType: "especialista_administracao",
    readyReason: "Briefing patrimonial completo para especialista continuar.",
    notReadyReason: "Ainda faltam dados criticos da administracao",
    score,
  });
}
