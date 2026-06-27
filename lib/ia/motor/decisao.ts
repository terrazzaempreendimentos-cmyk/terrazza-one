import { camposPendentes } from "./memoria";
import { descobrirProximaPergunta } from "./perguntas";
import type { ConversationMemory, LeadContext, MotorScript } from "./tipos";

const camposEssenciaisBase: Array<keyof LeadContext> = [
  "tipoLead",
  "cidade",
  "bairro",
  "tipoImovel",
  "valor",
  "objetivo",
];

function camposEssenciaisPorContexto(contexto: LeadContext) {
  if (contexto.tipoLead === "inquilino" || contexto.objetivo === "locacao") {
    return [...camposEssenciaisBase, "pet" as keyof LeadContext];
  }

  return camposEssenciaisBase;
}

export function decidir(
  contexto: LeadContext,
  memoria: ConversationMemory,
  script: MotorScript,
) {
  const pergunta = descobrirProximaPergunta(contexto);
  const informacoesFaltantes = camposPendentes(
    contexto,
    camposEssenciaisPorContexto(contexto),
  );
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
