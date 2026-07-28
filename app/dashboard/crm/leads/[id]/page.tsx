import Link from "next/link";

import { hasPermission } from "../../../../../lib/auth/permissions";
import { requirePagePermission } from "../../../../../lib/auth/page-permission";
import { getLeadFunnelStageLabel, getLeadTemperatureLabel } from "../../../../../lib/crm/leads/catalogs";
import { REASSIGNMENT_ELIGIBLE_STAGES } from "../../../../../lib/crm/roleta/reatribuicao";
import { createClient } from "../../../../../lib/supabase/server";
import { TransferAssignmentForm } from "../../roleta/transfer-assignment-form";

type Lead = {
  id: string;
  nome: string;
  telefone: string | null;
  tipo_lead: string | null;
  objetivo: string | null;
  cidade: string | null;
  origem: string | null;
  status: string | null;
  responsavel: string | null;
  responsavel_id: string | null;
  etapa_funil: string;
  status_operacional: string;
  temperatura: string | null;
  responsavel_pessoa: unknown;
  created_at: string | null;
};

type Person = { id: string; nome: string };

type TimelineEvento = {
  id: string;
  tipo: string | null;
  titulo: string | null;
  descricao: string | null;
  origem: string | null;
  created_at: string | null;
};

function labelTexto(valor: string | null) {
  if (!valor) return "Nao informado";

  return valor.replaceAll("_", " ");
}

function relationName(value: unknown, fallback: string) {
  const relation = Array.isArray(value) ? value[0] : value;
  if (!relation || typeof relation !== "object") return fallback;
  const name = (relation as { nome?: unknown }).nome;
  return typeof name === "string" && name.trim() ? name.trim() : fallback;
}

function formatarData(data: string | null) {
  if (!data) return "Sem registro";

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(data));
}

function temperaturaLead(status: string | null) {
  if (status === "corretor" || status === "fechado") return "quente";
  if (status === "ia_qualificando") return "morno";

  return "frio";
}

function especialistaSugerido(lead: Lead | null) {
  const texto = `${lead?.tipo_lead ?? ""} ${lead?.objetivo ?? ""}`.toLowerCase();

  if (texto.includes("inquilino") || texto.includes("alugar")) return "Especialista Locacao";
  if (texto.includes("comprador") || texto.includes("comprar")) return "Especialista Compra";
  if (texto.includes("vendedor") || texto.includes("vender")) return "Especialista Venda";
  if (texto.includes("propriet")) return "Especialista Administracao";

  return "Especialista a definir";
}

function proximosPassos(lead: Lead | null) {
  if (!lead) return ["Validar cadastro do lead", "Vincular atendimento quando houver dados reais"];
  if (lead.status === "corretor") return ["Continuar atendimento humano", "Registrar proximo contato na timeline"];
  if (lead.status === "ia_qualificando") return ["Revisar qualificacao", "Confirmar handoff com responsavel"];
  if (lead.status === "fechado") return ["Registrar conclusao", "Criar acompanhamento pos-atendimento"];

  return ["Realizar primeiro contato", "Confirmar objetivo comercial", "Definir responsavel"];
}

