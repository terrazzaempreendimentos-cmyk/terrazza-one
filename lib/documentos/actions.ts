"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";

import {
  AccessPermissionRequiredError,
  AccessProfileRequiredError,
  requireCorretorPessoaId,
  requirePermission,
  type AccessProfile,
} from "../auth/access-profile";
import type { Permission } from "../auth/permissions";
import { createClient } from "../supabase/server";
import {
  DOCUMENT_BUCKET,
  DOCUMENT_MAX_BYTES,
  DOCUMENT_MIME_TYPES,
  type AtualizarStatusChecklistInput,
  type ChecklistDocumentoStatus,
  type CriarItemChecklistInput,
  type DocumentoActionResult,
  type DocumentoEntidadeTipo,
  type DocumentoMimeType,
  type ReservarUploadInput,
  type UploadReservation,
} from "./contracts";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const CHECKLIST_STATUS = new Set<ChecklistDocumentoStatus>([
  "pendente",
  "entregue",
  "dispensado",
]);

type DocumentoRow = {
  id: string;
  imovel_id: string | null;
  negocio_id: string | null;
  bucket_id: string;
  storage_path: string;
  nome_original: string;
  estado_arquivo: string;
  ativo: boolean;
  enviado_por_user_id: string;
};

function failure<T = undefined>(mensagem: string): DocumentoActionResult<T> {
  return { ok: false, mensagem };
}

function success<T>(mensagem: string, data: T): DocumentoActionResult<T> {
  return { ok: true, mensagem, data };
}

function logError(etapa: string, codigo: unknown) {
  console.error({
    modulo: "documentos",
    etapa,
    codigo: typeof codigo === "string" ? codigo : "unexpected_error",
  });
}

async function authorize(permission: Permission) {
  try {
    const profile = await requirePermission(permission);
    requireCorretorPessoaId(profile);
    return profile;
  } catch (error) {
    logError(
      "authorization",
      error instanceof AccessPermissionRequiredError ||
        error instanceof AccessProfileRequiredError
        ? error.name
        : "authorization_error",
    );
    return null;
  }
}

function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value);
}

function isEntityType(value: unknown): value is DocumentoEntidadeTipo {
  return value === "imovel" || value === "negocio";
}

function revalidateEntity(tipo: DocumentoEntidadeTipo, id: string) {
  revalidatePath(
    tipo === "imovel"
      ? `/dashboard/imoveis/${id}`
      : `/dashboard/crm/negocios/${id}`,
  );
}

async function canManageEntity(
  profile: AccessProfile,
  tipo: DocumentoEntidadeTipo,
  id: string,
) {
  if (!isUuid(id)) return false;
  const supabase = await createClient();

  if (tipo === "negocio") {
    if (profile.papel !== "administrador" && profile.papel !== "gestor") {
      return false;
    }
    const result = await supabase
      .from("negocios")
      .select("id")
      .eq("id", id)
      .maybeSingle();
    if (result.error) logError("authorize_negocio", result.error.code);
    return !result.error && Boolean(result.data);
  }

  let query = supabase.from("imoveis").select("id").eq("id", id);
  if (profile.papel === "corretor") {
    query = query.eq("responsavel_pessoa_id", profile.pessoaId!);
  } else if (profile.papel !== "administrador" && profile.papel !== "gestor") {
    return false;
  }
  const result = await query.maybeSingle();
  if (result.error) logError("authorize_imovel", result.error.code);
  return !result.error && Boolean(result.data);
}

async function getDocumento(documentoId: string) {
  if (!isUuid(documentoId)) return null;
  const { data, error } = await (await createClient())
    .from("documentos")
    .select(
      "id, imovel_id, negocio_id, bucket_id, storage_path, nome_original, estado_arquivo, ativo, enviado_por_user_id",
    )
    .eq("id", documentoId)
    .maybeSingle();
  if (error) logError("documento_lookup", error.code);
  return error ? null : ((data ?? null) as DocumentoRow | null);
}

function documentEntity(documento: DocumentoRow) {
  if (documento.imovel_id) {
    return { tipo: "imovel" as const, id: documento.imovel_id };
  }
  if (documento.negocio_id) {
    return { tipo: "negocio" as const, id: documento.negocio_id };
  }
  return null;
}

