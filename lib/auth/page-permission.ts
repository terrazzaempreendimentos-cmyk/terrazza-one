import "server-only";

import { redirect } from "next/navigation";

import { getAccessState } from "./access-profile";
import { hasPermission, isPermission, type Permission } from "./permissions";

export async function requirePagePermission(permissao: Permission) {
  const access = await getAccessState();

  if (access.status === "unauthenticated") {
    redirect("/login");
  }

  if (access.status !== "active_profile") {
    redirect("/acesso-pendente");
  }

  if (!isPermission(permissao) || !hasPermission(access.profile.papel, permissao)) {
    redirect("/acesso-negado");
  }

  return access.profile;
}
