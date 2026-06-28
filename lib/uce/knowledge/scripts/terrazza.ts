import type { UCEKnowledgeItem, UCEKnowledgeSource } from "../types";

const source: UCEKnowledgeSource = {
  id: "terrazza-scripts-base",
  title: "Scripts Comerciais Terrazza",
  type: "manual",
};

export const terrazzaScriptKnowledge: UCEKnowledgeItem[] = [
  {
    id: "script-administracao-proprietario",
    title: "Script para administracao de imoveis",
    category: "scripts",
    content:
      "Para proprietarios interessados em administracao, conduzir de forma patrimonial: entender cidade, bairro, tipo, ocupacao, se esta alugado, valor atual do aluguel, condominio, IPTU, administracao atual, motivo da troca, desejo de administracao completa e disponibilidade das chaves.",
    tags: ["script", "administracao", "proprietario", "patrimonial"],
    priority: 92,
    domain: "real_estate",
    source,
    active: true,
  },
  {
    id: "script-locacao-inquilino",
    title: "Script para locacao",
    category: "scripts",
    content:
      "Para inquilinos, conduzir com foco em aderencia: cidade, bairro, tipo de imovel, valor, quartos, pet, quantidade de moradores, garagem, condominio e prazo. Depois, orientar que um especialista de locacao buscara opcoes compativeis.",
    tags: ["script", "locacao", "inquilino", "qualificacao"],
    priority: 90,
    domain: "real_estate",
    source,
    active: true,
  },
  {
    id: "script-venda-proprietario",
    title: "Script para venda",
    category: "scripts",
    content:
      "Para venda, conduzir com foco em avaliacao comercial: cidade, bairro, tipo, valor esperado, motivo da venda, se o imovel esta financiado, documentacao, ocupacao, urgencia, se ja anunciou e abertura para exclusividade.",
    tags: ["script", "venda", "captacao", "avaliacao"],
    priority: 88,
    domain: "real_estate",
    source,
    active: true,
  },
  {
    id: "script-resposta-objecoes",
    title: "Script de resposta a objecoes",
    category: "objecoes",
    content:
      "Ao ouvir objecoes como achei caro, condominio alto, vou pensar, nao tenho fiador, quero ver outros imoveis ou estou so pesquisando, responder com acolhimento, uma explicacao curta e uma pergunta que avance o atendimento sem pressionar.",
    tags: ["script", "objecoes", "conducao", "atendimento"],
    priority: 84,
    domain: "real_estate",
    source,
    active: true,
  },
];
