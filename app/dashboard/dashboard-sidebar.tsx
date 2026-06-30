"use client";

import { useSyncExternalStore } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  BarChart3,
  BookOpen,
  Bot,
  Brain,
  Building2,
  ChevronDown,
  ChevronRight,
  ClipboardCheck,
  FileText,
  FlaskConical,
  Gauge,
  Home,
  KeyRound,
  LayoutDashboard,
  LineChart,
  Link2,
  ListChecks,
  MailCheck,
  MessageSquareText,
  ScrollText,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  UserCog,
  UsersRound,
  Wrench,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

const STORAGE_KEY = "terrazza-dashboard-menu-open-groups";
const STORAGE_EVENT = "terrazza-dashboard-menu-storage";

type MenuLink = {
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: string;
};

type MenuPlaceholder = {
  label: string;
  icon: LucideIcon;
  disabled: true;
  badge: string;
};

type MenuDivider = {
  type: "divider";
  label: string;
};

type MenuItem = MenuLink | MenuPlaceholder | MenuDivider;

type MenuGroup = {
  id: string;
  title: string;
  icon: LucideIcon;
  links: MenuItem[];
};

const menuGroups: MenuGroup[] = [
  {
    id: "dashboard",
    title: "Dashboard",
    icon: LayoutDashboard,
    links: [{ label: "Visão Geral", href: "/dashboard", icon: Gauge }],
  },
  {
    id: "cadastros",
    title: "Cadastros",
    icon: Building2,
    links: [
      { label: "Proprietários", href: "/dashboard/proprietarios", icon: UsersRound },
      { label: "Pessoas", href: "/dashboard/pessoas", icon: UserCog },
      { label: "Inquilinos", href: "/dashboard/inquilinos", icon: KeyRound },
      { label: "Imóveis", href: "/dashboard/imoveis", icon: Home },
      { label: "Corretores", href: "/dashboard/crm/corretores", icon: ShieldCheck },
      {
        label: "Parceiros",
        icon: Link2,
        disabled: true,
        badge: "Em breve",
      },
    ],
  },
  {
    id: "crm",
    title: "CRM",
    icon: Sparkles,
    links: [
      { label: "CRM Terrazza", href: "/dashboard/crm", icon: Sparkles },
      { label: "Leads", href: "/dashboard/crm/leads", icon: UsersRound },
      { label: "Kanban", href: "/dashboard/crm/kanban", icon: BarChart3 },
      { label: "Agenda Inteligente", href: "/dashboard/crm/agenda", icon: ClipboardCheck },
      { label: "Roleta Inteligente", href: "/dashboard/crm/roleta", icon: Sparkles },
      { label: "Timeline", href: "/dashboard/crm/timeline", icon: ScrollText },
      { label: "Atendimentos", href: "/dashboard/crm/atendimentos", icon: MessageSquareText },
      { label: "Manutencoes e Conflitos", href: "/dashboard/crm/manutencoes", icon: Wrench },
    ],
  },
  {
    id: "uce",
    title: "UCE",
    icon: Brain,
    links: [
      { label: "IA Comercial", href: "/dashboard/crm/ia", icon: Bot },
      {
        label: "UCE Conhecimento",
        href: "/dashboard/crm/ia/conhecimento",
        icon: BookOpen,
      },
      {
        label: "UCE Memória",
        href: "/dashboard/crm/ia/memorias",
        icon: Brain,
      },
      {
        label: "UCE Correspondências",
        icon: MailCheck,
        disabled: true,
        badge: "Em breve",
      },
      {
        label: "UCE Analytics",
        icon: Activity,
        disabled: true,
        badge: "Em breve",
      },
    ],
  },
  {
    id: "inteligencia",
    title: "Inteligência",
    icon: LineChart,
    links: [
      { label: "Dashboard Executivo", icon: LineChart, disabled: true, badge: "Em breve" },
      { label: "Indicadores", icon: Gauge, disabled: true, badge: "Em breve" },
      { label: "Conversão", icon: BarChart3, disabled: true, badge: "Em breve" },
      {
        label: "Performance Comercial",
        icon: Activity,
        disabled: true,
        badge: "Em breve",
      },
      { label: "Relatórios", icon: FileText, disabled: true, badge: "Em breve" },
    ],
  },
  {
    id: "administracao",
    title: "Administração",
    icon: Settings,
    links: [
      { label: "Configurações", href: "/dashboard/configuracoes", icon: Settings },
      { label: "Usuários", icon: UserCog, disabled: true, badge: "Em breve" },
      { label: "Perfis", icon: ShieldCheck, disabled: true, badge: "Em breve" },
      {
        label: "Integrações",
        icon: SlidersHorizontal,
        disabled: true,
        badge: "Em breve",
      },
      { type: "divider", label: "Laboratório UCE" },
      {
        label: "Simulador IA",
        href: "/dashboard/crm/ia/simulador",
        icon: MessageSquareText,
      },
      { label: "Diagnóstico", icon: Gauge, disabled: true, badge: "Em breve" },
      { label: "Logs", icon: ListChecks, disabled: true, badge: "Em breve" },
      {
        label: "Testes OpenAI",
        icon: FlaskConical,
        disabled: true,
        badge: "Em breve",
      },
      {
        label: "Guardrails",
        icon: ShieldCheck,
        disabled: true,
        badge: "Em breve",
      },
    ],
  },
];

