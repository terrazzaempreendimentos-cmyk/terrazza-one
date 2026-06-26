"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Building2,
  ChevronDown,
  ChevronRight,
  CircleDollarSign,
  ClipboardCheck,
  FileText,
  Gauge,
  Home,
  KeyRound,
  LayoutDashboard,
  LineChart,
  MessageCircle,
  Settings,
  ShieldCheck,
  Sparkles,
  UsersRound,
  Wrench,
} from "lucide-react";

const STORAGE_KEY = "terrazza-dashboard-menu-open-groups";
const STORAGE_EVENT = "terrazza-dashboard-menu-storage";

const menuGroups = [
  {
    id: "dashboard",
    title: "Dashboard",
    icon: LayoutDashboard,
    links: [{ label: "Visão geral", href: "/dashboard", icon: Gauge }],
  },
  {
    id: "cadastros",
    title: "Cadastros",
    icon: Building2,
    links: [
      { label: "Proprietários", href: "/dashboard/proprietarios", icon: UsersRound },
      { label: "Imóveis", href: "/dashboard/imoveis", icon: Home },
      { label: "Inquilinos", href: "/dashboard/inquilinos", icon: KeyRound },
    ],
  },
  {
    id: "crm",
    title: "Terrazza CRM",
    icon: Sparkles,
    links: [
      { label: "Leads", href: "/dashboard/crm/leads", icon: UsersRound },
      { label: "Kanban", href: "/dashboard/crm/kanban", icon: BarChart3 },
      { label: "IA WhatsApp", href: "/dashboard/crm/ia-whatsapp", icon: MessageCircle },
      { label: "Agenda Inteligente", href: "/dashboard/crm/agenda", icon: ClipboardCheck },
      { label: "Corretores", href: "/dashboard/crm/corretores", icon: ShieldCheck },
    ],
  },
  {
    id: "inteligencia",
    title: "Inteligência",
    icon: LineChart,
    links: [
      { label: "Dashboard Executivo", href: "/dashboard/inteligencia", icon: LineChart },
      { label: "KPIs", href: "/dashboard/inteligencia/kpis", icon: Gauge },
    ],
  },
  {
    id: "administracao",
    title: "Administração",
    icon: FileText,
    links: [
      { label: "Contratos", href: "/dashboard/administracao/contratos", icon: FileText },
      { label: "Garantias", href: "/dashboard/administracao/garantias", icon: ShieldCheck },
      { label: "Vistorias", href: "/dashboard/administracao/vistorias", icon: ClipboardCheck },
      { label: "Manutenções", href: "/dashboard/administracao/manutencoes", icon: Wrench },
      { label: "Documentos", href: "/dashboard/administracao/documentos", icon: FileText },
      { label: "Financeiro", href: "/dashboard/administracao/financeiro", icon: CircleDollarSign },
    ],
  },
  {
    id: "configuracoes",
    title: "Configurações",
    icon: Settings,
    links: [{ label: "Configurações", href: "/dashboard/configuracoes", icon: Settings }],
  },
];

type OpenGroups = Record<string, boolean>;

function defaultOpenGroups() {
  return menuGroups.reduce<OpenGroups>((groups, group) => {
    groups[group.id] = true;
    return groups;
  }, {});
}

function getStoredOpenGroups() {
  const fallbackGroups = defaultOpenGroups();

  if (typeof window === "undefined") return fallbackGroups;

  const storedGroups = window.localStorage.getItem(STORAGE_KEY);

  if (!storedGroups) return fallbackGroups;

  try {
    return { ...fallbackGroups, ...JSON.parse(storedGroups) };
  } catch {
    return fallbackGroups;
  }
}

function subscribeOpenGroups(onStoreChange: () => void) {
  window.addEventListener(STORAGE_EVENT, onStoreChange);
  window.addEventListener("storage", onStoreChange);

  return () => {
    window.removeEventListener(STORAGE_EVENT, onStoreChange);
    window.removeEventListener("storage", onStoreChange);
  };
}

function isLinkActive(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === href;

  return pathname === href || pathname.startsWith(`${href}/`);
}

function isGroupActive(pathname: string, links: { href: string }[]) {
  return links.some((link) => isLinkActive(pathname, link.href));
}

