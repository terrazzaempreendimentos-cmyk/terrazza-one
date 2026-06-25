import Link from "next/link";

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

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#f7f3ed] text-[#143d2c] lg:pl-72">
      <aside className="border-b border-[#dfd4c2] bg-white/95 px-5 py-6 shadow-sm lg:fixed lg:inset-y-0 lg:left-0 lg:flex lg:w-72 lg:flex-col lg:overflow-y-auto lg:border-b-0 lg:border-r">
        <div>
          <Link href="/dashboard" className="block">
            <span className="text-xs font-semibold uppercase tracking-[0.28em] text-[#7a8a80]">
              Terrazza
            </span>
            <strong className="mt-2 block text-2xl text-[#143d2c]">
              One
            </strong>
          </Link>
          <p className="mt-3 text-sm leading-6 text-[#6b746c]">
            Painel interno da Terrazza Soluções Imobiliárias.
          </p>
        </div>

        <nav className="mt-8 grid gap-7">
          <Link
            href="/dashboard"
            className="rounded-xl border border-[#dfd4c2] bg-[#f7f3ed] px-4 py-3 text-sm font-semibold text-[#143d2c] transition hover:bg-[#efe7da]"
          >
            Dashboard
          </Link>

          {menuSections.map((section) => (
            <div key={section.title}>
              <p className="px-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#8a918b]">
                {section.title}
              </p>
              <div className="mt-3 grid gap-1">
                {section.links.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="rounded-xl px-4 py-2.5 text-sm font-medium text-[#355346] transition hover:bg-[#f7f3ed] hover:text-[#143d2c]"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>
          ))}

          <Link
            href="/dashboard/configuracoes"
            className="rounded-xl px-4 py-2.5 text-sm font-semibold text-[#355346] transition hover:bg-[#f7f3ed] hover:text-[#143d2c]"
          >
            Configurações
          </Link>
        </nav>
      </aside>

      <div>{children}</div>
    </div>
  );
}