type OpenGroups = Record<string, boolean>;

function createDefaultOpenGroups() {
  return menuGroups.reduce<OpenGroups>((groups, group) => {
    groups[group.id] = true;
    return groups;
  }, {});
}

const DEFAULT_OPEN_GROUPS = createDefaultOpenGroups();

let cachedOpenGroupsRaw: string | null = null;
let cachedOpenGroupsSnapshot: OpenGroups = DEFAULT_OPEN_GROUPS;

function getStoredOpenGroups() {
  if (typeof window === "undefined") return DEFAULT_OPEN_GROUPS;

  const storedGroups = window.localStorage.getItem(STORAGE_KEY);

  if (!storedGroups) {
    cachedOpenGroupsRaw = null;
    cachedOpenGroupsSnapshot = DEFAULT_OPEN_GROUPS;

    return cachedOpenGroupsSnapshot;
  }

  if (storedGroups === cachedOpenGroupsRaw) {
    return cachedOpenGroupsSnapshot;
  }

  try {
    cachedOpenGroupsRaw = storedGroups;
    cachedOpenGroupsSnapshot = {
      ...DEFAULT_OPEN_GROUPS,
      ...JSON.parse(storedGroups),
    };

    return cachedOpenGroupsSnapshot;
  } catch {
    cachedOpenGroupsRaw = null;
    cachedOpenGroupsSnapshot = DEFAULT_OPEN_GROUPS;

    return cachedOpenGroupsSnapshot;
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

function isGroupActive(pathname: string, links: MenuItem[]) {
  return links.some((link) => "href" in link && isLinkActive(pathname, link.href));
}

function subitemClassName(isActive: boolean) {
  return [
    "group/link relative flex items-center gap-3 rounded-xl border px-3 py-2.5 text-sm font-medium transition duration-300",
    isActive
      ? "border-[#C89B3C]/45 bg-[#C89B3C]/12 text-white shadow-[inset_3px_0_0_#C89B3C]"
      : "border-transparent text-white/68 hover:border-white/10 hover:bg-[#0A2A4A] hover:text-white",
  ].join(" ");
}

function disabledSubitemClassName() {
  return [
    "relative flex cursor-not-allowed items-center gap-3 rounded-xl border border-transparent px-3 py-2.5 text-sm font-medium",
    "text-white/34",
  ].join(" ");
}

function badgeClassName(disabled = false) {
  return [
    "ml-auto shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em]",
    disabled
      ? "border-white/10 bg-white/[0.035] text-white/32"
      : "border-[#C89B3C]/30 bg-[#C89B3C]/10 text-[#E1B866]",
  ].join(" ");
}

export function DashboardSidebar() {
  const pathname = usePathname();
  const openGroups = useSyncExternalStore(
    subscribeOpenGroups,
    getStoredOpenGroups,
    () => DEFAULT_OPEN_GROUPS,
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
          <Image
            src="/terrazza-logo.png"
            alt="Terrazza Soluções Imobiliárias"
            width={900}
            height={520}
            priority
            className="h-auto w-full rounded-2xl object-contain"
          />
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
                      if ("type" in link) {
                        return (
                          <div key={link.label} className="px-3 py-2">
                            <div className="mb-2 h-px bg-white/10" />
                            <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#E1B866]/80">
                              {link.label}
                            </span>
                          </div>
                        );
                      }

                      const LinkIcon = link.icon;

                      if ("disabled" in link) {
                        return (
                          <span
                            key={link.label}
                            className={disabledSubitemClassName()}
                            aria-disabled="true"
                            title={link.badge}
                          >
                            <LinkIcon size={16} strokeWidth={2.1} className="text-white/24" />
                            <span className="min-w-0 flex-1 truncate">{link.label}</span>
                            <span className={badgeClassName(true)}>{link.badge}</span>
                          </span>
                        );
                      }

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
                          <span className="min-w-0 flex-1 truncate">{link.label}</span>
                          {link.badge ? (
                            <span className={badgeClassName()}>{link.badge}</span>
                          ) : null}
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
