import type { UCEMatch } from "../correspondencias/types";
import type { UCEContext, UCEHypothesis } from "../core/types";
import type { UCEKnowledgeResult } from "../knowledge/types";
import type { UCEPerfil } from "../perfil/types";

export type UCEAprendizadoNivel = "baixo" | "medio" | "alto";

export type UCEAprendizadoRecomendacaoTipo =
  | "encaminhar_para_especialista"
  | "nutrir_lead"
  | "solicitar_documentacao"
  | "sugerir_visita"
  | "apresentar_opcoes_compativeis"
  | "registrar_memoria"
  | "criar_follow_up"
  | "avaliar_imovel";

export type UCEPadraoDetectado = {
  id: string;
  titulo: string;
  descricao: string;
  categoria: string;
  condicoes: string[];
  confianca: number;
  recomendacao: string;
};

export type UCEInsight = {
  id: string;
  titulo: string;
  descricao: string;
  prioridade: UCEAprendizadoNivel;
};

export type UCEAprendizadoMetricas = {
  nivelConfianca: UCEAprendizadoNivel;
  complexidadeAtendimento: UCEAprendizadoNivel;
  prioridadeOperacional: UCEAprendizadoNivel;
  necessidadeHumano: UCEAprendizadoNivel;
  potencialRelacionamento: UCEAprendizadoNivel;
};

export type UCEAprendizadoRecomendacao = {
  id: UCEAprendizadoRecomendacaoTipo;
  titulo: string;
  descricao: string;
  prioridade: UCEAprendizadoNivel;
};

export type UCEAprendizadoInput = {
  context: UCEContext;
  perfilComportamental?: UCEPerfil | null;
  hypotheses?: UCEHypothesis[];
  knowledgeResults?: UCEKnowledgeResult[];
  correspondencias?: UCEMatch[];
  memorias?: unknown[];
};

export type UCEAprendizado = {
  padroesDetectados: UCEPadraoDetectado[];
  insights: UCEInsight[];
  recomendacoes: UCEAprendizadoRecomendacao[];
  metricas: UCEAprendizadoMetricas;
  resumoAprendizado: string;
};

export type UCEAprendizadoResult = UCEAprendizado;
