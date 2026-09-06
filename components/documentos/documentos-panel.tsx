"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";

import {
  atualizarStatusChecklist,
  confirmarUpload,
  criarItemChecklist,
  excluirDocumento,
  gerarUrlDownload,
  reservarUpload,
} from "../../lib/documentos/actions";
import {
  DOCUMENT_BUCKET,
  DOCUMENT_MAX_BYTES,
  DOCUMENT_MIME_TYPES,
  type ChecklistDocumentoItem,
  type ChecklistDocumentoStatus,
  type DocumentoEntidadeTipo,
  type DocumentoItem,
  type DocumentoPanelPermissions,
} from "../../lib/documentos/contracts";
import { createClient } from "../../lib/supabase/client";

type Props = Readonly<{
  entidadeTipo: DocumentoEntidadeTipo;
  entidadeId: string;
  checklist: readonly ChecklistDocumentoItem[];
  documentos: readonly DocumentoItem[];
  permissions: DocumentoPanelPermissions;
  currentUserId: string;
}>;

const inputClass =
  "rounded-xl border border-[#E8DDCB] bg-white px-4 py-3 text-sm text-[#071E36] outline-none transition placeholder:text-[#8A9691] focus:border-[#C89B3C] focus:ring-2 focus:ring-[#C89B3C]/15";

