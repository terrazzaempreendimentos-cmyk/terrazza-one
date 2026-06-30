import Link from "next/link";
import {
  CheckCircle2,
  Clock3,
  Flame,
  MessageSquareText,
  ShieldCheck,
} from "lucide-react";

type AtendimentoStatus =
  | "em_andamento"
  | "aguardando_cliente"
  | "aguardando_corretor"
  | "pronto_handoff"
  | "concluido";

type Atendimento = {
  id: string;
  leadId: string | null;
  nome: string;
  canal: string;
  origem: string;
  status: AtendimentoStatus;
  especialista: string;
  temperatura: "frio" | "morno" | "quente";
  ultimaMensagem: string;
  proximoPasso: string;
};

const colunas: Array<{
  id: AtendimentoStatus;
  titulo: string;
  descricao: string;
  icon: typeof MessageSquareText;
}> = [
  {
    id: "em_andamento",
    titulo: "Em andamento",
    descricao: "Conversas ativas",
    icon: MessageSquareText,
  },
  {
    id: "aguardando_cliente",
    titulo: "Aguardando cliente",
    descricao: "Retorno solicitado",
    icon: Clock3,
  },
  {
    id: "aguardando_corretor",
    titulo: "Aguardando corretor",
    descricao: "Humano deve assumir",
    icon: ShieldCheck,
  },
  {
    id: "pronto_handoff",
    titulo: "Pronto para handoff",
    descricao: "Qualificado para encaminhar",
    icon: Flame,
  },
  {
    id: "concluido",
    titulo: "Concluido",
    descricao: "Atendimento finalizado",
    icon: CheckCircle2,
  },
];

const atendimentos: Atendimento[] = [
  {
    id: "atd-001",
    leadId: null,
    nome: "Mariana Alves",
    canal: "WhatsApp",
    origem: "Instagram",
    status: "aguardando_corretor",
    especialista: "Locacao",
    temperatura: "quente",
    ultimaMensagem: "Busca apartamento na Ponta Verde ate R$ 3.500.",
    proximoPasso: "Corretor deve validar opcoes compativeis.",
  },
  {
    id: "atd-002",
    leadId: null,
    nome: "Carlos Henrique",
    canal: "Instagram",
    origem: "Facebook",
    status: "aguardando_cliente",
    especialista: "Compra",
    temperatura: "morno",
    ultimaMensagem: "Quer comparar opcoes antes de visitar.",
    proximoPasso: "Enviar selecao curta e pedir confirmacao.",
  },
  {
    id: "atd-003",
    leadId: null,
    nome: "Ana Paula",
    canal: "Site",
    origem: "Manual",
    status: "em_andamento",
    especialista: "Administracao",
    temperatura: "morno",
    ultimaMensagem: "Possui imovel no Farol para administracao.",
    proximoPasso: "Confirmar ocupacao e documentacao.",
  },
  {
    id: "atd-004",
    leadId: null,
    nome: "Roberto Lima",
    canal: "WhatsApp",
    origem: "Portal",
    status: "pronto_handoff",
    especialista: "Venda",
    temperatura: "quente",
    ultimaMensagem: "Venda de casa com urgencia moderada.",
    proximoPasso: "Encaminhar para avaliacao comercial.",
  },
  {
    id: "atd-005",
    leadId: null,
    nome: "Fernanda Costa",
    canal: "Manual",
    origem: "Indicacao",
    status: "concluido",
    especialista: "Locacao",
    temperatura: "frio",
    ultimaMensagem: "Atendimento encerrado com orientacao registrada.",
    proximoPasso: "Acompanhar oportunidade futura.",
  },
];

function temperaturaClassName(temperatura: Atendimento["temperatura"]) {
  const classes = {
    frio: "bg-slate-100 text-slate-700",
    morno: "bg-amber-50 text-amber-700",
    quente: "bg-red-50 text-red-700",
  };

  return `rounded-full px-3 py-1 text-xs font-semibold ${classes[temperatura]}`;
}

