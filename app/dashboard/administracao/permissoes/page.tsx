import { requirePagePermission } from "../../../../lib/auth/page-permission";
import { PERMISSIONS, getPermissionsForRole } from "../../../../lib/auth/permissions";
import { ACCESS_ROLES } from "../../../../lib/admin/access/catalogs";

export default async function PermissoesPage() {
  await requirePagePermission("configuracoes.administrar");
  return <main className="min-h-screen bg-[#F7F3ED] px-6 py-10"><div className="mx-auto max-w-7xl"><h1 className="text-4xl font-bold text-[#071E36]">Matriz de permissões</h1><p className="mt-2 text-sm text-[#64736D]">Visão documental somente leitura.</p><div className="mt-8 overflow-auto rounded-3xl border border-[#E8DDCB] bg-white"><table className="min-w-full text-left text-sm"><thead><tr className="border-b border-[#E8DDCB]"><th className="p-4">Permissão</th>{ACCESS_ROLES.map((role) => <th key={role} className="p-4 capitalize">{role}</th>)}</tr></thead><tbody>{PERMISSIONS.map((permission) => <tr key={permission} className="border-b border-[#F0E9DD]"><td className="p-4 font-medium">{permission}</td>{ACCESS_ROLES.map((role) => <td key={role} className="p-4">{getPermissionsForRole(role).includes(permission) ? "Permitido" : "Negado"}</td>)}</tr>)}</tbody></table></div></div></main>;
}
