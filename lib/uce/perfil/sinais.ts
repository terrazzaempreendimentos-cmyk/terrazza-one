import type { UCESinalComportamental } from "./types";

export const sinaisComportamentais: UCESinalComportamental[] = [
  {
    id: "vou-pensar",
    frase: "vou pensar",
    descricao: "Lead sinaliza adiamento da decisao.",
    peso: 10,
    estiloDecisao: "inseguro",
    riscoPerda: "medio",
  },
  {
    id: "so-pesquisando",
    frase: "estou so pesquisando",
    descricao: "Lead ainda esta em etapa exploratoria.",
    peso: 9,
    estiloDecisao: "comparador",
    perfil: "vendedor_teste_mercado",
    riscoPerda: "medio",
  },
  {
    id: "resolver-rapido",
    frase: "preciso resolver rapido",
    descricao: "Lead demonstra pressa operacional.",
    peso: 12,
    estiloDecisao: "urgente",
    perfil: "inquilino_urgente",
    riscoPerda: "alto",
    urgencia: "alta",
  },
  {
    id: "outras-opcoes",
    frase: "quero ver outras opcoes",
    descricao: "Lead compara alternativas antes de decidir.",
    peso: 8,
    estiloDecisao: "comparador",
  },
  {
    id: "achei-caro",
    frase: "achei caro",
    descricao: "Objeção de preco ou valor percebido.",
    peso: 9,
    estiloDecisao: "analitico",
    riscoPerda: "medio",
  },
  {
    id: "tenho-pressa",
    frase: "tenho pressa",
    descricao: "Urgencia declarada pelo lead.",
    peso: 12,
    estiloDecisao: "urgente",
    perfil: "inquilino_urgente",
    riscoPerda: "alto",
    urgencia: "alta",
  },
  {
    id: "falar-esposa",
    frase: "vou falar com minha esposa",
    descricao: "Decisao depende de validacao familiar.",
    peso: 8,
    estiloDecisao: "consultivo",
    perfil: "familia",
  },
  {
    id: "sem-fiador",
    frase: "nao tenho fiador",
    descricao: "Possivel barreira de garantia locaticia.",
    peso: 9,
    estiloDecisao: "inseguro",
    perfil: "inquilino_consultivo",
    riscoPerda: "medio",
  },
  {
    id: "filhos",
    frase: "tenho filhos",
    descricao: "Perfil familiar com necessidades praticas.",
    peso: 10,
    perfil: "familia",
    estiloDecisao: "consultivo",
  },
  {
    id: "pet",
    frase: "tenho pet",
    descricao: "Necessidade especifica para locacao ou condominio.",
    peso: 7,
    perfil: "familia",
  },
  {
    id: "investir",
    frase: "quero investir",
    descricao: "Busca com foco em retorno financeiro.",
    peso: 12,
    perfil: "investidor",
    estiloDecisao: "investidor",
  },
  {
    id: "renda",
    frase: "quero renda",
    descricao: "Interesse em renda recorrente ou rentabilidade.",
    peso: 12,
    perfil: "investidor",
    estiloDecisao: "investidor",
  },
  {
    id: "nao-entendo",
    frase: "nao entendo muito",
    descricao: "Lead precisa de orientacao clara e segura.",
    peso: 10,
    estiloDecisao: "inseguro",
    perfil: "comprador_primeiro_imovel",
  },
  {
    id: "primeiro-imovel",
    frase: "primeiro imovel",
    descricao: "Compra com necessidade de educacao e suporte.",
    peso: 12,
    perfil: "comprador_primeiro_imovel",
    estiloDecisao: "consultivo",
  },
];

export function normalizeBehaviorText(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function detectarSinaisComportamentais(texto: string) {
  const normalized = normalizeBehaviorText(texto);

  return sinaisComportamentais.filter((sinal) =>
    normalized.includes(normalizeBehaviorText(sinal.frase)),
  );
}
