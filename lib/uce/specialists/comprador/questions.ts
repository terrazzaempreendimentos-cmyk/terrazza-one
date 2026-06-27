import type { UCENextQuestion } from "../../core/types";

export const compradorQuestions: UCENextQuestion[] = [
  { field: "cidade", text: "Em qual cidade voce quer comprar?", reason: "Cidade direciona as opcoes de venda." },
  { field: "bairro", text: "Tem algum bairro ou regiao de preferencia?", reason: "Bairro qualifica aderencia da busca." },
  { field: "tipoImovel", text: "Qual tipo de imovel voce procura?", reason: "Tipo do imovel direciona a selecao." },
  { field: "valor", text: "Qual faixa de valor voce tem em mente para a compra?", reason: "Valor define viabilidade comercial." },
  { field: "financiamento", text: "Voce pretende financiar?", reason: "Financiamento orienta a qualificacao da compra." },
  { field: "fgts", text: "Pretende usar FGTS?", reason: "FGTS pode indicar compra financiada ou primeiro imovel." },
  { field: "entradaDisponivel", text: "Voce ja tem uma entrada disponivel?", reason: "Entrada indica prontidao financeira." },
  { field: "quartos", text: "Quantos quartos voce procura?", reason: "Quartos indicam perfil de uso." },
  { field: "garagem", text: "Precisa de garagem?", reason: "Garagem qualifica requisitos do imovel." },
  { field: "condominioAceita", text: "Voce aceita imovel em condominio?", reason: "Condominio afeta a busca." },
  { field: "prazoCompra", text: "Qual seu prazo ideal para comprar?", reason: "Prazo define prioridade de atendimento." },
];
