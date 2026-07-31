import {
  isPapelAcesso,
  type PapelAcesso,
} from "./roles";

export const PERMISSIONS = Object.freeze([
  "dashboard.visualizar",
  "pessoas.visualizar",
  "pessoas.criar",
  "pessoas.editar",
  "pessoas.arquivar",
  "corretores.visualizar",
  "corretores.administrar",
  "corretores.arquivar",
  "imoveis.visualizar",
  "imoveis.criar",
  "imoveis.editar",
  "imoveis.arquivar",
  "leads.visualizar",
  "leads.criar",
  "leads.editar",
  "leads.arquivar",
  "leads.distribuir",
  "kanban.usar",
  "agenda.visualizar",
  "agenda.criar",
  "agenda.editar",
  "timeline.visualizar",
  "timeline.criar",
  "roleta.visualizar",
  "roleta.usar",
  "atendimentos.visualizar",
  "atendimentos.criar",
  "atendimentos.editar",
  "atendimentos.assumir",
  "atendimentos.concluir",
  "atendimentos.cancelar",
  "atendimentos.reabrir",
  "negocios.visualizar",
  "negocios.criar",
  "negocios.editar",
  "negocios.concluir",
  "negocios.perder",
  "negocios.cancelar",
  "negocios.reabrir",
  "negocios.arquivar",
  "atividades.visualizar",
  "atividades.criar",
  "atividades.editar",
  "manutencoes.visualizar",
  "manutencoes.criar",
  "manutencoes.editar",
  "manutencoes.arquivar",
  "ia.usar",
  "ia_conhecimento.visualizar",
  "ia_conhecimento.criar",
  "ia_conhecimento.editar",
  "ia_memorias.visualizar",
  "ia_memorias.criar",
  "usuarios.administrar",
  "configuracoes.administrar",
] as const);

export type Permission = (typeof PERMISSIONS)[number];

const PERMISSION_SET: ReadonlySet<string> = new Set(PERMISSIONS);
const NO_PERMISSIONS: readonly Permission[] = Object.freeze([]);

const GESTOR_PERMISSIONS = Object.freeze([
  "dashboard.visualizar",
  "pessoas.visualizar",
  "pessoas.criar",
  "pessoas.editar",
  "pessoas.arquivar",
  "corretores.visualizar",
  "corretores.administrar",
  "corretores.arquivar",
  "imoveis.visualizar",
  "imoveis.criar",
  "imoveis.editar",
  "imoveis.arquivar",
  "leads.visualizar",
  "leads.criar",
  "leads.editar",
  "leads.arquivar",
  "leads.distribuir",
  "kanban.usar",
  "agenda.visualizar",
  "agenda.criar",
  "agenda.editar",
  "timeline.visualizar",
  "timeline.criar",
  "roleta.visualizar",
  "roleta.usar",
  "atendimentos.visualizar",
  "atendimentos.criar",
  "atendimentos.editar",
  "atendimentos.assumir",
  "atendimentos.concluir",
  "atendimentos.cancelar",
  "atendimentos.reabrir",
  "negocios.visualizar",
  "negocios.criar",
  "negocios.editar",
  "negocios.concluir",
  "negocios.perder",
  "negocios.cancelar",
  "negocios.reabrir",
  "negocios.arquivar",
  "atividades.visualizar",
  "atividades.criar",
  "atividades.editar",
  "manutencoes.visualizar",
  "manutencoes.criar",
  "manutencoes.editar",
  "manutencoes.arquivar",
  "ia.usar",
  "ia_conhecimento.visualizar",
  "ia_conhecimento.criar",
  "ia_conhecimento.editar",
  "ia_memorias.visualizar",
  "ia_memorias.criar",
] as const satisfies readonly Permission[]);

const CORRETOR_PERMISSIONS = Object.freeze([
  "dashboard.visualizar",
  "pessoas.visualizar",
  "pessoas.criar",
  "pessoas.editar",
  "imoveis.visualizar",
  "imoveis.criar",
  "imoveis.editar",
  "leads.visualizar",
  "leads.editar",
  "kanban.usar",
  "agenda.visualizar",
  "agenda.editar",
  "timeline.visualizar",
  "roleta.visualizar",
  "atendimentos.visualizar",
  "negocios.visualizar",
  "atividades.visualizar",
  "atividades.editar",
  "manutencoes.visualizar",
  "ia.usar",
] as const satisfies readonly Permission[]);

