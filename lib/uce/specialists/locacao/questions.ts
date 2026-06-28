import type { UCENextQuestion } from "../../core/types";

export const locacaoQuestions: UCENextQuestion[] = [
  { field: "cidade", text: "Em qual cidade voce procura para locacao?", reason: "Cidade direciona a busca." },
  { field: "bairro", text: "Tem algum bairro de preferencia?", reason: "Bairro qualifica disponibilidade." },
  { field: "tipoImovel", text: "Qual tipo de imovel voce procura?", reason: "Tipo direciona opcoes." },
  { field: "valor", text: "Qual faixa de valor de aluguel voce procura?", reason: "Valor define aderencia." },
  { field: "quartos", text: "Quantos quartos voce precisa?", reason: "Quartos indicam perfil de moradia." },
  { field: "pet", text: "Voce possui pet?", reason: "Pet e relevante para locacao." },
  { field: "moradores", text: "Quantas pessoas vao morar no imovel?", reason: "Moradores qualificam uso." },
  { field: "prazoMudanca", text: "Qual o prazo para mudanca?", reason: "Prazo define prioridade." },
  { field: "garagem", text: "Precisa de garagem?", reason: "Garagem e requisito de busca." },
  { field: "condominioAceita", text: "Voce aceita imovel em condominio?", reason: "Condominio afeta as opcoes." },
];