function normalizeOptional(value: unknown, maxLength: number) {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized ? normalized.slice(0, maxLength) : null;
}

function cleanOriginalName(value: unknown) {
  if (typeof value !== "string") return "";
  return value
    .trim()
    .replace(/[\\/\u0000-\u001f\u007f]/g, "_")
    .slice(0, 255);
}

function mimeExtension(mimeType: DocumentoMimeType) {
  if (mimeType === "application/pdf") return "pdf";
  if (mimeType === "image/png") return "png";
  return "jpg";
}

async function validateChecklistLink(
  checklistDocumentoId: string,
  tipo: DocumentoEntidadeTipo,
  entidadeId: string,
) {
  const column = tipo === "imovel" ? "imovel_id" : "negocio_id";
  const { data, error } = await (await createClient())
    .from("checklist_documentos")
    .select("id")
    .eq("id", checklistDocumentoId)
    .eq(column, entidadeId)
    .eq("ativo", true)
    .maybeSingle();
  if (error) logError("checklist_link", error.code);
  return !error && Boolean(data);
}

export async function criarItemChecklist(
  input: CriarItemChecklistInput,
): Promise<DocumentoActionResult<{ checklistDocumentoId: string }>> {
  const profile = await authorize("checklist_documentos.gerenciar");
  if (!profile) return failure("Operacao nao autorizada.");
  if (!isEntityType(input.entidadeTipo) || !isUuid(input.entidadeId)) {
    return failure("Entidade documental invalida.");
  }
  if (!(await canManageEntity(profile, input.entidadeTipo, input.entidadeId))) {
    return failure("Operacao nao autorizada para esta entidade.");
  }

  const codigo = input.codigo.trim();
  const titulo = input.titulo.trim();
  if (!/^[A-Za-z0-9_-]{1,80}$/.test(codigo)) {
    return failure("Use ate 80 letras, numeros, hifen ou sublinhado no codigo.");
  }
  if (!titulo || titulo.length > 160) {
    return failure("Informe um titulo de ate 160 caracteres.");
  }
  const descricao = normalizeOptional(input.descricao, 2000);
  const payload = {
    imovel_id: input.entidadeTipo === "imovel" ? input.entidadeId : null,
    negocio_id: input.entidadeTipo === "negocio" ? input.entidadeId : null,
    codigo,
    titulo,
    descricao,
    obrigatorio: input.obrigatorio,
    status: "pendente",
    criado_por_user_id: profile.userId,
    atualizado_por_user_id: profile.userId,
  };
  const { data, error } = await (await createClient())
    .from("checklist_documentos")
    .insert(payload)
    .select("id")
    .single();
  if (error || !data) {
    logError("checklist_create", error?.code ?? "missing_return");
    return failure("Nao foi possivel criar o item do checklist.");
  }
  revalidateEntity(input.entidadeTipo, input.entidadeId);
  return success("Item criado.", { checklistDocumentoId: data.id as string });
}

export async function atualizarStatusChecklist(
  input: AtualizarStatusChecklistInput,
): Promise<DocumentoActionResult> {
  const profile = await authorize("checklist_documentos.gerenciar");
  if (!profile) return failure("Operacao nao autorizada.");
  if (!isUuid(input.checklistDocumentoId) || !CHECKLIST_STATUS.has(input.status)) {
    return failure("Item ou status invalido.");
  }

  const supabase = await createClient();
  const { data: item, error: itemError } = await supabase
    .from("checklist_documentos")
    .select("id, imovel_id, negocio_id")
    .eq("id", input.checklistDocumentoId)
    .eq("ativo", true)
    .maybeSingle();
  if (itemError || !item) {
    logError("checklist_status_lookup", itemError?.code ?? "not_found");
    return failure("Item de checklist nao encontrado.");
  }
  const tipo: DocumentoEntidadeTipo = item.imovel_id ? "imovel" : "negocio";
  const entidadeId = (item.imovel_id ?? item.negocio_id) as string;
  if (!(await canManageEntity(profile, tipo, entidadeId))) {
    return failure("Operacao nao autorizada para esta entidade.");
  }

  const motivo = normalizeOptional(input.motivoDispensa, 1000);
  if (input.status === "dispensado" && !motivo) {
    return failure("Informe o motivo da dispensa.");
  }
  const now = new Date().toISOString();
  const payload = {
    status: input.status,
    entregue_em: input.status === "entregue" ? now : null,
    entregue_por_user_id: input.status === "entregue" ? profile.userId : null,
    dispensado_em: input.status === "dispensado" ? now : null,
    dispensado_por_user_id: input.status === "dispensado" ? profile.userId : null,
    motivo_dispensa: input.status === "dispensado" ? motivo : null,
    atualizado_por_user_id: profile.userId,
  };
  const { data, error } = await supabase
    .from("checklist_documentos")
    .update(payload)
    .eq("id", input.checklistDocumentoId)
    .eq("ativo", true)
    .select("id")
    .maybeSingle();
  if (error || !data) {
    logError("checklist_status_update", error?.code ?? "not_updated");
    return failure("Nao foi possivel atualizar o checklist.");
  }
  revalidateEntity(tipo, entidadeId);
  return success("Status atualizado.", undefined);
}

