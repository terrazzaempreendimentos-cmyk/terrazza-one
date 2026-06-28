import type { UCENextQuestion } from "../../core/types";

export const locacaoQuestions: UCENextQuestion[] = [
  { field: "cidade", text: "Em qual cidade você procura para locação?", reason: "Cidade direciona a busca." },
  { field: "bairro", text: "Tem algum bairro ou região de preferência?", reason: "Bairro qualifica aderência." },
  { field: "tipoImovel", text: "Qual tipo de imóvel você procura?", reason: "Tipo direciona opções." },
  { field: "valor", text: "Qual faixa de valor de aluguel você procura?", reason: "Valor define aderência." },
  { field: "quartos", text: "Quantos quartos você precisa?", reason: "Quartos indicam perfil de moradia." },
  { field: "pet", text: "Você possui pet?", reason: "Pet é relevante para locação." },
  { field: "moradores", text: "Quantas pessoas vão morar no imóvel?", reason: "Moradores qualificam uso." },
  { field: "urgencia", text: "Existe alguma urgência ou prazo para mudança?", reason: "Prazo define prioridade." },
  { field: "documentacao", text: "Você já possui documentação para análise cadastral?", reason: "Documentação acelera locação." },
  { field: "condominioAceita", text: "Você aceita imóvel em condomínio?", reason: "Condomínio afeta as opções." },
];
