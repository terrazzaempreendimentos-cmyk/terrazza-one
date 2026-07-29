import Link from "next/link";
import { AlertCircle, Clock3, Flame, MessageSquareText, UserRoundCheck } from "lucide-react";

import { hasPermission } from "../../../../lib/auth/permissions";
import { requirePagePermission } from "../../../../lib/auth/page-permission";
import {
  getAtendimentoChannelLabel,
  getAtendimentoPriorityLabel,
  getAtendimentoResultLabel,
  getAtendimentoStatusLabel,
  isAtendimentoChannel,
  isAtendimentoFinalStatus,
  isAtendimentoOrigin,
  isAtendimentoPriority,
  isAtendimentoResult,
  isAtendimentoStatus,
  type AtendimentoChannel,
  type AtendimentoOrigin,
  type AtendimentoPriority,
  type AtendimentoResult,
  type AtendimentoStatus,
} from "../../../../lib/crm/atendimentos/catalogs";
import { isAtendimentoOpenManagedStatus } from "../../../../lib/crm/atendimentos/rpc-contracts";
import { createClient } from "../../../../lib/supabase/server";
import {
  AssumeAtendimentoForm,
  ChangeAtendimentoStateForm,
  CreateAtendimentoForm,
  FinalAtendimentoControls,
  type EligibleLeadOption,
} from "./operation-forms";

type Relation = { id: string; nome: string | null };

type Atendimento = {
  id: string;
  lead_id: string;
  responsavel_id: string | null;
  atendimento_anterior_id: string | null;
  status: AtendimentoStatus;
  prioridade: AtendimentoPriority;
  canal: AtendimentoChannel;
  origem: AtendimentoOrigin;
  assunto: string | null;
  resumo: string | null;
  proxima_acao_em: string | null;
  assumido_em: string | null;
  created_at: string;
  updated_at: string;
  resultado: AtendimentoResult | null;
  concluido_em: string | null;
  cancelado_em: string | null;
  lead: unknown;
  responsavel: unknown;
};

type AtendimentoRaw = Record<string, unknown>;
type LeadRaw = { id: unknown; nome: unknown; etapa_funil: unknown; status_operacional: unknown };

const OPEN_STATUSES: readonly AtendimentoStatus[] = ["aguardando", "em_atendimento", "aguardando_cliente", "aguardando_interno"];
const ELIGIBLE_LEAD_STAGES = ["novo", "qualificacao", "atendimento", "visita_avaliacao", "proposta", "negociacao", "documentacao"] as const;

