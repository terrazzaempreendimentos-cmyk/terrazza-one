import Link from "next/link";

import { hasPermission } from "../../../../lib/auth/permissions";
import { requirePagePermission } from "../../../../lib/auth/page-permission";
import {
  getLeadTemperatureLabel,
  LEAD_FUNNEL_STAGES,
  type LeadFunnelStage,
  type LeadSemanticVariant,
} from "../../../../lib/crm/leads/catalogs";
import { createClient } from "../../../../lib/supabase/server";
import { MarkLost, QuickMove, ReopenLost } from "./move-controls";

type Lead = {
  id: string;
  nome: string;
  telefone: string | null;
  email: string | null;
  etapa_funil: LeadFunnelStage;
  status_operacional: string;
  temperatura: string | null;
  responsavel_id: string | null;
  updated_at: string | null;
  responsavel_pessoa: unknown;
};

const NORMAL_FLOW = LEAD_FUNNEL_STAGES.filter((stage) => stage.id !== "perdido");
const REOPEN_STAGES = LEAD_FUNNEL_STAGES.filter((stage) => !stage.isFinal).map((stage) => ({
  id: stage.id,
  label: stage.label,
}));

function responsibleName(value: unknown) {
  const relation = Array.isArray(value) ? value[0] : value;
  if (!relation || typeof relation !== "object") return "Não atribuído";
  const name = (relation as { nome?: unknown }).nome;
  return typeof name === "string" && name.trim() ? name.trim() : "Não atribuído";
}

function formatUpdatedAt(value: string | null) {
  if (!value) return "Não informada";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Não informada";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function stageAccent(variant: LeadSemanticVariant) {
  const classes: Record<LeadSemanticVariant, string> = {
    neutral: "border-t-slate-400",
    info: "border-t-sky-500",
    warning: "border-t-amber-500",
    primary: "border-t-[#C89B3C]",
    success: "border-t-emerald-500",
    danger: "border-t-red-500",
    muted: "border-t-slate-300",
  };
  return classes[variant];
}

export default async function KanbanPage() {
  const profile = await requirePagePermission("kanban.usar");
  const canMove =
    hasPermission(profile.papel, "leads.editar") &&
    (profile.papel === "administrador" || profile.papel === "gestor");
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("leads")
    .select(
      "id, nome, telefone, email, etapa_funil, status_operacional, temperatura, responsavel_id, updated_at, responsavel_pessoa:pessoas!leads_responsavel_id_fkey(nome)",
    )
    .neq("status_operacional", "arquivado")
    .order("updated_at", { ascending: false });

  if (error) {
    console.error({ modulo: "crm_kanban", etapa: "list", codigo: error.code });
  }
  const leads = error ? [] : ((data ?? []) as unknown as Lead[]);

  return (
    <main className="min-h-screen bg-[#F7F3ED] px-6 py-10 sm:px-8">
      <div className="mx-auto max-w-[1800px]">
        <header>
          <span className="rounded-full border border-[#C89B3C]/35 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#8B6827]">Terrazza CRM</span>
          <h1 className="mt-5 text-4xl font-bold text-[#071E36]">Kanban operacional</h1>
          <p className="mt-2 text-[#64736D]">Movimentações seguras pelo funil canônico, com histórico atômico na Timeline.</p>
        </header>

        {error ? (
          <p role="alert" className="mt-8 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">Não foi possível carregar o Kanban.</p>
        ) : leads.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-[#E8DDCB] bg-white p-5 text-sm text-[#64736D]">Nenhum Lead operacional encontrado. <Link href="/dashboard/crm/leads" className="font-semibold text-[#8B6827] underline">Cadastrar Lead</Link></div>
        ) : null}

        <section className="mt-8 flex gap-5 overflow-x-auto pb-5">
          {LEAD_FUNNEL_STAGES.map((stage) => {
            const stageLeads = leads.filter((lead) => lead.etapa_funil === stage.id);
            return (
              <section key={stage.id} className={`min-w-[300px] flex-1 rounded-2xl border border-t-4 border-[#E8DDCB] bg-white p-4 shadow-sm ${stageAccent(stage.variant)}`}>
                <header className="flex items-start justify-between gap-3">
                  <div><h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-[#071E36]">{stage.label}</h2><p className="mt-1 text-xs text-[#64736D]">{stage.description}</p></div>
                  <span className="rounded-full bg-[#C89B3C]/10 px-2.5 py-1 text-xs font-semibold text-[#8B6827]">{stageLeads.length}</span>
                </header>

                <div className="mt-4 grid gap-3">
                  {stageLeads.length === 0 ? <p className="rounded-xl bg-[#F7F3ED] px-4 py-6 text-center text-sm text-[#64736D]">Sem Leads nesta etapa.</p> : stageLeads.map((lead) => (
                    <KanbanCard key={lead.id} lead={lead} canMove={canMove} />
                  ))}
                </div>
              </section>
            );
          })}
        </section>
      </div>
    </main>
  );
}

function KanbanCard({ lead, canMove }: { lead: Lead; canMove: boolean }) {
  const flowIndex = NORMAL_FLOW.findIndex((stage) => stage.id === lead.etapa_funil);
  const previous = flowIndex > 0 ? NORMAL_FLOW[flowIndex - 1] : null;
  const next = flowIndex >= 0 && flowIndex < NORMAL_FLOW.length - 1
    ? NORMAL_FLOW[flowIndex + 1]
    : null;

  return (
    <article className="rounded-xl border border-[#E8DDCB] bg-[#fffdfa] p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3"><h3 className="font-semibold text-[#071E36]">{lead.nome}</h3>{lead.temperatura ? <span className="rounded-full bg-amber-50 px-2 py-1 text-[11px] font-semibold text-amber-700">{getLeadTemperatureLabel(lead.temperatura) ?? "Inválida"}</span> : null}</div>
      <p className="mt-2 truncate text-sm text-[#64736D]">{lead.telefone || lead.email || "Contato não informado"}</p>
      <dl className="mt-3 grid gap-1 text-xs text-[#64736D]"><div><dt className="inline font-semibold text-[#071E36]">Responsável: </dt><dd className="inline">{responsibleName(lead.responsavel_pessoa)}</dd></div><div><dt className="inline font-semibold text-[#071E36]">Atualizado: </dt><dd className="inline">{formatUpdatedAt(lead.updated_at)}</dd></div></dl>
      <Link href={`/dashboard/crm/leads/${lead.id}`} className="mt-3 inline-flex text-xs font-semibold text-[#8B6827] underline">Abrir Lead</Link>

      {canMove && lead.etapa_funil === "perdido" ? <div className="mt-4"><ReopenLost leadId={lead.id} stages={REOPEN_STAGES} /></div> : null}
      {canMove && flowIndex >= 0 && lead.etapa_funil !== "fechado" ? (
        <div className="mt-4 grid gap-3 border-t border-[#E8DDCB] pt-3">
          <div className="flex flex-wrap gap-2">
            {previous ? <QuickMove leadId={lead.id} destination={previous.id} label="Voltar" /> : null}
            {next ? <QuickMove leadId={lead.id} destination={next.id} label="Avançar" /> : null}
          </div>
          <MarkLost leadId={lead.id} />
        </div>
      ) : null}
    </article>
  );
}
