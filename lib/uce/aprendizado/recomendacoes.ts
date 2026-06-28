import type {
  UCEAprendizadoMetricas,
  UCEAprendizadoRecomendacao,
  UCEPadraoDetectado,
} from "./types";

export function gerarRecomendacoesAprendizado(
  padroes: UCEPadraoDetectado[],
  metricas: UCEAprendizadoMetricas,
): UCEAprendizadoRecomendacao[] {
  const recomendacoes = new Map<string, UCEAprendizadoRecomendacao>();

  function add(recomendacao: UCEAprendizadoRecomendacao) {
    recomendacoes.set(recomendacao.id, recomendacao);
  }

  if (metricas.necessidadeHumano === "alto") {
    add({
      id: "encaminhar_para_especialista",
      titulo: "Encaminhar para especialista",
      descricao: "Acionar especialista humano para evitar perda de timing ou risco comercial.",
      prioridade: "alto",
    });
  }

  if (padroes.some((pattern) => pattern.id === "lead_sem_pressa_precisa_nutricao")) {
    add({
      id: "nutrir_lead",
      titulo: "Nutrir lead",
      descricao: "Manter follow-up consultivo com informacoes e oportunidades compativeis.",
      prioridade: "medio",
    });
    add({
      id: "criar_follow_up",
      titulo: "Criar follow-up",
      descricao: "Registrar proximo contato para manter relacionamento ativo.",
      prioridade: "medio",
    });
  }

  if (padroes.some((pattern) => pattern.id === "comprador_financiado_precisa_documentacao")) {
    add({
      id: "solicitar_documentacao",
      titulo: "Solicitar documentacao",
      descricao: "Orientar documentos iniciais e etapas de financiamento sem prometer aprovacao.",
      prioridade: "alto",
    });
  }

  if (padroes.some((pattern) => pattern.id === "urgencia_alta_exige_handoff_rapido")) {
    add({
      id: "sugerir_visita",
      titulo: "Sugerir visita",
      descricao: "Tentar converter rapidamente para visita ou atendimento humano.",
      prioridade: "alto",
    });
  }

  if (metricas.potencialRelacionamento !== "baixo") {
    add({
      id: "apresentar_opcoes_compativeis",
      titulo: "Apresentar opcoes compativeis",
      descricao: "Usar correspondencias de maior score para conduzir o atendimento.",
      prioridade: metricas.potencialRelacionamento,
    });
  }

  add({
    id: "registrar_memoria",
    titulo: "Registrar memoria",
    descricao: "Guardar sinais importantes para melhorar proximos atendimentos.",
    prioridade: "medio",
  });

  if (padroes.some((pattern) => pattern.id.includes("proprietario"))) {
    add({
      id: "avaliar_imovel",
      titulo: "Avaliar imovel",
      descricao: "Preparar avaliacao comercial ou patrimonial conforme objetivo do proprietario.",
      prioridade: "alto",
    });
  }

  return Array.from(recomendacoes.values());
}
