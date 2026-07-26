import { redirect } from "next/navigation";

import { getAccessState } from "../../lib/auth/access-profile";
import { DashboardSidebar } from "./dashboard-sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const access = await getAccessState();

  if (access.status === "unauthenticated") {
    redirect("/login");
  }

  if (access.status !== "active_profile") {
    redirect("/acesso-pendente");
  }

  return (
    <div className="min-h-screen bg-[#F7F3ED] text-[#102A27] lg:pl-72">
      <DashboardSidebar />
      <div>{children}</div>
    </div>
  );
}