export default async function LeadDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const profile = await requirePagePermission("leads.visualizar");
  const canTransfer = (profile.papel === "administrador" || profile.papel === "gestor")
    && hasPermission(profile.papel, "leads.distribuir")
    && hasPermission(profile.papel, "leads.editar");
  const supabase = await createClient();

  const { id } = await params;

  const [leadResult, timelineResult] = await Promise.all([
    supabase
      .from("leads")
      .select("id, nome, telefone, tipo_lead, objetivo, cidade, origem, status, responsavel, responsavel_id, etapa_funil, status_operacional, temperatura, created_at, responsavel_pessoa:pessoas!leads_responsavel_id_fkey(nome)")
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("timeline")
      .select("id, tipo, titulo, descricao, origem, created_at")
      .eq("lead_id", id)
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  const lead = (leadResult.data ?? null) as Lead | null;
  const eventos = (timelineResult.data ?? []) as TimelineEvento[];
  const erroCarregamento = leadResult.error || timelineResult.error;
  const currentResponsibleName = relationName(lead?.responsavel_pessoa, lead?.responsavel || "A definir");
  const isTransferEligible = Boolean(
    lead?.responsavel_id
    && lead.status_operacional === "ativo"
    && REASSIGNMENT_ELIGIBLE_STAGES.some((stage) => stage === lead.etapa_funil),
  );
  let transferPeople: Person[] = [];
  let transferPeopleError = false;

  if (canTransfer && isTransferEligible) {
    const peopleResult = await supabase
      .from("pessoas")
      .select("id, nome")
      .eq("ativo", true)
      .contains("papeis", ["corretor"])
      .order("nome", { ascending: true });

    if (peopleResult.error) {
      console.error({ modulo: "crm_lead_detail", etapa: "reassignment_people", codigo: peopleResult.error.code });
      transferPeopleError = true;
    } else {
      transferPeople = ((peopleResult.data ?? []) as Person[]).filter((person) => person.nome.trim());
    }
  }

  return (
    <main className="min-h-screen bg-[#F7F3ED] px-6 py-10 sm:px-8">
      <div className="mx-auto max-w-7xl">
        <Link
          href="/dashboard/crm/leads"
          className="inline-flex rounded-xl border border-[#E8DDCB] bg-white px-4 py-2 text-sm font-medium text-[#071E36] transition hover:border-[#C89B3C]/45 hover:bg-[#C89B3C]/10"
        >
          Voltar para Leads
        </Link>

        <header className="mt-8 rounded-[2rem] border border-[#E8DDCB] bg-white p-6 shadow-sm sm:p-8">
          <span className="rounded-full border border-[#C89B3C]/35 bg-[#C89B3C]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#8B6827]">
            Detalhe operacional
          </span>
          <div className="mt-5 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-4xl font-bold tracking-tight text-[#071E36]">
                {lead?.nome ?? "Lead nao encontrado"}
              </h1>
              <p className="mt-2 max-w-3xl leading-6 text-[#64736D]">
                Visao preparada para consolidar dados comerciais, atendimento,
                UCE e historico do relacionamento.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href="/dashboard/crm/atendimentos"
                className="rounded-xl bg-[#071E36] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#0A2A4A]"
              >
                Ver atendimento
              </Link>
              <Link
                href="/dashboard/crm/timeline"
                className="rounded-xl border border-[#E8DDCB] bg-white px-4 py-2 text-sm font-semibold text-[#071E36] transition hover:border-[#C89B3C]/45 hover:bg-[#C89B3C]/10"
              >
                Ver timeline
              </Link>
            </div>
          </div>
        </header>

        {erroCarregamento ? (
          <p className="mt-6 rounded-xl bg-[#fbebe7] px-4 py-3 text-sm text-[#8a2e1c]">
            Nao foi possivel carregar todos os dados do lead.
          </p>
        ) : null}

        <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[
            ["Status comercial", labelTexto(lead?.status ?? null)],
            ["Origem", lead?.origem || "manual"],
            ["Responsavel", currentResponsibleName],
            ["Temperatura", lead?.temperatura ? getLeadTemperatureLabel(lead.temperatura) ?? "Nao informada" : temperaturaLead(lead?.status ?? null)],
          ].map(([titulo, valor]) => (
            <article
              key={titulo}
              className="rounded-3xl border border-[#E8DDCB] bg-white p-5 shadow-sm"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8B6827]">
                {titulo}
              </p>
              <strong className="mt-3 block text-2xl font-bold text-[#071E36]">
                {valor}
              </strong>
            </article>
          ))}
        </section>

        {lead ? (
          <section className="mt-6 rounded-3xl border border-[#E8DDCB] bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-[#071E36]">Responsavel pelo atendimento</h2>
            <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_360px] lg:items-start">
              <dl className="grid gap-2 text-sm text-[#64736D]">
                <div><dt className="inline font-semibold text-[#071E36]">Pessoa-corretora: </dt><dd className="inline">{currentResponsibleName}</dd></div>
                <div><dt className="inline font-semibold text-[#071E36]">Etapa: </dt><dd className="inline">{getLeadFunnelStageLabel(lead.etapa_funil) ?? labelTexto(lead.etapa_funil)}</dd></div>
              </dl>
              {canTransfer && isTransferEligible && lead.responsavel_id ? (
                <TransferAssignmentForm
                  leadId={lead.id}
                  currentResponsibleId={lead.responsavel_id}
                  currentResponsibleName={currentResponsibleName}
                  people={transferPeople}
                  disabledMessage={transferPeopleError ? "Nao foi possivel carregar as Pessoas-corretoras." : undefined}
                />
              ) : null}
            </div>
          </section>
        ) : null}

        <section className="mt-6 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-3xl border border-[#E8DDCB] bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-[#071E36]">Dados do lead</h2>
            <div className="mt-5 grid gap-4 text-sm md:grid-cols-2">
              <p><strong className="text-[#071E36]">Telefone:</strong> {lead?.telefone || "Nao informado"}</p>
              <p><strong className="text-[#071E36]">Tipo:</strong> {lead?.tipo_lead || "Nao informado"}</p>
              <p><strong className="text-[#071E36]">Objetivo:</strong> {lead?.objetivo || "Nao informado"}</p>
              <p><strong className="text-[#071E36]">Cidade:</strong> {lead?.cidade || "Nao informada"}</p>
              <p><strong className="text-[#071E36]">Criado em:</strong> {formatarData(lead?.created_at ?? null)}</p>
              <p><strong className="text-[#071E36]">Especialista UCE:</strong> {especialistaSugerido(lead)}</p>
            </div>
          </div>

          <div className="rounded-3xl border border-[#E8DDCB] bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-[#071E36]">Resumo UCE</h2>
            <p className="mt-4 text-sm leading-6 text-[#64736D]">
              Placeholder operacional para resumo cognitivo, preferencias,
              perfil comportamental e justificativa de handoff quando o UCE
              alimentar o CRM.
            </p>
            <div className="mt-4 rounded-2xl bg-[#F7F3ED] p-4 text-sm text-[#102A27]">
              Perfil comportamental: aguardando dados reais do atendimento.
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-6 xl:grid-cols-2">
          <div className="rounded-3xl border border-[#E8DDCB] bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-[#071E36]">Proximos passos</h2>
            <div className="mt-5 grid gap-3">
              {proximosPassos(lead).map((passo) => (
                <div
                  key={passo}
                  className="rounded-2xl border border-[#E8DDCB] bg-[#fffdfa] p-4 text-sm font-medium text-[#102A27]"
                >
                  {passo}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-[#E8DDCB] bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-[#071E36]">Atendimentos relacionados</h2>
            <div className="mt-5 rounded-2xl border border-dashed border-[#E8DDCB] bg-[#F7F3ED] p-5 text-sm text-[#64736D]">
              Estrutura preparada para listar conversas do WhatsApp, Instagram,
              site e atendimentos manuais vinculados ao lead.
            </div>
          </div>
        </section>

        <section className="mt-6 rounded-3xl border border-[#E8DDCB] bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-[#071E36]">Timeline resumida</h2>
          <div className="mt-5 grid gap-3">
            {eventos.length === 0 ? (
              <p className="rounded-2xl bg-[#F7F3ED] px-4 py-8 text-center text-sm text-[#64736D]">
                Nenhum evento vinculado a este lead ate o momento.
              </p>
            ) : (
              eventos.map((evento) => (
                <article
                  key={evento.id}
                  className="rounded-2xl border border-[#E8DDCB] bg-[#fffdfa] p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <strong className="text-[#071E36]">
                      {evento.titulo || labelTexto(evento.tipo)}
                    </strong>
                    <span className="rounded-full bg-[#C89B3C]/10 px-3 py-1 text-xs font-semibold text-[#8B6827]">
                      {formatarData(evento.created_at)}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-[#64736D]">
                    {evento.tipo === "lead_reatribuido" && !canTransfer
                      ? "Responsavel pelo atendimento atualizado."
                      : evento.descricao || "Evento registrado sem descricao detalhada."}
                  </p>
                </article>
              ))
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