export async function reservarUpload(
  input: ReservarUploadInput,
): Promise<DocumentoActionResult<UploadReservation>> {
  const profile = await authorize("documentos.enviar");
  if (!profile) return failure("Operacao nao autorizada.");
  if (!isEntityType(input.entidadeTipo) || !isUuid(input.entidadeId)) {
    return failure("Entidade documental invalida.");
  }
  if (!(await canManageEntity(profile, input.entidadeTipo, input.entidadeId))) {
    return failure("Operacao nao autorizada para esta entidade.");
  }
  if (!DOCUMENT_MIME_TYPES.some((mime) => mime === input.mimeType)) {
    return failure("Tipo de arquivo nao permitido.");
  }
  if (!Number.isSafeInteger(input.tamanhoBytes) || input.tamanhoBytes <= 0 || input.tamanhoBytes > DOCUMENT_MAX_BYTES) {
    return failure("O arquivo deve ter no maximo 6 MiB.");
  }
  const nomeOriginal = cleanOriginalName(input.nomeOriginal);
  const categoria = input.categoria.trim();
  const titulo = normalizeOptional(input.titulo, 160);
  if (!nomeOriginal) return failure("Nome de arquivo invalido.");
  if (!categoria || categoria.length > 80) {
    return failure("Informe uma categoria de ate 80 caracteres.");
  }
  const checklistId = input.checklistDocumentoId?.trim() || null;
  if (checklistId && (!isUuid(checklistId) || !(await validateChecklistLink(checklistId, input.entidadeTipo, input.entidadeId)))) {
    return failure("Item de checklist invalido para esta entidade.");
  }

  const mimeType = input.mimeType as DocumentoMimeType;
  const documentoId = randomUUID();
  const objectId = randomUUID();
  const prefix = input.entidadeTipo === "imovel" ? "imoveis" : "negocios";
  const storagePath = `${prefix}/${input.entidadeId}/${documentoId}/${objectId}.${mimeExtension(mimeType)}`;
  const supabase = await createClient();
  const { error: insertError } = await supabase.from("documentos").insert({
    id: documentoId,
    imovel_id: input.entidadeTipo === "imovel" ? input.entidadeId : null,
    negocio_id: input.entidadeTipo === "negocio" ? input.entidadeId : null,
    checklist_documento_id: checklistId,
    categoria,
    titulo,
    nome_original: nomeOriginal,
    bucket_id: DOCUMENT_BUCKET,
    storage_path: storagePath,
    mime_type: mimeType,
    tamanho_bytes: input.tamanhoBytes,
    estado_arquivo: "pendente_upload",
    enviado_por_user_id: profile.userId,
  });
  if (insertError) {
    logError("upload_reserve_insert", insertError.code);
    return failure("Nao foi possivel reservar o upload.");
  }

  const { data: signed, error: signedError } = await supabase.storage
    .from(DOCUMENT_BUCKET)
    .createSignedUploadUrl(storagePath, { upsert: false });
  if (signedError || !signed) {
    logError("upload_reserve_sign", signedError?.name ?? "missing_signed_url");
    await supabase.rpc("finalizar_upload_documento", {
      p_documento_id: documentoId,
    });
    return failure("Nao foi possivel preparar o envio ao Storage.");
  }

  revalidateEntity(input.entidadeTipo, input.entidadeId);
  return success("Upload reservado.", {
    documentoId,
    storagePath,
    signedUrl: signed.signedUrl,
    token: signed.token,
  });
}

