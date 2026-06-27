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
      "Identificar potencial de captação para locação e administração, entender o imóvel, urgência, documentação e abertura do proprietário para avaliação comercial.",
    perguntasObrigatorias: [
      "Qual é a cidade e o bairro do imóvel?",
      "O imóvel está vazio, ocupado ou em preparação?",
      "Você deseja apenas locar ou também contratar administração completa?",
      "Qual valor de aluguel você imagina?",
      "O imóvel possui condomínio, IPTU ou taxa relevante?",
      "A documentação e as chaves estão disponíveis?",
    ],
    perguntasOpcionais: [
      "O imóvel já foi anunciado antes?",
      "Existe alguma restrição para perfil de inquilino?",
      "Você possui fotos atualizadas?",
      "Existe mobília ou diferencial relevante?",
    ],
    criteriosScore: [
      "Imóvel em Maceió ou região prioritária",
      "Interesse em administração completa",
      "Documentação disponível",
      "Chaves disponíveis para avaliação",
      "Valor pretendido compatível com mercado",
      "Urgência para locar",
    ],
    condicaoPassagemCorretor:
      "Passar para corretor quando houver cidade/bairro, tipo de imóvel, intenção de locação/administração e autorização para avaliação inicial.",
    proximaAcaoSugerida:
      "Agendar avaliação comercial, solicitar dados básicos do imóvel e orientar próximos passos da captação.",
  },
  inquilino: {
    objetivo:
      "Qualificar necessidade de locação, orçamento, região, perfil familiar e urgência para identificar aderência ao estoque e preparar atendimento do corretor.",
    perguntasObrigatorias: [
      "Qual cidade você procura?",
      "Tem bairros de preferência?",
      "Qual faixa de aluguel seria confortável?",
      "Quantos quartos você precisa?",
      "Você possui pet?",
      "Qual o prazo ideal para mudança?",
    ],
    perguntasOpcionais: [
      "Precisa de vaga de garagem?",
      "Aceita condomínio?",
      "Tem preferência por casa ou apartamento?",
      "Já possui documentação básica para análise?",
    ],
    criteriosScore: [
      "Faixa de aluguel definida",
      "Bairro ou região definida",
      "Prazo de mudança curto",
      "Documentação pronta",
      "Disponibilidade para visita",
      "Aderência ao estoque atual",
    ],
    condicaoPassagemCorretor:
      "Passar para corretor quando houver cidade, bairro/região, faixa de aluguel, quantidade de quartos e prazo de mudança.",
    proximaAcaoSugerida:
      "Buscar imóveis compatíveis, criar follow-up e direcionar para corretor de locação.",
  },
  comprador: {
    objetivo:
      "Entender intenção de compra, região, faixa de investimento, forma de pagamento e urgência para preparar atendimento consultivo de vendas.",
    perguntasObrigatorias: [
      "Qual cidade você deseja comprar?",
      "Tem bairros de preferência?",
      "Qual valor aproximado pretende investir?",
      "A compra seria com financiamento?",
      "Você pretende usar FGTS?",
      "Qual sua urgência para comprar?",
    ],
    perguntasOpcionais: [
      "Procura casa, apartamento ou terreno?",
      "Quantos quartos precisa?",
      "Já possui crédito aprovado?",
      "Aceita imóvel em condomínio?",
    ],
    criteriosScore: [
      "Valor de compra definido",
      "Forma de pagamento definida",
      "Crédito aprovado ou em análise",
      "Região definida",
      "Urgência para comprar",
      "Disponibilidade para visita",
    ],
    condicaoPassagemCorretor:
      "Passar para corretor quando houver cidade, região, faixa de valor e forma de pagamento minimamente definida.",
    proximaAcaoSugerida:
      "Encaminhar para corretor de vendas com briefing financeiro e preferências de imóvel.",
  },
  vendedor: {
    objetivo:
      "Identificar imóvel disponível para venda, expectativa de preço, documentação e motivação para avaliar viabilidade comercial.",
    perguntasObrigatorias: [
      "O imóvel fica em qual cidade e bairro?",
      "Qual é o tipo de imóvel?",
      "Qual valor você imagina para venda?",
      "O imóvel está ocupado ou disponível?",
      "A documentação está atualizada?",
      "Qual prazo desejado para venda?",
    ],
    perguntasOpcionais: [
      "O imóvel possui financiamento ativo?",
      "Já está anunciado em outro lugar?",
      "Existe exclusividade com outra imobiliária?",
      "Possui fotos e matrícula atualizada?",
    ],
    criteriosScore: [
      "Documentação organizada",
      "Preço pretendido compatível",
      "Disponibilidade para avaliação",
      "Motivação clara para venda",
      "Imóvel em região de interesse",
      "Ausência de impedimentos comerciais",
    ],
    condicaoPassagemCorretor:
      "Passar para corretor quando houver localização, tipo, valor pretendido, situação de ocupação e disponibilidade para avaliação.",
    proximaAcaoSugerida:
      "Encaminhar para avaliação comercial e definição de estratégia de venda.",
  },
  corretor_parceiro: {
    objetivo:
      "Entender oportunidade de parceria, imóvel indicado, autorização do proprietário e potencial de captação para locação ou administração.",
    perguntasObrigatorias: [
      "Você possui imóvel para indicar para administração ou locação?",
      "O imóvel fica em qual cidade e bairro?",
      "O proprietário autorizou o contato?",
      "Qual é o perfil do imóvel?",
      "Existe alguma condição comercial combinada?",
    ],
    perguntasOpcionais: [
      "Você já trabalhou com esse proprietário antes?",
      "O imóvel está disponível para visita?",
      "Existe urgência para locar ou administrar?",
      "Há fotos ou documentos iniciais?",
    ],
    criteriosScore: [
      "Autorização do proprietário",
      "Imóvel com localização clara",
      "Condição comercial alinhada",
      "Disponibilidade de informações",
      "Potencial de administração",
      "Relação prévia com o parceiro",
    ],
    condicaoPassagemCorretor:
      "Passar para responsável quando houver imóvel identificado, autorização do proprietário e condição de parceria minimamente clara.",
    proximaAcaoSugerida:
      "Encaminhar para responsável por parcerias e captação para validar autorização e condições.",
  },
};

export function obterScriptQualificacao(tipoLead: TipoLeadSimulador) {
  return scriptsQualificacao[tipoLead];
}

export function obterLacunasPendentes(tipoLead: TipoLeadSimulador, cidade: string) {
  const script = obterScriptQualificacao(tipoLead);
  const lacunas = script.perguntasObrigatorias.slice(0, 3);

  if (!cidade.trim()) {
    return ["Cidade do atendimento ainda não informada", ...lacunas];
  }

  return lacunas;
}
