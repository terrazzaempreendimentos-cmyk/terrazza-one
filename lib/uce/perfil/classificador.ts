import type { UCEContext, UCEHypothesis, UCEMessage } from "../core/types";
import { detectarSinaisComportamentais } from "./sinais";
import type {
  UCEEstiloDecisao,
  UCEPerfilComportamental,
  UCEPerfilRisco,
  UCESinalComportamental,
} from "./types";

function addScore<T extends string>(scores: Map<T, number>, key: T | undefined, value: number) {
  if (!key) return;

  scores.set(key, (scores.get(key) ?? 0) + value);
}

function topEntries<T extends string>(scores: Map<T, number>) {
  return Array.from(scores.entries()).sort((a, b) => b[1] - a[1]);
}

function inferContextSignals(context: UCEContext): UCESinalComportamental[] {
  const signals: UCESinalComportamental[] = [];
  const objective = String(context.fields.objetivo ?? "");
  const leadType = context.leadType;

  if (leadType === "comprador" && context.fields.financiamento === true) {
    signals.push({
      id: "contexto-comprador-financiado",
      frase: "financiamento",
      descricao: "Comprador sinaliza compra com financiamento.",
      peso: 7,
      perfil: "comprador_primeiro_imovel",
      estiloDecisao: "consultivo",
    });
  }

  if (leadType === "proprietario" || objective === "administracao") {
    signals.push({
      id: "contexto-proprietario-administracao",
      frase: "administracao",
      descricao: "Proprietario considera administracao patrimonial.",
      peso: 8,
      perfil: "proprietario_rentista",
      estiloDecisao: "analitico",
    });
  }

  if (leadType === "inquilino" && context.fields.urgencia === "alta") {
    signals.push({
      id: "contexto-inquilino-urgente",
      frase: "urgencia alta",
      descricao: "Inquilino com urgencia alta.",
      peso: 9,
      perfil: "inquilino_urgente",
      estiloDecisao: "urgente",
      riscoPerda: "alto",
      urgencia: "alta",
    });
  }

  if (context.fields.pet === true || context.fields.moradores || context.fields.quartos) {
    signals.push({
      id: "contexto-familia",
      frase: "perfil familiar",
      descricao: "Dados sugerem decisao com foco familiar.",
      peso: 6,
      perfil: "familia",
      estiloDecisao: "consultivo",
    });
  }

  return signals;
}

function inferHypothesisSignals(hypotheses: UCEHypothesis[]) {
  return hypotheses.flatMap<UCESinalComportamental>((hypothesis) => {
    const text = `${hypothesis.key} ${hypothesis.title} ${hypothesis.category}`.toLowerCase();

    if (text.includes("investidor")) {
      return [{
        id: `hipotese-${hypothesis.key}-investidor`,
        frase: hypothesis.title,
        descricao: "Hipotese aponta interesse de investimento.",
        peso: 8,
        perfil: "investidor",
        estiloDecisao: "investidor",
      }];
    }

    if (text.includes("administracao")) {
      return [{
        id: `hipotese-${hypothesis.key}-administracao`,
        frase: hypothesis.title,
        descricao: "Hipotese aponta potencial de administracao.",
        peso: 7,
        perfil: "proprietario_rentista",
        estiloDecisao: "analitico",
      }];
    }

    return [];
  });
}

function defaultProfile(context: UCEContext): UCEPerfilComportamental {
  if (context.leadType === "comprador") return "comprador_primeiro_imovel";
  if (context.leadType === "inquilino") return "inquilino_consultivo";
  if (context.leadType === "vendedor") return "vendedor_motivado";
  if (context.leadType === "proprietario") return "proprietario_rentista";

  return "familia";
}

function maxRisk(signals: UCESinalComportamental[]): UCEPerfilRisco {
  if (signals.some((signal) => signal.riscoPerda === "alto")) return "alto";
  if (signals.some((signal) => signal.riscoPerda === "medio")) return "medio";

  return "baixo";
}

export function classificarPerfilComportamental(
  context: UCEContext,
  messages: UCEMessage[],
  hypotheses: UCEHypothesis[],
) {
  const text = messages.map((message) => message.content).join(" ");
  const signals = [
    ...detectarSinaisComportamentais(text),
    ...inferContextSignals(context),
    ...inferHypothesisSignals(hypotheses),
  ];
  const profileScores = new Map<UCEPerfilComportamental, number>();
  const styleScores = new Map<UCEEstiloDecisao, number>();

  for (const signal of signals) {
    addScore(profileScores, signal.perfil, signal.peso);
    addScore(styleScores, signal.estiloDecisao, signal.peso);
  }

  const profiles = topEntries(profileScores);
  const styles = topEntries(styleScores);
  const perfilPrincipal = profiles[0]?.[0] ?? defaultProfile(context);
  const perfisSecundarios = profiles
    .slice(1, 4)
    .map(([profile]) => profile)
    .filter((profile) => profile !== perfilPrincipal);
  const estiloDecisao = styles[0]?.[0] ?? "consultivo";
  const nivelUrgencia = signals.some((signal) => signal.urgencia === "alta")
    ? "alta"
    : context.fields.urgencia === "baixa"
      ? "baixa"
      : "media";

  return {
    perfilPrincipal,
    perfisSecundarios,
    estiloDecisao,
    nivelUrgencia,
    riscoPerda: maxRisk(signals),
    sinaisDetectados: signals,
  };
}
