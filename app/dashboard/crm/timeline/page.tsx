import { redirect } from "next/navigation";
import { requirePagePermission } from "../../../../lib/auth/page-permission";
export default async function LegacyTimelinePage() { await requirePagePermission("timeline.visualizar"); redirect("/dashboard/administracao/timeline"); }
