import { revalidatePath } from "next/cache";
import { Brain, Database, PlusCircle } from "lucide-react";

import { requireUser } from "../../../../../lib/auth/require-user";
import {
  createMemory,
  searchMemories,
  type UCEMemory,
  type UCEMemoryEntityType,
  type UCEMemoryType,
} from "../../../../../lib/uce/memory/persistent";

const entityTypes: UCEMemoryEntityType[] = [
  "lead",
  "proprietario",
  "inquilino",
  "imovel",
  "corretor",
  "atendimento",
  "manutencao",
  "conflito",
];

const memoryTypes: UCEMemoryType[] = [
  "preferencia",
  "historico",
  "conflito",
  "manutencao",
  "financeiro",
  "juridico",
  "comportamento",
  "observacao",
  "follow_up",
];

const sentiments = ["neutro", "positivo", "negativo", "atencao"];

function valorTexto(formData: FormData, campo: string) {
  return String(formData.get(campo) ?? "").trim();
}

function formatarData(data: string | null) {
  if (!data) return "-";

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(data));
}

function resumir(texto: string, limite = 180) {
  return texto.length > limite ? `${texto.slice(0, limite)}...` : texto;
}

function label(value: string) {
  return value.replace("_", " ");
}

function splitTags(tags: string | null) {
  return (tags ?? "")
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

async function loadRecentMemories() {
  try {
    return {
      memories: await searchMemories({ limit: 20 }),
      error: null,
    };
  } catch {
    return {
      memories: [] as UCEMemory[],
      error:
        "Não foi possível carregar as memórias. Verifique se o SQL 011 já foi aplicado no Supabase.",
    };
  }
}

export default async function UceMemoriasPage() {
  async function cadastrarMemoria(formData: FormData) {
    "use server";
    await requireUser();

    const entityType = valorTexto(formData, "entity_type") as UCEMemoryEntityType;
    const memoryType = valorTexto(formData, "memory_type") as UCEMemoryType;
    const title = valorTexto(formData, "title");
    const content = valorTexto(formData, "content");
    const importance = Number(valorTexto(formData, "importance") || 1);

    if (!entityType || !memoryType || !title || !content) {
      throw new Error("Tipo de entidade, tipo de memória, título e conteúdo são obrigatórios.");
    }

    await createMemory({
      entity_type: entityType,
      entity_label: valorTexto(formData, "entity_label") || null,
      memory_type: memoryType,
      title,
      content,
      sentiment: valorTexto(formData, "sentiment") || null,
      importance: Number.isFinite(importance) ? importance : 1,
      source: "manual",
      tags: valorTexto(formData, "tags") || null,
    });

    revalidatePath("/dashboard/crm/ia/memorias");
  }

  const { memories, error } = await loadRecentMemories();

  return (
    <main className="min-h-screen bg-[#F7F3ED] px-6 py-10 sm:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="rounded-[2rem] border border-[#E8DDCB] bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-4">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#071E36] text-[#E1B866] shadow-lg shadow-[#071E36]/15">
                <Brain size={26} strokeWidth={2.2} />
              </span>
              <div>
                <span className="rounded-full border border-[#C89B3C]/35 bg-[#C89B3C]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#8B6827]">
                  IA Comercial
                </span>
                <h1 className="mt-4 text-4xl font-bold tracking-tight text-[#071E36]">
                  Memórias UCE
                </h1>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-[#64736D]">
                  Histórico persistente de pessoas, imóveis, manutenções e conflitos.
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-[#E8DDCB] bg-[#F7F3ED] px-4 py-3 text-sm text-[#64736D]">
              <span className="block text-xs font-semibold uppercase tracking-[0.14em] text-[#8B6827]">
                Memória persistente
              </span>
              <strong className="mt-1 block text-[#071E36]">
                Cadastro manual
              </strong>
            </div>
          </div>

          <div className="mt-6 h-px bg-gradient-to-r from-[#C89B3C]/60 via-[#E8DDCB] to-transparent" />
        </header>

        <section className="mt-8 grid gap-6 xl:grid-cols-[420px_1fr]">
          <div className="rounded-[2rem] border border-[#E8DDCB] bg-white p-6 shadow-sm sm:p-8">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#071E36] text-[#E1B866]">
                <PlusCircle size={20} />
              </span>
              <div>
                <h2 className="text-xl font-semibold text-[#071E36]">
                  Nova memória
                </h2>
                <p className="text-sm text-[#64736D]">
                  Registre contexto operacional reutilizável pelo UCE.
                </p>
              </div>
            </div>

            <form action={cadastrarMemoria} className="mt-6 grid gap-5">
              <label className="grid gap-2 text-sm font-medium text-[#102A27]">
                Tipo de entidade
                <select
                  name="entity_type"
                  required
                  defaultValue="lead"
                  className="rounded-xl border border-[#E8DDCB] bg-white px-4 py-3 text-[#071E36] outline-none transition focus:border-[#C89B3C]"
                >
                  {entityTypes.map((type) => (
                    <option key={type} value={type}>
                      {label(type)}
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid gap-2 text-sm font-medium text-[#102A27]">
                Rótulo da entidade
                <input
                  name="entity_label"
                  className="rounded-xl border border-[#E8DDCB] px-4 py-3 text-[#071E36] outline-none transition placeholder:text-[#9a9d98] focus:border-[#C89B3C]"
                  placeholder="Ex.: João Silva, Apto Ponta Verde"
                />
              </label>

              <label className="grid gap-2 text-sm font-medium text-[#102A27]">
                Tipo de memória
                <select
                  name="memory_type"
                  required
                  defaultValue="observacao"
                  className="rounded-xl border border-[#E8DDCB] bg-white px-4 py-3 text-[#071E36] outline-none transition focus:border-[#C89B3C]"
                >
                  {memoryTypes.map((type) => (
                    <option key={type} value={type}>
                      {label(type)}
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid gap-2 text-sm font-medium text-[#102A27]">
                Título
                <input
                  name="title"
                  required
                  className="rounded-xl border border-[#E8DDCB] px-4 py-3 text-[#071E36] outline-none transition placeholder:text-[#9a9d98] focus:border-[#C89B3C]"
                  placeholder="Ex.: Prefere contato pela manhã"
                />
              </label>

              <label className="grid gap-2 text-sm font-medium text-[#102A27]">
                Conteúdo
                <textarea
                  name="content"
                  required
                  rows={7}
                  className="rounded-xl border border-[#E8DDCB] px-4 py-3 text-[#071E36] outline-none transition placeholder:text-[#9a9d98] focus:border-[#C89B3C]"
                  placeholder="Descreva o histórico, preferência, pendência ou risco..."
                />
              </label>

              <label className="grid gap-2 text-sm font-medium text-[#102A27]">
                Sentimento
                <select
                  name="sentiment"
                  defaultValue="neutro"
                  className="rounded-xl border border-[#E8DDCB] bg-white px-4 py-3 text-[#071E36] outline-none transition focus:border-[#C89B3C]"
                >
                  {sentiments.map((sentiment) => (
                    <option key={sentiment} value={sentiment}>
                      {label(sentiment)}
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid gap-2 text-sm font-medium text-[#102A27]">
                Importância
                <input
                  name="importance"
                  type="number"
                  min={1}
                  max={5}
                  defaultValue={1}
                  className="rounded-xl border border-[#E8DDCB] px-4 py-3 text-[#071E36] outline-none transition placeholder:text-[#9a9d98] focus:border-[#C89B3C]"
                />
              </label>

              <label className="grid gap-2 text-sm font-medium text-[#102A27]">
                Tags
                <input
                  name="tags"
                  className="rounded-xl border border-[#E8DDCB] px-4 py-3 text-[#071E36] outline-none transition placeholder:text-[#9a9d98] focus:border-[#C89B3C]"
                  placeholder="Ex.: manutenção, garantia, proprietário"
                />
              </label>

              <button
                type="submit"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#071E36] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#0A2A4A]"
              >
                Salvar memória
                <Brain size={16} />
              </button>
            </form>
          </div>

          <div className="rounded-[2rem] border border-[#E8DDCB] bg-white p-6 shadow-sm sm:p-8">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-[#071E36]">
                  Memórias recentes
                </h2>
                <p className="mt-1 text-sm text-[#64736D]">
                  Registros persistentes para consulta futura do atendimento.
                </p>
              </div>
              <span className="inline-flex items-center gap-2 rounded-full border border-[#C89B3C]/30 bg-[#C89B3C]/10 px-3 py-1 text-sm font-semibold text-[#8B6827]">
                <Database size={15} />
                {memories.length}
              </span>
            </div>

            {error ? (
              <p className="mt-6 rounded-xl bg-[#fbebe7] px-4 py-3 text-sm text-[#8a2e1c]">
                {error}
              </p>
            ) : memories.length === 0 ? (
              <p className="mt-6 rounded-2xl border border-dashed border-[#E8DDCB] bg-[#F7F3ED] px-4 py-12 text-center text-sm text-[#64736D]">
                Nenhuma memória cadastrada ainda.
              </p>
            ) : (
              <div className="mt-6 grid gap-4">
                {memories.map((memory) => (
                  <article
                    key={memory.id}
                    className="rounded-3xl border border-[#E8DDCB] bg-[#fffdfa] p-5 shadow-sm transition hover:border-[#C89B3C]/35 hover:shadow-lg hover:shadow-[#071E36]/10"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <span className="rounded-full bg-[#C89B3C]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-[#8B6827]">
                          {label(memory.entity_type)} · {label(memory.memory_type)}
                        </span>
                        <h3 className="mt-3 text-lg font-semibold text-[#071E36]">
                          {memory.title}
                        </h3>
                        {memory.entity_label ? (
                          <p className="mt-1 text-sm font-medium text-[#64736D]">
                            {memory.entity_label}
                          </p>
                        ) : null}
                      </div>

                      <span className="rounded-full border border-[#E8DDCB] bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-[#64736D]">
                        importância {memory.importance}
                      </span>
                    </div>

                    <p className="mt-4 text-sm leading-6 text-[#64736D]">
                      {resumir(memory.content)}
                    </p>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {memory.sentiment ? (
                        <span className="rounded-full border border-[#E8DDCB] bg-white px-3 py-1 text-xs font-medium text-[#64736D]">
                          {label(memory.sentiment)}
                        </span>
                      ) : null}
                      {splitTags(memory.tags).map((tag) => (
                        <span
                          key={`${memory.id}-${tag}`}
                          className="rounded-full border border-[#E8DDCB] bg-white px-3 py-1 text-xs font-medium text-[#64736D]"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>

                    <div className="mt-5 flex flex-wrap gap-2 border-t border-[#E8DDCB]/70 pt-4 text-xs font-medium text-[#64736D]">
                      <span className="rounded-full bg-white px-3 py-1">
                        Fonte: {memory.source || "manual"}
                      </span>
                      <span className="rounded-full bg-white px-3 py-1">
                        Criada em: {formatarData(memory.created_at)}
                      </span>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
