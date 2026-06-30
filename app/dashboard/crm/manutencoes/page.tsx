import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  Clock3,
  FileWarning,
  Hammer,
  ShieldAlert,
  Wrench,
} from "lucide-react";

type TipoCaso = "manutencao" | "conflito";

type Prioridade = "Baixa" | "Media" | "Alta" | "Critica";

type StatusCaso =
  | "aberto"
  | "em analise"
  | "aguardando proprietario"
  | "aguardando orcamento"
  | "autorizado"
  | "em execucao"
  | "resolvido"
  | "conflito ativo"
  | "encerrado";

type CasoOperacional = {
  id: string;
  tipo: TipoCaso;
  categoria: string;
  imovel: string;
  inquilino: string;
  proprietario: string;
  prioridade: Prioridade;
  status: StatusCaso;
  origem: string;
  data: string;
  responsavel: string;
  resumo: string;
  historico: string[];
  proximaAcao: string;
  risco: string;
  memoriaRelacionada: string;
  observacoes: string;
};

const casos: CasoOperacional[] = [
  {
    id: "man-001",
    tipo: "manutencao",
    categoria: "infiltracao",
    imovel: "Apartamento Ponta Verde, 804",
    inquilino: "Mariana Alves",
    proprietario: "Roberto Lima",
    prioridade: "Alta",
    status: "aguardando orcamento",
    origem: "WhatsApp",
    data: "2026-06-28",
    responsavel: "Equipe patrimonial",
    resumo: "Inquilina relatou infiltracao no teto da suite apos chuva forte.",
    historico: [
      "Solicitacao registrada pelo atendimento.",
      "Fotos recebidas e anexacao futura prevista.",
      "Orcamento solicitado a prestador parceiro.",
    ],
    proximaAcao: "Cobrar retorno do prestador e validar autorizacao com o proprietario.",
    risco: "Alto: risco de aumento do dano e desgaste com inquilina.",
    memoriaRelacionada: "Historico futuro do imovel deve registrar recorrencia de infiltracao.",
    observacoes: "Priorizar comunicacao objetiva entre inquilina, proprietario e prestador.",
  },
  {
    id: "conf-001",
    tipo: "conflito",
    categoria: "atraso de aluguel",
    imovel: "Casa Farol, 32",
    inquilino: "Carlos Henrique",
    proprietario: "Ana Paula",
    prioridade: "Critica",
    status: "conflito ativo",
    origem: "Manual",
    data: "2026-06-27",
    responsavel: "Administracao",
    resumo: "Proprietaria questiona atraso recorrente e pede posicionamento formal.",
    historico: [
      "Contato inicial registrado pela administracao.",
      "Inquilino informou previsao de pagamento.",
      "Proprietaria solicitou acompanhamento mais firme.",
    ],
    proximaAcao: "Registrar alinhamento interno e preparar comunicacao formal sem parecer juridico definitivo.",
    risco: "Critico: conflito financeiro pode evoluir para notificacao.",
    memoriaRelacionada: "UCE Memoria podera recuperar historico de atrasos e acordos anteriores.",
    observacoes: "Evitar promessas. Encaminhar para especialista quando houver risco juridico.",
  },
  {
    id: "man-002",
    tipo: "manutencao",
    categoria: "eletrica",
    imovel: "Studio Jatiuca, 1202",
    inquilino: "Fernanda Costa",
    proprietario: "Paulo Martins",
    prioridade: "Media",
    status: "em execucao",
    origem: "Site",
    data: "2026-06-25",
    responsavel: "Manutencao",
    resumo: "Disjuntor desarmando ao ligar ar-condicionado.",
    historico: [
      "Chamado aberto pelo portal.",
      "Prestador enviado para vistoria.",
      "Execucao aprovada pelo proprietario.",
    ],
    proximaAcao: "Confirmar conclusao do servico e satisfacao da inquilina.",
    risco: "Medio: impacto direto no uso do imovel.",
    memoriaRelacionada: "Registrar equipamento e prestador utilizado para consultas futuras.",
    observacoes: "Validar se ha garantia do servico.",
  },
  {
    id: "conf-002",
    tipo: "conflito",
    categoria: "divergencia de vistoria",
    imovel: "Apartamento Pajucara, 303",
    inquilino: "Lucas Ferreira",
    proprietario: "Helena Duarte",
    prioridade: "Alta",
    status: "em analise",
    origem: "Atendimento",
    data: "2026-06-24",
    responsavel: "Vistoria",
    resumo: "Divergencia sobre estado de pintura e armarios na entrega de chaves.",
    historico: [
      "Relato recebido na entrega de chaves.",
      "Fotos da vistoria inicial precisam ser revisadas.",
      "Partes aguardam posicionamento da administradora.",
    ],
    proximaAcao: "Comparar vistoria inicial e final antes de qualquer cobranca.",
    risco: "Alto: pode gerar contestacao e desgaste entre as partes.",
    memoriaRelacionada: "UCE Memoria podera cruzar observacoes antigas do imovel e das partes.",
    observacoes: "Manter tom neutro e registrar cada decisao.",
  },
  {
    id: "man-003",
    tipo: "manutencao",
    categoria: "fechadura",
    imovel: "Sala Comercial Centro, 410",
    inquilino: "Clinica Horizonte",
    proprietario: "Grupo Maceio Prime",
    prioridade: "Baixa",
    status: "resolvido",
    origem: "WhatsApp",
    data: "2026-06-20",
    responsavel: "Equipe patrimonial",
    resumo: "Troca de cilindro concluida e validada pelo ocupante.",
    historico: [
      "Solicitacao aberta por mensagem.",
      "Prestador autorizado.",
      "Servico concluido e confirmado.",
    ],
    proximaAcao: "Arquivar comprovante e manter registro no historico.",
    risco: "Baixo: caso resolvido.",
    memoriaRelacionada: "Historico futuro deve indicar troca recente da fechadura.",
    observacoes: "Sem pendencias operacionais.",
  },
];

