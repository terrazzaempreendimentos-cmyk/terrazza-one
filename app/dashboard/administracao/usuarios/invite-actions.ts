"use server";
import { revalidatePath } from "next/cache";
import { requirePermission, requireRole } from "../../../../lib/auth/access-profile";
import { createAdminClient } from "../../../../lib/supabase/admin";
import { createClient } from "../../../../lib/supabase/server";
import { isAccessRole, isAccessUuid, isSaveUserAccessResult, type AccessRole } from "../../../../lib/admin/access/contracts";
export type InviteState = { status: "idle" | "success" | "error"; message?: string };
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export async function convidarNovoUsuario(_: InviteState, formData: FormData): Promise<InviteState> {
  await requirePermission("usuarios.administrar"); await requireRole("administrador");
  const email = String(formData.get("email") ?? "").trim().toLowerCase(); const papel = String(formData.get("papel") ?? ""); const ativo = formData.get("ativo") === "true"; const pessoa = String(formData.get("pessoa_id") ?? "").trim() || null;
  if (!emailPattern.test(email) || email.length > 254) return { status: "error", message: "E-mail invalido." };
  if (!isAccessRole(papel)) return { status: "error", message: "Papel invalido." };
  if (pessoa && !isAccessUuid(pessoa)) return { status: "error", message: "Pessoa inexistente." };
  let admin; try { admin = createAdminClient(); } catch { return { status: "error", message: "O servico de convites ainda nao esta configurado." }; }
  const site = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, ""); if (!site || !/^https?:\/\/[^/]+$/i.test(site)) return { status: "error", message: "O servico de convites ainda nao esta configurado." };
  const { data, error } = await admin.auth.admin.inviteUserByEmail(email, { redirectTo: `${site}/auth/confirm?next=%2Fdefinir-senha` });
  if (error) { const existing = /already|exists|registered|duplicate/i.test(error.message); return { status: "error", message: existing ? "Este e-mail ja pertence a um usuario. Configure o acesso na listagem existente." : "Nao foi possivel enviar o convite." }; }
  const userId = data.user?.id; if (!userId) return { status: "error", message: "Nao foi possivel enviar o convite." };
  const result = await (await createClient()).rpc("salvar_usuario_acesso", { p_user_id: userId, p_papel: papel as AccessRole, p_ativo: ativo, p_pessoa_id: pessoa, p_updated_at_esperado: null });
  const row = Array.isArray(result.data) ? result.data[0] : result.data;
  if (result.error || !isSaveUserAccessResult(row) || row.user_id !== userId || row.papel !== papel || row.ativo !== ativo || row.pessoa_id !== pessoa || row.operacao !== "perfil_criado") { revalidatePath("/dashboard/administracao/usuarios"); return { status: "success", message: "Convite enviado, mas o acesso ainda precisa ser configurado na listagem." }; }
  revalidatePath("/dashboard/administracao/usuarios"); revalidatePath("/dashboard/administracao"); revalidatePath("/dashboard"); return { status: "success", message: "Convite enviado e acesso configurado com sucesso." };
}
