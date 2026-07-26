import { redirect } from "next/navigation";

import { requirePagePermission } from "../../../../lib/auth/page-permission";

export default async function CorretoresCrmRedirectPage() {
  await requirePagePermission("corretores.visualizar");
  redirect("/dashboard/corretores");
}
