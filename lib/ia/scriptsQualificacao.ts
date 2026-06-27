import type { TipoLeadSimulador } from "./fluxos";

export type ScriptQualificacao = {
  objetivo: string;
  perguntasObrigatorias: string[];
  perguntasOpcionais: string[];
  criteriosScore: string[];
  condicaoPassagemCorretor: string;
  proximaAcaoSugerida: string;
};

export const scriptsQualificacao: Record<TipoLeadSimulador, ScriptQualificacao> = {
  proprietario: {
    objetivo:
      "Identificar potencial de captacao para locacao e administracao, entender o imovel, urgencia, documentacao e abertura do proprietario para avaliacao comercial.",
    perguntasObrigatorias: [
      "Qual e a cidade e o bairro do imovel?",
      "O imovel esta vazio, ocupado ou em preparacao?",
      "Voce deseja apenas locar ou tambem contratar administracao completa?",
      "Qual valor de aluguel voce imagina?",
      "O imovel possui condominio, IPTU ou taxa relevante?",
      "A documentacao e as chaves estao disponiveis?",
    ],
    perguntasOpcionais: [
      "O imovel ja foi anunciado antes?",
      "Existe alguma restricao para perfil de inquilino?",
      "Voce possui fotos atualizadas?",
      "Existe mobilia ou diferencial relevante?",
    ],
    criteriosScore: [
      "Imovel em Maceio ou regiao prioritaria",
      "Interesse em administracao completa",
      "Documentacao disponivel",
      "Chaves disponiveis para avaliacao",
      "Valor pretendido compativel com mercado",
      "Urgencia para locar",
    ],
    condicaoPassagemCorretor:
      "Passar para corretor quando houver cidade/bairro, tipo de imovel, intencao de locacao/administracao e autorizacao para avaliacao inicial.",
    proximaAcaoSugerida:
      "Agendar avaliacao comercial, solicitar dados basicos do imovel e orientar proximos passos da captacao.",
  },
  inquilino: {
    objetivo:
      "Qualificar necessidade de locacao, orcamento, regiao, perfil familiar e urgencia para identificar aderencia ao estoque e preparar atendimento do corretor.",
    perguntasObrigatorias: [
      "Qual cidade voce procura?",
      "Tem bairros de preferencia?",
      "Qual faixa de aluguel seria confortavel?",
      "Quantos quartos voce precisa?",
      "Voce possui pet?",
      "Qual o prazo ideal para mudanca?",
    ],
    perguntasOpcionais: [
      "Precisa de vaga de garagem?",
      "Aceita condominio?",
      "Tem preferencia por casa ou apartamento?",
      "Ja possui documentacao basica para analise?",
    ],
    criteriosScore: [
      "Faixa de aluguel definida",
      "Bairro ou regiao definida",
      "Prazo de mudanca curto",
      "Documentacao pronta",
      "Disponibilidade para visita",
      "Aderencia ao estoque atual",
    ],
    condicaoPassagemCorretor:
      "Passar para corretor quando houver cidade, bairro/regiao, faixa de aluguel, quantidade de quartos e prazo de mudanca.",
    proximaAcaoSugerida:
      "Buscar imoveis compativeis, criar follow-up e direcionar para corretor de locacao.",
  },
  comprador: {
    objetivo:
      "Entender intencao de compra, regiao, faixa de investimento, forma de pagamento e urgencia para preparar atendimento consultivo de vendas.",
    perguntasObrigatorias: [
      "Qual cidade voce deseja comprar?",
      "Tem bairros de preferencia?",
      "Qual valor aproximado pretende investir?",
      "A compra seria com financiamento?",
      "Voce pretende usar FGTS?",
      "Qual sua urgencia para comprar?",
    ],
    perguntasOpcionais: [
      "Procura casa, apartamento ou terreno?",
      "Quantos quartos precisa?",
      "Ja possui credito aprovado?",
      "Aceita imovel em condominio?",
    ],
    criteriosScore: [
      "Valor de compra definido",
      "Forma de pagamento definida",
      "Credito aprovado ou em analise",
      "Regiao definida",
      "Urgencia para comprar",
      "Disponibilidade para visita",
    ],
    condicaoPassagemCorretor:
      "Passar para corretor quando houver cidade, regiao, faixa de valor e forma de pagamento minimamente definida.",
    proximaAcaoSugerida:
      "Encaminhar para corretor de vendas com briefing financeiro e preferencias de imovel.",
  },
  vendedor: {
    objetivo:
      "Identificar imovel disponivel para venda, expectativa de preco, documentacao e motivacao para avaliar viabilidade comercial.",
    perguntasObrigatorias: [
      "O imovel fica em qual cidade e bairro?",
      "Qual e o tipo de imovel?",
      "Qual valor voce imagina para venda?",
      "O imovel esta ocupado ou disponivel?",
      "A documentacao esta atualizada?",
      "Qual prazo desejado para venda?",
    ],
    perguntasOpcionais: [
      "O imovel possui financiamento ativo?",
      "Ja esta anunciado em outro lugar?",
      "Existe exclusividade com outra imobiliaria?",
      "Possui fotos e matricula atualizada?",
    ],
    criteriosScore: [
      "Documentacao organizada",
      "Preco pretendido compativel",
      "Disponibilidade para avaliacao",
      "Motivacao clara para venda",
      "Imovel em regiao de interesse",
      "Ausencia de impedimentos comerciais",
    ],
    condicaoPassagemCorretor:
      "Passar para corretor quando houver localizacao, tipo, valor pretendido, situacao de ocupacao e disponibilidade para avaliacao.",
    proximaAcaoSugerida:
      "Encaminhar para avaliacao comercial e definicao de estrategia de venda.",
  },
  corretor_parceiro: {
    objetivo:
      "Entender oportunidade de parceria, imovel indicado, autorizacao do proprietario e potencial de captacao para locacao ou administracao.",
    perguntasObrigatorias: [
      "Voce possui imovel para indicar para administracao ou locacao?",
      "O imovel fica em qual cidade e bairro?",
      "O proprietario autorizou o contato?",
      "Qual e o perfil do imovel?",
      "Existe alguma condicao comercial combinada?",
    ],
    perguntasOpcionais: [
      "Voce ja trabalhou com esse proprietario antes?",
      "O imovel esta disponivel para visita?",
      "Existe urgencia para locar ou administrar?",
      "Ha fotos ou documentos iniciais?",
    ],
    criteriosScore: [
      "Autorizacao do proprietario",
      "Imovel com localizacao clara",
      "Condicao comercial alinhada",
      "Disponibilidade de informacoes",
      "Potencial de administracao",
      "Relacao previa com o parceiro",
    ],
    condicaoPassagemCorretor:
      "Passar para responsavel quando houver imovel identificado, autorizacao do proprietario e condicao de parceria minimamente clara.",
    proximaAcaoSugerida:
      "Encaminhar para responsavel por parcerias e captacao para validar autorizacao e condicoes.",
  },
};

export function obterScriptQualificacao(tipoLead: TipoLeadSimulador) {
  return scriptsQualificacao[tipoLead];
}

export function obterLacunasPendentes(tipoLead: TipoLeadSimulador, cidade: string) {
  const script = obterScriptQualificacao(tipoLead);
  const lacunas = script.perguntasObrigatorias.slice(0, 3);

  if (!cidade.trim()) {
    return ["Cidade do atendimento ainda nao informada", ...lacunas];
  }

  return lacunas;
}
