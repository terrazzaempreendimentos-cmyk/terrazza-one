import type { UCENextQuestion } from "../../core/types";

export const vendedorQuestions: UCENextQuestion[] = [
  { field: "cidade", text: "Em qual cidade fica o imovel?", reason: "Cidade orienta avaliacao comercial." },
  { field: "bairro", text: "Qual e o bairro do imovel?", reason: "Bairro ajuda na analise de mercado." },
  { field: "tipoImovel", text: "Qual e o tipo do imovel?", reason: "Tipo define comparaveis." },
  { field: "areaM2", text: "Qual é a área aproximada do imóvel?", reason: "Area ajuda na avaliacao comercial." },
  { field: "quartos", text: "Quantos quartos o imovel possui?", reason: "Quartos qualificam comparaveis." },
  { field: "vagas", text: "Quantas vagas de garagem possui?", reason: "Vagas impactam avaliacao comercial." },
  { field: "valor", text: "Qual valor voce espera pela venda?", reason: "Valor esperado indica posicionamento." },
  { field: "ocupacao", text: "O imovel esta ocupado?", reason: "Ocupacao afeta visita e estrategia." },
  { field: "documentacao", text: "A documentacao do imovel esta organizada?", reason: "Documentacao indica prontidao comercial." },
  { field: "urgencia", text: "Qual a urgencia para vender?", reason: "Urgencia define prioridade e abordagem." },
  { field: "motivoVenda", text: "Qual e o principal motivo da venda?", reason: "Motivo orienta estrategia." },
  { field: "imovelFinanciado", text: "O imovel ainda esta financiado?", reason: "Financiamento afeta viabilidade da venda." },
  { field: "jaAnunciou", text: "Voce ja anunciou esse imovel antes?", reason: "Historico de anuncio mostra tracao." },
  { field: "exclusividade", text: "Voce considera trabalhar com exclusividade?", reason: "Exclusividade define estrategia comercial." },
];
