import type { LeadContext } from "../motor/tipos";

export type PersonaComercial = {
  nome: string;
  descricao: string;
  estilo: string;
  prioridades: string[];
  perguntasPreferidas: string[];
  tom: string;
};

export type SelecionarPersonaEntrada = {
  contexto: LeadContext;
};
