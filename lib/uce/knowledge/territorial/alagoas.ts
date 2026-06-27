import type {
  UCETerritorialCommercialUse,
  UCETerritorialDemandLevel,
  UCETerritorialPublicProfile,
} from "./maceio";

export type UCETerritorialCity = {
  nome: string;
  cidade: string;
  estado: string;
  perfil: string;
  tags: string[];
  usoComercial: string;
  observacoes: string;
  nivelDemanda: UCETerritorialDemandLevel;
  perfilPublico: UCETerritorialPublicProfile;
  adequadoPara: UCETerritorialCommercialUse[];
};

function cidade(
  nome: string,
  perfil: string,
  tags: string[],
  usoComercial: string,
  observacoes: string,
  nivelDemanda: UCETerritorialDemandLevel,
  perfilPublico: UCETerritorialPublicProfile,
  adequadoPara: UCETerritorialCommercialUse[],
): UCETerritorialCity {
  return {
    nome,
    cidade: nome,
    estado: "AL",
    perfil,
    tags,
    usoComercial,
    observacoes,
    nivelDemanda,
    perfilPublico,
    adequadoPara,
  };
}

export const cidadesAlagoas: UCETerritorialCity[] = [
  cidade(
    "Maceió",
    "Capital de Alagoas, principal mercado imobiliario do estado.",
    ["capital", "orla", "servicos", "turismo"],
    "Forte para locacao, venda, administracao, temporada e investimento.",
    "Mercado amplo, com perfis muito distintos por bairro.",
    "alta",
    "misto",
    ["locacao", "venda", "administracao", "temporada", "investimento"],
  ),
  cidade(
    "Marechal Deodoro",
    "Cidade historica e litoranea, com destaque para Praia do Frances.",
    ["historica", "praia", "frances", "turismo"],
    "Boa para temporada, investimento, venda e administracao.",
    "Demanda associada a lazer, segunda residencia e turismo.",
    "alta",
    "turistico",
    ["venda", "administracao", "temporada", "investimento"],
  ),
  cidade(
    "Barra de São Miguel",
    "Destino litoraneo consolidado, com casas, condominios e turismo.",
    ["praia", "turismo", "segunda residencia", "alto padrao"],
    "Forte para temporada, venda e investimento.",
    "Mercado sensivel a localizacao, vista, acesso a praia e padrao construtivo.",
    "alta",
    "turistico",
    ["venda", "administracao", "temporada", "investimento"],
  ),
  cidade(
    "Paripueira",
    "Cidade litoranea proxima a Maceio, com perfil turistico e residencial.",
    ["litoral norte", "praia", "turismo"],
    "Boa para temporada, venda e investimento.",
    "Atrai publico de lazer e moradia com acesso a Maceio.",
    "media",
    "turistico",
    ["venda", "administracao", "temporada", "investimento"],
  ),
  cidade(
    "Maragogi",
    "Destino turistico de alta visibilidade no litoral norte alagoano.",
    ["turismo", "praia", "litoral norte", "investimento"],
    "Forte para temporada, investimento e venda.",
    "Potencial ligado a turismo, hospedagem e ativos de lazer.",
    "alta",
    "turistico",
    ["venda", "administracao", "temporada", "investimento"],
  ),
  cidade(
    "Japaratinga",
    "Destino litoraneo turistico, mais reservado e em valorizacao.",
    ["turismo", "praia", "litoral norte", "pousadas"],
    "Boa para investimento, temporada e venda.",
    "Demanda relacionada a turismo de experiencia e segunda residencia.",
    "media",
    "turistico",
    ["venda", "administracao", "temporada", "investimento"],
  ),
  cidade(
    "São Miguel dos Milagres",
    "Destino premium da Rota Ecologica, com forte apelo turistico.",
    ["rota ecologica", "alto padrao", "turismo", "praia"],
    "Forte para investimento, temporada e venda de alto padrao.",
    "Mercado exige leitura de regularidade, acesso, produto e vocacao turistica.",
    "alta",
    "alto_padrao",
    ["venda", "administracao", "temporada", "investimento"],
  ),
  cidade(
    "Porto de Pedras",
    "Cidade da Rota Ecologica com turismo qualificado e natureza preservada.",
    ["rota ecologica", "turismo", "praia", "natureza"],
    "Boa para investimento, temporada e venda.",
    "Atrai projetos de lazer, hospedagem e segunda residencia.",
    "media",
    "turistico",
    ["venda", "administracao", "temporada", "investimento"],
  ),
  cidade(
    "Penedo",
    "Cidade historica do Baixo Sao Francisco, com vocacao cultural.",
    ["historica", "rio sao francisco", "cultura"],
    "Adequada para venda, administracao e investimentos especificos.",
    "Potencial turistico e patrimonial, mas demanda exige leitura local.",
    "media",
    "misto",
    ["locacao", "venda", "administracao", "investimento"],
  ),
  cidade(
    "Arapiraca",
    "Principal polo do agreste alagoano, com economia regional forte.",
    ["agreste", "polo regional", "comercio", "servicos"],
    "Forte para venda, locacao, administracao e investimento.",
    "Mercado urbano relevante fora da capital, com demanda residencial e comercial.",
    "alta",
    "misto",
    ["locacao", "venda", "administracao", "investimento"],
  ),
];

function normalizar(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function buscarCidadeAlagoas(nome: string) {
  const normalized = normalizar(nome);

  return (
    cidadesAlagoas.find((cidadeItem) => normalizar(cidadeItem.nome) === normalized) ??
    null
  );
}