const categoriasManutencao = [
  "hidraulica",
  "eletrica",
  "infiltracao",
  "ar-condicionado",
  "fechadura",
  "pintura",
  "mobilia",
  "limpeza",
  "estrutural",
  "outros",
];

const categoriasConflito = [
  "atraso de aluguel",
  "reclamacao de barulho",
  "descumprimento contratual",
  "mau uso do imovel",
  "acesso ao imovel",
  "divergencia de vistoria",
  "cobranca contestada",
  "comunicacao dificil",
];

function prioridadeClassName(prioridade: Prioridade) {
  const classes = {
    Baixa: "bg-slate-100 text-slate-700",
    Media: "bg-amber-50 text-amber-700",
    Alta: "bg-orange-50 text-orange-700",
    Critica: "bg-red-50 text-red-700",
  };

  return `rounded-full px-3 py-1 text-xs font-semibold ${classes[prioridade]}`;
}

function statusClassName(status: StatusCaso) {
  if (status === "resolvido" || status === "encerrado") {
    return "bg-emerald-50 text-emerald-700";
  }

  if (status === "conflito ativo") {
    return "bg-red-50 text-red-700";
  }

  if (status.includes("aguardando")) {
    return "bg-amber-50 text-amber-700";
  }

  return "bg-[#F7F3ED] text-[#071E36]";
}

function formatarData(data: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "medium",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(data));
}

