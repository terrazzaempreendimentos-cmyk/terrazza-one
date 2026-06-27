import type { TipoLeadSimulador } from "../fluxos";
import { obterScriptQualificacao } from "../scriptsQualificacao";
import { gerarBriefing } from "./briefing";
import { calcularConfiancaCampos } from "./confianca";
import { avaliarQualificacao, definirEstadoCognitivo } from "./estado";
import { extrairInformacoes } from "./extracao";
import { gerarHipoteses } from "./hipoteses";
import { gerarInferenciasComerciais } from "./inferencia";
import { atualizarContexto, camposPendentes } from "./memoria";
import { descobrirProximaPergunta } from "./perguntas";
import { calcularScore } from "./score";
import { selecionarPersona } from "../personas";
import { sugerirRespostaComercial } from "../comercial";
import type { ExtractedInfo, LeadContext, MotorTurnResult } from "./tipos";

function resumoDoQueEntendeu(informacoes: ExtractedInfo) {
  const partes = [
    informacoes.cidade ? `cidade ${informacoes.cidade}` : null,
    informacoes.bairro ? `bairro ${informacoes.bairro}` : null,
    informacoes.tipoImovel ? `imovel do tipo ${informacoes.tipoImovel}` : null,
    informacoes.quartos ? `${informacoes.quartos} quarto(s)` : null,
    informacoes.valor ? `faixa de valor ${informacoes.valor}` : null,
    Object.prototype.hasOwnProperty.call(informacoes, "pet")
      ? informacoes.pet
        ? "pet registrado"
        : "sem pet registrado"
      : null,
    informacoes.objetivo ? `objetivo de ${informacoes.objetivo}` : null,
    informacoes.urgencia ? `prazo ${informacoes.urgencia}` : null,
  ].filter(Boolean);

  if (partes.length === 0) {
    return "Entendi. Vou organizar isso com cuidado para nao perder o contexto.";
  }

  return `Perfeito, entendi ${partes.join(", ")}.`;
}

function respostaNatural({
  proximaPergunta,
  podePassar,
  script,
  informacoesExtraidas,
  contexto,
}: {
  proximaPergunta: ReturnType<typeof descobrirProximaPergunta>;
  podePassar: boolean;
  script: ReturnType<typeof obterScriptQualificacao>;
  informacoesExtraidas: ExtractedInfo;
  contexto: LeadContext;
}) {
  const confirmacao = resumoDoQueEntendeu(informacoesExtraidas);
  const aberturas = [
    "Perfeito, entendi.",
    "Otimo, isso ja ajuda bastante.",
    "Excelente, com essas informacoes ja consigo avancar.",
    "Agora so preciso confirmar mais um ponto.",
  ];
  const indice =
    (contexto.cidade ? 1 : 0) +
    (contexto.bairro ? 1 : 0) +
    (contexto.tipoImovel ? 1 : 0) +
    (contexto.valor ? 1 : 0) +
    (contexto.objetivo ? 1 : 0);
  const abertura = aberturas[indice % aberturas.length];

  if (podePassar) {
    return `${confirmacao} ${abertura} Ja tenho as informacoes principais para preparar seu atendimento com um especialista da Terrazza. Vou organizar o briefing e indicar o proximo passo: ${script.proximaAcaoSugerida}`;
  }

  if (proximaPergunta) {
    return `${confirmacao} ${abertura} ${proximaPergunta.texto}`;
  }

  return `${confirmacao} Vou consolidar essas informacoes e preparar o melhor encaminhamento comercial.`;
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
  const contextoComPergunta = atualizarContexto(contexto, {
    ultimaPerguntaCampo: proximaPergunta?.campo ?? null,
  });
  const inferenciasComerciais = gerarInferenciasComerciais(contextoComPergunta);
  const leituraComercial = sugerirRespostaComercial(
    mensagemUsuario,
    contextoComPergunta,
    inferenciasComerciais,
  );
  const personaAtiva = selecionarPersona(contextoComPergunta);
  const { score, temperatura } = calcularScore(
    contextoComPergunta,
    inferenciasComerciais,
  );
  const script = obterScriptQualificacao(tipoLead);
  const { qualificado, podePassarCorretor, motivoQualificacao } =
    avaliarQualificacao(contexto, score);
  const estadoCognitivo = definirEstadoCognitivo(contextoComPergunta, score);
  const confiancaCampos = calcularConfiancaCampos(
    contextoComPergunta,
    informacoesExtraidas,
  );
  const hipoteses = gerarHipoteses(contextoComPergunta);
  const briefing = gerarBriefing({
    contexto: contextoComPergunta,
    score,
    temperatura,
    sugestao: script.proximaAcaoSugerida,
    hipotesesComerciais: inferenciasComerciais,
    alertasComerciais: leituraComercial,
  });

  return {
    contexto: contextoComPergunta,
    informacoesExtraidas,
    camposPendentes: pendentes,
    proximaPergunta,
    score,
    temperatura,
    briefing,
    estadoCognitivo,
    confiancaCampos,
    hipoteses,
    inferenciasComerciais,
    personaAtiva,
    objecaoDetectada: leituraComercial.objecaoDetectada,
    respostaComercialSugerida: leituraComercial.respostaComercialSugerida,
    proximaPerguntaComercial: leituraComercial.proximaPerguntaSugerida,
    riscoComercial: leituraComercial.riscoComercial,
    precisaCorretorHumano: leituraComercial.precisaCorretorHumano,
    leituraComercial: leituraComercial.leituraComercial,
    qualificado,
    motivoQualificacao,
    podePassarCorretor,
    respostaIa: respostaNatural({
      proximaPergunta,
      podePassar: podePassarCorretor,
      script,
      informacoesExtraidas,
      contexto: contextoComPergunta,
    }),
  };
}
