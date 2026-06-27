import { camposPendentes } from "./memoria";
import { descobrirProximaPergunta } from "./perguntas";
import type { ConversationMemory, LeadContext, MotorScript } from "./tipos";

const camposEssenciais: Array<keyof LeadContext> = [
  "tipoLead",
  "cidade",
  "bairro",
  "tipoImovel",
  "valor",
  "objetivo",
];

export function decidir(
  contexto: LeadContext,
  memoria: ConversationMemory,
  script: MotorScript,
) {
  const pergunta = descobrirProximaPergunta(contexto);
  const informacoesFaltantes = camposPendentes(contexto, camposEssenciais);
  const camposEssenciaisPreenchidos = informacoesFaltantes.length === 0;
  const podePassarParaCorretor =
    camposEssenciaisPreenchidos || informacoesFaltantes.length <= 1;

  return {
    pergunta,
    objetivoAtual: camposEssenciaisPreenchidos
      ? "Preparar briefing e passagem de bastao para corretor."
      : pergunta
        ? `Coletar informacao sobre ${pergunta.campo}.`
        : "Preparar passagem de bastao para corretor.",
    proximoPasso: podePassarParaCorretor
      ? script.proximaAcaoSugerida
      : pergunta?.texto ?? "Consolidar informacoes do lead.",
    podePassarParaCorretor,
    informacoesFaltantes,
    memoria,
  };
}
