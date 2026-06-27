import type { ScriptQualificacao } from "../scriptsQualificacao";
import type { TipoLeadSimulador } from "../fluxos";
import type { PersonaComercial } from "../personas/Base";
import type { HipoteseIA } from "./inferencia";

export type LeadTemperature = "frio" | "morno" | "quente";

export type EstadoCognitivo =
  | "identificando_intencao"
  | "qualificando_perfil"
  | "coletando_detalhes"
  | "preparando_briefing"
  | "pronto_para_corretor";

export type CampoPergunta =
  | "cidade"
  | "bairro"
  | "tipoImovel"
  | "valor"
  | "pet"
  | "urgencia"
  | "objetivo"
  | "quartos"
  | "financiamento"
  | "fgts"
  | "documentacao";

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
  ultimaPerguntaCampo: CampoPergunta | null;
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
  campo: CampoPergunta;
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

export type CampoConfianca = {
  campo: keyof LeadContext;
  label: string;
  valor: string;
  confianca: number;
  origem: "informado" | "inferido" | "vazio";
};

export type HipoteseComercial = {
  chave: string;
  titulo: string;
  descricao: string;
  confianca: number;
};

export type MotorTurnResult = {
  contexto: LeadContext;
  informacoesExtraidas: ExtractedInfo;
  camposPendentes: Array<keyof LeadContext>;
  proximaPergunta: NextQuestion | null;
  score: number;
  temperatura: LeadTemperature;
  briefing: string;
  respostaIa: string;
  estadoCognitivo: EstadoCognitivo;
  confiancaCampos: CampoConfianca[];
  hipoteses: HipoteseComercial[];
  inferenciasComerciais: HipoteseIA[];
  personaAtiva: PersonaComercial;
  qualificado: boolean;
  motivoQualificacao: string;
  podePassarCorretor: boolean;
};
