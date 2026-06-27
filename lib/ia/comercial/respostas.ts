import type { HipoteseIA } from "../motor/inferencia";
import type { LeadContext } from "../motor/tipos";
import { detectarObjecaoComercial, type RiscoComercial } from "./objecoes";

export type RespostaComercial = {
  objecaoDetectada: string | null;
  respostaComercialSugerida: string | null;
  proximaPerguntaSugerida: string | null;
  riscoComercial: RiscoComercial | null;
  precisaCorretorHumano: boolean;
  leituraComercial: string | null;
};

export function sugerirRespostaComercial(
  mensagemUsuario: string,
  contexto: LeadContext,
  hipoteses: HipoteseIA[],
): RespostaComercial {
  const objecao = detectarObjecaoComercial(mensagemUsuario);

  if (!objecao) {
    return {
      objecaoDetectada: null,
      respostaComercialSugerida: null,
      proximaPerguntaSugerida: null,
      riscoComercial: null,
      precisaCorretorHumano: false,
      leituraComercial: null,
    };
  }

  const hipoteseAlta = hipoteses.some((hipotese) => hipotese.confianca >= 85);
  const precisaCorretorHumano =
    objecao.risco === "alto" ||
    objecao.categoria === "financiamento" ||
    objecao.categoria === "fiador" ||
    (contexto.urgencia === "alta" && hipoteseAlta);

  return {
    objecaoDetectada: objecao.categoria,
    respostaComercialSugerida: objecao.respostaSugerida,
    proximaPerguntaSugerida: objecao.proximaPergunta,
    riscoComercial: objecao.risco,
    precisaCorretorHumano,
    leituraComercial: objecao.leituraComercial,
  };
}
