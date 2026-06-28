import type { UCENextQuestion } from "../../core/types";

export const administracaoQuestions: UCENextQuestion[] = [
  { field: "cidade", text: "Em qual cidade fica o imovel?", reason: "Cidade orienta administracao patrimonial." },
  { field: "bairro", text: "Qual e o bairro do imovel?", reason: "Bairro ajuda na leitura de mercado." },
  { field: "tipoImovel", text: "Qual e o tipo do imovel?", reason: "Tipo define operacao de administracao." },
  { field: "areaM2", text: "Qual é a área aproximada do imóvel?", reason: "Area ajuda na leitura patrimonial." },
  { field: "quartos", text: "Quantos quartos o imovel possui?", reason: "Quartos qualificam o perfil do imovel." },
  { field: "vagas", text: "Quantas vagas de garagem possui?", reason: "Vagas impactam a administracao." },
  { field: "ocupacao", text: "O imovel esta ocupado?", reason: "Ocupacao define o fluxo operacional." },
  { field: "valor", text: "Qual e o valor atual ou pretendido do aluguel?", reason: "Valor ajuda na avaliacao da administracao." },
  { field: "condominioValor", text: "Qual e o valor do condominio?", reason: "Condominio compoe a leitura patrimonial." },
  { field: "iptu", text: "Qual e o valor aproximado do IPTU?", reason: "IPTU compoe custos recorrentes." },
  { field: "documentacao", text: "A documentacao do imovel esta organizada?", reason: "Documentacao indica prontidao operacional." },
  { field: "urgencia", text: "Existe alguma urgencia para administrar ou alugar?", reason: "Urgencia define prioridade operacional." },
  { field: "alugado", text: "Ele esta alugado hoje?", reason: "Aluguel atual orienta a transicao." },
  { field: "administracaoAtual", text: "Existe alguma administracao atual?", reason: "Administracao atual indica transicao." },
  { field: "motivoTroca", text: "Qual o motivo da troca ou da busca por administracao?", reason: "Motivo orienta abordagem patrimonial." },
  { field: "administracaoCompleta", text: "Voce deseja administracao completa?", reason: "Escopo define proposta." },
  { field: "chavesDisponiveis", text: "As chaves estao disponiveis?", reason: "Chaves afetam vistoria e operacao." },
];
