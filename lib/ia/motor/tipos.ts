import type { ScriptQualificacao } from "../scriptsQualificacao";
import type { TipoLeadSimulador } from "../fluxos";

export type LeadTemperature = "frio" | "morno" | "quente";

export type LeadContext = {
  tipoLead: TipoLeadSimulador | null;
  cidade: string | null;
  bairro: string | null;
  tipoImovel: string | null;
  quartos: number | null;
  banheiros: number | null;
  valor: number | null;
  pet: boolean | null;
  financiamento: boolean | null;
  fgts: boolean | null;
  urgencia: string | null;
  objetivo: string | null;
  origem: string | null;
  canal: string | null;
  prazoMudanca: string | null;
  documentacao: string | null;
};

export type ConversationMemory = {
  contexto: LeadContext;
  historico: string[];
};

export type ConversationState = {
  contexto: LeadContext;
  memoria: ConversationMemory;
};

export type NextQuestion = {
  campo: keyof LeadContext;
  texto: string;
  motivo: string;
};

export type DecisionStep = {
  pergunta: NextQuestion | null;
  objetivoAtual: string;
  proximoPasso: string;
  podePassarParaCorretor: boolean;
  informacoesFaltantes: Array<keyof LeadContext>;
};

export type MotorResponse = {
  decisao: DecisionStep;
  score: number;
  temperatura: LeadTemperature;
  briefing: string;
};

export type MotorScript = ScriptQualificacao;

export type ChatMessage = {
  id: string;
  autor: "ia" | "usuario";
  texto: string;
};

export type ConversationTurn = {
  mensagemUsuario: string;
  contextoAntes: LeadContext;
  contextoDepois: LeadContext;
  respostaIa: string;
};

export type ExtractedInfo = Partial<LeadContext>;

export type MotorTurnResult = {
  contexto: LeadContext;
  informacoesExtraidas: ExtractedInfo;
  camposPendentes: Array<keyof LeadContext>;
  proximaPergunta: NextQuestion | null;
  score: number;
  temperatura: LeadTemperature;
  briefing: string;
  respostaIa: string;
};