export async function confirmarUpload(
  documentoId: string,
): Promise<DocumentoActionResult<{ estadoArquivo: "disponivel" | "falhou" }>> {
  const profile = await authorize("documentos.enviar");
  if (!profile) return failure("Operacao nao autorizada.");
  const documento = await getDocumento(documentoId);
  if (!documento) return failure("Documento nao encontrado.");
  const entity = documentEntity(documento);
  if (!entity || !(await canManageEntity(profile, entity.tipo, entity.id))) {
    return failure("Operacao nao autorizada para este documento.");
  }
  if (profile.papel === "corretor" && documento.enviado_por_user_id !== profile.userId) {
    return failure("Operacao nao autorizada para este documento.");
  }

  const { data, error } = await (await createClient()).rpc(
    "finalizar_upload_documento",
    { p_documento_id: documentoId },
  );
  if (error) {
    logError("upload_finalize_rpc", error.code);
    return failure("Nao foi possivel validar o arquivo enviado.");
  }
  const result = data as { estado_arquivo?: unknown } | null;
  const state = result?.estado_arquivo;
  if (state !== "disponivel" && state !== "falhou") {
    logError("upload_finalize_return", "invalid_return");
    return failure("Nao foi possivel confirmar o estado do arquivo.");
  }
  revalidateEntity(entity.tipo, entity.id);
  return state === "disponivel"
    ? success("Arquivo enviado e validado.", { estadoArquivo: state })
    : failure("O arquivo recebido nao corresponde a reserva e foi marcado como falho.");
}

export async function gerarUrlDownload(
  documentoId: string,
): Promise<DocumentoActionResult<{ signedUrl: string }>> {
  const profile = await authorize("documentos.baixar");
  if (!profile) return failure("Operacao nao autorizada.");
  const documento = await getDocumento(documentoId);
  if (!documento || !documento.ativo || documento.estado_arquivo !== "disponivel") {
    return failure("Documento indisponivel.");
  }
  const entity = documentEntity(documento);
  if (!entity || !(await canManageEntity(profile, entity.tipo, entity.id))) {
    return failure("Operacao nao autorizada para este documento.");
  }

  const { data, error } = await (await createClient()).storage
    .from(documento.bucket_id)
    .createSignedUrl(documento.storage_path, 60, {
      download: documento.nome_original,
    });
  if (error || !data) {
    logError("download_sign", error?.name ?? "missing_signed_url");
    return failure("Nao foi possivel gerar o link de download.");
  }
  return success("Link gerado.", { signedUrl: data.signedUrl });
}

export async function excluirDocumento(
  documentoId: string,
): Promise<DocumentoActionResult> {
  const profile = await authorize("documentos.excluir");
  if (!profile || (profile.papel !== "administrador" && profile.papel !== "gestor")) {
    return failure("Operacao nao autorizada.");
  }
  const documento = await getDocumento(documentoId);
  if (!documento || !documento.ativo) return failure("Documento nao encontrado.");
  const entity = documentEntity(documento);
  if (!entity || !(await canManageEntity(profile, entity.tipo, entity.id))) {
    return failure("Operacao nao autorizada para este documento.");
  }

  const { data, error } = await (await createClient())
    .from("documentos")
    .update({
      ativo: false,
      estado_arquivo: "excluido",
      excluido_em: new Date().toISOString(),
      excluido_por_user_id: profile.userId,
    })
    .eq("id", documentoId)
    .eq("ativo", true)
    .select("id")
    .maybeSingle();
  if (error || !data) {
    logError("document_delete_logical", error?.code ?? "not_updated");
    return failure("Nao foi possivel excluir o documento.");
  }
  revalidateEntity(entity.tipo, entity.id);
  return success("Documento excluido logicamente.", undefined);
}
