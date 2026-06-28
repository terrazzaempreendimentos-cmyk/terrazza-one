import type { UCENextQuestion } from "../../core/types";

export const administracaoQuestions: UCENextQuestion[] = [
  { field: "cidade", text: "Em qual cidade fica o imóvel?", reason: "Cidade orienta administração patrimonial." },
  { field: "bairro", text: "Qual é o bairro do imóvel?", reason: "Bairro ajuda na leitura de mercado." },
  { field: "tipoImovel", text: "Qual é o tipo do imóvel?", reason: "Tipo define operação de administração." },
  { field: "areaM2", text: "Qual é a área aproximada do imóvel?", reason: "Área ajuda na leitura patrimonial." },
  { field: "quartos", text: "Quantos quartos o imóvel possui?", reason: "Quartos qualificam o perfil do imóvel." },
  { field: "vagas", text: "Quantas vagas de garagem possui?", reason: "Vagas impactam a administração." },
  { field: "ocupacao", text: "O imóvel está ocupado ou desocupado?", reason: "Ocupação define o fluxo operacional." },
  { field: "valorAluguelAtual", text: "Qual valor de aluguel você imagina?", reason: "Valor ajuda na avaliação da administração." },
  { field: "condominioValor", text: "Qual é o valor do condomínio?", reason: "Condomínio compõe a leitura patrimonial." },
  { field: "iptu", text: "Qual é o valor do IPTU?", reason: "IPTU compõe custos recorrentes." },
  { field: "documentacao", text: "A documentação do imóvel está organizada?", reason: "Documentação indica prontidão operacional." },
  { field: "urgencia", text: "Existe algum prazo ou urgência para alugar/administrar esse imóvel?", reason: "Urgência define prioridade operacional." },
];
