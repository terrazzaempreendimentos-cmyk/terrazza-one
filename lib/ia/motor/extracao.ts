import type { ExtractedInfo, LeadContext } from "./tipos";

function normalizar(texto: string) {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function extrairValor(texto: string) {
  const valorComMil = texto.match(
    /(?:r\$\s*)?(\d{1,3}(?:\.\d{3})+|\d+)\s*(mil)?/i,
  );

  if (!valorComMil) return null;

  const numero = Number(valorComMil[1].replaceAll(".", ""));
  const multiplicador = valorComMil[2] ? 1000 : 1;

  return numero * multiplicador;
}

const cidades: Record<string, string> = {
  maceio: "Maceio",
  aracaju: "Aracaju",
  recife: "Recife",
  "joao pessoa": "Joao Pessoa",
  salvador: "Salvador",
};

const bairros: Record<string, string> = {
  "ponta verde": "Ponta Verde",
  jatiuca: "Jatiuca",
  pajucara: "Pajucara",
  farol: "Farol",
  gruta: "Gruta",
  "stella maris": "Stella Maris",
  jardins: "Jardins",
  atalaia: "Atalaia",
  farolandia: "Farolandia",
};

const tiposImovel = [
  "apartamento",
  "casa",
  "sala",
  "terreno",
  "lote",
  "comercial",
];

const objetivos: Array<{ termos: string[]; valor: NonNullable<LeadContext["objetivo"]> }> = [
  {
    termos: ["alugar", "aluguel", "locacao", "locar"],
    valor: "locacao",
  },
  {
    termos: ["administrar", "administracao"],
    valor: "administracao",
  },
  {
    termos: ["anunciar", "captar", "captacao"],
    valor: "captacao",
  },
  {
    termos: ["vender", "venda"],
    valor: "venda",
  },
  {
    termos: ["comprar", "compra"],
    valor: "compra",
  },
];

function contem(texto: string, termos: string[]) {
  return termos.some((termo) => texto.includes(termo));
}

function extrairPorUltimaPergunta(
  texto: string,
  campo: LeadContext["ultimaPerguntaCampo"],
): ExtractedInfo {
  const informacoes: ExtractedInfo = {};

  if (campo === "pet") {
    if (contem(texto, ["sim", "tenho", "tenho pet", "cachorro", "gato"])) {
      informacoes.pet = true;
    }

    if (
      contem(texto, ["nao", "nao tenho", "sem pet"]) ||
      texto.trim() === "n"
    ) {
      informacoes.pet = false;
    }
  }

  if (campo === "urgencia") {
    if (contem(texto, ["urgente", "imediato", "agora", "este mes", "30 dias"])) {
      informacoes.urgencia = "alta";
    }

    if (contem(texto, ["60 dias", "2 meses"])) {
      informacoes.urgencia = "media";
    }

    if (contem(texto, ["sem pressa", "nao tenho pressa", "posso esperar"])) {
      informacoes.urgencia = "baixa";
    }
  }

  if (campo === "financiamento") {
    if (contem(texto, ["sim", "financiado", "vou financiar"])) {
      informacoes.financiamento = true;
    }

    if (contem(texto, ["nao", "a vista"])) {
      informacoes.financiamento = false;
    }
  }

  if (campo === "fgts") {
    if (contem(texto, ["sim", "tenho", "vou usar"])) {
      informacoes.fgts = true;
    }

    if (contem(texto, ["nao", "nao tenho"])) {
      informacoes.fgts = false;
    }
  }

  if (campo === "quartos") {
    if (contem(texto, ["1", "um", "1 quarto"])) informacoes.quartos = 1;
    if (contem(texto, ["2", "dois", "2 quartos"])) informacoes.quartos = 2;
    if (contem(texto, ["3", "tres", "3 quartos"])) informacoes.quartos = 3;
    if (contem(texto, ["4", "quatro", "4 quartos"])) informacoes.quartos = 4;
  }

  return informacoes;
}

export function extrairInformacoes(
  mensagem: string,
  contextoAtual: LeadContext,
): ExtractedInfo {
  const texto = normalizar(mensagem);
  const informacoes: ExtractedInfo = extrairPorUltimaPergunta(
    texto,
    contextoAtual.ultimaPerguntaCampo,
  );

  const cidade = Object.keys(cidades).find((item) => texto.includes(item));
  if (cidade) informacoes.cidade = cidades[cidade];

  const bairro = Object.keys(bairros).find((item) => texto.includes(item));
  if (bairro) informacoes.bairro = bairros[bairro];

  const tipoImovel = tiposImovel.find((item) => texto.includes(item));
  if (tipoImovel) informacoes.tipoImovel = tipoImovel;

  const quartos = texto.match(/(\d+)\s*quarto/);
  if (quartos) informacoes.quartos = Number(quartos[1]);

  const banheiros = texto.match(/(\d+)\s*banheiro/);
  if (banheiros) informacoes.banheiros = Number(banheiros[1]);

  const valor = extrairValor(mensagem);
  if (valor) informacoes.valor = valor;

  if (
    !Object.prototype.hasOwnProperty.call(informacoes, "pet") &&
    (texto.includes("tenho pet") ||
      texto.includes("cachorro") ||
      texto.includes("gato"))
  ) {
    informacoes.pet = true;
  }

  if (
    !Object.prototype.hasOwnProperty.call(informacoes, "pet") &&
    texto.includes("nao tenho pet")
  ) {
    informacoes.pet = false;
  }

  if (
    !Object.prototype.hasOwnProperty.call(informacoes, "financiamento") &&
    (texto.includes("financiamento") || texto.includes("financiado"))
  ) {
    informacoes.financiamento = true;
  }

  if (
    !Object.prototype.hasOwnProperty.call(informacoes, "financiamento") &&
    texto.includes("a vista")
  ) {
    informacoes.financiamento = false;
  }

  if (!Object.prototype.hasOwnProperty.call(informacoes, "fgts") && texto.includes("fgts")) {
    informacoes.fgts = true;
  }

  const urgencias = [
    "imediato",
    "urgente",
    "este mes",
    "30 dias",
    "60 dias",
    "sem pressa",
  ];
  const urgencia = urgencias.find((item) => texto.includes(item));
  if (!informacoes.urgencia && urgencia) informacoes.urgencia = urgencia;

  const objetivo = objetivos.find((item) =>
    item.termos.some((termo) => texto.includes(termo)),
  );
  if (objetivo) informacoes.objetivo = objetivo.valor;

  if (
    texto.includes("30 dias") ||
    texto.includes("60 dias") ||
    texto.includes("este mes")
  ) {
    informacoes.prazoMudanca = informacoes.urgencia ?? "prazo informado";
  }

  if (
    texto.includes("documentacao") ||
    texto.includes("credito") ||
    texto.includes("aprovado")
  ) {
    informacoes.documentacao = "informada";
  }

  return {
    ...informacoes,
    tipoLead: contextoAtual.tipoLead,
    origem: contextoAtual.origem,
    canal: contextoAtual.canal,
  };
}