export default function AtendimentosPage() {
  const resumo = colunas.map((coluna) => ({
    ...coluna,
    valor: atendimentos.filter((atendimento) => atendimento.status === coluna.id)
      .length,
  }));

  return (
    <main className="min-h-screen bg-[#F7F3ED] px-6 py-10 sm:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="rounded-[2rem] border border-[#E8DDCB] bg-white p-6 shadow-sm sm:p-8">
          <span className="rounded-full border border-[#C89B3C]/35 bg-[#C89B3C]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#8B6827]">
            Terrazza CRM
          </span>
          <h1 className="mt-5 text-4xl font-bold tracking-tight text-[#071E36]">
            Atendimentos
          </h1>
          <p className="mt-2 max-w-3xl leading-6 text-[#64736D]">
            Central operacional de conversas, processos comerciais e futuros
            handoffs entre UCE e equipe humana.
          </p>
        </header>

        <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {resumo.map((card) => {
            const Icon = card.icon;

            return (
              <article
                key={card.id}
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
                <p className="mt-1 text-sm text-[#64736D]">{card.descricao}</p>
              </article>
            );
          })}
        </section>

        <section className="mt-6 flex gap-5 overflow-x-auto pb-4">
          {colunas.map((coluna) => {
            const itens = atendimentos.filter(
              (atendimento) => atendimento.status === coluna.id,
            );

            return (
              <div
                key={coluna.id}
                className="min-w-[300px] flex-1 rounded-3xl border border-[#E8DDCB] bg-white p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-[#071E36]">
                      {coluna.titulo}
                    </h2>
                    <p className="mt-1 text-xs text-[#64736D]">{coluna.descricao}</p>
                  </div>
                  <span className="rounded-full bg-[#C89B3C]/10 px-2.5 py-1 text-xs font-semibold text-[#8B6827]">
                    {itens.length}
                  </span>
                </div>

                <div className="mt-4 grid gap-3">
                  {itens.map((atendimento) => (
                    <article
                      key={atendimento.id}
                      className="rounded-2xl border border-[#E8DDCB] bg-[#fffdfa] p-4 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="font-semibold text-[#071E36]">
                            {atendimento.nome}
                          </h3>
                          <p className="mt-1 text-xs text-[#64736D]">
                            {atendimento.canal} via {atendimento.origem}
                          </p>
                        </div>
                        <span className={temperaturaClassName(atendimento.temperatura)}>
                          {atendimento.temperatura}
                        </span>
                      </div>

                      <div className="mt-4 grid gap-2 text-xs text-[#64736D]">
                        <span>Especialista UCE: {atendimento.especialista}</span>
                        <span>Ultima mensagem: {atendimento.ultimaMensagem}</span>
                        <span>Proximo passo: {atendimento.proximoPasso}</span>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        {atendimento.leadId ? (
                          <Link
                            href={`/dashboard/crm/leads/${atendimento.leadId}`}
                            className="rounded-full border border-[#E8DDCB] bg-white px-3 py-1 text-xs font-semibold text-[#071E36] transition hover:border-[#C89B3C]/45 hover:bg-[#C89B3C]/10"
                          >
                            Ver lead
                          </Link>
                        ) : (
                          <span className="rounded-full border border-dashed border-[#E8DDCB] bg-white px-3 py-1 text-xs font-semibold text-[#64736D]">
                            Lead em breve
                          </span>
                        )}
                        <Link
                          href="/dashboard/crm/timeline"
                          className="rounded-full border border-[#E8DDCB] bg-white px-3 py-1 text-xs font-semibold text-[#071E36] transition hover:border-[#C89B3C]/45 hover:bg-[#C89B3C]/10"
                        >
                          Ver timeline
                        </Link>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            );
          })}
        </section>
      </div>
    </main>
  );
}
