export function limparDocumento(documento: string) {
  return documento.replace(/\D/g, "");
}

export function validarCPF(cpf: string) {
  const value = limparDocumento(cpf);

  if (value.length !== 11 || /^(\d)\1+$/.test(value)) return false;

  const calcularDigito = (base: string, fatorInicial: number) => {
    const total = base
      .split("")
      .reduce((sum, digit, index) => sum + Number(digit) * (fatorInicial - index), 0);
    const rest = (total * 10) % 11;

    return rest === 10 ? 0 : rest;
  };

  const digito1 = calcularDigito(value.slice(0, 9), 10);
  const digito2 = calcularDigito(value.slice(0, 10), 11);

  return digito1 === Number(value[9]) && digito2 === Number(value[10]);
}

export function validarCNPJ(cnpj: string) {
  const value = limparDocumento(cnpj);

  if (value.length !== 14 || /^(\d)\1+$/.test(value)) return false;

  const calcularDigito = (base: string, pesos: number[]) => {
    const total = base
      .split("")
      .reduce((sum, digit, index) => sum + Number(digit) * pesos[index], 0);
    const rest = total % 11;

    return rest < 2 ? 0 : 11 - rest;
  };

  const digito1 = calcularDigito(value.slice(0, 12), [
    5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2,
  ]);
  const digito2 = calcularDigito(value.slice(0, 13), [
    6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2,
  ]);

  return digito1 === Number(value[12]) && digito2 === Number(value[13]);
}

export function formatarCPF(cpf: string) {
  const value = limparDocumento(cpf).slice(0, 11);

  return value
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/^(\d{3})\.(\d{3})\.(\d{3})(\d)/, "$1.$2.$3-$4");
}

export function formatarCNPJ(cnpj: string) {
  const value = limparDocumento(cnpj).slice(0, 14);

  return value
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/^(\d{2})\.(\d{3})\.(\d{3})(\d)/, "$1.$2.$3/$4")
    .replace(/^(\d{2})\.(\d{3})\.(\d{3})\/(\d{4})(\d)/, "$1.$2.$3/$4-$5");
}