const ATENDIMENTO_PERMISSIONS = Object.freeze([
  "dashboard.visualizar",
  "pessoas.visualizar",
  "pessoas.criar",
  "pessoas.editar",
  "imoveis.visualizar",
  "leads.visualizar",
  "leads.criar",
  "leads.editar",
  "kanban.usar",
  "agenda.visualizar",
  "agenda.criar",
  "agenda.editar",
  "timeline.visualizar",
  "timeline.criar",
  "roleta.visualizar",
  "atendimentos.visualizar",
  "atendimentos.editar",
  "atendimentos.assumir",
  "negocios.visualizar",
  "atividades.visualizar",
  "atividades.criar",
  "atividades.editar",
  "manutencoes.visualizar",
  "manutencoes.editar",
  "ia.usar",
] as const satisfies readonly Permission[]);

const ROLE_PERMISSIONS = {
  administrador: PERMISSIONS,
  gestor: GESTOR_PERMISSIONS,
  corretor: CORRETOR_PERMISSIONS,
  atendimento: ATENDIMENTO_PERMISSIONS,
} as const satisfies Record<PapelAcesso, readonly Permission[]>;

export type FutureScope = "proprio" | "atribuido" | "relacionado" | "todos";

export type FuturePermissionScope = Readonly<{
  papel: PapelAcesso;
  permissao: Permission;
  escopoFuturo: FutureScope;
}>;

export const FUTURE_PERMISSION_SCOPES = Object.freeze([
  { papel: "corretor", permissao: "pessoas.criar", escopoFuturo: "relacionado" },
  { papel: "corretor", permissao: "pessoas.editar", escopoFuturo: "relacionado" },
  { papel: "corretor", permissao: "leads.visualizar", escopoFuturo: "atribuido" },
  { papel: "corretor", permissao: "leads.editar", escopoFuturo: "atribuido" },
  { papel: "corretor", permissao: "kanban.usar", escopoFuturo: "atribuido" },
  { papel: "corretor", permissao: "agenda.visualizar", escopoFuturo: "proprio" },
  { papel: "corretor", permissao: "agenda.editar", escopoFuturo: "proprio" },
  { papel: "corretor", permissao: "imoveis.criar", escopoFuturo: "proprio" },
  { papel: "corretor", permissao: "imoveis.editar", escopoFuturo: "proprio" },
  { papel: "corretor", permissao: "atendimentos.visualizar", escopoFuturo: "atribuido" },
  { papel: "corretor", permissao: "atendimentos.editar", escopoFuturo: "atribuido" },
  { papel: "corretor", permissao: "atendimentos.assumir", escopoFuturo: "atribuido" },
  { papel: "corretor", permissao: "negocios.visualizar", escopoFuturo: "proprio" },
  { papel: "corretor", permissao: "atividades.visualizar", escopoFuturo: "proprio" },
  { papel: "corretor", permissao: "atividades.editar", escopoFuturo: "proprio" },
  { papel: "corretor", permissao: "timeline.visualizar", escopoFuturo: "relacionado" },
  { papel: "corretor", permissao: "manutencoes.visualizar", escopoFuturo: "atribuido" },
] as const satisfies readonly FuturePermissionScope[]);

export function isPermission(value: unknown): value is Permission {
  return typeof value === "string" && PERMISSION_SET.has(value);
}

export function getPermissionsForRole(papel: unknown): readonly Permission[] {
  if (!isPapelAcesso(papel)) {
    return NO_PERMISSIONS;
  }

  return ROLE_PERMISSIONS[papel];
}

export function hasPermission(
  papel: unknown,
  permissao: unknown,
): permissao is Permission {
  if (!isPapelAcesso(papel) || !isPermission(permissao)) {
    return false;
  }

  return (ROLE_PERMISSIONS[papel] as readonly Permission[]).includes(permissao);
}
