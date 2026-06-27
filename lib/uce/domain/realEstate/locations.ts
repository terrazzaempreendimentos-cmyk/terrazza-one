import {
  bairrosMaceio,
  buscarBairroMaceio,
  buscarCidadeAlagoas,
  cidadesAlagoas,
  obterPerfilTerritorial,
  sugerirUsoComercialPorLocal,
} from "../../knowledge/territorial";

export const maceioNeighborhoods = bairrosMaceio.map((bairro) => bairro.nome);
export const alagoasCities = cidadesAlagoas.map((cidade) => cidade.nome);

export function normalizarTextoLocalizacao(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
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

  return city ? buscarCidadeAlagoas(city)?.nome ?? city : null;
}

export function detectarBairro(text: string) {
  const neighborhood = detectFromList(text, maceioNeighborhoods);

  return neighborhood ? buscarBairroMaceio(neighborhood)?.nome ?? neighborhood : null;
}

export function isBairroConhecido(text: string) {
  return detectarBairro(text) !== null;
}

export { obterPerfilTerritorial, sugerirUsoComercialPorLocal };
