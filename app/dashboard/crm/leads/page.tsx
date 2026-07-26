import { revalidatePath } from "next/cache";
import Link from "next/link";
import { redirect } from "next/navigation";
import { BarChart3, Clock3, Flame, Plus, Search, UserCheck } from "lucide-react";

import { ConfirmSubmitButton } from "../../../../components/ConfirmSubmitButton";
import {
  requireActiveProfile,
  requirePermission,
} from "../../../../lib/auth/access-profile";
import { requirePagePermission } from "../../../../lib/auth/page-permission";
import { supabase } from "../../../../lib/supabase";

type SearchParams = Record<string, string | string[] | undefined>;

type Lead = {
  id: string;
  nome: string;
  telefone: string | null;
  tipo_lead: string | null;
  objetivo: string | null;
  cidade: string | null;
  bairro_interesse: string | null;
  origem: string | null;
  status: string | null;
  responsavel: string | null;
  observacao: string | null;
  created_at: string | null;
};

const tiposLead = ["proprietario", "inquilino", "comprador", "vendedor", "corretor parceiro"];
const origens = ["whatsapp", "instagram", "indicacao", "portal", "site", "manual"];
const statusLeads = ["novo", "ia_qualificando", "corretor", "fechado", "perdido"];

function paramValue(searchParams: SearchParams, key: string) {
  const value = searchParams[key];
  return Array.isArray(value) ? value[0] : value;
}

function valorTexto(formData: FormData, campo: string) {
  return String(formData.get(campo) ?? "").trim();
}

function normalizarTexto(value: unknown) {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function formatarData(data: string | null) {
  if (!data) return "-";

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "medium",
  }).format(new Date(data));
}

function labelTexto(valor: string | null | undefined) {
  if (!valor) return "-";
  return valor.replaceAll("_", " ");
}

function temperaturaLead(status: string | null): "frio" | "morno" | "quente" {
  if (status === "corretor" || status === "fechado") return "quente";
  if (status === "ia_qualificando") return "morno";
  return "frio";
}

function badgeClassName(
  tipo: "frio" | "morno" | "quente" | "handoff" | "origem" | "status",
) {
  const classes = {
    frio: "bg-slate-100 text-slate-700 ring-slate-200",
    morno: "bg-amber-50 text-amber-700 ring-amber-100",
    quente: "bg-red-50 text-red-700 ring-red-100",
    handoff: "bg-[#071E36] text-[#E1B866] ring-[#071E36]/20",
    origem: "bg-[#C89B3C]/10 text-[#8B6827] ring-[#C89B3C]/20",
    status: "bg-[#F7F3ED] text-[#071E36] ring-[#E8DDCB]",
  };

  return `rounded-full px-3 py-1 text-xs font-semibold ring-1 ${classes[tipo]}`;
}

function especialistaSugerido(lead: Lead) {
  const tipo = `${lead.tipo_lead ?? ""} ${lead.objetivo ?? ""}`.toLowerCase();

  if (tipo.includes("inquilino") || tipo.includes("alugar") || tipo.includes("locacao")) {
    return "Locacao";
  }
  if (tipo.includes("comprador") || tipo.includes("comprar")) return "Compra";
  if (tipo.includes("vendedor") || tipo.includes("vender")) return "Venda";
  if (tipo.includes("propriet")) return "Administracao";

  return "A definir";
}

function proximaAcaoLead(lead: Lead) {
  if (lead.status === "fechado") return "Registrar pos-atendimento";
  if (lead.status === "corretor") return "Corretor deve continuar";
  if (lead.status === "ia_qualificando") return "Validar qualificacao";
  if (lead.status === "perdido") return "Reavaliar oportunidade futura";
  return "Realizar primeiro contato";
}

