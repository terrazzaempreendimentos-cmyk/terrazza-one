import type {
  UCEBriefing,
  UCECommercialAwareness,
  UCEContext,
  UCEHandoffDecision,
  UCEHandoffType,
  UCEHypothesis,
} from "../core/types";
import { selectUCESpecialist, type UCESpecialistConfig } from "../specialists";

function hasValue(value: unknown) {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.trim().length > 0;

  return true;
}

function text(value: unknown) {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function isResidential(context: UCEContext) {
  const propertyType = text(context.fields.tipoImovel);

  return (
    propertyType.includes("apartamento") ||
    propertyType.includes("casa") ||
    context.leadType === "inquilino" ||
    context.leadType === "comprador"
  );
}

function petApplies(context: UCEContext) {
  const objective = text(context.fields.objetivo);

  return context.leadType === "inquilino" || objective.includes("locacao");
}

function isOwnerOrAdministration(context: UCEContext) {
  const objective = text(context.fields.objetivo);

  return context.leadType === "proprietario" || objective.includes("administracao");
}

function ownerHasValue(context: UCEContext) {
  return hasValue(context.fields.valor) || hasValue(context.fields.valorPretendido);
}

function ownerMissingCriticalFields(context: UCEContext) {
  return [
    !hasValue(context.fields.objetivo) ? "objetivo" : null,
    !hasValue(context.fields.cidade) && !hasValue(context.fields.bairro)
      ? "cidade_ou_bairro"
      : null,
    !hasValue(context.fields.tipoImovel) ? "tipoImovel" : null,
    !ownerHasValue(context) ? "valor_ou_valorPretendido" : null,
    Object.prototype.hasOwnProperty.call(context.fields, "ocupacao") &&
    !hasValue(context.fields.ocupacao)
      ? "ocupacao"
      : null,
    Object.prototype.hasOwnProperty.call(context.fields, "estadoImovel") &&
    !hasValue(context.fields.estadoImovel)
      ? "estadoImovel"
      : null,
  ].filter(Boolean) as string[];
}

function tenantMissingCriticalFields(context: UCEContext) {
  return [
    !hasValue(context.fields.objetivo) ? "objetivo" : null,
    !hasValue(context.fields.cidade) && !hasValue(context.fields.bairro)
      ? "cidade_ou_bairro"
      : null,
    !hasValue(context.fields.tipoImovel) ? "tipoImovel" : null,
    !hasValue(context.fields.valor) ? "valor" : null,
    isResidential(context) && !hasValue(context.fields.quartos) ? "quartos" : null,
    petApplies(context) && !hasValue(context.fields.pet) ? "pet" : null,
    !hasValue(context.fields.urgencia) && !hasValue(context.fields.prazoMudanca)
      ? "urgencia_ou_prazo"
      : null,
  ].filter(Boolean) as string[];
}

function handoffType(context: UCEContext): UCEHandoffType {
  const objective = text(context.fields.objetivo);

  if (context.leadType === "proprietario" || objective.includes("administracao")) {
    return "especialista_administracao";
  }

  if (objective.includes("locacao") || context.leadType === "inquilino") {
    return "especialista_locacao";
  }

  if (
    objective.includes("venda") ||
    objective.includes("compra") ||
    context.leadType === "comprador" ||
    context.leadType === "vendedor"
  ) {
    return "especialista_venda";
  }

  return "corretor";
}

export function shouldHandoff(
  context: UCEContext,
  score: number,
  missingFields: string[],
  hypotheses: UCEHypothesis[],
): UCEHandoffDecision {
  void hypotheses;

  if (context.domain === "real_estate") {
    return selectUCESpecialist(context).buildHandoff({
      context,
      missingFields,
      score,
    });
  }

  const missingCriticalFields = isOwnerOrAdministration(context)
    ? ownerMissingCriticalFields(context)
    : tenantMissingCriticalFields(context);
  const optionalMissingFields = missingFields.filter(
    (field) => !missingCriticalFields.includes(field),
  );
  const minimumScore = isOwnerOrAdministration(context) ? 65 : 70;
  const canHandoff = missingCriticalFields.length === 0 && score >= minimumScore;

  return {
    canHandoff,
    reason: canHandoff
      ? "Campos essenciais coletados e score minimo atingido para passagem humana."
      : `Ainda faltam campos criticos ou score suficiente: ${
          missingCriticalFields.length > 0
            ? missingCriticalFields.join(", ")
            : `score abaixo de ${minimumScore}`
        }.`,
    handoffType: canHandoff ? handoffType(context) : "atendimento_humano",
    missingCriticalFields,
    optionalMissingFields,
  };
}

export function isQualifiedForHandoff(
  context: UCEContext,
  score: number,
  tipoLead?: string | null,
) {
  const contextWithType = {
    ...context,
    leadType: tipoLead ?? context.leadType,
  };

  if (contextWithType.domain === "real_estate") {
    return selectUCESpecialist(contextWithType).buildHandoff({
      context: contextWithType,
      missingFields: [],
      score,
    }).canHandoff;
  }
  const missingCriticalFields = isOwnerOrAdministration(contextWithType)
    ? ownerMissingCriticalFields(contextWithType)
    : tenantMissingCriticalFields(contextWithType);
  const minimumScore = isOwnerOrAdministration(contextWithType) ? 65 : 70;

  return missingCriticalFields.length === 0 && score >= minimumScore;
}

export function generatePostHandoffResponse(
  context: UCEContext,
  specialist: UCESpecialistConfig,
  message = "",
) {
  void context;
  void specialist;

  const normalizedMessage = text(message);
  const followUpIntents = ["ok", "sim", "agendar", "quero", "pode seguir"];

  if (followUpIntents.some((intent) => normalizedMessage.includes(intent))) {
    return "Combinado. O próximo passo é o especialista confirmar disponibilidade e continuar o atendimento.";
  }

  return "Perfeito. Esse atendimento já está qualificado e pronto para ser encaminhado ao especialista da Terrazza.";
}

export function generateDeterministicFinalMessage(
  context: UCEContext,
  tipoLead?: string | null,
  objetivo?: string | null,
) {
  if (context.domain === "real_estate") {
    return selectUCESpecialist(context).closingMessage;
  }

  const leadType = text(tipoLead ?? context.leadType);
  const objective = text(objetivo ?? context.fields.objetivo);

  if (leadType === "inquilino" || objective.includes("locacao")) {
    return "Perfeito. Ja tenho as principais informacoes do seu perfil: regiao desejada, tipo de imovel, quartos, faixa de valor, pet e prazo. Vou organizar seu atendimento e encaminhar para um especialista em locacao da Terrazza verificar opcoes compativeis e combinar os proximos passos.";
  }

  if (leadType === "proprietario" || objective.includes("administracao")) {
    return "Excelente. Ja tenho uma boa base para iniciar a avaliacao do seu imovel. Vou encaminhar para um especialista da Terrazza confirmar os dados, entender o estado do imovel e orientar a melhor estrategia de locacao e administracao.";
  }

  if (leadType === "comprador" || objective.includes("compra")) {
    return "Perfeito. Ja tenho uma boa visao do seu perfil de compra. Vou organizar essas informacoes para que um especialista avalie opcoes compativeis e oriente os proximos passos com seguranca.";
  }

  return generateClosingMessage(context, {
    summary: "",
    fields: {},
    hypotheses: [],
    pendingFields: [],
  }, {
    conversionChance: 0,
    financialPotential: "medio",
    leadEffort: "medio",
    urgencyLevel: "",
    commercialRisk: "baixo",
    shouldEscalateToHuman: false,
    reason: "",
  });
}

export function generateClosingMessage(
  context: UCEContext,
  _briefing: UCEBriefing,
  awareness: UCECommercialAwareness,
) {
  const objective = text(context.fields.objetivo);
  const leadType = text(context.leadType);

  if (leadType === "inquilino" || objective.includes("locacao")) {
    return "Perfeito, ja tenho as principais informacoes para seu atendimento: localizacao, tipo de imovel, faixa de valor, quartos, pet e prazo. Vou encaminhar seu perfil para um especialista da Terrazza, que podera verificar opcoes compativeis e combinar os proximos passos.";
  }

  if (leadType === "proprietario" || objective.includes("administracao")) {
    return "Excelente, ja tenho uma boa base para iniciar a avaliacao do seu imovel. O proximo passo e um especialista da Terrazza confirmar os dados, entender o estado do imovel e orientar a melhor estrategia de locacao e administracao.";
  }

  if (leadType === "comprador" || objective.includes("compra")) {
    return "Perfeito, ja tenho uma boa visao do seu perfil de compra. Vou organizar essas informacoes para que um especialista possa avaliar opcoes compativeis e orientar os proximos passos com seguranca.";
  }

  if (leadType === "vendedor" || objective.includes("venda")) {
    return "Excelente, ja tenho as informacoes iniciais para direcionar sua intencao de venda. O proximo passo e um especialista avaliar o imovel, o posicionamento de preco e a melhor estrategia comercial.";
  }

  if (awareness.shouldEscalateToHuman) {
    return "Perfeito, ja reuni informacoes importantes e vou encaminhar para um atendimento humano da Terrazza para seguir com seguranca.";
  }

  return "Perfeito, ja tenho informacoes suficientes para preparar seu atendimento e encaminhar para a equipe da Terrazza.";
}