export default function ManutencoesPage() {
  const resumo = [
    {
      titulo: "Solicitacoes abertas",
      valor: casos.filter((caso) => !["resolvido", "encerrado"].includes(caso.status))
        .length,
      detalhe: "Demandas em acompanhamento",
      icon: ClipboardList,
    },
    {
      titulo: "Urgentes",
      valor: casos.filter((caso) => ["Alta", "Critica"].includes(caso.prioridade))
        .length,
      detalhe: "Alta prioridade operacional",
      icon: AlertTriangle,
    },
    {
      titulo: "Aguardando proprietario",
      valor: casos.filter((caso) => caso.status === "aguardando proprietario").length,
      detalhe: "Dependem de autorizacao",
      icon: Clock3,
    },
    {
      titulo: "Aguardando orcamento",
      valor: casos.filter((caso) => caso.status === "aguardando orcamento").length,
      detalhe: "Prestadores acionados",
      icon: Hammer,
    },
    {
      titulo: "Resolvidas",
      valor: casos.filter((caso) => caso.status === "resolvido").length,
      detalhe: "Finalizadas com registro",
      icon: CheckCircle2,
    },
    {
      titulo: "Conflitos ativos",
      valor: casos.filter((caso) => caso.status === "conflito ativo").length,
      detalhe: "Exigem acompanhamento fino",
      icon: ShieldAlert,
    },
  ];

  const casoDestaque = casos[0];

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
                Manutencoes e Conflitos
              </h1>
              <p className="mt-2 max-w-3xl leading-6 text-[#64736D]">
                Acompanhe solicitacoes, pendencias e historico de relacionamento
                entre inquilinos, proprietarios e imoveis.
              </p>
            </div>
            <span className="inline-flex w-fit items-center gap-2 rounded-2xl border border-[#E8DDCB] bg-[#F7F3ED] px-4 py-3 text-sm font-semibold text-[#071E36]">
              <Wrench size={18} className="text-[#C89B3C]" />
              Operacao patrimonial
            </span>
          </div>
        </header>

        <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {resumo.map((card) => {
            const Icon = card.icon;

            return (
              <article
                key={card.titulo}
                className="rounded-3xl border border-[#E8DDCB] bg-white p-5 shadow-sm"
              >
                <div className="flex items-center justify-between gap-4">
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#071E36] text-[#E1B866]">
                    <Icon size={20} strokeWidth={2.2} />
                  </span>
                  <strong className="text-3xl font-bold text-[#071E36]">
                    {card.valor}
                  </strong>
                </div>
                <h2 className="mt-4 text-sm font-semibold uppercase tracking-[0.14em] text-[#071E36]">
                  {card.titulo}
                </h2>
                <p className="mt-1 text-sm text-[#64736D]">{card.detalhe}</p>
              </article>
            );
          })}
        </section>

        <section className="mt-6 grid gap-6 xl:grid-cols-[1.4fr_0.8fr]">
          <div className="rounded-3xl border border-[#E8DDCB] bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-[#071E36]">
                  Casos operacionais
                </h2>
                <p className="mt-1 text-sm text-[#64736D]">
                  Dados simulados para preparar o fluxo futuro de manutencao,
                  conflito e memoria operacional.
                </p>
              </div>
              <span className="w-fit rounded-full bg-[#C89B3C]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#8B6827]">
                Mock seguro
              </span>
            </div>

            <div className="mt-6 overflow-x-auto">
              <table className="w-full min-w-[1180px] text-left text-sm">
                <thead className="border-b border-[#E8DDCB] text-[#64736D]">
                  <tr>
                    <th className="px-4 py-3 font-medium">Tipo</th>
                    <th className="px-4 py-3 font-medium">Imovel</th>
                    <th className="px-4 py-3 font-medium">Inquilino</th>
                    <th className="px-4 py-3 font-medium">Proprietario</th>
                    <th className="px-4 py-3 font-medium">Prioridade</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Origem</th>
                    <th className="px-4 py-3 font-medium">Data</th>
                    <th className="px-4 py-3 font-medium">Responsavel</th>
                    <th className="px-4 py-3 font-medium">Resumo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#eee7dc] text-[#102A27]">
                  {casos.map((caso) => (
                    <tr key={caso.id}>
                      <td className="px-4 py-4">
                        <div className="flex flex-col gap-2">
                          <span className="font-semibold text-[#071E36]">
                            {caso.tipo === "manutencao" ? "Manutencao" : "Conflito"}
                          </span>
                          <span className="rounded-full bg-[#F7F3ED] px-3 py-1 text-xs font-semibold text-[#64736D]">
                            {caso.categoria}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-4 font-medium text-[#071E36]">
                        {caso.imovel}
                      </td>
                      <td className="px-4 py-4">{caso.inquilino}</td>
                      <td className="px-4 py-4">{caso.proprietario}</td>
                      <td className="px-4 py-4">
                        <span className={prioridadeClassName(caso.prioridade)}>
                          {caso.prioridade}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClassName(caso.status)}`}
                        >
                          {caso.status}
                        </span>
                      </td>
                      <td className="px-4 py-4">{caso.origem}</td>
                      <td className="px-4 py-4">{formatarData(caso.data)}</td>
                      <td className="px-4 py-4">{caso.responsavel}</td>
                      <td className="max-w-xs px-4 py-4 text-[#64736D]">
                        {caso.resumo}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <aside className="grid gap-4">
            <section className="rounded-3xl border border-[#E8DDCB] bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#071E36] text-[#E1B866]">
                  <FileWarning size={20} />
                </span>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8B6827]">
                    Caso em destaque
                  </p>
                  <h2 className="text-lg font-semibold text-[#071E36]">
                    {casoDestaque.imovel}
                  </h2>
                </div>
              </div>
              <p className="mt-4 text-sm leading-6 text-[#64736D]">
                {casoDestaque.resumo}
              </p>
            </section>

            <section className="rounded-3xl border border-[#E8DDCB] bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-[#071E36]">
                Historico resumido
              </h2>
              <div className="mt-4 grid gap-3">
                {casoDestaque.historico.map((item) => (
                  <p
                    key={item}
                    className="rounded-2xl border border-[#E8DDCB] bg-[#fffdfa] p-3 text-sm text-[#102A27]"
                  >
                    {item}
                  </p>
                ))}
              </div>
            </section>

            {[
              ["Proxima acao sugerida", casoDestaque.proximaAcao],
              ["Risco do caso", casoDestaque.risco],
              ["UCE Memoria relacionada", casoDestaque.memoriaRelacionada],
              ["Observacoes", casoDestaque.observacoes],
            ].map(([titulo, conteudo]) => (
              <section
                key={titulo}
                className="rounded-3xl border border-[#E8DDCB] bg-white p-6 shadow-sm"
              >
                <h2 className="text-lg font-semibold text-[#071E36]">{titulo}</h2>
                <p className="mt-3 text-sm leading-6 text-[#64736D]">{conteudo}</p>
              </section>
            ))}
          </aside>
        </section>

        <section className="mt-6 grid gap-6 xl:grid-cols-2">
          <div className="rounded-3xl border border-[#E8DDCB] bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-[#071E36]">
              Categorias de manutencao
            </h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {categoriasManutencao.map((categoria) => (
                <span
                  key={categoria}
                  className="rounded-full border border-[#E8DDCB] bg-[#F7F3ED] px-3 py-1 text-xs font-semibold text-[#64736D]"
                >
                  {categoria}
                </span>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-[#E8DDCB] bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-[#071E36]">
              Categorias de conflito
            </h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {categoriasConflito.map((categoria) => (
                <span
                  key={categoria}
                  className="rounded-full border border-[#E8DDCB] bg-[#F7F3ED] px-3 py-1 text-xs font-semibold text-[#64736D]"
                >
                  {categoria}
                </span>
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