export function DocumentosPanel({
  entidadeTipo,
  entidadeId,
  checklist,
  documentos,
  permissions,
  currentUserId,
}: Props) {
  const router = useRouter();
  const uploadFormRef = useRef<HTMLFormElement>(null);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  async function run(operation: () => Promise<{ ok: boolean; mensagem: string }>) {
    setPending(true);
    setMessage(null);
    try {
      const result = await operation();
      setMessage({
        type: result.ok ? "success" : "error",
        text: result.mensagem,
      });
      if (result.ok) router.refresh();
      return result.ok;
    } catch {
      setMessage({ type: "error", text: "Nao foi possivel concluir a operacao." });
      return false;
    } finally {
      setPending(false);
    }
  }

  async function handleCreateChecklist(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const completed = await run(() =>
      criarItemChecklist({
        entidadeTipo,
        entidadeId,
        codigo: String(data.get("codigo") ?? ""),
        titulo: String(data.get("titulo") ?? ""),
        descricao: String(data.get("descricao") ?? ""),
        obrigatorio: data.get("obrigatorio") === "on",
      }),
    );
    if (completed) form.reset();
  }

  async function handleStatus(event: FormEvent<HTMLFormElement>, itemId: string) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    await run(() =>
      atualizarStatusChecklist({
        checklistDocumentoId: itemId,
        status: String(data.get("status")) as ChecklistDocumentoStatus,
        motivoDispensa: String(data.get("motivo_dispensa") ?? ""),
      }),
    );
  }

  async function handleUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const file = data.get("arquivo");
    if (!(file instanceof File) || file.size === 0) {
      setMessage({ type: "error", text: "Selecione um arquivo." });
      return;
    }
    if (!DOCUMENT_MIME_TYPES.some((mime) => mime === file.type)) {
      setMessage({ type: "error", text: "Envie PDF, JPG/JPEG ou PNG." });
      return;
    }
    if (file.size > DOCUMENT_MAX_BYTES) {
      setMessage({ type: "error", text: "O arquivo deve ter no maximo 6 MiB." });
      return;
    }

    setPending(true);
    setMessage(null);
    try {
      const reservation = await reservarUpload({
        entidadeTipo,
        entidadeId,
        nomeOriginal: file.name,
        mimeType: file.type,
        tamanhoBytes: file.size,
        categoria: String(data.get("categoria") ?? ""),
        titulo: String(data.get("titulo") ?? ""),
        checklistDocumentoId: String(data.get("checklist_documento_id") ?? ""),
      });
      if (!reservation.ok) {
        setMessage({ type: "error", text: reservation.mensagem });
        return;
      }

      const supabase = createClient();
      const { error: uploadError } = await supabase.storage
        .from(DOCUMENT_BUCKET)
        .uploadToSignedUrl(
          reservation.data.storagePath,
          reservation.data.token,
          file,
          { contentType: file.type, upsert: false },
        );
      const confirmation = await confirmarUpload(reservation.data.documentoId);
      if (uploadError && !confirmation.ok) {
        setMessage({
          type: "error",
          text: "O Storage nao concluiu o envio do arquivo.",
        });
        router.refresh();
        return;
      }
      setMessage({
        type: confirmation.ok ? "success" : "error",
        text: confirmation.mensagem,
      });
      if (confirmation.ok) {
        uploadFormRef.current?.reset();
        router.refresh();
      }
    } catch {
      setMessage({ type: "error", text: "Nao foi possivel concluir o upload." });
    } finally {
      setPending(false);
    }
  }

  async function handleDownload(documentoId: string) {
    setPending(true);
    setMessage(null);
    try {
      const result = await gerarUrlDownload(documentoId);
      if (!result.ok) {
        setMessage({ type: "error", text: result.mensagem });
        return;
      }
      window.location.assign(result.data.signedUrl);
    } catch {
      setMessage({ type: "error", text: "Nao foi possivel iniciar o download." });
    } finally {
      setPending(false);
    }
  }

  async function handleDelete(documentoId: string) {
    if (!window.confirm("Excluir logicamente este documento? O arquivo fisico sera preservado.")) {
      return;
    }
    await run(() => excluirDocumento(documentoId));
  }

  return (
    <div className="grid gap-6">
      {message ? (
        <p
          role={message.type === "error" ? "alert" : "status"}
          className={`rounded-xl px-4 py-3 text-sm font-medium ${
            message.type === "error"
              ? "border border-red-100 bg-red-50 text-red-700"
              : "border border-emerald-100 bg-emerald-50 text-emerald-700"
          }`}
        >
          {message.text}
        </p>
      ) : null}

      <section className="rounded-3xl border border-[#E8DDCB] bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-[#071E36]">Checklist documental</h2>
            <p className="mt-1 text-sm text-[#64736D]">
              A entrega do item independe de haver arquivo anexado.
            </p>
          </div>
          <span className="rounded-full bg-[#F7F3ED] px-3 py-1 text-xs font-semibold text-[#64736D]">
            {checklist.length} itens
          </span>
        </div>

        {permissions.podeGerenciarChecklist ? (
          <form onSubmit={handleCreateChecklist} className="mt-5 grid gap-3 rounded-2xl bg-[#F7F3ED] p-4 md:grid-cols-2">
            <input name="codigo" required maxLength={80} pattern="[A-Za-z0-9_-]+" placeholder="Codigo (ex: matricula)" className={inputClass} />
            <input name="titulo" required maxLength={160} placeholder="Titulo do item" className={inputClass} />
            <textarea name="descricao" maxLength={2000} placeholder="Descricao opcional" className={`${inputClass} min-h-24 md:col-span-2`} />
            <label className="flex items-center gap-2 text-sm font-medium text-[#071E36]">
              <input name="obrigatorio" type="checkbox" defaultChecked /> Obrigatorio
            </label>
            <button disabled={pending} className="rounded-xl bg-[#071E36] px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60">
              Adicionar ao checklist
            </button>
          </form>
        ) : null}

        <div className="mt-5 grid gap-3">
          {checklist.length === 0 ? (
            <p className="rounded-2xl bg-[#F7F3ED] px-4 py-8 text-center text-sm text-[#64736D]">
              Nenhum item de checklist cadastrado.
            </p>
          ) : (
            checklist.map((item) => (
              <article key={item.id} className="rounded-2xl border border-[#E8DDCB] bg-[#fffdfa] p-4">
                <div className="flex flex-wrap justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#8B6827]">{item.codigo}</p>
                    <h3 className="mt-1 font-semibold text-[#071E36]">{item.titulo}</h3>
                    {item.descricao ? <p className="mt-2 text-sm text-[#64736D]">{item.descricao}</p> : null}
                  </div>
                  <span className={statusClass(item.status)}>{statusLabel(item.status)}</span>
                </div>
                {permissions.podeGerenciarChecklist ? (
                  <form onSubmit={(event) => handleStatus(event, item.id)} className="mt-4 grid gap-2 sm:grid-cols-[180px_1fr_auto]">
                    <select name="status" defaultValue={item.status} className={inputClass}>
                      <option value="pendente">Pendente</option>
                      <option value="entregue">Entregue</option>
                      <option value="dispensado">Dispensado</option>
                    </select>
                    <input name="motivo_dispensa" maxLength={1000} placeholder="Motivo obrigatorio se dispensado" className={inputClass} />
                    <button disabled={pending} className="rounded-xl border border-[#C89B3C]/40 bg-white px-4 py-2 text-sm font-semibold text-[#8B6827] disabled:opacity-60">
                      Atualizar
                    </button>
                  </form>
                ) : null}
              </article>
            ))
          )}
        </div>
      </section>

      {permissions.podeVisualizarArquivos ? (
        <section className="rounded-3xl border border-[#E8DDCB] bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-[#071E36]">Arquivos privados</h2>
          <p className="mt-1 text-sm text-[#64736D]">PDF, JPG/JPEG ou PNG, com ate 6 MiB.</p>

          {permissions.podeEnviar ? (
            <form ref={uploadFormRef} onSubmit={handleUpload} className="mt-5 grid gap-3 rounded-2xl bg-[#F7F3ED] p-4 md:grid-cols-2">
              <input name="arquivo" type="file" required accept="application/pdf,image/jpeg,image/png,.pdf,.jpg,.jpeg,.png" className={`${inputClass} md:col-span-2`} />
              <input name="categoria" required maxLength={80} placeholder="Categoria" className={inputClass} />
              <input name="titulo" maxLength={160} placeholder="Titulo opcional" className={inputClass} />
              <select name="checklist_documento_id" className={inputClass}>
                <option value="">Sem vinculo com checklist</option>
                {checklist.map((item) => <option key={item.id} value={item.id}>{item.titulo}</option>)}
              </select>
              <button disabled={pending} className="rounded-xl bg-[#071E36] px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60">
                {pending ? "Processando..." : "Enviar arquivo"}
              </button>
            </form>
          ) : null}

          <div className="mt-5 grid gap-3">
            {documentos.length === 0 ? (
              <p className="rounded-2xl bg-[#F7F3ED] px-4 py-8 text-center text-sm text-[#64736D]">Nenhum arquivo disponivel.</p>
            ) : documentos.map((documento) => (
              <article key={documento.id} className="rounded-2xl border border-[#E8DDCB] bg-[#fffdfa] p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#8B6827]">{documento.categoria}</p>
                    <h3 className="mt-1 font-semibold text-[#071E36]">{documento.titulo || documento.nomeOriginal}</h3>
                    <p className="mt-2 text-xs text-[#64736D]">
                      {documento.nomeOriginal} · {formatBytes(documento.tamanhoBytes)} · {formatDate(documento.createdAt)} · {documento.enviadoPorUserId === currentUserId ? "Voce" : `Usuario ${documento.enviadoPorUserId.slice(0, 8)}`}
                    </p>
                  </div>
                  <span className={fileStateClass(documento.estadoArquivo)}>{fileStateLabel(documento.estadoArquivo)}</span>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {permissions.podeBaixar && documento.estadoArquivo === "disponivel" ? (
                    <button type="button" disabled={pending} onClick={() => handleDownload(documento.id)} className="rounded-full border border-[#E8DDCB] bg-white px-3 py-1 text-xs font-semibold text-[#071E36] disabled:opacity-60">Baixar</button>
                  ) : null}
                  {permissions.podeExcluir ? (
                    <button type="button" disabled={pending} onClick={() => handleDelete(documento.id)} className="rounded-full border border-red-100 bg-red-50 px-3 py-1 text-xs font-semibold text-red-700 disabled:opacity-60">Excluir</button>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : (
        <section className="rounded-3xl border border-[#E8DDCB] bg-white p-6 text-sm text-[#64736D] shadow-sm">
          Seu perfil pode acompanhar o checklist, mas nao possui acesso aos arquivos anexados.
        </section>
      )}
    </div>
  );
}

function statusLabel(status: ChecklistDocumentoStatus) {
  return { pendente: "Pendente", entregue: "Entregue", dispensado: "Dispensado" }[status];
}

function statusClass(status: ChecklistDocumentoStatus) {
  const color = status === "entregue" ? "bg-emerald-50 text-emerald-700" : status === "dispensado" ? "bg-slate-100 text-slate-700" : "bg-amber-50 text-amber-700";
  return `h-fit rounded-full px-3 py-1 text-xs font-semibold ${color}`;
}

function fileStateLabel(status: DocumentoItem["estadoArquivo"]) {
  return { pendente_upload: "Aguardando upload", disponivel: "Disponivel", falhou: "Falhou", excluido: "Excluido" }[status];
}

function fileStateClass(status: DocumentoItem["estadoArquivo"]) {
  const color = status === "disponivel" ? "bg-emerald-50 text-emerald-700" : status === "falhou" ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700";
  return `h-fit rounded-full px-3 py-1 text-xs font-semibold ${color}`;
}

function formatBytes(bytes: number) {
  return bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(1)} KiB` : `${(bytes / (1024 * 1024)).toFixed(1)} MiB`;
}

function formatDate(value: string) {
  if (Number.isNaN(Date.parse(value))) return "Data indisponivel";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" }).format(new Date(value));
}
