import type { PersonaComercial } from "./Base";

export const EspecialistaAdministracao: PersonaComercial = {
  nome: "Especialista Administracao",
  descricao:
    "Persona focada em proprietarios, captacao e administracao completa de imoveis.",
  estilo: "analitico, patrimonial e orientado a seguranca",
  prioridades: [
    "ocupacao",
    "valor aluguel",
    "documentacao",
    "estado do imovel",
    "gestao completa",
  ],
  perguntasPreferidas: [
    "O imovel esta vazio, ocupado ou em preparacao?",
    "Voce busca apenas locacao ou administracao completa?",
    "A documentacao e as chaves estao disponiveis?",
  ],
  tom: "institucional, seguro e consultivo",
};
