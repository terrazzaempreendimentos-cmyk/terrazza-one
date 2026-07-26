export type PessoaComPapeis = {
  papeis?: string[] | null;
};

export const PAPEIS_COMERCIAIS = Object.freeze([
  "proprietario",
  "inquilino",
  "comprador",
  "vendedor",
  "corretor",
  "parceiro",
  "prestador",
  "investidor",
] as const);

export type PapelComercial = (typeof PAPEIS_COMERCIAIS)[number];

const PAPEL_ALIASES: Record<string, string> = {
  proprietario: "proprietario",
  proprietaria: "proprietario",
  "proprietário": "proprietario",
  "proprietária": "proprietario",
  inquilino: "inquilino",
  inquilina: "inquilino",
  corretor: "corretor",
  corretora: "corretor",
};

export function normalizePapel(papel: string) {
  const normalized = papel
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "_");

  return PAPEL_ALIASES[normalized] ?? normalized;
}

export function isPapelComercial(value: unknown): value is PapelComercial {
  return (
    typeof value === "string" &&
    (PAPEIS_COMERCIAIS as readonly string[]).includes(normalizePapel(value))
  );
}

function normalizePapeis(papeis: string[] | null | undefined) {
  return Array.from(new Set((papeis ?? []).map(normalizePapel).filter(Boolean)));
}

export function hasPapel(
  pessoa: PessoaComPapeis | string[] | null | undefined,
  papel: string,
) {
  const papeis = Array.isArray(pessoa) ? pessoa : pessoa?.papeis;

  return normalizePapeis(papeis).includes(normalizePapel(papel));
}

export function addPapel(papeis: string[] | null | undefined, papel: string) {
  const normalized = normalizePapel(papel);
  const current = normalizePapeis(papeis);

  if (current.includes(normalized)) {
    return current;
  }

  return [...current, normalized];
}

export function removePapel(papeis: string[] | null | undefined, papel: string) {
  const normalized = normalizePapel(papel);

  return normalizePapeis(papeis).filter((item) => item !== normalized);
}

export function isOnlyPapel(
  papeis: string[] | null | undefined,
  papel: string,
) {
  const current = normalizePapeis(papeis);

  return current.length === 1 && current[0] === normalizePapel(papel);
}
