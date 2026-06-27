import { buscarCidadeAlagoas, cidadesAlagoas } from "./alagoas";
import { bairrosMaceio, buscarBairroMaceio } from "./maceio";

export function obterPerfilTerritorial(nome: string) {
  return buscarBairroMaceio(nome) ?? buscarCidadeAlagoas(nome);
}

export function sugerirUsoComercialPorLocal(local: string) {
  const perfil = obterPerfilTerritorial(local);

  if (!perfil) {
    return {
      local,
      adequadoPara: [],
      usoComercial:
        "Local nao encontrado na base territorial inicial. Validar manualmente.",
      observacoes: "Sem perfil territorial cadastrado no Knowledge Engine.",
    };
  }

  return {
    local: perfil.nome,
    adequadoPara: perfil.adequadoPara,
    usoComercial: perfil.usoComercial,
    observacoes: perfil.observacoes,
    nivelDemanda: perfil.nivelDemanda,
    perfilPublico: perfil.perfilPublico,
  };
}

export { bairrosMaceio, buscarBairroMaceio, cidadesAlagoas, buscarCidadeAlagoas };
export type {
  UCETerritorialCity,
} from "./alagoas";
export type {
  UCETerritorialCommercialUse,
  UCETerritorialDemandLevel,
  UCETerritorialNeighborhood,
  UCETerritorialPublicProfile,
} from "./maceio";
