import { limparDocumento } from "./validators";

export type EnderecoViaCEP = {
  cep: string;
  endereco: string;
  bairro: string;
  cidade: string;
  estado: string;
};

type ViaCEPResponse = {
  cep?: string;
  logradouro?: string;
  bairro?: string;
  localidade?: string;
  uf?: string;
  erro?: boolean;
};

export async function buscarEnderecoPorCEP(cep: string): Promise<EnderecoViaCEP> {
  const cleanCep = limparDocumento(cep);

  if (cleanCep.length !== 8) {
    throw new Error("CEP invalido. Informe 8 digitos.");
  }

  const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);

  if (!response.ok) {
    throw new Error("Nao foi possivel consultar o CEP agora.");
  }

  const data = (await response.json()) as ViaCEPResponse;

  if (data.erro) {
    throw new Error("CEP nao encontrado.");
  }

  return {
    cep: data.cep ?? cleanCep,
    endereco: data.logradouro ?? "",
    bairro: data.bairro ?? "",
    cidade: data.localidade ?? "",
    estado: data.uf ?? "",
  };
}
