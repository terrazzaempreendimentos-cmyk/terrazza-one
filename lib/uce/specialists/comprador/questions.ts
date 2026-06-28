import type { UCENextQuestion } from "../../core/types";

export const compradorQuestions: UCENextQuestion[] = [
  { field: "cidade", text: "Em qual cidade você quer comprar?", reason: "Cidade direciona as opções de venda." },
  { field: "bairro", text: "Tem algum bairro ou região de preferência?", reason: "Bairro qualifica aderência da busca." },
  { field: "tipoImovel", text: "Qual tipo de imóvel você procura?", reason: "Tipo do imóvel direciona a seleção." },
  { field: "valor", text: "Qual faixa de valor você tem em mente para a compra?", reason: "Valor define viabilidade comercial." },
  { field: "entradaDisponivel", text: "Você já possui algum valor reservado para entrada?", reason: "Entrada ajuda a qualificar financiamento e viabilidade." },
  { field: "financiamento", text: "Você pretende financiar?", reason: "Financiamento orienta a qualificação da compra." },
  { field: "fgts", text: "Pretende usar FGTS?", reason: "FGTS pode indicar compra financiada ou primeiro imóvel." },
  { field: "quartos", text: "Quantos quartos você procura?", reason: "Quartos indicam perfil de uso." },
  { field: "vagas", text: "Precisa de quantas vagas de garagem?", reason: "Vagas qualificam requisitos do imóvel." },
  { field: "urgencia", text: "Existe algum prazo ou urgência para comprar?", reason: "Prazo define prioridade de atendimento." },
];
