export type TimelineOrigem =
  | "todos"
  | "agenda"
  | "ia"
  | "whatsapp"
  | "manual"
  | "vista"
  | "sistema";

export type TimelineEvento = {
  id: string;
  tipo: string | null;
  titulo: string | null;
  descricao: string | null;
  lead_id: string | null;
  proprietario_id: string | null;
  inquilino_id: string | null;
  imovel_id: string | null;
  corretor_id: string | null;
  origem: string | null;
  created_at: string | null;
};

export type TimelineVinculo = {
  label: string;
  nome: string;
};

export type TimelineItemData = TimelineEvento & {
  dataGrupo: string;
  dataCurta: string;
  hora: string;
  tipoLabel: string;
  origemNormalizada: Exclude<TimelineOrigem, "todos">;
  origemLabel: string;
  responsavel: string;
  descricaoResumo: string | null;
  vinculos: TimelineVinculo[];
  textoBusca: string;
};

export type TimelineGrupo = {
  data: string;
  eventos: TimelineItemData[];
};

export const filtrosTimeline: Array<{
  label: string;
  valor: TimelineOrigem;
}> = [
  { label: "Todos", valor: "todos" },
  { label: "Agenda", valor: "agenda" },
  { label: "IA", valor: "ia" },
  { label: "WhatsApp", valor: "whatsapp" },
  { label: "Manual", valor: "manual" },
];

function dateKey(data: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
  }).format(data);
}

export function labelTexto(valor: string | null) {
  if (!valor) return "Evento";

  return valor.replaceAll("_", " ");
}

export function normalizarOrigem(
  origem: string | null,
  tipo: string | null,
): Exclude<TimelineOrigem, "todos"> {
  const origemNormalizada = (origem || "").toLowerCase();
  const tipoNormalizado = (tipo || "").toLowerCase();

  if (origemNormalizada.includes("whatsapp")) return "whatsapp";
  if (origemNormalizada.includes("ia")) return "ia";
  if (origemNormalizada.includes("vista")) return "vista";
  if (origemNormalizada.includes("sistema")) return "sistema";
  if (origemNormalizada.includes("agenda")) return "agenda";
  if (tipoNormalizado.includes("tarefa")) return "agenda";
  if (origemNormalizada.includes("manual")) return "manual";

  return "manual";
}

export function origemLabel(origem: Exclude<TimelineOrigem, "todos">) {
  const labels: Record<Exclude<TimelineOrigem, "todos">, string> = {
    agenda: "Agenda",
    ia: "IA",
    whatsapp: "WhatsApp",
    manual: "Manual",
    vista: "Vista",
    sistema: "Sistema",
  };

  return labels[origem];
}

export function formatarHoraTimeline(data: string | null) {
  if (!data) return "—";

  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(data));
}

export function formatarDataCurtaTimeline(data: string | null) {
  if (!data) return "—";

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(data));
}

export function labelGrupoData(data: string | null) {
  if (!data) return "Sem data";

  const dataEvento = new Date(data);
  const chaveEvento = dateKey(dataEvento);
  const agora = new Date();
  const hoje = dateKey(agora);
  const ontem = new Date(agora);
  ontem.setDate(ontem.getDate() - 1);

  if (chaveEvento === hoje) return "Hoje";
  if (chaveEvento === dateKey(ontem)) return "Ontem";

  return formatarDataCurtaTimeline(data);
}

export function descricaoResumo(descricao: string | null, limite = 220) {
  if (!descricao) return null;

  return descricao.length > limite ? `${descricao.slice(0, limite)}...` : descricao;
}

export function montarTimelineItems(
  eventos: TimelineEvento[],
  mapas: {
    leadsPorId: Map<string, string>;
    proprietariosPorId: Map<string, string>;
    inquilinosPorId: Map<string, string>;
    imoveisPorId: Map<string, string>;
    corretoresPorId: Map<string, string>;
  },
) {
  return eventos.map((evento) => {
    const origemNormalizada = normalizarOrigem(evento.origem, evento.tipo);
    const vinculos = [
      evento.lead_id ? ["Lead", mapas.leadsPorId.get(evento.lead_id)] : null,
      evento.proprietario_id
        ? ["Proprietário", mapas.proprietariosPorId.get(evento.proprietario_id)]
        : null,
      evento.inquilino_id
        ? ["Inquilino", mapas.inquilinosPorId.get(evento.inquilino_id)]
        : null,
      evento.imovel_id ? ["Imóvel", mapas.imoveisPorId.get(evento.imovel_id)] : null,
      evento.corretor_id
        ? ["Corretor", mapas.corretoresPorId.get(evento.corretor_id)]
        : null,
    ]
      .filter((vinculo): vinculo is string[] => Boolean(vinculo?.[1]))
      .map(([label, nome]) => ({ label, nome }));

    const responsavel =
      (evento.corretor_id && mapas.corretoresPorId.get(evento.corretor_id)) ||
      (origemNormalizada === "sistema" ? "Sistema Terrazza" : "Equipe Terrazza");

    const item: TimelineItemData = {
      ...evento,
      dataGrupo: labelGrupoData(evento.created_at),
      dataCurta: formatarDataCurtaTimeline(evento.created_at),
      hora: formatarHoraTimeline(evento.created_at),
      tipoLabel: labelTexto(evento.tipo),
      origemNormalizada,
      origemLabel: origemLabel(origemNormalizada),
      responsavel,
      descricaoResumo: descricaoResumo(evento.descricao),
      vinculos,
      textoBusca: "",
    };

    item.textoBusca = [
      item.titulo,
      item.descricao,
      item.tipoLabel,
      item.origemLabel,
      item.responsavel,
      ...item.vinculos.map((vinculo) => `${vinculo.label} ${vinculo.nome}`),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return item;
  });
}

export function filtrarTimelineItems(
  eventos: TimelineItemData[],
  filtro: TimelineOrigem,
  busca: string,
) {
  const termo = busca.trim().toLowerCase();

  return eventos.filter((evento) => {
    const passaFiltro =
      filtro === "todos" || evento.origemNormalizada === filtro;
    const passaBusca = !termo || evento.textoBusca.includes(termo);

    return passaFiltro && passaBusca;
  });
}

export function agruparTimelinePorData(eventos: TimelineItemData[]) {
  const grupos = new Map<string, TimelineItemData[]>();

  eventos.forEach((evento) => {
    const grupo = grupos.get(evento.dataGrupo) ?? [];
    grupo.push(evento);
    grupos.set(evento.dataGrupo, grupo);
  });

  return Array.from(grupos.entries()).map<TimelineGrupo>(([data, eventosGrupo]) => ({
    data,
    eventos: eventosGrupo,
  }));
}
