export const DOCUMENT_BUCKET = "crm-documentos";
export const DOCUMENT_MAX_BYTES = 6 * 1024 * 1024;

export const DOCUMENT_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
] as const;

export type DocumentoMimeType = (typeof DOCUMENT_MIME_TYPES)[number];
export type DocumentoEntidadeTipo = "imovel" | "negocio";
export type ChecklistDocumentoStatus = "pendente" | "entregue" | "dispensado";
export type DocumentoEstadoArquivo =
  | "pendente_upload"
  | "disponivel"
  | "falhou"
  | "excluido";

export type DocumentoActionResult<T = undefined> =
  | { ok: true; mensagem: string; data: T }
  | { ok: false; mensagem: string };

export type ChecklistDocumentoItem = Readonly<{
  id: string;
  codigo: string;
  titulo: string;
  descricao: string | null;
  obrigatorio: boolean;
  status: ChecklistDocumentoStatus;
  ordem: number;
  observacoes: string | null;
}>;

export type DocumentoItem = Readonly<{
  id: string;
  checklistDocumentoId: string | null;
  categoria: string;
  titulo: string | null;
  nomeOriginal: string;
  mimeType: DocumentoMimeType;
  tamanhoBytes: number;
  estadoArquivo: DocumentoEstadoArquivo;
  enviadoPorUserId: string;
  disponibilizadoEm: string | null;
  createdAt: string;
}>;

export type DocumentoPanelPermissions = Readonly<{
  podeGerenciarChecklist: boolean;
  podeVisualizarArquivos: boolean;
  podeEnviar: boolean;
  podeBaixar: boolean;
  podeExcluir: boolean;
}>;

export type CriarItemChecklistInput = Readonly<{
  entidadeTipo: DocumentoEntidadeTipo;
  entidadeId: string;
  codigo: string;
  titulo: string;
  descricao?: string;
  obrigatorio: boolean;
}>;

export type AtualizarStatusChecklistInput = Readonly<{
  checklistDocumentoId: string;
  status: ChecklistDocumentoStatus;
  motivoDispensa?: string;
}>;

export type ReservarUploadInput = Readonly<{
  entidadeTipo: DocumentoEntidadeTipo;
  entidadeId: string;
  nomeOriginal: string;
  mimeType: string;
  tamanhoBytes: number;
  categoria: string;
  titulo?: string;
  checklistDocumentoId?: string;
}>;

export type UploadReservation = Readonly<{
  documentoId: string;
  storagePath: string;
  signedUrl: string;
  token: string;
}>;
