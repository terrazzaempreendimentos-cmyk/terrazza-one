export type UCETerritorialDemandLevel = "baixa" | "media" | "alta";

export type UCETerritorialPublicProfile =
  | "economico"
  | "medio"
  | "medio_alto"
  | "alto_padrao"
  | "turistico"
  | "misto";

export type UCETerritorialCommercialUse =
  | "locacao"
  | "venda"
  | "administracao"
  | "temporada"
  | "investimento";

export type UCETerritorialNeighborhood = {
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

function bairro(
  nome: string,
  perfil: string,
  tags: string[],
  usoComercial: string,
  observacoes: string,
  nivelDemanda: UCETerritorialDemandLevel,
  perfilPublico: UCETerritorialPublicProfile,
  adequadoPara: UCETerritorialCommercialUse[],
): UCETerritorialNeighborhood {
  return {
    nome,
    cidade: "Maceió",
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

export const bairrosMaceio: UCETerritorialNeighborhood[] = [
  bairro("Ponta Verde", "Orla urbana valorizada, verticalizada e com alta liquidez.", ["orla", "praia", "alto giro", "vertical"], "Forte para locacao, venda e administracao de apartamentos.", "Regiao com boa procura por moradia, temporada e investimento.", "alta", "alto_padrao", ["locacao", "venda", "administracao", "temporada", "investimento"]),
  bairro("Pajuçara", "Bairro turistico de orla, com vocacao para temporada e servicos.", ["orla", "turismo", "praia", "servicos"], "Bom para temporada, investimento e locacao mobiliada.", "Demanda influenciada por turismo, proximidade da praia e equipamentos urbanos.", "alta", "turistico", ["locacao", "venda", "administracao", "temporada", "investimento"]),
  bairro("Jatiúca", "Regiao nobre, consolidada, com apartamentos e comercio ativo.", ["nobre", "servicos", "orla proxima", "vertical"], "Forte para locacao residencial, venda e administracao.", "Boa liquidez e publico de renda media alta.", "alta", "medio_alto", ["locacao", "venda", "administracao", "investimento"]),
  bairro("Poço", "Bairro tradicional entre centro expandido e orla.", ["tradicional", "central", "servicos"], "Adequado para locacao, venda e administracao.", "Pode atender quem busca acesso rapido a areas centrais e praia.", "media", "medio", ["locacao", "venda", "administracao"]),
  bairro("Jaraguá", "Area historica e portuaria com vocacao cultural e comercial.", ["historico", "comercial", "revitalizacao"], "Interessante para comercio, investimento e usos mistos.", "Perfil depende muito da rua, estado do imovel e finalidade.", "media", "misto", ["venda", "administracao", "investimento"]),
  bairro("Centro", "Centro comercial e institucional de Maceio.", ["central", "comercio", "servicos"], "Mais adequado para comercial, investimento e administracao.", "Procura residencial e mais especifica, com foco em praticidade.", "media", "misto", ["locacao", "venda", "administracao", "investimento"]),
  bairro("Farol", "Bairro tradicional, central e bem servido por escolas e servicos.", ["tradicional", "central", "familia", "servicos"], "Forte para venda, locacao e administracao residencial.", "Boa opcao para familias e publico que prioriza mobilidade urbana.", "alta", "medio", ["locacao", "venda", "administracao"]),
  bairro("Gruta de Lourdes", "Regiao residencial valorizada, familiar e bem localizada.", ["residencial", "familia", "valorizado"], "Boa para venda, locacao e administracao.", "Perfil costuma valorizar seguranca, espaco e acesso a servicos.", "alta", "medio_alto", ["locacao", "venda", "administracao", "investimento"]),
  bairro("Mangabeiras", "Bairro urbano com comercio forte e proximidade de eixos de circulacao.", ["servicos", "shopping", "vertical", "mobilidade"], "Forte para locacao e administracao de apartamentos.", "Atende publico que busca praticidade e acesso a comercio.", "alta", "medio_alto", ["locacao", "venda", "administracao", "investimento"]),
  bairro("Cruz das Almas", "Regiao de expansao vertical e proximidade da orla norte.", ["expansao", "orla norte", "investimento"], "Boa para venda, locacao e investimento.", "Demanda pode variar entre moradia, investimento e segunda residencia.", "alta", "medio_alto", ["locacao", "venda", "administracao", "investimento"]),
  bairro("Jacarecica", "Area litoranea em expansao, com condominios e potencial de valorizacao.", ["litoral", "expansao", "condominios"], "Boa para venda, investimento e locacao.", "Perfil favorece imoveis novos e projetos com lazer.", "media", "medio_alto", ["locacao", "venda", "administracao", "investimento"]),
  bairro("Guaxuma", "Litoral norte com perfil residencial, casas e condominios.", ["litoral norte", "casas", "condominios"], "Forte para venda, administracao e investimento.", "Atrai publico que busca praia, tranquilidade e mais espaco.", "media", "alto_padrao", ["venda", "administracao", "temporada", "investimento"]),
  bairro("Garça Torta", "Bairro de praia com perfil alternativo, charmoso e turistico.", ["litoral norte", "praia", "turismo"], "Bom para temporada, investimento e venda de casas.", "Procura ligada a experiencia de praia e imoveis diferenciados.", "media", "turistico", ["venda", "administracao", "temporada", "investimento"]),
  bairro("Riacho Doce", "Bairro litoraneo tradicional, com vocacao residencial e turistica.", ["litoral norte", "tradicional", "praia"], "Adequado para temporada, venda e administracao.", "Pode atrair investidores de hospedagem e segunda residencia.", "media", "turistico", ["venda", "administracao", "temporada", "investimento"]),
  bairro("Ipioca", "Praia de alto apelo turistico e condominios de padrao elevado.", ["praia", "resorts", "alto padrao", "turismo"], "Forte para investimento, temporada e venda.", "Local relevante para imoveis de lazer e alto padrao.", "alta", "turistico", ["venda", "administracao", "temporada", "investimento"]),
  bairro("Benedito Bentes", "Grande regiao residencial, popular e com comercio local forte.", ["popular", "residencial", "comercio local"], "Adequado para venda e locacao economica.", "Demanda sensivel a preco, transporte e infraestrutura proxima.", "media", "economico", ["locacao", "venda", "administracao"]),
  bairro("Serraria", "Regiao residencial em crescimento, com condominios e servicos.", ["residencial", "condominios", "crescimento"], "Boa para locacao, venda e administracao.", "Perfil familiar e de renda media, com boa procura por casas e apartamentos.", "alta", "medio", ["locacao", "venda", "administracao", "investimento"]),
  bairro("Antares", "Bairro residencial planejado, familiar e com condominios.", ["residencial", "familia", "condominios"], "Forte para venda, locacao e administracao.", "Boa aderencia para familias que buscam tranquilidade e acesso urbano.", "alta", "medio", ["locacao", "venda", "administracao"]),
  bairro("Tabuleiro do Martins", "Regiao ampla, popular e comercial, com forte circulacao.", ["popular", "comercial", "amplo"], "Adequado para locacao, venda e administracao.", "Oportunidades variam bastante conforme rua e tipo de imovel.", "media", "misto", ["locacao", "venda", "administracao", "investimento"]),
  bairro("Cidade Universitária", "Regiao ligada a universidades, hospitais e expansao urbana.", ["universitario", "expansao", "servicos"], "Boa para locacao, investimento e venda.", "Pode funcionar para estudantes, profissionais e familias.", "media", "medio", ["locacao", "venda", "administracao", "investimento"]),
  bairro("Santa Lúcia", "Bairro residencial de renda media, com acesso a eixos importantes.", ["residencial", "familia", "acesso"], "Adequado para venda, locacao e administracao.", "Boa leitura para familias e moradia permanente.", "media", "medio", ["locacao", "venda", "administracao"]),
  bairro("Clima Bom", "Regiao popular, residencial e extensa.", ["popular", "residencial", "economico"], "Mais forte para venda e locacao economica.", "Aderencia depende de preco, transporte e infraestrutura local.", "media", "economico", ["locacao", "venda", "administracao"]),
  bairro("Pinheiro", "Bairro tradicional afetado por restricoes territoriais e historico geologico.", ["tradicional", "restricao", "atencao juridica"], "Exige cautela juridica e territorial antes de venda ou administracao.", "Qualquer oportunidade deve ser validada com documentacao e situacao atual.", "baixa", "misto", ["venda", "administracao", "investimento"]),
  bairro("Pitanguinha", "Bairro central, residencial e tradicional.", ["central", "tradicional", "residencial"], "Adequado para locacao, venda e administracao.", "Atende publico que busca localizacao pratica e preco intermediario.", "media", "medio", ["locacao", "venda", "administracao"]),
  bairro("Prado", "Bairro tradicional com acesso central e perfil misto.", ["tradicional", "central", "misto"], "Bom para venda, locacao e administracao.", "Pode atender moradia e pequenos usos comerciais.", "media", "medio", ["locacao", "venda", "administracao"]),
  bairro("Ponta Grossa", "Bairro tradicional, proximo ao centro e a Lagoa Mundaú.", ["tradicional", "lagoa", "central"], "Adequado para locacao e venda de ticket medio.", "Demanda tende a ser local e sensivel a preco.", "media", "medio", ["locacao", "venda", "administracao"]),
  bairro("Trapiche da Barra", "Regiao tradicional ligada a equipamentos urbanos e lagoa.", ["tradicional", "lagoa", "servicos"], "Adequado para venda, locacao e administracao.", "Perfil misto, com oportunidades residenciais e institucionais.", "media", "misto", ["locacao", "venda", "administracao"]),
  bairro("Vergel do Lago", "Bairro popular tradicional na regiao lagunar.", ["popular", "lagoa", "tradicional"], "Mais adequado para locacao e venda economica.", "Demanda exige leitura cuidadosa de micro-localizacao.", "baixa", "economico", ["locacao", "venda", "administracao"]),
  bairro("Levada", "Regiao popular e comercial, proxima ao centro.", ["popular", "comercio", "central"], "Adequada para comercial, locacao e venda economica.", "Perfil de alta circulacao, mas com variacao grande por rua.", "media", "misto", ["locacao", "venda", "administracao", "investimento"]),
  bairro("Bebedouro", "Bairro tradicional com historico de restricoes territoriais.", ["tradicional", "restricao", "atencao juridica"], "Exige cautela para qualquer operacao imobiliaria.", "Validar situacao atual, documentacao e risco territorial antes de avancar.", "baixa", "misto", ["venda", "administracao", "investimento"]),
  bairro("Chã de Bebedouro", "Regiao residencial tradicional com necessidade de leitura local.", ["residencial", "tradicional", "local"], "Adequada para venda e locacao conforme micro-localizacao.", "Requer validacao de acesso, entorno e documentacao.", "baixa", "economico", ["locacao", "venda", "administracao"]),
  bairro("Chã da Jaqueira", "Bairro residencial de perfil popular e local.", ["residencial", "popular", "local"], "Adequado para locacao e venda economica.", "Demanda ligada a moradia permanente e preco acessivel.", "media", "economico", ["locacao", "venda", "administracao"]),
  bairro("Jacintinho", "Regiao populosa, comercial e residencial.", ["popular", "comercio", "alta densidade"], "Forte para locacao economica, venda e comercio local.", "Boa demanda local, com sensibilidade a preco e acesso.", "alta", "misto", ["locacao", "venda", "administracao", "investimento"]),
  bairro("Feitosa", "Bairro residencial tradicional, com acesso a regioes centrais.", ["residencial", "tradicional", "acesso"], "Adequado para locacao, venda e administracao.", "Perfil de renda media e demanda familiar.", "media", "medio", ["locacao", "venda", "administracao"]),
  bairro("Barro Duro", "Bairro residencial consolidado, com comercio e boa mobilidade.", ["residencial", "servicos", "familia"], "Forte para venda, locacao e administracao.", "Boa procura por familias e publico de renda media.", "alta", "medio", ["locacao", "venda", "administracao"]),
  bairro("São Jorge", "Regiao residencial com perfil familiar e acesso a servicos.", ["residencial", "familia", "medio"], "Adequado para locacao, venda e administracao.", "Pode atender quem busca custo menor que bairros nobres proximos.", "media", "medio", ["locacao", "venda", "administracao"]),
  bairro("Ouro Preto", "Bairro residencial de perfil local e familiar.", ["residencial", "familia", "local"], "Adequado para venda e locacao.", "Demanda tende a ser residencial e de ticket medio.", "media", "medio", ["locacao", "venda", "administracao"]),
  bairro("Canaã", "Bairro residencial, local e de perfil economico a medio.", ["residencial", "local", "economico"], "Adequado para locacao e venda economica.", "Boa aderencia para moradia permanente.", "media", "economico", ["locacao", "venda", "administracao"]),
  bairro("Santo Amaro", "Regiao residencial de perfil local.", ["residencial", "local", "economico"], "Adequado para venda e locacao economica.", "Demanda depende de preco e condicoes do imovel.", "baixa", "economico", ["locacao", "venda", "administracao"]),
  bairro("Bom Parto", "Bairro tradicional proximo a areas centrais e lagunares.", ["tradicional", "central", "lagoa"], "Adequado para locacao, venda e administracao.", "Exige leitura de micro-localizacao e estado do imovel.", "media", "misto", ["locacao", "venda", "administracao"]),
  bairro("Mutange", "Area com forte historico de restricoes territoriais.", ["restricao", "atencao juridica", "territorial"], "Nao deve avancar sem validacao territorial e juridica.", "Operacoes exigem cautela reforcada e checagem documental.", "baixa", "misto", ["venda", "administracao", "investimento"]),
  bairro("Fernão Velho", "Bairro historico e residencial, proximo a area lagunar.", ["historico", "residencial", "lagoa"], "Adequado para venda, locacao e oportunidades especificas.", "Pode ter apelo historico, mas demanda depende do produto.", "baixa", "misto", ["locacao", "venda", "administracao", "investimento"]),
  bairro("Rio Novo", "Regiao residencial mais afastada e de perfil economico.", ["residencial", "economico", "acesso"], "Adequado para venda e locacao economica.", "Demanda sensivel a transporte, preco e infraestrutura.", "baixa", "economico", ["locacao", "venda", "administracao"]),
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

export function buscarBairroMaceio(nome: string) {
  const normalized = normalizar(nome);

  return (
    bairrosMaceio.find((bairroItem) => normalizar(bairroItem.nome) === normalized) ??
    null
  );
}
