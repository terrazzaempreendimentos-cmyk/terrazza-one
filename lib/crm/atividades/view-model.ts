import type { ActivityPriority, ActivityStatus, ActivityType } from "./catalogs";

export type ActivityRelation = Readonly<{ id: string; label: string }>;

export type ActivityView = Readonly<{
  id: string;
  titulo: string;
  descricao: string | null;
  tipo: ActivityType;
  status: ActivityStatus;
  prioridade: ActivityPriority;
  origem: string;
  lead_id: string | null;
  atendimento_id: string | null;
  negocio_id: string | null;
  imovel_id: string | null;
  pessoa_id: string | null;
  responsavel_id: string | null;
  inicio_planejado_em: string | null;
  fim_planejado_em: string | null;
  dia_inteiro: boolean;
  local: string | null;
  link_reuniao: string | null;
  observacoes_internas: string | null;
  iniciado_em: string | null;
  concluida_em: string | null;
  cancelada_em: string | null;
  resultado: string | null;
  atividade_anterior_id: string | null;
  created_at: string;
  updated_at: string;
  lead: ActivityRelation | null;
  atendimento: ActivityRelation | null;
  negocio: ActivityRelation | null;
  imovel: ActivityRelation | null;
  pessoa: ActivityRelation | null;
  responsavel: ActivityRelation | null;
}>;

export type ActivityOptions = Readonly<{
  leads: readonly ActivityRelation[];
  atendimentos: readonly ActivityRelation[];
  negocios: readonly ActivityRelation[];
  imoveis: readonly ActivityRelation[];
  pessoas: readonly ActivityRelation[];
}>;

export const ACTIVITY_SELECT = `
  id, titulo, descricao, tipo, status, prioridade, origem,
  lead_id, atendimento_id, negocio_id, imovel_id, pessoa_id, responsavel_id,
  inicio_planejado_em, fim_planejado_em, dia_inteiro, local, link_reuniao,
  observacoes_internas, iniciado_em, concluida_em, cancelada_em, resultado,
  atividade_anterior_id, ativo, created_at, updated_at,
  lead:leads(id, nome),
  atendimento:atendimentos(id, assunto),
  negocio:negocios(id, titulo),
  imovel:imoveis(id, codigo),
  pessoa:pessoas!tarefas_pessoa_id_fkey(id, nome),
  responsavel:pessoas!tarefas_responsavel_id_fkey(id, nome)
`;

function relation(value: unknown, labelKey: string): ActivityRelation | null {
  const item = Array.isArray(value) ? value[0] : value;
  if (!item || typeof item !== "object") return null;
  const row = item as Record<string, unknown>;
  return typeof row.id === "string" && typeof row[labelKey] === "string"
    ? { id: row.id, label: row[labelKey] }
    : null;
}

export function normalizeActivity(value: unknown): ActivityView | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  if (typeof row.id !== "string" || typeof row.titulo !== "string" || typeof row.updated_at !== "string") return null;
  return {
    id: row.id, titulo: row.titulo, descricao: typeof row.descricao === "string" ? row.descricao : null,
    tipo: row.tipo as ActivityType, status: row.status as ActivityStatus, prioridade: row.prioridade as ActivityPriority,
    origem: typeof row.origem === "string" ? row.origem : "manual",
    lead_id: typeof row.lead_id === "string" ? row.lead_id : null,
    atendimento_id: typeof row.atendimento_id === "string" ? row.atendimento_id : null,
    negocio_id: typeof row.negocio_id === "string" ? row.negocio_id : null,
    imovel_id: typeof row.imovel_id === "string" ? row.imovel_id : null,
    pessoa_id: typeof row.pessoa_id === "string" ? row.pessoa_id : null,
    responsavel_id: typeof row.responsavel_id === "string" ? row.responsavel_id : null,
    inicio_planejado_em: typeof row.inicio_planejado_em === "string" ? row.inicio_planejado_em : null,
    fim_planejado_em: typeof row.fim_planejado_em === "string" ? row.fim_planejado_em : null,
    dia_inteiro: row.dia_inteiro === true, local: typeof row.local === "string" ? row.local : null,
    link_reuniao: typeof row.link_reuniao === "string" ? row.link_reuniao : null,
    observacoes_internas: typeof row.observacoes_internas === "string" ? row.observacoes_internas : null,
    iniciado_em: typeof row.iniciado_em === "string" ? row.iniciado_em : null,
    concluida_em: typeof row.concluida_em === "string" ? row.concluida_em : null,
    cancelada_em: typeof row.cancelada_em === "string" ? row.cancelada_em : null,
    resultado: typeof row.resultado === "string" ? row.resultado : null,
    atividade_anterior_id: typeof row.atividade_anterior_id === "string" ? row.atividade_anterior_id : null,
    created_at: typeof row.created_at === "string" ? row.created_at : row.updated_at,
    updated_at: row.updated_at,
    lead: relation(row.lead, "nome"), atendimento: relation(row.atendimento, "assunto"),
    negocio: relation(row.negocio, "titulo"), imovel: relation(row.imovel, "codigo"),
    pessoa: relation(row.pessoa, "nome"), responsavel: relation(row.responsavel, "nome"),
  };
}

export function formatRecife(value: string | null) {
  if (!value) return "Sem planejamento";
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Recife", dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}
