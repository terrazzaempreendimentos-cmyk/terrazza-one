export type UCEConhecimentoDominio =
  | "Institucional"
  | "Juridico"
  | "Comercial"
  | "Locacao"
  | "Venda"
  | "Administracao"
  | "Condominio"
  | "Financiamento"
  | "Garantias"
  | "Mercado"
  | "Bairros"
  | "Imoveis"
  | "FAQ"
  | "Scripts";

export type UCEConhecimentoFonte = {
  id: string;
  nome: string;
  tipo: "manual" | "sistema" | "documento" | "base_interna";
  atualizadoEm?: string | null;
};

export type UCEConhecimentoItem = {
  id: string;
  titulo: string;
  categoria: string;
  dominio: UCEConhecimentoDominio;
  conteudo: string;
  tags: string[];
  prioridade: number;
  relacionamentos: string[];
  fonte: UCEConhecimentoFonte;
  cidade?: string | null;
  estado?: string | null;
  bairro?: string | null;
  vigencia?: string | null;
};

export type UCEConhecimentoConsulta = {
  texto?: string | null;
  categoria?: string | null;
  tags?: string[];
  cidade?: string | null;
  bairro?: string | null;
  dominio?: UCEConhecimentoDominio | null;
  dominios?: UCEConhecimentoDominio[];
  limite?: number;
};

export type UCEConhecimentoResultado = {
  item: UCEConhecimentoItem;
  score: number;
  motivos: string[];
};

export type UCEConhecimentoContextInput = UCEConhecimentoConsulta & {
  especialista?: string | null;
  maxItens?: number;
};

export type UCEConhecimentoContext = {
  consulta: UCEConhecimentoContextInput;
  resultados: UCEConhecimentoResultado[];
  resumo: string;
  relacoes: string[];
};
