import type { UCENextQuestion } from "../../core/types";

export const vendedorQuestions: UCENextQuestion[] = [
  { field: "cidade", text: "Em qual cidade fica o imóvel?", reason: "Cidade orienta avaliação comercial." },
  { field: "bairro", text: "Qual é o bairro do imóvel?", reason: "Bairro ajuda na análise de mercado." },
  { field: "tipoImovel", text: "Qual é o tipo do imóvel?", reason: "Tipo define comparáveis." },
  { field: "areaM2", text: "Qual é a área aproximada do imóvel?", reason: "Área ajuda na avaliação comercial." },
  { field: "quartos", text: "Quantos quartos o imóvel possui?", reason: "Quartos qualificam comparáveis." },
  { field: "vagas", text: "Quantas vagas de garagem possui?", reason: "Vagas impactam avaliação comercial." },
  { field: "valor", text: "Qual valor você espera pela venda?", reason: "Valor esperado indica posicionamento." },
  { field: "ocupacao", text: "O imóvel está ocupado ou desocupado?", reason: "Ocupação afeta visita e estratégia." },
  { field: "documentacao", text: "A documentação do imóvel está organizada?", reason: "Documentação indica prontidão comercial." },
  { field: "urgencia", text: "Existe algum prazo ou urgência para a venda?", reason: "Urgência define prioridade e abordagem." },
];
