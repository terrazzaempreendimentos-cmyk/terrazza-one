export const maceioNeighborhoods = [
  "Ponta Verde",
  "Pajuçara",
  "Jatiúca",
  "Poço",
  "Jaraguá",
  "Centro",
  "Farol",
  "Gruta de Lourdes",
  "Mangabeiras",
  "Cruz das Almas",
  "Jacarecica",
  "Guaxuma",
  "Garça Torta",
  "Riacho Doce",
  "Ipioca",
  "Benedito Bentes",
  "Serraria",
  "Antares",
  "Tabuleiro do Martins",
  "Cidade Universitária",
  "Santa Lúcia",
  "Clima Bom",
  "Pinheiro",
  "Pitanguinha",
  "Prado",
  "Ponta Grossa",
  "Trapiche da Barra",
  "Vergel do Lago",
  "Levada",
  "Bebedouro",
  "Chã de Bebedouro",
  "Chã da Jaqueira",
  "Jacintinho",
  "Feitosa",
  "Barro Duro",
  "São Jorge",
  "Ouro Preto",
  "Canaã",
  "Santo Amaro",
  "Bom Parto",
  "Mutange",
  "Fernão Velho",
  "Rio Novo",
] as const;

export const alagoasCities = [
  "Maceió",
  "Marechal Deodoro",
  "Barra de São Miguel",
  "Paripueira",
  "Maragogi",
  "Japaratinga",
  "São Miguel dos Milagres",
  "Porto de Pedras",
  "Penedo",
  "Arapiraca",
] as const;

const displayNames: Record<string, string> = {
  pajucara: "Pajuçara",
  jatiuca: "Jatiúca",
  poco: "Poço",
  jaragua: "Jaraguá",
  "garca torta": "Garça Torta",
  "cidade universitaria": "Cidade Universitária",
  "santa lucia": "Santa Lúcia",
  "cha de bebedouro": "Chã de Bebedouro",
  "cha da jaqueira": "Chã da Jaqueira",
  "sao jorge": "São Jorge",
  canaa: "Canaã",
  "fernao velho": "Fernão Velho",
  maceio: "Maceió",
  "barra de sao miguel": "Barra de São Miguel",
  "sao miguel dos milagres": "São Miguel dos Milagres",
};

export function normalizarTextoLocalizacao(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function canonicalName(value: string) {
  const normalized = normalizarTextoLocalizacao(value);

  return displayNames[normalized] ?? value;
}

function detectFromList(text: string, list: readonly string[]) {
  const normalized = normalizarTextoLocalizacao(text);

  return list.find((item) => {
    const normalizedItem = normalizarTextoLocalizacao(item);
    const pattern = new RegExp(`(^|\\s)${normalizedItem}(\\s|$)`);

    return pattern.test(normalized);
  });
}

export function detectarCidade(text: string) {
  const city = detectFromList(text, alagoasCities);

  return city ? canonicalName(city) : null;
}

export function detectarBairro(text: string) {
  const neighborhood = detectFromList(text, maceioNeighborhoods);

  return neighborhood ? canonicalName(neighborhood) : null;
}

export function isBairroConhecido(text: string) {
  return detectarBairro(text) !== null;
}