export default async function LeadsPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  await requirePagePermission("leads.visualizar");

  const resolvedSearchParams = (await searchParams) ?? {};
  const busca = paramValue(resolvedSearchParams, "busca") ?? "";
  const filtroStatus = paramValue(resolvedSearchParams, "status") ?? "";
  const filtroOrigem = paramValue(resolvedSearchParams, "origem") ?? "";
  const filtroTipo = paramValue(resolvedSearchParams, "tipo_lead") ?? "";
  const filtroResponsavel = paramValue(resolvedSearchParams, "responsavel") ?? "";
  const filtroTemperatura = paramValue(resolvedSearchParams, "temperatura") ?? "";
  const editId = paramValue(resolvedSearchParams, "edit") ?? "";

  async function salvarLead(formData: FormData) {
    "use server";
    await requireActiveProfile();

    const id = valorTexto(formData, "id");
    const nome = valorTexto(formData, "nome");

    if (!nome) {
      throw new Error("O nome do lead e obrigatorio.");
    }

    const payload = {
      nome,
      telefone: valorTexto(formData, "telefone") || null,
      tipo_lead: valorTexto(formData, "tipo_lead") || null,
      objetivo: valorTexto(formData, "objetivo") || null,
      cidade: valorTexto(formData, "cidade") || null,
      bairro_interesse: valorTexto(formData, "bairro_interesse") || null,
      origem: valorTexto(formData, "origem") || "manual",
      status: valorTexto(formData, "status") || "novo",
      responsavel: valorTexto(formData, "responsavel") || null,
      observacao: valorTexto(formData, "observacao") || null,
    };

    const { error } = id
      ? await supabase.from("leads").update(payload).eq("id", id)
      : await supabase.from("leads").insert(payload);

    if (error) {
      throw new Error("Nao foi possivel salvar o lead.");
    }

    revalidatePath("/dashboard/crm/leads");
    redirect("/dashboard/crm/leads");
  }

  async function excluirLead(formData: FormData) {
    "use server";
    await requirePermission("leads.arquivar");

    const id = valorTexto(formData, "id");

    if (!id) {
      throw new Error("Lead nao informado.");
    }

    const { error } = await supabase.from("leads").update({ status: "perdido" }).eq("id", id);

    if (error) {
      throw new Error("Nao foi possivel arquivar o lead.");
    }

    revalidatePath("/dashboard/crm/leads");
  }

  const { data, error } = await supabase
    .from("leads")
    .select(
      "id, nome, telefone, tipo_lead, objetivo, cidade, bairro_interesse, origem, status, responsavel, observacao, created_at",
    )
    .order("created_at", { ascending: false });

  const leads = (data ?? []) as Lead[];
  const responsaveis = Array.from(
    new Set(leads.map((lead) => lead.responsavel).filter(Boolean) as string[]),
  ).sort((a, b) => a.localeCompare(b));
  const leadsFiltrados = leads.filter((lead) => {
    const textoBusca = normalizarTexto(
      [
        lead.nome,
        lead.telefone,
        lead.tipo_lead,
        lead.objetivo,
        lead.cidade,
        lead.bairro_interesse,
        lead.origem,
        lead.status,
        lead.responsavel,
        lead.observacao,
      ].join(" "),
    );

    return (
      (!busca || textoBusca.includes(normalizarTexto(busca))) &&
      (!filtroStatus || lead.status === filtroStatus) &&
      (!filtroOrigem || lead.origem === filtroOrigem) &&
      (!filtroTipo || lead.tipo_lead === filtroTipo) &&
      (!filtroResponsavel || lead.responsavel === filtroResponsavel) &&
      (!filtroTemperatura || temperaturaLead(lead.status) === filtroTemperatura)
    );
  });
  const leadEmEdicao = leads.find((lead) => lead.id === editId) ?? null;

  const resumoLeads = [
    {
      titulo: "Total",
      valor: leads.length,
      descricao: "Leads na base comercial",
      icon: BarChart3,
    },
    {
      titulo: "Novos",
      valor: leads.filter((lead) => (lead.status || "novo") === "novo").length,
      descricao: "Aguardando primeira acao",
      icon: Plus,
    },
    {
      titulo: "Quentes",
      valor: leads.filter((lead) => temperaturaLead(lead.status) === "quente").length,
      descricao: "Com potencial imediato",
      icon: Flame,
    },
    {
      titulo: "Aguardando retorno",
      valor: leads.filter((lead) => lead.status === "ia_qualificando").length,
      descricao: "Em qualificacao ou retorno",
      icon: Clock3,
    },
    {
      titulo: "Convertidos",
      valor: leads.filter((lead) => lead.status === "fechado").length,
      descricao: "Fechados na operacao",
      icon: UserCheck,
    },
  ];

  return (
    <main className="min-h-screen bg-[#F7F3ED] px-6 py-10 sm:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="rounded-[2rem] border border-[#E8DDCB] bg-white p-6 shadow-sm sm:p-8">
          <span className="rounded-full border border-[#C89B3C]/35 bg-[#C89B3C]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#8B6827]">
            Terrazza CRM
          </span>
          <div className="mt-5 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-4xl font-bold tracking-tight text-[#071E36]">
                Leads Premium
              </h1>
              <p className="mt-2 max-w-3xl leading-6 text-[#64736D]">
                Central operacional de oportunidades, origem, temperatura,
                responsavel e proximos passos comerciais.
              </p>
            </div>
            <Link
              href="/dashboard/crm/atendimentos"
              className="inline-flex w-fit items-center gap-2 rounded-2xl border border-[#E8DDCB] bg-[#F7F3ED] px-4 py-3 text-sm font-semibold text-[#071E36] transition hover:border-[#C89B3C]/45 hover:bg-[#C89B3C]/10"
            >
              Abrir atendimentos
            </Link>
          </div>
        </header>

        <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {resumoLeads.map((card) => {
            const Icon = card.icon;
            return (
              <article
                key={card.titulo}
                className="rounded-3xl border border-[#E8DDCB] bg-white p-5 shadow-sm"
              >
                <div className="flex items-center justify-between gap-4">
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#071E36] text-[#E1B866]">
                    <Icon size={20} />
                  </span>
                  <strong className="text-3xl font-bold text-[#071E36]">
                    {card.valor}
                  </strong>
                </div>
                <h2 className="mt-4 text-sm font-semibold uppercase tracking-[0.14em] text-[#071E36]">
                  {card.titulo}
                </h2>
                <p className="mt-1 text-sm text-[#64736D]">{card.descricao}</p>
              </article>
            );
          })}
        </section>

        <section className="mt-8 rounded-[2rem] border border-[#E8DDCB] bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-[#071E36]">
                {leadEmEdicao ? "Editar lead" : "Novo lead manual"}
              </h2>
              <p className="mt-1 text-sm text-[#64736D]">
                Cadastro operacional com responsavel, origem, temperatura e proxima acao.
              </p>
            </div>
            {leadEmEdicao ? (
              <Link
                href="/dashboard/crm/leads"
                className="w-fit rounded-xl border border-[#E8DDCB] bg-white px-4 py-2 text-sm font-semibold text-[#071E36] transition hover:border-[#C89B3C]/45 hover:bg-[#C89B3C]/10"
              >
                Cancelar edicao
              </Link>
            ) : null}
          </div>

          <form action={salvarLead} className="mt-6 grid gap-5 md:grid-cols-3">
            <input type="hidden" name="id" value={leadEmEdicao?.id ?? ""} />
            <label className="grid gap-2 text-sm font-medium text-[#102A27]">
              Nome
              <input
                name="nome"
                required
                defaultValue={leadEmEdicao?.nome ?? ""}
                className="rounded-xl border border-[#E8DDCB] px-4 py-3 text-[#071E36] outline-none transition placeholder:text-[#9a9d98] focus:border-[#C89B3C]"
                placeholder="Nome do lead"
              />
            </label>

            <label className="grid gap-2 text-sm font-medium text-[#102A27]">
              Telefone
              <input
                name="telefone"
                type="tel"
                defaultValue={leadEmEdicao?.telefone ?? ""}
                className="rounded-xl border border-[#E8DDCB] px-4 py-3 text-[#071E36] outline-none transition placeholder:text-[#9a9d98] focus:border-[#C89B3C]"
                placeholder="(00) 00000-0000"
              />
            </label>

            <label className="grid gap-2 text-sm font-medium text-[#102A27]">
              Tipo de lead
              <select
                name="tipo_lead"
                defaultValue={leadEmEdicao?.tipo_lead ?? "proprietario"}
                className="rounded-xl border border-[#E8DDCB] bg-white px-4 py-3 text-[#071E36] outline-none transition focus:border-[#C89B3C]"
              >
                {tiposLead.map((tipo) => (
                  <option key={tipo} value={tipo}>
                    {tipo}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-2 text-sm font-medium text-[#102A27]">
              Objetivo
              <input
                name="objetivo"
                defaultValue={leadEmEdicao?.objetivo ?? ""}
                className="rounded-xl border border-[#E8DDCB] px-4 py-3 text-[#071E36] outline-none transition placeholder:text-[#9a9d98] focus:border-[#C89B3C]"
                placeholder="Comprar, alugar, vender..."
              />
            </label>

            <label className="grid gap-2 text-sm font-medium text-[#102A27]">
              Cidade
              <input
                name="cidade"
                defaultValue={leadEmEdicao?.cidade ?? ""}
                className="rounded-xl border border-[#E8DDCB] px-4 py-3 text-[#071E36] outline-none transition placeholder:text-[#9a9d98] focus:border-[#C89B3C]"
                placeholder="Cidade"
              />
            </label>

            <label className="grid gap-2 text-sm font-medium text-[#102A27]">
              Bairro de interesse
              <input
                name="bairro_interesse"
                defaultValue={leadEmEdicao?.bairro_interesse ?? ""}
                className="rounded-xl border border-[#E8DDCB] px-4 py-3 text-[#071E36] outline-none transition placeholder:text-[#9a9d98] focus:border-[#C89B3C]"
                placeholder="Bairro"
              />
            </label>

            <label className="grid gap-2 text-sm font-medium text-[#102A27]">
              Origem
              <select
                name="origem"
                defaultValue={leadEmEdicao?.origem ?? "manual"}
                className="rounded-xl border border-[#E8DDCB] bg-white px-4 py-3 text-[#071E36] outline-none transition focus:border-[#C89B3C]"
              >
                {origens.map((origem) => (
                  <option key={origem} value={origem}>
                    {origem}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-2 text-sm font-medium text-[#102A27]">
              Status
              <select
                name="status"
                defaultValue={leadEmEdicao?.status ?? "novo"}
                className="rounded-xl border border-[#E8DDCB] bg-white px-4 py-3 text-[#071E36] outline-none transition focus:border-[#C89B3C]"
              >
                {statusLeads.map((status) => (
                  <option key={status} value={status}>
                    {labelTexto(status)}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-2 text-sm font-medium text-[#102A27]">
              Responsavel
              <input
                name="responsavel"
                defaultValue={leadEmEdicao?.responsavel ?? ""}
                className="rounded-xl border border-[#E8DDCB] px-4 py-3 text-[#071E36] outline-none transition placeholder:text-[#9a9d98] focus:border-[#C89B3C]"
                placeholder="Corretor ou responsavel"
              />
            </label>

            <label className="grid gap-2 text-sm font-medium text-[#102A27] md:col-span-3">
              Observacao
              <textarea
                name="observacao"
                rows={4}
                defaultValue={leadEmEdicao?.observacao ?? ""}
                className="rounded-xl border border-[#E8DDCB] px-4 py-3 text-[#071E36] outline-none transition placeholder:text-[#9a9d98] focus:border-[#C89B3C]"
                placeholder="Contexto do atendimento, necessidade, proximos passos..."
              />
            </label>

            <div className="flex flex-wrap gap-3 md:col-span-3">
              <button
                type="submit"
                className="rounded-xl bg-[#071E36] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#0A2A4A]"
              >
                {leadEmEdicao ? "Salvar alteracoes" : "Salvar lead"}
              </button>
              {leadEmEdicao ? (
                <Link
                  href="/dashboard/crm/leads"
                  className="rounded-xl border border-[#E8DDCB] bg-white px-5 py-3 text-sm font-semibold text-[#071E36] transition hover:border-[#C89B3C]/45 hover:bg-[#C89B3C]/10"
                >
                  Cancelar
                </Link>
              ) : null}
            </div>
          </form>
        </section>

        <section className="mt-8 rounded-[2rem] border border-[#E8DDCB] bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-[#071E36]">
                Leads cadastrados
              </h2>
              <p className="mt-1 text-sm text-[#64736D]">
                Busca, filtros e atalhos para atendimento e timeline.
              </p>
            </div>
            <span className="rounded-full bg-[#C89B3C]/10 px-3 py-1 text-sm font-medium text-[#8B6827]">
              {leadsFiltrados.length} de {leads.length}
            </span>
          </div>

          <form className="mt-6 grid gap-3 lg:grid-cols-[1.4fr_repeat(5,1fr)_auto]" action="/dashboard/crm/leads">
            <label className="relative">
              <Search
                size={16}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#9a9d98]"
              />
              <input
                name="busca"
                defaultValue={busca}
                placeholder="Buscar por nome, telefone, bairro, responsavel..."
                className="h-full w-full rounded-xl border border-[#E8DDCB] bg-white py-3 pl-9 pr-3 text-sm text-[#071E36] outline-none focus:border-[#C89B3C]"
              />
            </label>
            <select name="tipo_lead" defaultValue={filtroTipo} className="rounded-xl border border-[#E8DDCB] bg-white px-3 py-3 text-sm text-[#071E36]">
              <option value="">Tipo</option>
              {tiposLead.map((tipo) => (
                <option key={tipo} value={tipo}>{tipo}</option>
              ))}
            </select>
            <select name="status" defaultValue={filtroStatus} className="rounded-xl border border-[#E8DDCB] bg-white px-3 py-3 text-sm text-[#071E36]">
              <option value="">Status</option>
              {statusLeads.map((status) => (
                <option key={status} value={status}>{labelTexto(status)}</option>
              ))}
            </select>
            <select name="origem" defaultValue={filtroOrigem} className="rounded-xl border border-[#E8DDCB] bg-white px-3 py-3 text-sm text-[#071E36]">
              <option value="">Origem</option>
              {origens.map((origem) => (
                <option key={origem} value={origem}>{origem}</option>
              ))}
            </select>
            <select name="temperatura" defaultValue={filtroTemperatura} className="rounded-xl border border-[#E8DDCB] bg-white px-3 py-3 text-sm text-[#071E36]">
              <option value="">Temperatura</option>
              {["frio", "morno", "quente"].map((temperatura) => (
                <option key={temperatura} value={temperatura}>{temperatura}</option>
              ))}
            </select>
            <select name="responsavel" defaultValue={filtroResponsavel} className="rounded-xl border border-[#E8DDCB] bg-white px-3 py-3 text-sm text-[#071E36]">
              <option value="">Responsavel</option>
              {responsaveis.map((responsavel) => (
                <option key={responsavel} value={responsavel}>{responsavel}</option>
              ))}
            </select>
            <button type="submit" className="rounded-xl bg-[#071E36] px-5 py-3 text-sm font-semibold text-white">
              Filtrar
            </button>
          </form>

          {error ? (
            <p className="mt-6 rounded-xl bg-[#fbebe7] px-4 py-3 text-sm text-[#8a2e1c]">
              Nao foi possivel carregar os leads. Verifique se a tabela ja foi criada.
            </p>
          ) : leadsFiltrados.length === 0 ? (
            <p className="mt-6 rounded-xl bg-[#F7F3ED] px-4 py-8 text-center text-sm text-[#64736D]">
              Nenhum lead encontrado para os filtros selecionados.
            </p>
          ) : (
            <div className="mt-6 grid gap-4">
              {leadsFiltrados.map((lead) => {
                const temperatura = temperaturaLead(lead.status);
                return (
                  <article
                    key={lead.id}
                    className="rounded-3xl border border-[#E8DDCB] bg-[#fffdfa] p-5 shadow-sm transition duration-300 hover:border-[#C89B3C]/35 hover:shadow-lg"
                  >
                    <div className="grid gap-5 xl:grid-cols-[1.3fr_1fr_auto] xl:items-start">
                      <div>
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <Link
                              href={`/dashboard/crm/leads/${lead.id}`}
                              className="text-xl font-semibold text-[#071E36] transition hover:text-[#8B6827]"
                            >
                              {lead.nome}
                            </Link>
                            <p className="mt-1 text-sm text-[#64736D]">
                              {lead.telefone || "Telefone nao informado"} ·{" "}
                              {lead.cidade || "Cidade nao informada"}
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <span className={badgeClassName(temperatura)}>{temperatura}</span>
                            <span className={badgeClassName("origem")}>{lead.origem || "manual"}</span>
                            {lead.status === "corretor" ? (
                              <span className={badgeClassName("handoff")}>handoff UCE</span>
                            ) : null}
                          </div>
                        </div>
                        <p className="mt-4 text-sm leading-6 text-[#64736D]">
                          {lead.observacao || "Sem observacao operacional registrada."}
                        </p>
                      </div>

                      <div className="grid gap-3 text-sm sm:grid-cols-2 xl:grid-cols-1">
                        <span className="rounded-2xl bg-white px-3 py-2 text-[#64736D]">
                          <strong className="text-[#071E36]">Status:</strong>{" "}
                          {labelTexto(lead.status)}
                        </span>
                        <span className="rounded-2xl bg-white px-3 py-2 text-[#64736D]">
                          <strong className="text-[#071E36]">Tipo:</strong>{" "}
                          {lead.tipo_lead || "-"}
                        </span>
                        <span className="rounded-2xl bg-white px-3 py-2 text-[#64736D]">
                          <strong className="text-[#071E36]">Responsavel:</strong>{" "}
                          {lead.responsavel || "-"}
                        </span>
                        <span className="rounded-2xl bg-white px-3 py-2 text-[#64736D]">
                          <strong className="text-[#071E36]">Ultimo contato:</strong>{" "}
                          {formatarData(lead.created_at)}
                        </span>
                      </div>

                      <div className="min-w-[240px] rounded-2xl border border-[#E8DDCB] bg-white p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8B6827]">
                          Proxima acao
                        </p>
                        <p className="mt-2 text-sm font-semibold text-[#071E36]">
                          {proximaAcaoLead(lead)}
                        </p>
                        <p className="mt-3 text-xs text-[#64736D]">
                          Especialista UCE sugerido
                        </p>
                        <span className={`mt-2 inline-flex ${badgeClassName("status")}`}>
                          {especialistaSugerido(lead)}
                        </span>
                      </div>
                    </div>

                    <div className="mt-5 flex flex-wrap gap-2 border-t border-[#E8DDCB] pt-4">
                      <Link href={`/dashboard/crm/leads/${lead.id}`} className="rounded-full border border-[#E8DDCB] bg-white px-3 py-1 text-xs font-semibold text-[#071E36] transition hover:border-[#C89B3C]/45 hover:bg-[#C89B3C]/10">
                        Visualizar
                      </Link>
                      <Link href={`/dashboard/crm/leads?edit=${lead.id}`} className="rounded-full border border-[#E8DDCB] bg-white px-3 py-1 text-xs font-semibold text-[#071E36] transition hover:border-[#C89B3C]/45 hover:bg-[#C89B3C]/10">
                        Editar
                      </Link>
                      <Link href="/dashboard/crm/negocios" className="rounded-full border border-[#C89B3C]/35 bg-[#C89B3C]/10 px-3 py-1 text-xs font-semibold text-[#8B6827] transition hover:bg-[#C89B3C]/15">
                        Transformar em negocio
                      </Link>
                      <form action={excluirLead}>
                        <input type="hidden" name="id" value={lead.id} />
                        <ConfirmSubmitButton
                          message="Arquivar este lead como perdido?"
                          className="rounded-full border border-red-100 bg-red-50 px-3 py-1 text-xs font-semibold text-red-700 transition hover:bg-red-100"
                        >
                          Excluir
                        </ConfirmSubmitButton>
                      </form>
                      <Link href="/dashboard/crm/atendimentos" className="rounded-full border border-[#E8DDCB] bg-white px-3 py-1 text-xs font-semibold text-[#071E36] transition hover:border-[#C89B3C]/45 hover:bg-[#C89B3C]/10">
                        Ver atendimento
                      </Link>
                      <Link href="/dashboard/crm/timeline" className="rounded-full border border-[#E8DDCB] bg-white px-3 py-1 text-xs font-semibold text-[#071E36] transition hover:border-[#C89B3C]/45 hover:bg-[#C89B3C]/10">
                        Ver timeline
                      </Link>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
