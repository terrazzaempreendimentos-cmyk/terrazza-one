import { camposPendentes } from "./memoria";
import type { EstadoCognitivo, LeadContext } from "./tipos";

const camposEssenciais: Array<keyof LeadContext> = [
  "cidade",
  "bairro",
  "tipoImovel",
  "valor",
  "objetivo",
];

export function avaliarQualificacao(contexto: LeadContext, score: number) {
  const pendentes = camposPendentes(contexto, camposEssenciais);
  const camposEssenciaisPreenchidos = pendentes.length === 0;
  const qualificado = score >= 75 && camposEssenciaisPreenchidos;

  return {
    qualificado,
    podePassarCorretor: qualificado || (score >= 65 && pendentes.length <= 1),
    motivoQualificacao: qualificado
      ? "Score acima de 75 e campos essenciais preenchidos."
      : `Ainda faltam ${pendentes.length} campo(s) essencial(is): ${
          pendentes.length > 0 ? pendentes.join(", ") : "nenhum"
        }.`,
  };
}

export function definirEstadoCognitivo(
  contexto: LeadContext,
  score: number,
): EstadoCognitivo {
  const pendentes = camposPendentes(contexto, camposEssenciais);
  const preenchidos = camposEssenciais.length - pendentes.length;

  if (!contexto.objetivo) return "identificando_intencao";
  if (preenchidos <= 2) return "qualificando_perfil";
  if (pendentes.length > 1) return "coletando_detalhes";
  if (score >= 75 && pendentes.length === 0) return "pronto_para_corretor";

  return "preparando_briefing";
}

export function progressoEstado(estado: EstadoCognitivo) {
  const pesos: Record<EstadoCognitivo, number> = {
    identificando_intencao: 18,
    qualificando_perfil: 38,
    coletando_detalhes: 58,
    preparando_briefing: 78,
    pronto_para_corretor: 100,
  };

  return pesos[estado];
}
