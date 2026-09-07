import type { NegocioPartRole, NegocioStage, NegocioStatus, NegocioType } from "../../../../lib/crm/negocios/catalogs";

export type KanbanFinalPermissions = Readonly<{
  conclude: boolean;
  lose: boolean;
  cancel: boolean;
  reopen: boolean;
  archive: boolean;
}>;

export type KanbanNegocio = Readonly<{
  id: string;
  leadId: string;
  titulo: string;
  tipo: NegocioType;
  tipoLabel: string;
  etapa: NegocioStage;
  status: NegocioStatus;
  updatedAt: string;
  leadNome: string;
  imovelLabel: string;
  responsavelNome: string;
  valor: number | null;
  moeda: string;
  previsaoLabel: string;
  partesAtivas: number;
  partesPapeis: readonly NegocioPartRole[];
  diasNaEtapa: number;
  reabertura: boolean;
  hasSuccessor: boolean;
  valorFechado: number | null;
  comissaoEfetiva: number | null;
}>;
