"use client";

import { PointerActivationConstraints, PointerSensor } from "@dnd-kit/dom";
import {
  DragDropProvider,
  DragOverlay as DndDragOverlay,
  useDraggable,
  useDroppable,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/react";
import { ArrowLeft, ArrowRight, Ellipsis, GripVertical, LoaderCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { startTransition, useMemo, useRef, useState } from "react";

import {
  NEGOCIO_STAGES,
  getNegocioStageLabel,
  type NegocioStage,
} from "../../../../lib/crm/negocios/catalogs";
import { NEGOCIO_RPC_LIMITS } from "../../../../lib/crm/negocios/rpc-contracts";
import { NEGOCIO_STAGE_TRANSITIONS } from "../../../../lib/crm/negocios/transitions";
import { movimentarNegocioKanban } from "./actions";
import { FinalOperationControls } from "./final-operation-forms";
import type { KanbanFinalPermissions, KanbanNegocio } from "./kanban-types";

type Props = Readonly<{
  initialItems: readonly KanbanNegocio[];
  canMove: boolean;
  finalPermissions: KanbanFinalPermissions;
  clearFiltersHref: string;
}>;

const COLUMN_WIDTH = "w-[290px] min-w-[290px] max-w-[290px]";
const INPUT = "w-full rounded-xl border border-[#E8DDCB] bg-white px-3 py-2 text-sm text-[#071E36] outline-none transition focus:border-[#C89B3C] focus:ring-2 focus:ring-[#C89B3C]/15";

export function NegociosKanbanBoard({ initialItems, canMove, finalPermissions, clearFiltersHref }: Props) {
  const router = useRouter();
  const [items, setItems] = useState<readonly KanbanNegocio[]>(initialItems);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [pendingIds, setPendingIds] = useState<ReadonlySet<string>>(new Set());
  const [notice, setNotice] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const [mobileStage, setMobileStage] = useState<NegocioStage>(() => initialItems[0]?.etapa ?? NEGOCIO_STAGES[0].id);
  const handleRefs = useRef(new Map<string, HTMLButtonElement>());

  const activeItem = activeId ? items.find((item) => item.id === activeId) ?? null : null;
  const validTargets = useMemo(
    () => new Set<NegocioStage>(activeItem ? NEGOCIO_STAGE_TRANSITIONS[activeItem.etapa] : []),
    [activeItem],
  );

  function restoreFocus(id: string) {
    requestAnimationFrame(() => handleRefs.current.get(id)?.focus());
  }

  function move(item: KanbanNegocio, destination: NegocioStage, observacao: string | null = null) {
    if (!canMove || pendingIds.has(item.id) || !NEGOCIO_STAGE_TRANSITIONS[item.etapa].includes(destination as never)) return;
    setNotice(null);
    setPendingIds((current) => new Set(current).add(item.id));
    setItems((current) => current.map((candidate) => candidate.id === item.id ? { ...candidate, etapa: destination, diasNaEtapa: 0 } : candidate));
    setAnnouncement(`${item.titulo} movido para ${getNegocioStageLabel(destination)}. Confirmando no servidor.`);
    setMobileStage(destination);

    startTransition(async () => {
      try {
        const result = await movimentarNegocioKanban({
          negocioId: item.id,
          leadId: item.leadId,
          etapaAtual: item.etapa,
          etapaDestino: destination,
          updatedAt: item.updatedAt,
          observacao,
        });

        if (result.ok) {
          setItems((current) => current.map((candidate) => candidate.id === item.id ? {
            ...candidate,
            etapa: result.data.etapa_atual,
            updatedAt: result.data.updated_at,
            diasNaEtapa: 0,
          } : candidate));
          setNotice({ tone: "success", text: `Negocio movido para ${getNegocioStageLabel(destination)}.` });
          setAnnouncement(`${item.titulo} confirmado em ${getNegocioStageLabel(destination)}.`);
        } else {
          setItems((current) => current.map((candidate) => candidate.id === item.id ? item : candidate));
          setMobileStage(item.etapa);
          setNotice({ tone: "error", text: result.message });
          setAnnouncement(`Movimentacao cancelada. ${result.message}`);
        }
      } catch {
        const message = "Nao foi possivel confirmar a movimentacao. O quadro foi atualizado.";
        setItems((current) => current.map((candidate) => candidate.id === item.id ? item : candidate));
        setMobileStage(item.etapa);
        setNotice({ tone: "error", text: message });
        setAnnouncement(`Movimentacao cancelada. ${message}`);
      } finally {
        setPendingIds((current) => {
          const next = new Set(current);
          next.delete(item.id);
          return next;
        });
        restoreFocus(item.id);
        router.refresh();
      }
    });
  }

  function handleDragStart(event: DragStartEvent) {
    const id = String(event.operation.source?.id ?? "");
    const item = items.find((candidate) => candidate.id === id);
    if (!item || !canMove || pendingIds.has(id)) return;
    setActiveId(id);
    const destinations = NEGOCIO_STAGE_TRANSITIONS[item.etapa].map(getNegocioStageLabel).join(" ou ");
    setAnnouncement(`${item.titulo} selecionado. Destinos disponiveis: ${destinations}. Use as setas e confirme com Enter.`);
  }

  function handleDragEnd(event: DragEndEvent) {
    const item = activeId ? items.find((candidate) => candidate.id === activeId) : null;
    const destination = stageFromDropId(event.operation.target?.id);
    setActiveId(null);
    if (!item) return;
    if (event.canceled || !destination || !validTargets.has(destination)) {
      setAnnouncement(`Movimentacao de ${item.titulo} cancelada.`);
      restoreFocus(item.id);
      return;
    }
    move(item, destination);
  }

  if (!items.length) {
    return <section className="mt-8 rounded-[2rem] border border-dashed border-[#D8C8AE] bg-white px-6 py-14 text-center shadow-sm">
      <p className="text-lg font-semibold text-[#071E36]">Nenhum negocio encontrado com os filtros atuais.</p>
      <p className="mt-2 text-sm text-[#64736D]">Ajuste os filtros para voltar a visualizar o trilho comercial.</p>
      <Link href={clearFiltersHref} className="mt-5 inline-flex rounded-xl bg-[#071E36] px-4 py-2.5 text-sm font-semibold text-white">Limpar filtros</Link>
    </section>;
  }

  return <>
    <div aria-live="polite" aria-atomic="true" className="sr-only">{announcement}</div>
    {notice ? <div role={notice.tone === "error" ? "alert" : "status"} className={`mt-5 flex items-start justify-between gap-4 rounded-2xl border px-4 py-3 text-sm font-medium ${notice.tone === "error" ? "border-red-200 bg-red-50 text-red-800" : "border-emerald-200 bg-emerald-50 text-emerald-800"}`}>
      <span>{notice.text}</span><button type="button" onClick={() => setNotice(null)} className="shrink-0 font-semibold" aria-label="Fechar aviso">Fechar</button>
    </div> : null}

    <div className="mt-8 hidden md:block">
      <DragDropProvider
        sensors={(defaults) => defaults.map((sensor) => sensor === PointerSensor
          ? PointerSensor.configure({ activationConstraints: [new PointerActivationConstraints.Delay({ value: 250, tolerance: 6 })] })
          : sensor)}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="overflow-x-auto pb-5 [scrollbar-color:#C8B89D_transparent]">
          <div className="flex min-w-max items-stretch gap-3 rounded-[2rem] border border-[#DED1BE] bg-[#ECE4D8] p-3 shadow-[0_18px_45px_rgba(7,30,54,0.08)]">
            {NEGOCIO_STAGES.map((stage) => <KanbanColumn
              key={stage.id}
              stage={stage.id}
              label={stage.label}
              description={stage.description}
              items={items.filter((item) => item.etapa === stage.id)}
              canMove={canMove}
              activeItem={activeItem}
              validDrop={validTargets.has(stage.id)}
              pendingIds={pendingIds}
              finalPermissions={finalPermissions}
              handleRefs={handleRefs}
              onMove={move}
            />)}
          </div>
        </div>
        <DndDragOverlay dropAnimation={{ duration: 200, easing: "cubic-bezier(.2,.8,.2,1)" }}>
          {activeItem ? <KanbanCardPreview item={activeItem} /> : null}
        </DndDragOverlay>
      </DragDropProvider>
    </div>

    <MobileStageNavigator
      items={items}
      canMove={canMove}
      pendingIds={pendingIds}
      selectedStage={mobileStage}
      finalPermissions={finalPermissions}
      onSelectStage={setMobileStage}
      onMove={move}
    />
  </>;
}

function KanbanColumn({ stage, label, description, items, canMove, activeItem, validDrop, pendingIds, finalPermissions, handleRefs, onMove }: Readonly<{
  stage: NegocioStage;
  label: string;
  description: string;
  items: readonly KanbanNegocio[];
  canMove: boolean;
  activeItem: KanbanNegocio | null;
  validDrop: boolean;
  pendingIds: ReadonlySet<string>;
  finalPermissions: KanbanFinalPermissions;
  handleRefs: React.MutableRefObject<Map<string, HTMLButtonElement>>;
  onMove: (item: KanbanNegocio, destination: NegocioStage, observacao?: string | null) => void;
}>) {
  const { ref, isDropTarget } = useDroppable({ id: `stage:${stage}`, data: { stage }, disabled: !validDrop });
  const total = items.reduce((sum, item) => sum + (item.valor ?? 0), 0);
  const stalled = items.filter((item) => item.diasNaEtapa > 7).length;
  const dragActive = Boolean(activeItem);

  return <section ref={ref} aria-label={`${label}: ${items.length} negocios`} className={`${COLUMN_WIDTH} flex min-h-[560px] flex-col rounded-[1.4rem] border transition-[border-color,background-color,opacity,transform] duration-200 motion-reduce:transition-none ${isDropTarget ? "scale-[1.015] border-[#C89B3C] bg-[#FFFBF1] shadow-[0_12px_28px_rgba(200,155,60,.18)]" : validDrop ? "border-[#D4B66F] bg-[#FAF6EE]" : dragActive ? "border-[#DED5C7] bg-[#F0EAE0] opacity-55" : "border-[#DED5C7] bg-[#F7F3ED]"}`}>
    <header className="sticky top-0 z-10 rounded-t-[1.35rem] border-b border-[#E2D7C7] bg-[rgba(255,253,249,.96)] px-4 py-4 backdrop-blur">
      <div className="flex items-start justify-between gap-3"><div><h2 className="text-sm font-bold text-[#071E36]">{label}</h2><p className="mt-1 line-clamp-2 text-[11px] leading-4 text-[#718078]">{description}</p></div><span className="rounded-full bg-[#071E36] px-2.5 py-1 text-xs font-bold text-[#F0C86E]">{items.length}</span></div>
      <div className="mt-3 flex items-center justify-between gap-2 border-t border-[#EEE5D8] pt-3 text-[11px]"><strong className="text-[#071E36]">{formatMoney(total)}</strong><span className={stalled ? "font-semibold text-amber-700" : "text-[#718078]"}>{stalled} {stalled === 1 ? "parado" : "parados"}</span></div>
    </header>
    <div className={`grid flex-1 content-start gap-3 p-3 transition-[padding,min-height] duration-200 motion-reduce:transition-none ${validDrop && !items.length ? "min-h-[360px] p-5" : ""}`}>
      {items.length ? items.map((item) => <NegocioCard
        key={item.id}
        item={item}
        canMove={canMove}
        pending={pendingIds.has(item.id)}
        finalPermissions={finalPermissions}
        handleRefs={handleRefs}
        onMove={onMove}
      />) : <div className={`grid place-items-center rounded-2xl border border-dashed px-4 text-center text-xs text-[#718078] ${validDrop ? "min-h-52 border-[#C89B3C] bg-white/70 font-medium text-[#8B6827]" : "min-h-28 border-[#D8CDBD] bg-white/45"}`}>{validDrop ? "Solte o negocio nesta etapa" : "Nenhum negocio nesta etapa"}</div>}
    </div>
  </section>;
}

function NegocioCard({ item, canMove, pending, finalPermissions, handleRefs, onMove, mobile = false }: Readonly<{
  item: KanbanNegocio;
  canMove: boolean;
  pending: boolean;
  finalPermissions: KanbanFinalPermissions;
  handleRefs?: React.MutableRefObject<Map<string, HTMLButtonElement>>;
  onMove: (item: KanbanNegocio, destination: NegocioStage, observacao?: string | null) => void;
  mobile?: boolean;
}>) {
  const { ref, handleRef, isDragging } = useDraggable({ id: item.id, data: { stage: item.etapa }, disabled: mobile || !canMove || pending });
  const destinations = NEGOCIO_STAGE_TRANSITIONS[item.etapa];
  const [observationOpen, setObservationOpen] = useState(false);
  const [destination, setDestination] = useState<NegocioStage>(destinations[0] ?? item.etapa);
  const [observation, setObservation] = useState("");
  const selectedDestination = destinations.includes(destination as never) ? destination : destinations[0] ?? item.etapa;

  function connectHandle(element: Element | null) {
    handleRef(element);
    if (!handleRefs) return;
    if (element instanceof HTMLButtonElement) handleRefs.current.set(item.id, element);
    else handleRefs.current.delete(item.id);
  }

  return <article ref={mobile ? undefined : ref} className={`group relative rounded-2xl border border-[#E4D8C7] bg-[#FFFEFC] p-4 shadow-[0_7px_20px_rgba(7,30,54,.06)] transition-[opacity,transform,box-shadow] duration-200 motion-reduce:transition-none ${isDragging ? "opacity-20" : "hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(7,30,54,.1)]"} ${pending ? "pointer-events-none opacity-65" : ""}`}>
    <div className="flex items-start justify-between gap-2">
      <div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-[.13em] text-[#9A7125]">{item.tipoLabel}</p><h3 className="mt-1.5 line-clamp-2 text-[15px] font-bold leading-5 text-[#071E36]">{item.titulo}</h3></div>
      {canMove && !mobile ? <button ref={connectHandle} type="button" disabled={pending} aria-label={`Mover ${item.titulo}. Pressione Espaco ou Enter para iniciar.`} className="grid size-8 shrink-0 cursor-grab place-items-center rounded-lg text-[#8A9691] transition hover:bg-[#F4ECDD] hover:text-[#8B6827] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C89B3C] active:cursor-grabbing disabled:cursor-wait"><GripVertical size={17}/></button> : null}
    </div>
    <div className="mt-2 flex flex-wrap gap-1.5">{item.reabertura ? <Badge>Reabertura</Badge> : null}{item.hasSuccessor ? <Badge>Ciclo posterior</Badge> : null}{item.diasNaEtapa > 7 ? <StalledBadge days={item.diasNaEtapa}/> : null}</div>
    <dl className="mt-3 grid gap-1.5 text-xs"><Info label="Lead" value={item.leadNome}/><Info label="Imovel" value={item.imovelLabel}/><Info label="Responsavel" value={item.responsavelNome}/></dl>
    <div className="mt-4 flex items-end justify-between gap-3 border-t border-[#EEE6DA] pt-3"><div><p className="text-[10px] uppercase tracking-[.08em] text-[#7A8982]">Valor comercial</p><strong className="mt-0.5 block text-sm text-[#071E36]">{item.valor === null ? "Nao informado" : formatMoney(item.valor, item.moeda)}</strong></div><div className="text-right"><p className="text-[10px] uppercase tracking-[.08em] text-[#7A8982]">Previsao</p><span className="mt-0.5 block text-xs font-medium text-[#435650]">{item.previsaoLabel}</span></div></div>
    {pending ? <div className="mt-3 flex items-center gap-2 rounded-xl bg-[#F5EBD6] px-3 py-2 text-xs font-semibold text-[#7B5B20]"><LoaderCircle size={14} className="animate-spin motion-reduce:animate-none"/>Movendo...</div> : null}
    <div className="mt-3 flex items-center justify-between gap-2"><Link href={`/dashboard/crm/negocios/${item.id}`} className="rounded-lg bg-[#071E36] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#12395D]">Detalhes</Link><details className="relative"><summary className="grid size-8 cursor-pointer list-none place-items-center rounded-lg border border-[#E4D8C7] bg-white text-[#435650] marker:content-none" aria-label={`Mais acoes para ${item.titulo}`}><Ellipsis size={17}/></summary><div className="absolute bottom-10 right-0 z-30 w-64 rounded-2xl border border-[#DED1BE] bg-white p-3 shadow-[0_18px_45px_rgba(7,30,54,.18)]"><div className="grid gap-1 text-xs font-semibold">{canMove ? <Link href={`/dashboard/crm/negocios?editar=${item.id}`} className="rounded-lg px-3 py-2 text-[#071E36] hover:bg-[#F7F3ED]">Editar negocio</Link> : null}<Link href={`/dashboard/crm/leads/${item.leadId}`} className="rounded-lg px-3 py-2 text-[#071E36] hover:bg-[#F7F3ED]">Ver Lead</Link>{canMove ? <button type="button" onClick={() => setObservationOpen((current) => !current)} className="rounded-lg px-3 py-2 text-left text-[#071E36] hover:bg-[#F7F3ED]">Mover com observacao</button> : null}</div>{canMove && observationOpen ? <form onSubmit={(event) => { event.preventDefault(); onMove(item, selectedDestination, observation); setObservationOpen(false); setObservation(""); }} className="mt-2 grid gap-2 border-t border-[#EEE6DA] pt-3"><label className="text-[10px] font-bold uppercase tracking-[.08em] text-[#8B6827]">Etapa adjacente<select value={selectedDestination} onChange={(event) => setDestination(event.target.value as NegocioStage)} className={`${INPUT} mt-1`}>{destinations.map((stage) => <option key={stage} value={stage}>{getNegocioStageLabel(stage)}</option>)}</select></label><label className="text-[10px] font-bold uppercase tracking-[.08em] text-[#8B6827]">Observacao<textarea value={observation} onChange={(event) => setObservation(event.target.value)} maxLength={NEGOCIO_RPC_LIMITS.observacaoMovimentacao} rows={2} className={`${INPUT} mt-1 resize-none normal-case tracking-normal`}/></label><button type="submit" className="rounded-lg bg-[#C89B3C] px-3 py-2 text-xs font-bold text-[#071E36]">Confirmar movimento</button></form> : null}<FinalOperationControls negocioId={item.id} leadId={item.leadId} updatedAt={item.updatedAt} tipo={item.tipo} status={item.status} valorFechado={item.valorFechado} comissaoEfetiva={item.comissaoEfetiva} partes={item.partesPapeis} hasSuccessor={item.hasSuccessor} permissions={finalPermissions}/></div></details></div>
    {mobile ? <MobileMoveControls item={item} canMove={canMove} pending={pending} onMove={onMove}/> : null}
  </article>;
}

function MobileStageNavigator({ items, canMove, pendingIds, selectedStage, finalPermissions, onSelectStage, onMove }: Readonly<{
  items: readonly KanbanNegocio[];
  canMove: boolean;
  pendingIds: ReadonlySet<string>;
  selectedStage: NegocioStage;
  finalPermissions: KanbanFinalPermissions;
  onSelectStage: (stage: NegocioStage) => void;
  onMove: (item: KanbanNegocio, destination: NegocioStage, observacao?: string | null) => void;
}>) {
  const visible = items.filter((item) => item.etapa === selectedStage);
  return <section className="mt-7 md:hidden">
    <div className="-mx-4 overflow-x-auto px-4 pb-2"><div role="tablist" aria-label="Etapas do funil" className="flex min-w-max gap-2">{NEGOCIO_STAGES.map((stage) => { const count = items.filter((item) => item.etapa === stage.id).length; const active = selectedStage === stage.id; return <button key={stage.id} type="button" role="tab" aria-selected={active} onClick={() => onSelectStage(stage.id)} className={`rounded-full border px-3.5 py-2 text-xs font-bold transition ${active ? "border-[#071E36] bg-[#071E36] text-white" : "border-[#DDD0BD] bg-white text-[#52635D]"}`}>{stage.label}<span className={`ml-2 rounded-full px-1.5 py-0.5 ${active ? "bg-white/15 text-[#F0C86E]" : "bg-[#F3EBDD] text-[#8B6827]"}`}>{count}</span></button>; })}</div></div>
    <div className="mt-3 flex items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[.1em] text-[#9A7125]">Etapa selecionada</p><h2 className="mt-1 text-xl font-bold text-[#071E36]">{getNegocioStageLabel(selectedStage)}</h2></div>{!canMove ? <span className="rounded-full bg-[#E9EEF0] px-3 py-1.5 text-[11px] font-semibold text-[#52635D]">Visualizacao somente</span> : null}</div>
    <div className="mt-4 grid gap-3">{visible.length ? visible.map((item) => <NegocioCard key={item.id} item={item} canMove={canMove} pending={pendingIds.has(item.id)} finalPermissions={finalPermissions} onMove={onMove} mobile/>) : <p className="rounded-2xl border border-dashed border-[#D8CDBD] bg-white/60 px-5 py-10 text-center text-sm text-[#64736D]">Nenhum negocio nesta etapa.</p>}</div>
  </section>;
}

function MobileMoveControls({ item, canMove, pending, onMove }: Readonly<{ item: KanbanNegocio; canMove: boolean; pending: boolean; onMove: (item: KanbanNegocio, destination: NegocioStage) => void }>) {
  if (!canMove) return null;
  const index = NEGOCIO_STAGES.findIndex((stage) => stage.id === item.etapa);
  const previous = NEGOCIO_STAGES[index - 1]?.id;
  const next = NEGOCIO_STAGES[index + 1]?.id;
  return <div className="mt-3 grid grid-cols-2 gap-2 border-t border-[#EEE6DA] pt-3"><button type="button" disabled={!previous || pending} onClick={() => previous && onMove(item, previous)} className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-[#D8CDBD] bg-white px-3 py-2 text-xs font-bold text-[#071E36] disabled:opacity-35"><ArrowLeft size={14}/>Voltar etapa</button><button type="button" disabled={!next || pending} onClick={() => next && onMove(item, next)} className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#C89B3C] px-3 py-2 text-xs font-bold text-[#071E36] disabled:opacity-35">Avancar etapa<ArrowRight size={14}/></button></div>;
}

function KanbanCardPreview({ item }: { item: KanbanNegocio }) {
  return <div className="w-[270px] rotate-1 rounded-2xl border border-[#C89B3C] bg-white p-4 shadow-[0_24px_55px_rgba(7,30,54,.22)]"><p className="text-[10px] font-bold uppercase tracking-[.13em] text-[#9A7125]">{item.tipoLabel}</p><p className="mt-1.5 text-[15px] font-bold leading-5 text-[#071E36]">{item.titulo}</p><p className="mt-3 text-xs text-[#64736D]">{item.leadNome}</p></div>;
}

function stageFromDropId(value: unknown): NegocioStage | null {
  if (typeof value !== "string" || !value.startsWith("stage:")) return null;
  const stage = value.slice(6);
  return NEGOCIO_STAGES.some((candidate) => candidate.id === stage) ? stage as NegocioStage : null;
}

function formatMoney(value: number, currency = "BRL") {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency }).format(value);
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="flex min-w-0 justify-between gap-3"><dt className="shrink-0 text-[#7A8982]">{label}</dt><dd className="truncate text-right font-medium text-[#314943]" title={value}>{value}</dd></div>;
}

function Badge({ children }: { children: React.ReactNode }) {
  return <span className="rounded-full bg-[#F3EBDD] px-2 py-1 text-[10px] font-semibold text-[#76571F]">{children}</span>;
}

function StalledBadge({ days }: { days: number }) {
  const red = days >= 14;
  return <span className={`rounded-full px-2 py-1 text-[10px] font-bold ${red ? "bg-red-100 text-red-800" : "bg-amber-100 text-amber-800"}`}>Parado ha {days} dias</span>;
}
