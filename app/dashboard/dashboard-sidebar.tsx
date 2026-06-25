"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const menuSections = [
  {
    title: "Cadastros",
    links: [
      { label: "Proprietários", href: "/dashboard/proprietarios" },
      { label: "Imóveis", href: "/dashboard/imoveis" },
      { label: "Inquilinos", href: "/dashboard/inquilinos" },
    ],
  },
  {
    title: "Terrazza CRM",
    links: [
      { label: "Leads", href: "/dashboard/crm/leads" },
      { label: "Kanban", href: "/dashboard/crm/kanban" },
      { label: "IA WhatsApp", href: "/dashboard/crm/ia-whatsapp" },
      { label: "Agenda", href: "/dashboard/crm/agenda" },
      { label: "Corretores", href: "/dashboard/crm/corretores" },
    ],
  },
  {
    title: "Administração",
    links: [
      { label: "Contratos", href: "/dashboard/administracao/contratos" },
      { label: "Garantias", href: "/dashboard/administracao/garantias" },
      { label: "Vistorias", href: "/dashboard/administracao/vistorias" },
      { label: "Manutenções", href: "/dashboard/administracao/manutencoes" },
      { label: "Documentos", href: "/dashboard/administracao/documentos" },
      { label: "Financeiro", href: "/dashboard/administracao/financeiro" },
    ],
  },
  {
    title: "Inteligência",
    links: [
      { label: "Dashboard Executivo", href: "/dashboard/inteligencia" },
      { label: "KPIs", href: "/dashboard/inteligencia/kpis" },
    ],
  },
];

function linkClassName(isActive: boolean) {
  return [
    "rounded-xl border px-4 py-2.5 text-sm font-medium transition",
    isActive
      ? "border-[#C89B3C]/70 bg-[#C89B3C]/15 text-white shadow-[inset_3px_0_0_#C89B3C]"
      : "border-transparent text-white/75 hover:border-white/10 hover:bg-[#0A2A4A] hover:text-white",
  ].join(" ");
}

export function DashboardSidebar() {
  const pathname = usePathname();

  return (
    <aside className="border-b border-white/10 bg-[#071E36] px-5 py-6 shadow-2xl shadow-[#071E36]/20 lg:fixed lg:inset-y-0 lg:left-0 lg:flex lg:w-72 lg:flex-col lg:overflow-y-auto lg:border-b-0 lg:border-r">
      <div className="rounded-2xl border border-[#C89B3C]/30 bg-white/[0.03] p-5">
        <Link href="/dashboard" className="block">
          <span className="text-xs font-semibold uppercase tracking-[0.32em] text-[#E1B866]">
            TERRAZZA
          </span>
          <strong className="mt-2 block text-3xl leading-none text-white">
            One
          </strong>
          <span className="mt-3 block h-px w-16 bg-[#C89B3C]" />
          <p className="mt-3 text-sm font-medium text-white/70">
            Painel Operacional
          </p>
        </Link>
      </div>

      <nav className="mt-8 grid gap-7">
        <Link
          href="/dashboard"
          className={linkClassName(pathname === "/dashboard")}
        >
          Dashboard
        </Link>

        {menuSections.map((section) => (
          <div key={section.title}>
            <p className="px-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#E1B866]">
              {section.title}
            </p>
            <div className="mt-3 grid gap-1">
              {section.links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={linkClassName(pathname === link.href)}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        ))}

        <Link
          href="/dashboard/configuracoes"
          className={linkClassName(pathname === "/dashboard/configuracoes")}
        >
          Configurações
        </Link>
      </nav>
    </aside>
  );
}