export default async function AtendimentosPage() {
  const profile = await requirePagePermission("atendimentos.visualizar");
  const supabase = await createClient();
  const bankAllowsMutation = profile.papel === "administrador" || profile.papel === "gestor";
  const canCreate = bankAllowsMutation && hasPermission(profile.papel, "atendimentos.criar");
  const canAssume = bankAllowsMutation && hasPermission(profile.papel, "atendimentos.assumir");
  const canEdit = bankAllowsMutation && hasPermission(profile.papel, "atendimentos.editar");
  const canConclude = bankAllowsMutation && hasPermission(profile.papel, "atendimentos.concluir");
  const canCancel = bankAllowsMutation && hasPermission(profile.papel, "atendimentos.cancelar");
  const canReopen = bankAllowsMutation && hasPermission(profile.papel, "atendimentos.reabrir");

  const atendimentosPromise = supabase
    .from("atendimentos")
    .select("id, lead_id, responsavel_id, atendimento_anterior_id, status, prioridade, canal, origem, assunto, resumo, proxima_acao_em, assumido_em, created_at, updated_at, resultado, concluido_em, cancelado_em, lead:leads!atendimentos_lead_id_fkey(id, nome), responsavel:pessoas!atendimentos_responsavel_id_fkey(id, nome)")
    .order("updated_at", { ascending: false });
  const leadsPromise = canCreate
    ? supabase
        .from("leads")
        .select("id, nome, etapa_funil, status_operacional")
        .eq("status_operacional", "ativo")
        .in("etapa_funil", [...ELIGIBLE_LEAD_STAGES])
        .order("nome", { ascending: true })
    : Promise.resolve({ data: [], error: null });

  const [atendimentosResult, leadsResult] = await Promise.all([atendimentosPromise, leadsPromise]);

  if (atendimentosResult.error) {
    logQueryError("list", atendimentosResult.error.code);
  }
  if (leadsResult.error) {
    logQueryError("eligible_leads", leadsResult.error.code);
  }

  const rawAtendimentos = (atendimentosResult.data ?? []) as unknown[];
  const atendimentos = rawAtendimentos
    .map(normalizeAtendimento)
    .filter((item): item is Atendimento => item !== null);
  if (atendimentos.length !== rawAtendimentos.length) {
    logQueryError("normalize_list", "invalid_row");
  }
  const openLeadIds = new Set(atendimentos.filter((item) => OPEN_STATUSES.includes(item.status)).map((item) => item.lead_id));
  const previousAttendanceIds = new Set(atendimentos.map((item) => item.atendimento_anterior_id).filter((id): id is string => Boolean(id)));
  const eligibleLeads = ((leadsResult.data ?? []) as unknown as LeadRaw[])
    .map(normalizeEligibleLead)
    .filter((lead): lead is EligibleLeadOption => lead !== null && !openLeadIds.has(lead.id));

  const groups = {
    waiting: atendimentos.filter((item) => item.status === "aguardando"),
    active: atendimentos.filter((item) => item.status === "em_atendimento"),
    returning: atendimentos.filter((item) => item.status === "aguardando_cliente" || item.status === "aguardando_interno"),
    recentClosed: atendimentos.filter((item) => isAtendimentoFinalStatus(item.status)).slice(0, 12),
  };
  const open = atendimentos.filter((item) => OPEN_STATUSES.includes(item.status));
  const indicators = [
    { label: "Total aberto", value: open.length, icon: MessageSquareText },
    { label: "Aguardando", value: groups.waiting.length, icon: Clock3 },
    { label: "Em atendimento", value: groups.active.length, icon: UserRoundCheck },
    { label: "Aguardando cliente", value: atendimentos.filter((item) => item.status === "aguardando_cliente").length, icon: Clock3 },
    { label: "Aguardando interno", value: atendimentos.filter((item) => item.status === "aguardando_interno").length, icon: AlertCircle },
    { label: "Urgentes", value: open.filter((item) => item.prioridade === "urgente").length, icon: Flame },
  ];

  return (
    <main className="min-h-screen bg-[#F7F3ED] px-6 py-10 sm:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="rounded-[2rem] border border-[#E8DDCB] bg-white p-6 shadow-sm sm:p-8">
          <span className="rounded-full border border-[#C89B3C]/35 bg-[#C89B3C]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#8B6827]">Terrazza CRM</span>
          <h1 className="mt-5 text-4xl font-bold tracking-tight text-[#071E36]">Atendimentos</h1>
          <p className="mt-2 max-w-3xl leading-6 text-[#64736D]">Fila operacional real para criacao, assuncao e acompanhamento dos estados abertos.</p>
        </header>

        {atendimentosResult.error ? (
          <p role="alert" className="mt-6 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">Nao foi possivel carregar os Atendimentos.</p>
        ) : null}

        <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
          {indicators.map((indicator) => {
            const Icon = indicator.icon;
            return (
              <article key={indicator.label} className="rounded-3xl border border-[#E8DDCB] bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#071E36] text-[#E1B866]"><Icon size={19} /></span><strong className="text-3xl text-[#071E36]">{indicator.value}</strong></div>
                <h2 className="mt-4 text-xs font-semibold uppercase tracking-[0.12em] text-[#071E36]">{indicator.label}</h2>
              </article>
            );
          })}
        </section>

        {canCreate ? (
          <>
            <CreateAtendimentoForm leads={eligibleLeads} />
            {leadsResult.error ? <p role="alert" className="mt-3 text-sm text-red-700">Nao foi possivel carregar os Leads elegiveis.</p> : null}
          </>
        ) : null}

        <div className="mt-8 grid gap-8">
          <AtendimentoSection title="Fila aguardando" description="Atendimentos ainda nao assumidos." items={groups.waiting} canAssume={canAssume} canEdit={canEdit} canConclude={canConclude} canCancel={canCancel} canReopen={canReopen} previousAttendanceIds={previousAttendanceIds} />
          <AtendimentoSection title="Em andamento" description="Casos conduzidos pela equipe responsavel." items={groups.active} canAssume={canAssume} canEdit={canEdit} canConclude={canConclude} canCancel={canCancel} canReopen={canReopen} previousAttendanceIds={previousAttendanceIds} />
          <AtendimentoSection title="Aguardando retorno" description="Dependencias do cliente ou da operacao interna." items={groups.returning} canAssume={canAssume} canEdit={canEdit} canConclude={canConclude} canCancel={canCancel} canReopen={canReopen} previousAttendanceIds={previousAttendanceIds} />
          <AtendimentoSection title="Encerrados recentes" description="Leitura dos ultimos Atendimentos concluidos ou cancelados." items={groups.recentClosed} canAssume={false} canEdit={false} canConclude={false} canCancel={false} canReopen={canReopen} previousAttendanceIds={previousAttendanceIds} />
        </div>
      </div>
    </main>
  );
}

function AtendimentoSection({ title, description, items, canAssume, canEdit, canConclude, canCancel, canReopen, previousAttendanceIds }: { title: string; description: string; items: readonly Atendimento[]; canAssume: boolean; canEdit: boolean; canConclude: boolean; canCancel: boolean; canReopen: boolean; previousAttendanceIds: ReadonlySet<string> }) {
  return (
    <section className="rounded-[2rem] border border-[#E8DDCB] bg-white p-5 shadow-sm sm:p-6">
      <div className="flex items-start justify-between gap-4"><div><h2 className="text-xl font-semibold text-[#071E36]">{title}</h2><p className="mt-1 text-sm text-[#64736D]">{description}</p></div><span className="rounded-full bg-[#C89B3C]/10 px-3 py-1 text-sm font-semibold text-[#8B6827]">{items.length}</span></div>
      {items.length === 0 ? (
        <p className="mt-5 rounded-2xl bg-[#F7F3ED] px-4 py-8 text-center text-sm text-[#64736D]">Nenhum Atendimento nesta fila.</p>
      ) : (
        <div className="mt-5 grid gap-4 xl:grid-cols-2">
          {items.map((item) => <AtendimentoCard key={item.id} item={item} canAssume={canAssume} canEdit={canEdit} canConclude={canConclude} canCancel={canCancel} canReopen={canReopen} hasLaterAttendance={previousAttendanceIds.has(item.id)} />)}
        </div>
      )}
    </section>
  );
}

function AtendimentoCard({ item, canAssume, canEdit, canConclude, canCancel, canReopen, hasLaterAttendance }: { item: Atendimento; canAssume: boolean; canEdit: boolean; canConclude: boolean; canCancel: boolean; canReopen: boolean; hasLaterAttendance: boolean }) {
  const lead = relation(item.lead);
  const responsavel = relation(item.responsavel);
  return (
    <article className="rounded-3xl border border-[#E8DDCB] bg-[#fffdfa] p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><h3 className="text-lg font-semibold text-[#071E36]">{item.assunto?.trim() || "Atendimento sem assunto"}</h3><p className="mt-1 text-sm text-[#64736D]">{lead?.nome?.trim() || "Lead sem nome disponivel"}</p>{item.atendimento_anterior_id ? <p className="mt-2 text-xs text-[#8B6827]">Originado de Atendimento anterior.</p> : null}{hasLaterAttendance ? <p className="mt-2 text-xs text-[#8B6827]">Possui Atendimento posterior.</p> : null}</div>
        <div className="flex flex-wrap gap-2"><Badge label={getAtendimentoStatusLabel(item.status) ?? "Status invalido"} kind="status" /><Badge label={getAtendimentoPriorityLabel(item.prioridade) ?? "Prioridade invalida"} kind={item.prioridade === "urgente" ? "danger" : "priority"} />{item.atendimento_anterior_id ? <Badge label="Reabertura" kind="priority" /> : null}</div>
      </div>
      <dl className="mt-4 grid gap-2 text-sm text-[#64736D] sm:grid-cols-2">
        <Info label="Canal" value={getAtendimentoChannelLabel(item.canal) ?? "Nao informado"} />
        <Info label="Responsavel" value={responsavel?.nome?.trim() || "Nao atribuido"} />
        <Info label="Proxima acao" value={formatDate(item.proxima_acao_em)} />
        <Info label="Atualizado" value={formatDate(item.updated_at)} />
      </dl>
      <p className="mt-4 line-clamp-3 text-sm leading-6 text-[#64736D]">{item.resumo?.trim() || "Sem resumo operacional."}</p>
      {item.resultado ? <p className="mt-3 text-xs font-semibold text-[#8B6827]">Resultado: {getAtendimentoResultLabel(item.resultado) ?? "Nao informado"}</p> : null}
      <div className="mt-5 flex flex-wrap gap-2 border-t border-[#E8DDCB] pt-4">
        <Link href={`/dashboard/crm/leads/${item.lead_id}`} className="rounded-full border border-[#E8DDCB] bg-white px-3 py-1 text-xs font-semibold text-[#071E36]">Ver Lead</Link>
      </div>
      <div className="mt-4 grid gap-3">
        {item.status === "aguardando" && canAssume && item.responsavel_id ? <AssumeAtendimentoForm atendimentoId={item.id} leadId={item.lead_id} updatedAt={item.updated_at} /> : null}
        {item.status === "aguardando" && !item.responsavel_id ? <p className="rounded-xl bg-[#F7F3ED] px-3 py-2 text-sm text-[#64736D]">Aguardando distribuicao ou atribuicao de responsavel.</p> : null}
        {canEdit && isAtendimentoOpenManagedStatus(item.status) ? <ChangeAtendimentoStateForm atendimentoId={item.id} leadId={item.lead_id} currentStatus={item.status} updatedAt={item.updated_at} /> : null}
        <FinalAtendimentoControls
          atendimentoId={item.id}
          leadId={item.lead_id}
          responsavelId={item.responsavel_id}
          currentStatus={item.status}
          updatedAt={item.updated_at}
          canConclude={canConclude && isAtendimentoOpenManagedStatus(item.status) && Boolean(item.responsavel_id) && Boolean(item.assumido_em)}
          canCancel={canCancel && OPEN_STATUSES.includes(item.status)}
          canReopen={canReopen && isAtendimentoFinalStatus(item.status)}
        />
      </div>
    </article>
  );
}

function normalizeAtendimento(value: unknown): Atendimento | null {
  if (!value || typeof value !== "object") return null;
  const row = value as AtendimentoRaw;
  if (typeof row.id !== "string" || typeof row.lead_id !== "string" || typeof row.updated_at !== "string" || typeof row.created_at !== "string") return null;
  if (!isAtendimentoStatus(row.status) || !isAtendimentoPriority(row.prioridade) || !isAtendimentoChannel(row.canal) || !isAtendimentoOrigin(row.origem)) return null;
  if (row.resultado !== null && !isAtendimentoResult(row.resultado)) return null;
  return {
    id: row.id,
    lead_id: row.lead_id,
    responsavel_id: typeof row.responsavel_id === "string" ? row.responsavel_id : null,
    atendimento_anterior_id: typeof row.atendimento_anterior_id === "string" ? row.atendimento_anterior_id : null,
    status: row.status,
    prioridade: row.prioridade,
    canal: row.canal,
    origem: row.origem,
    assunto: nullableString(row.assunto),
    resumo: nullableString(row.resumo),
    proxima_acao_em: nullableString(row.proxima_acao_em),
    assumido_em: nullableString(row.assumido_em),
    created_at: row.created_at,
    updated_at: row.updated_at,
    resultado: row.resultado,
    concluido_em: nullableString(row.concluido_em),
    cancelado_em: nullableString(row.cancelado_em),
    lead: row.lead,
    responsavel: row.responsavel,
  };
}

function normalizeEligibleLead(value: LeadRaw): EligibleLeadOption | null {
  return typeof value.id === "string" && typeof value.nome === "string" && value.nome.trim() && value.status_operacional === "ativo" && ELIGIBLE_LEAD_STAGES.some((stage) => stage === value.etapa_funil)
    ? { id: value.id, nome: value.nome.trim() }
    : null;
}

function relation(value: unknown): Relation | null {
  const candidate = Array.isArray(value) ? value[0] : value;
  if (!candidate || typeof candidate !== "object") return null;
  const row = candidate as Record<string, unknown>;
  return typeof row.id === "string" ? { id: row.id, nome: nullableString(row.nome) } : null;
}

function nullableString(value: unknown) {
  return typeof value === "string" ? value : null;
}

function formatDate(value: string | null) {
  if (!value || Number.isNaN(Date.parse(value))) return "Nao informada";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" }).format(new Date(value));
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl bg-white px-3 py-2"><dt className="text-xs font-semibold uppercase tracking-[0.1em] text-[#8B6827]">{label}</dt><dd className="mt-1 text-[#071E36]">{value}</dd></div>;
}

function Badge({ label, kind }: { label: string; kind: "status" | "priority" | "danger" }) {
  const style = kind === "danger" ? "bg-red-50 text-red-700" : kind === "status" ? "bg-[#071E36] text-[#E1B866]" : "bg-[#C89B3C]/10 text-[#8B6827]";
  return <span className={`rounded-full px-3 py-1 text-xs font-semibold ${style}`}>{label}</span>;
}

function logQueryError(etapa: string, codigo: unknown) {
  console.error({ modulo: "crm_atendimentos", etapa, codigo: typeof codigo === "string" ? codigo : "query_error" });
}
