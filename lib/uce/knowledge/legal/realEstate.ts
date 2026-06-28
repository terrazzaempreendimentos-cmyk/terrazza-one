import type { UCEKnowledgeItem, UCEKnowledgeSource } from "../types";

const source: UCEKnowledgeSource = {
  id: "terrazza-legal-real-estate-base",
  title: "Base Juridica Imobiliaria Terrazza",
  type: "manual",
};

export const realEstateLegalKnowledge: UCEKnowledgeItem[] = [
  {
    id: "juridico-nao-parecer-definitivo",
    title: "Limite juridico da IA Comercial",
    category: "juridico",
    content:
      "A IA Comercial nao deve dar parecer juridico definitivo, interpretar caso complexo como conclusao legal ou substituir especialista. Quando houver duvida juridica, risco documental, disputa, restricao territorial ou situacao sensivel, deve orientar encaminhamento para especialista da Terrazza.",
    tags: ["juridico", "parecer", "especialista", "risco"],
    priority: 100,
    domain: "real_estate",
    source,
    active: true,
  },
  {
    id: "juridico-promessa-aprovacao",
    title: "Cuidado com promessas de aprovacao",
    category: "juridico",
    content:
      "A IA nao deve prometer aprovacao cadastral, aprovacao de financiamento, aceite de garantia ou fechamento de contrato. Deve usar linguagem condicional: a proposta sera analisada, a documentacao sera avaliada e a aprovacao depende dos criterios internos e dos parceiros envolvidos.",
    tags: ["aprovacao", "garantia", "financiamento", "analise"],
    priority: 98,
    domain: "real_estate",
    source,
    active: true,
  },
  {
    id: "juridico-lgpd",
    title: "LGPD no atendimento imobiliario",
    category: "juridico",
    content:
      "Dados pessoais devem ser tratados com finalidade clara de atendimento imobiliario. A IA deve solicitar apenas dados necessarios ao fluxo, evitar exposicao indevida de informacoes sensiveis e encaminhar dados para analise somente dentro do processo comercial da Terrazza.",
    tags: ["lgpd", "dados pessoais", "privacidade", "atendimento"],
    priority: 94,
    domain: "real_estate",
    source,
    active: true,
  },
  {
    id: "juridico-documentacao-imobiliaria-basica",
    title: "Documentacao imobiliaria basica",
    category: "documentacao",
    content:
      "Documentacao imobiliaria basica pode envolver matricula atualizada, documentos pessoais das partes, comprovantes, certidoes quando aplicavel, contrato, vistoria e documentos de garantia. A IA deve tratar essa lista como orientacao inicial e encaminhar validacao para especialista.",
    tags: ["documentacao", "matricula", "contrato", "vistoria", "certidoes"],
    priority: 90,
    domain: "real_estate",
    source,
    active: true,
  },
];
