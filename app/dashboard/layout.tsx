import { redirect } from "next/navigation";

import { getOptionalUser } from "../../lib/auth/require-user";
import { DashboardSidebar } from "./dashboard-sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getOptionalUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-[#F7F3ED] text-[#102A27] lg:pl-72">
      <DashboardSidebar />
      <div>{children}</div>
    </div>
  );
}
