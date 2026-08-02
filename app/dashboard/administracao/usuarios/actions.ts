"use server";

import { revalidatePath } from "next/cache";
import { requirePermission, requireRole } from "../../../../lib/auth/access-profile";
import { createClient } from "../../../../lib/supabase/server";
import { isAccessRole, isAccessTimestamp, isAccessUuid, isSaveUserAccessResult, type AccessRole } from "../../../../lib/admin/access/contracts";

export type UserAccessActionState = { status: "idle" | "success" | "error"; message?: string };

const SAFE_ERRORS = new Set([
  "Operacao nao autorizada.", "Usuario inexistente.", "Papel invalido.", "Pessoa inexistente.",
  "Pessoa ja vinculada.", "Perfil inexistente.", "Perfil atualizado por outra operacao.",
  "Voce nao pode inativar o proprio acesso.", "Voce nao pode alterar o proprio papel administrativo.",
  "O sistema deve manter pelo menos um administrador ativo.", "Estado de perfil invalido.", "Retorno inesperado.",
  "Falha ao salvar acesso.",
]);

export async function salvarUsuarioAcesso(_prev: UserAccessActionState, formData: FormData): Promise<UserAccessActionState> {
  const actor = await requirePermission("usuarios.administrar");
  await requireRole("administrador");
  const userId = String(formData.get("user_id") ?? "");
  const papel = String(formData.get("papel") ?? "");
  const ativoValues = formData.getAll("ativo");
  if (ativoValues.length > 1) return { status: "error", message: "Selecione um estado de acesso valido." };
  const ativoRaw = ativoValues.length === 0 ? "false" : String(ativoValues[0]);
  const pessoaRaw = String(formData.get("pessoa_id") ?? "").trim();
  const updatedRaw = String(formData.get("updated_at_esperado") ?? "").trim();
  if (!isAccessUuid(userId) || !isAccessRole(papel) || !["true", "false"].includes(ativoRaw) || (pessoaRaw && !isAccessUuid(pessoaRaw)) || (updatedRaw && !isAccessTimestamp(updatedRaw))) return { status: "error", message: "Selecione um papel de acesso valido." };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("salvar_usuario_acesso", {
    p_user_id: userId, p_papel: papel as AccessRole, p_ativo: ativoRaw === "true", p_pessoa_id: pessoaRaw || null, p_updated_at_esperado: updatedRaw || null,
  });
  if (error) {
    const message = SAFE_ERRORS.has(error.message) ? error.message : "Falha ao salvar acesso.";
    return { status: "error", message };
  }
  const result = Array.isArray(data) ? data[0] : data;
  if (!isSaveUserAccessResult(result) || result.user_id !== userId || result.papel !== papel || result.ativo !== (ativoRaw === "true") || result.pessoa_id !== (pessoaRaw || null)) return { status: "error", message: "O acesso retornado nao corresponde aos valores solicitados." };
  void actor;
  revalidatePath("/dashboard/administracao"); revalidatePath("/dashboard/administracao/usuarios"); revalidatePath("/dashboard");
  return { status: "success", message: result.operacao === "perfil_criado" ? "Acesso configurado com sucesso." : "Acesso atualizado com sucesso." };
}
