import type { TipoLeadSimulador } from "../fluxos";

export type EstrategiaComercial = {
  abordagemInicial: string;
  focoQualificacao: string[];
  sinaisDeAltaIntencao: string[];
  sinaisDeBaixaIntencao: string[];
  quandoPassarParaCorretor: string;
  proximaMelhorAcao: string;
};

export const estrategiasPorTipoLead: Record<TipoLeadSimulador, EstrategiaComercial> = {
  proprietario: {
    abordagemInicial:
      "Conduzir como consultoria patrimonial, reforcando seguranca, gestao e posicionamento correto do imovel.",
    focoQualificacao: ["bairro", "estado do imovel", "valor pretendido", "documentacao", "gestao completa"],
    sinaisDeAltaIntencao: ["quer administrar", "tem chaves", "documentacao pronta", "imovel vazio"],
    sinaisDeBaixaIntencao: ["so curioso", "sem prazo", "valor muito fora", "sem autorizacao"],
    quandoPassarParaCorretor:
      "Quando houver localizacao, tipo de imovel, valor pretendido e abertura para avaliacao.",
    proximaMelhorAcao:
      "Agendar avaliacao comercial e solicitar informacoes basicas do imovel.",
  },
  inquilino: {
    abordagemInicial:
      "Conduzir com foco em necessidade real, prazo, valor total e criterios de escolha.",
    focoQualificacao: ["bairro", "valor", "quartos", "pet", "prazo", "garantia"],
    sinaisDeAltaIntencao: ["quer visitar", "tem prazo curto", "valor definido", "documentacao pronta"],
    sinaisDeBaixaIntencao: ["so pesquisando", "sem bairro", "sem faixa de valor", "sem prazo"],
    quandoPassarParaCorretor:
      "Quando houver bairro/regiao, faixa de aluguel, prazo e aderencia minima ao estoque.",
    proximaMelhorAcao:
      "Separar opcoes aderentes e sugerir visita ou follow-up objetivo.",
  },
  comprador: {
    abordagemInicial:
      "Conduzir de forma educativa, validando credito, entrada, urgencia e perfil do imovel.",
    focoQualificacao: ["valor", "financiamento", "FGTS", "bairro", "tipo de imovel", "urgencia"],
    sinaisDeAltaIntencao: ["credito aprovado", "entrada definida", "quer visitar", "prazo claro"],
    sinaisDeBaixaIntencao: ["nao sabe valor", "sem credito", "so olhando", "sem regiao"],
    quandoPassarParaCorretor:
      "Quando houver faixa de valor, cidade/bairro e forma de pagamento minimamente definida.",
    proximaMelhorAcao:
      "Validar viabilidade financeira e direcionar para atendimento consultivo de vendas.",
  },
  vendedor: {
    abordagemInicial:
      "Conduzir como avaliacao comercial, entendendo motivacao, preco, documentacao e prazo.",
    focoQualificacao: ["localizacao", "tipo", "valor esperado", "documentacao", "ocupacao", "prazo"],
    sinaisDeAltaIntencao: ["quer vender logo", "documentacao pronta", "aceita avaliacao", "tem fotos"],
    sinaisDeBaixaIntencao: ["preco irreal", "sem autorizacao", "sem pressa", "sem documentos"],
    quandoPassarParaCorretor:
      "Quando houver dados minimos do imovel e abertura para avaliacao ou estrategia comercial.",
    proximaMelhorAcao:
      "Solicitar dados do imovel e preparar avaliacao comercial.",
  },
  corretor_parceiro: {
    abordagemInicial:
      "Conduzir com foco em parceria, autorizacao do proprietario e clareza da oportunidade.",
    focoQualificacao: ["imovel indicado", "autorizacao", "condicao comercial", "contato do proprietario"],
    sinaisDeAltaIntencao: ["tem autorizacao", "imovel disponivel", "dados completos", "proprietario ciente"],
    sinaisDeBaixaIntencao: ["sem autorizacao", "informacao incompleta", "parceria indefinida"],
    quandoPassarParaCorretor:
      "Quando a oportunidade tiver imovel identificado e autorizacao minima para contato.",
    proximaMelhorAcao:
      "Encaminhar para responsavel por parcerias e validar autorizacao.",
  },
};

export function obterEstrategiaComercial(tipoLead: TipoLeadSimulador) {
  return estrategiasPorTipoLead[tipoLead];
}
