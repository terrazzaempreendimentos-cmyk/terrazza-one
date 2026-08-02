import { requirePermission, requireRole } from "../../../../lib/auth/access-profile";
import { createClient } from "../../../../lib/supabase/server";
import { isSafeUserAccess, type SafeUserAccess } from "../../../../lib/admin/access/contracts";
import { UserAccessForm } from "./user-access-form";
import { InviteForm } from "./invite-form";
type PersonOption = { id: string; nome: string; ativo: boolean };

export default async function UsuariosPage() {
  const actor = await requirePermission("usuarios.administrar"); await requireRole("administrador");
  const supabase = await createClient();
  const [{ data, error }, { data: people }] = await Promise.all([supabase.rpc("listar_usuarios_acessos"), supabase.from("pessoas").select("id, nome, ativo").eq("ativo", true).not("nome", "is", null).order("nome")]);
  const users = (Array.isArray(data) ? data : data ? [data] : []).filter(isSafeUserAccess) as SafeUserAccess[];
  if (error) return <main className="p-8"><p role="alert">Não foi possível carregar os acessos.</p></main>;
  const options = (people ?? []).filter((person): person is PersonOption => typeof person.id === "string" && typeof person.nome === "string" && typeof person.ativo === "boolean");
  return <main className="min-h-screen bg-[#F7F3ED] p-8"><h1 className="text-3xl font-bold text-[#071E36]">Usuários e acessos</h1><p className="mt-2 text-[#64736D]">A gestão atual permite configurar usuários que já existem no sistema de autenticação. Convites serão adicionados em uma próxima etapa.</p><InviteForm people={options} /><div className="mt-6 grid gap-3">{users.map((user) => <UserAccessForm key={`${user.user_id}:${user.perfil_updated_at ?? "sem-perfil"}`} user={user} people={options} currentUserId={actor.userId} />)}</div></main>;
}
