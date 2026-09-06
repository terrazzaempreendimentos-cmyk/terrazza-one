import Link from "next/link";
import { notFound } from "next/navigation";

import { DocumentosPanel } from "../../../../../components/documentos/documentos-panel";
import { hasPermission } from "../../../../../lib/auth/permissions";
import { requirePagePermission } from "../../../../../lib/auth/page-permission";
import type {
  ChecklistDocumentoItem,
  ChecklistDocumentoStatus,
  DocumentoEstadoArquivo,
  DocumentoItem,
  DocumentoMimeType,
} from "../../../../../lib/documentos/contracts";
import { createClient } from "../../../../../lib/supabase/server";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type Relation = { nome?: string | null; codigo?: string | null; titulo?: string | null };
type Negocio = {
  id: string;
  titulo: string;
  tipo: string;
  etapa: string;
  status_operacional: string;
  moeda: string;
  valor_anunciado: number | null;
  valor_proposto: number | null;
  valor_negociado: number | null;
  valor_fechado: number | null;
  previsao_fechamento: string | null;
  created_at: string;
  updated_at: string;
  lead: Relation | Relation[] | null;
  imovel: Relation | Relation[] | null;
  responsavel: Relation | Relation[] | null;
};
type Raw = Record<string, unknown>;

export default async function NegocioDetalhePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const profile = await requirePagePermission("negocios.visualizar");
  const { id } = await params;
  if (!UUID_PATTERN.test(id)) notFound();
  const query = await searchParams;
  const tab = query.aba === "documentos" ? "documentos" : "resumo";
  const supabase = await createClient();
  const negocioResult = await supabase
    .from("negocios")
    .select("id, titulo, tipo, etapa, status_operacional, moeda, valor_anunciado, valor_proposto, valor_negociado, valor_fechado, previsao_fechamento, created_at, updated_at, lead:leads!negocios_lead_id_fkey(nome), imovel:imoveis!negocios_imovel_id_fkey(codigo, titulo), responsavel:pessoas!negocios_responsavel_id_fkey(nome)")
    .eq("id", id)
    .maybeSingle();
  if (negocioResult.error) logQueryError("negocio", negocioResult.error.code);
  if (!negocioResult.data) notFound();
  const negocio = negocioResult.data as unknown as Negocio;

  const isAdminManager = profile.papel === "administrador" || profile.papel === "gestor";
  const canManageChecklist = isAdminManager && hasPermission(profile.papel, "checklist_documentos.gerenciar");
  const canViewFiles = isAdminManager && hasPermission(profile.papel, "documentos.visualizar");
  const canUpload = isAdminManager && hasPermission(profile.papel, "documentos.enviar");
  const canDownload = isAdminManager && hasPermission(profile.papel, "documentos.baixar");
  const canDelete = isAdminManager && hasPermission(profile.papel, "documentos.excluir");

  const checklistPromise = supabase
    .from("checklist_documentos")
    .select("id, codigo, titulo, descricao, obrigatorio, status, ordem, observacoes")
    .eq("negocio_id", id)
    .eq("ativo", true)
    .order("ordem", { ascending: true })
    .order("created_at", { ascending: true });
  const documentsPromise = canViewFiles
    ? supabase
        .from("documentos")
        .select("id, checklist_documento_id, categoria, titulo, nome_original, mime_type, tamanho_bytes, estado_arquivo, enviado_por_user_id, disponibilizado_em, created_at")
        .eq("negocio_id", id)
        .eq("ativo", true)
        .order("created_at", { ascending: false })
    : Promise.resolve({ data: [], error: null });
  const [checklistResult, documentsResult] = await Promise.all([checklistPromise, documentsPromise]);
  if (checklistResult.error) logQueryError("checklist", checklistResult.error.code);
  if (documentsResult.error) logQueryError("documentos", documentsResult.error.code);
  const checklist = normalizeChecklist(checklistResult.data);
  const documentos = normalizeDocuments(documentsResult.data);
  const lead = relation(negocio.lead);
  const imovel = relation(negocio.imovel);
  const responsavel = relation(negocio.responsavel);

  return (
    <main className="min-h-screen bg-[#F7F3ED] px-5 py-8 sm:px-8">
      <div className="mx-auto max-w-7xl">
        <Link href="/dashboard/crm/negocios" className="inline-flex rounded-xl border border-[#E8DDCB] bg-white px-4 py-2 text-sm font-semibold text-[#071E36]">Voltar para Negocios</Link>
        <header className="mt-6 rounded-[2rem] border border-[#E8DDCB] bg-white p-6 shadow-sm sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8B6827]">{negocio.tipo} · {negocio.etapa}</p>
          <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
            <div><h1 className="text-3xl font-bold text-[#071E36] sm:text-4xl">{negocio.titulo}</h1><p className="mt-2 text-[#64736D]">Lead: {lead?.nome || "Nao informado"}</p></div>
            {isAdminManager && hasPermission(profile.papel, "negocios.editar") ? <Link href={`/dashboard/crm/negocios?editar=${id}`} className="rounded-xl bg-[#071E36] px-4 py-2 text-sm font-semibold text-white">Editar cadastro</Link> : null}
          </div>
        </header>
        <nav aria-label="Secoes do Negocio" className="mt-6 flex gap-2 rounded-2xl border border-[#E8DDCB] bg-white p-2 shadow-sm">
          <TabLink href={`/dashboard/crm/negocios/${id}`} active={tab === "resumo"}>Resumo</TabLink>
          <TabLink href={`/dashboard/crm/negocios/${id}?aba=documentos`} active={tab === "documentos"}>Documentos</TabLink>
        </nav>
        {checklistResult.error || documentsResult.error ? <p role="alert" className="mt-6 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">Nao foi possivel carregar todos os dados documentais.</p> : null}
        {tab === "resumo" ? (
          <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Info label="Status" value={negocio.status_operacional} />
            <Info label="Etapa" value={negocio.etapa} />
            <Info label="Valor" value={formatMoney(negocio.valor_fechado ?? negocio.valor_negociado ?? negocio.valor_proposto ?? negocio.valor_anunciado, negocio.moeda)} />
            <Info label="Previsao" value={formatDate(negocio.previsao_fechamento)} />
            <Info label="Lead" value={lead?.nome ?? null} />
            <Info label="Imovel" value={[imovel?.codigo, imovel?.titulo].filter(Boolean).join(" - ") || null} />
            <Info label="Responsavel" value={responsavel?.nome ?? null} />
            <Info label="Atualizado" value={formatDateTime(negocio.updated_at)} />
          </section>
        ) : (
          <div className="mt-6"><DocumentosPanel entidadeTipo="negocio" entidadeId={id} checklist={checklist} documentos={documentos} currentUserId={profile.userId} permissions={{ podeGerenciarChecklist: canManageChecklist, podeVisualizarArquivos: canViewFiles, podeEnviar: canUpload, podeBaixar: canDownload, podeExcluir: canDelete }} /></div>
        )}
      </div>
    </main>
  );
}

