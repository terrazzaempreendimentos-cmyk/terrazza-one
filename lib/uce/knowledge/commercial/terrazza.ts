import type { UCEKnowledgeItem, UCEKnowledgeSource } from "../types";

const source: UCEKnowledgeSource = {
  id: "terrazza-commercial-base",
  title: "Base Comercial e Operacional Terrazza",
  type: "manual",
};

export const terrazzaCommercialKnowledge: UCEKnowledgeItem[] = [
  {
    id: "terrazza-institucional",
    title: "Terrazza Solucoes Imobiliarias",
    category: "institucional",
    content:
      "A Terrazza Solucoes Imobiliarias atua em Maceio e Aracaju. O foco inicial em Maceio e locacao e administracao de imoveis. Em Aracaju, a atuacao comercial inclui captacao, venda e locacao.",
    tags: ["terrazza", "institucional", "maceio", "aracaju"],
    priority: 100,
    domain: "real_estate",
    source,
    active: true,
  },
  {
    id: "terrazza-administracao-imoveis",
    title: "Administracao de imoveis Terrazza",
    category: "comercial",
    content:
      "A administracao de imoveis envolve divulgacao, cadastro do imovel, analise cadastral do interessado, garantia locaticia, contrato, vistoria, cobranca, repasse, manutencao e suporte ao proprietario. O atendimento deve explicar que a Terrazza organiza a operacao para reduzir atrito do proprietario e dar previsibilidade ao aluguel.",
    tags: [
      "administracao",
      "proprietario",
      "locacao",
      "vistoria",
      "repasse",
      "manutencao",
    ],
    priority: 95,
    domain: "real_estate",
    source,
    active: true,
  },
  {
    id: "terrazza-locacao-fluxo",
    title: "Fluxo comercial de locacao",
    category: "comercial",
    content:
      "O fluxo de locacao deve qualificar perfil do inquilino, documentacao, garantia, visita, proposta, analise, contrato e entrega de chaves. A conversa deve confirmar cidade, bairro, tipo de imovel, faixa de valor, quartos, pet quando aplicavel, moradores, garagem, condominio e prazo.",
    tags: [
      "locacao",
      "inquilino",
      "documentacao",
      "garantia",
      "visita",
      "contrato",
      "chaves",
    ],
    priority: 90,
    domain: "real_estate",
    source,
    active: true,
  },
  {
    id: "terrazza-compra-fluxo",
    title: "Fluxo comercial de compra",
    category: "comercial",
    content:
      "O fluxo de compra deve entender cidade, bairro, tipo de imovel, faixa de valor, financiamento, uso de FGTS, entrada disponivel, quartos, garagem, condominio e prazo de compra. A IA deve organizar o briefing para especialista de vendas selecionar opcoes compativeis e orientar proximos passos financeiros sem prometer aprovacao.",
    tags: [
      "compra",
      "comprador",
      "financiamento",
      "fgts",
      "entrada",
      "vendas",
    ],
    priority: 89,
    domain: "real_estate",
    source,
    active: true,
  },
  {
    id: "terrazza-venda-fluxo",
    title: "Fluxo comercial de venda",
    category: "comercial",
    content:
      "O fluxo de venda envolve captacao, avaliacao comercial, verificacao de documentacao, matricula, definicao de preco, negociacao e proposta. A conversa deve entender cidade, bairro, tipo do imovel, valor esperado, motivo da venda, financiamento, ocupacao, urgencia, anuncio anterior e abertura para exclusividade.",
    tags: [
      "venda",
      "captacao",
      "avaliacao",
      "matricula",
      "preco",
      "negociacao",
      "proposta",
    ],
    priority: 88,
    domain: "real_estate",
    source,
    active: true,
  },
  {
    id: "terrazza-garantias-locaticias",
    title: "Garantias locaticias",
    category: "garantias",
    content:
      "As garantias locaticias iniciais consideradas pela Terrazza incluem fiador, caucao, seguro fianca, titulo de capitalizacao e analise via Maximiza. A IA nao deve prometer aprovacao; deve orientar que a garantia sera analisada conforme perfil, documentacao e politica comercial.",
    tags: [
      "garantias",
      "fiador",
      "caucao",
      "seguro fianca",
      "titulo de capitalizacao",
      "maximiza",
    ],
    priority: 92,
    domain: "real_estate",
    source,
    active: true,
  },
  {
    id: "terrazza-objecoes-comerciais",
    title: "Objecoes comerciais frequentes",
    category: "objecoes",
    content:
      "Objecoes frequentes: achei caro, condominio alto, vou pensar, nao tenho fiador, quero ver outros imoveis e estou so pesquisando. A resposta deve reconhecer a preocupacao, evitar pressao, fazer uma pergunta objetiva e conduzir para comparacao, alternativas de garantia, analise de perfil ou proximo passo comercial.",
    tags: [
      "objecoes",
      "preco",
      "condominio",
      "fiador",
      "pesquisando",
      "comparacao",
    ],
    priority: 86,
    domain: "real_estate",
    source,
    active: true,
  },
];
