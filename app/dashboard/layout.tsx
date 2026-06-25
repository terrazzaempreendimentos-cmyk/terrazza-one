import { DashboardSidebar } from "./dashboard-sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#F7F3ED] text-[#102A27] lg:pl-72">
      <DashboardSidebar />
      <div>{children}</div>
    </div>
  );
}
