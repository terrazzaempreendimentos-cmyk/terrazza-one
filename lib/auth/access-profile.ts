import "server-only";

import { cache } from "react";

import { createClient } from "../supabase/server";
import {
  hasPermission,
  isPermission,
  type Permission,
} from "./permissions";
import { isPapelAcesso, type PapelAcesso } from "./roles";

export type AccessProfile = Readonly<{
  id: string;
  userId: string;
  papel: PapelAcesso;
  ativo: true;
}>;

export type AccessState =
  | { status: "unauthenticated" }
  | { status: "missing_profile" }
  | { status: "inactive_profile" }
  | { status: "active_profile"; profile: AccessProfile };

type AccessProfileRow = {
  id: unknown;
  user_id: unknown;
  papel: unknown;
  ativo: unknown;
};

export class AccessProfileRequiredError extends Error {
  constructor() {
    super("Acesso operacional nao autorizado.");
    this.name = "AccessProfileRequiredError";
  }
}

export class AccessRoleRequiredError extends Error {
  constructor() {
    super("Permissao operacional insuficiente.");
    this.name = "AccessRoleRequiredError";
  }
}

export class AccessPermissionRequiredError extends Error {
  constructor() {
    super("Permissao operacional insuficiente.");
    this.name = "AccessPermissionRequiredError";
  }
}

export const getAccessState = cache(async (): Promise<AccessState> => {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { status: "unauthenticated" };
  }

  const { data, error: profileError } = await supabase
    .from("usuarios_perfis")
    .select("id, user_id, papel, ativo")
    .eq("user_id", user.id)
    .maybeSingle();

  if (profileError) {
    throw new AccessProfileRequiredError();
  }

  if (!data) {
    return { status: "missing_profile" };
  }

  const row = data as AccessProfileRow;
  const hasValidIdentity =
    typeof row.id === "string" && row.user_id === user.id;

  if (!hasValidIdentity || row.ativo !== true || !isPapelAcesso(row.papel)) {
    return { status: "inactive_profile" };
  }

  return {
    status: "active_profile",
    profile: {
      id: row.id as string,
      userId: user.id,
      papel: row.papel,
      ativo: true,
    },
  };
});

export async function getOptionalAccessProfile() {
  const state = await getAccessState();

  return state.status === "active_profile" ? state.profile : null;
}

export async function requireActiveProfile() {
  const state = await getAccessState();

  if (state.status !== "active_profile") {
    throw new AccessProfileRequiredError();
  }

  return state.profile;
}

export async function requireRole(
  ...allowedRoles: [PapelAcesso, ...PapelAcesso[]]
) {
  const profile = await requireActiveProfile();

  if (!allowedRoles.includes(profile.papel)) {
    throw new AccessRoleRequiredError();
  }

  return profile;
}

export async function requirePermission(permissao: Permission) {
  const profile = await requireActiveProfile();

  if (!isPermission(permissao) || !hasPermission(profile.papel, permissao)) {
    throw new AccessPermissionRequiredError();
  }

  return profile;
}