function subitemClassName(isActive: boolean) {
  return [
    "group/link relative flex items-center gap-3 rounded-xl border px-3 py-2.5 text-sm font-medium transition duration-300",
    isActive
      ? "border-[#C89B3C]/45 bg-[#C89B3C]/12 text-white shadow-[inset_3px_0_0_#C89B3C]"
      : "border-transparent text-white/68 hover:border-white/10 hover:bg-[#0A2A4A] hover:text-white",
  ].join(" ");
}

export function DashboardSidebar() {
  const pathname = usePathname();
  const openGroups = useSyncExternalStore(
    subscribeOpenGroups,
    getStoredOpenGroups,
    defaultOpenGroups,
  );

  function toggleGroup(groupId: string) {
    const nextGroups = {
      ...openGroups,
      [groupId]: !openGroups[groupId],
    };

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextGroups));
    window.dispatchEvent(new Event(STORAGE_EVENT));
  }

  return (
    <aside className="border-b border-white/10 bg-[#071E36] px-4 py-5 shadow-2xl shadow-[#071E36]/20 lg:fixed lg:inset-y-0 lg:left-0 lg:flex lg:w-72 lg:flex-col lg:overflow-y-auto lg:border-b-0 lg:border-r">
      <div className="rounded-3xl border border-[#C89B3C]/30 bg-white/[0.035] p-5 shadow-inner shadow-white/5">
        <Link href="/dashboard" className="block">
          <span className="text-xs font-semibold uppercase tracking-[0.32em] text-[#E1B866]">
            TERRAZZA
          </span>
          <strong className="mt-2 block text-3xl leading-none text-white">
            One
          </strong>
          <span className="mt-4 block h-px w-16 bg-[#C89B3C]" />
          <p className="mt-3 text-sm font-medium text-white/70">
            Painel Operacional
          </p>
        </Link>
      </div>

      <nav className="mt-6 grid gap-2">
        {menuGroups.map((group) => {
          const Icon = group.icon;
          const isOpen = openGroups[group.id] ?? true;
          const groupActive = isGroupActive(pathname, group.links);

          return (
            <section
              key={group.id}
              className={[
                "rounded-2xl border transition duration-300",
                groupActive
                  ? "border-[#C89B3C]/35 bg-[#C89B3C]/10"
                  : "border-transparent bg-transparent",
              ].join(" ")}
            >
              <button
                type="button"
                onClick={() => toggleGroup(group.id)}
                className={[
                  "flex w-full items-center justify-between gap-3 rounded-2xl px-3 py-3 text-left transition duration-300",
                  groupActive
                    ? "text-[#E1B866]"
                    : "text-white/80 hover:bg-[#0A2A4A] hover:text-white",
                ].join(" ")}
                aria-expanded={isOpen}
              >
                <span className="flex min-w-0 items-center gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/[0.06] text-[#E1B866]">
                    <Icon size={17} strokeWidth={2.2} />
                  </span>
                  <span className="truncate text-sm font-semibold">
                    {group.title}
                  </span>
                </span>
                {isOpen ? (
                  <ChevronDown size={16} strokeWidth={2.2} />
                ) : (
                  <ChevronRight size={16} strokeWidth={2.2} />
                )}
              </button>

              <div
                className={[
                  "grid overflow-hidden transition-all duration-300 ease-in-out",
                  isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
                ].join(" ")}
              >
                <div className="min-h-0">
                  <div className="grid gap-1 px-2 pb-3 pt-1">
                    {group.links.map((link) => {
                      const LinkIcon = link.icon;
                      const active = isLinkActive(pathname, link.href);

                      return (
                        <Link
                          key={link.href}
                          href={link.href}
                          className={subitemClassName(active)}
                        >
                          <span
                            className={[
                              "absolute left-0 top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-full transition duration-300",
                              active ? "bg-[#C89B3C]" : "bg-transparent",
                            ].join(" ")}
                          />
                          <LinkIcon
                            size={16}
                            strokeWidth={2.1}
                            className={active ? "text-[#E1B866]" : "text-white/45"}
                          />
                          <span className="truncate">{link.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              </div>
            </section>
          );
        })}
      </nav>
    </aside>
  );
}