function TabLink({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) { return <Link href={href} aria-current={active ? "page" : undefined} className={`rounded-xl px-4 py-2 text-sm font-semibold ${active ? "bg-[#071E36] text-white" : "text-[#64736D] hover:bg-[#F7F3ED]"}`}>{children}</Link>; }
function Info({ label, value }: { label: string; value: string | null }) { return <article className="rounded-3xl border border-[#E8DDCB] bg-white p-5 shadow-sm"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8B6827]">{label}</p><p className="mt-3 text-lg font-semibold text-[#071E36]">{value || "Nao informado"}</p></article>; }
function relation(value: Relation | Relation[] | null) { return Array.isArray(value) ? value[0] ?? null : value; }
function normalizeChecklist(data: unknown): ChecklistDocumentoItem[] { if (!Array.isArray(data)) return []; return data.flatMap((value) => { if (!value || typeof value !== "object") return []; const row = value as Raw; if (typeof row.id !== "string" || typeof row.codigo !== "string" || typeof row.titulo !== "string" || typeof row.obrigatorio !== "boolean" || !isChecklistStatus(row.status)) return []; return [{ id: row.id, codigo: row.codigo, titulo: row.titulo, descricao: text(row.descricao), obrigatorio: row.obrigatorio, status: row.status, ordem: number(row.ordem) ?? 0, observacoes: text(row.observacoes) }]; }); }
function normalizeDocuments(data: unknown): DocumentoItem[] { if (!Array.isArray(data)) return []; return data.flatMap((value) => { if (!value || typeof value !== "object") return []; const row = value as Raw; if (typeof row.id !== "string" || typeof row.categoria !== "string" || typeof row.nome_original !== "string" || !isMime(row.mime_type) || !isFileState(row.estado_arquivo) || typeof row.enviado_por_user_id !== "string" || typeof row.created_at !== "string") return []; const size = number(row.tamanho_bytes); if (size === null) return []; return [{ id: row.id, checklistDocumentoId: text(row.checklist_documento_id), categoria: row.categoria, titulo: text(row.titulo), nomeOriginal: row.nome_original, mimeType: row.mime_type, tamanhoBytes: size, estadoArquivo: row.estado_arquivo, enviadoPorUserId: row.enviado_por_user_id, disponibilizadoEm: text(row.disponibilizado_em), createdAt: row.created_at }]; }); }
function isChecklistStatus(value: unknown): value is ChecklistDocumentoStatus { return value === "pendente" || value === "entregue" || value === "dispensado"; }
function isMime(value: unknown): value is DocumentoMimeType { return value === "application/pdf" || value === "image/jpeg" || value === "image/png"; }
function isFileState(value: unknown): value is DocumentoEstadoArquivo { return value === "pendente_upload" || value === "disponivel" || value === "falhou" || value === "excluido"; }
function text(value: unknown) { return typeof value === "string" ? value : null; }
function number(value: unknown) { const parsed = typeof value === "number" ? value : typeof value === "string" ? Number(value) : Number.NaN; return Number.isFinite(parsed) ? parsed : null; }
function formatMoney(value: number | null, currency: string) { if (value === null) return null; try { return new Intl.NumberFormat("pt-BR", { style: "currency", currency: /^[A-Z]{3}$/.test(currency) ? currency : "BRL" }).format(value); } catch { return String(value); } }
function formatDate(value: string | null) { return !value ? null : new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeZone: "UTC" }).format(new Date(`${value.slice(0, 10)}T00:00:00Z`)); }
function formatDateTime(value: string) { return Number.isNaN(Date.parse(value)) ? null : new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" }).format(new Date(value)); }
function logQueryError(etapa: string, codigo: unknown) { console.error({ modulo: "documentos_negocio_detail", etapa, codigo: typeof codigo === "string" ? codigo : "query_error" }); }
