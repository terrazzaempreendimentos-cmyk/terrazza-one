import type { TipoLeadSimulador } from "../fluxos";
import { obterScriptQualificacao } from "../scriptsQualificacao";
import { gerarBriefing } from "./briefing";
import { extrairInformacoes } from "./extracao";
import { atualizarContexto, camposPendentes } from "./memoria";
import { descobrirProximaPergunta } from "./perguntas";
import { calcularScore } from "./score";
import type { LeadContext, MotorTurnResult } from "./tipos";

function respostaNatural({
  proximaPergunta,
  podePassar,
  script,
}: {
  proximaPergunta: ReturnType<typeof descobrirProximaPergunta>;
  podePassar: boolean;
  script: ReturnType<typeof obterScriptQualificacao>;
}) {
  if (podePassar) {
    return `Perfeito. Ja tenho as informacoes principais para preparar seu atendimento com um especialista da Terrazza. Vou organizar o briefing e indicar o proximo passo: ${script.proximaAcaoSugerida}`;
  }

  if (proximaPergunta) {
    return `Otimo, entendi. Para te orientar melhor, ${proximaPergunta.texto.toLowerCase()}`;
  }

  return "Perfeito. Vou consolidar essas informacoes e preparar o melhor encaminhamento comercial.";
}

export function processarTurno({
  mensagemUsuario,
  contextoAtual,
  tipoLead,
  origem,
  canal,
}: {
  mensagemUsuario: string;
  contextoAtual: LeadContext;
  tipoLead: TipoLeadSimulador;
  origem: string;
  canal: string;
}): MotorTurnResult {
  const contextoBase = atualizarContexto(contextoAtual, {
    tipoLead,
    origem,
    canal,
  });
  const informacoesExtraidas = extrairInformacoes(mensagemUsuario, contextoBase);
  const contexto = atualizarContexto(contextoBase, informacoesExtraidas);
  const pendentes = camposPendentes(contexto, [
    "tipoLead",
    "cidade",
    "bairro",
    "tipoImovel",
    "valor",
    "objetivo",
  ]);
  const proximaPergunta = descobrirProximaPergunta(contexto);
  const { score, temperatura } = calcularScore(contexto);
  const script = obterScriptQualificacao(tipoLead);
  const podePassar = pendentes.length <= 1;
  const briefing = gerarBriefing({
    contexto,
    score,
    temperatura,
    sugestao: script.proximaAcaoSugerida,
  });

  return {
    contexto,
    informacoesExtraidas,
    camposPendentes: pendentes,
    proximaPergunta,
    score,
    temperatura,
    briefing,
    respostaIa: respostaNatural({
      proximaPergunta,
      podePassar,
      script,
    }),
  };
}
