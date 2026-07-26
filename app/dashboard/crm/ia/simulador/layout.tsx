import { requirePagePermission } from "../../../../../lib/auth/page-permission";

export default async function SimuladorIaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requirePagePermission("ia.usar");

  return children;
}
