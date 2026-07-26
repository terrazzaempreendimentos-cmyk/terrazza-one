export const PAPEIS_ACESSO = [
  "administrador",
  "gestor",
  "corretor",
  "atendimento",
] as const;

export type PapelAcesso = (typeof PAPEIS_ACESSO)[number];

export function isPapelAcesso(value: unknown): value is PapelAcesso {
  return (
    typeof value === "string" &&
    PAPEIS_ACESSO.includes(value as PapelAcesso)
  );
}
