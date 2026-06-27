import type { LeadContext } from "./tipos";

export function criarContextoInicial(): LeadContext {
  return {
    tipoLead: null,
    cidade: null,
    bairro: null,
    tipoImovel: null,
    quartos: null,
    banheiros: null,
    valor: null,
    pet: null,
    financiamento: null,
    fgts: null,
    urgencia: null,
    objetivo: null,
    origem: null,
    canal: null,
    prazoMudanca: null,
    documentacao: null,
    ultimaPerguntaCampo: null,
  };
}
