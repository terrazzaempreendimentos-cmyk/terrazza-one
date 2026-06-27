import type { ConversationMemory, LeadContext, MotorScript } from "./tipos";
import { camposPendentes } from "./memoria";
import { descobrirProximaPergunta } from "./perguntas";

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
  const podePassarParaCorretor = informacoesFaltantes.length <= 1;

  return {
    pergunta,
    objetivoAtual: pergunta
      ? `Coletar informação sobre ${pergunta.campo}.`
      : "Preparar passagem de bastão para corretor.",
    proximoPasso: podePassarParaCorretor
      ? script.proximaAcaoSugerida
      : pergunta?.texto ?? "Consolidar informações do lead.",
    podePassarParaCorretor,
    informacoesFaltantes,
    memoria,
  };
}
