import { hasPapel } from "../pessoas/papeis";
import type { SupabaseClient } from "@supabase/supabase-js";

export type CorretorOrigem = "pessoas" | "corretores";

export type CorretorUnificado = {
  id: string;
  sourceId: string;
  origem: CorretorOrigem;
  nome: string;
  creci: string | null;
  telefone: string | null;
  whatsapp: string | null;
  email: string | null;
  cidade: string | null;
  cidade_base: string | null;
  status: string | null;
  ativo: boolean | null;
  especialidade: string | null;
  peso_roleta: number | null;
  leads_recebidos: number | null;
  tempo_medio_resposta_min: number | null;
  taxa_conversao: number | null;
  disponibilidade: string | null;
};

type PessoaCorretor = {
  id: string;
  nome: string | null;
  telefone: string | null;
  celular: string | null;
  whatsapp: string | null;
  email: string | null;
  cidade: string | null;
  status: string | null;
  observacoes: string | null;
  papeis: string[] | null;
  ativo: boolean | null;
};

type CorretorLegado = {
  id: string;
  nome: string | null;
  creci: string | null;
  ativo: boolean | null;
  especialidade: string | null;
  cidade_base: string | null;
  peso_roleta: number | null;
  leads_recebidos: number | null;
  tempo_medio_resposta_min: number | null;
  taxa_conversao: number | null;
  disponibilidade: string | null;
};

function extrairCreci(observacoes: string | null) {
  const match = observacoes?.match(/CRECI:\s*(.+)/i);
  return match?.[1]?.trim() ?? null;
}

function normalizar(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function normalizarCreci(value: string | null) {
  return String(value ?? "").trim().toUpperCase().replace(/\s+/g, "");
}

function telefonePrincipal(pessoa: PessoaCorretor) {
  return pessoa.whatsapp || pessoa.celular || pessoa.telefone || null;
}

function chaveDeduplicacao(corretor: Pick<CorretorUnificado, "creci" | "nome" | "telefone" | "whatsapp">) {
  const creci = normalizarCreci(corretor.creci);
  if (creci) return `creci:${creci}`;

  const contato = normalizar(corretor.whatsapp || corretor.telefone).replace(/\D/g, "");
  return `nome-contato:${normalizar(corretor.nome)}:${contato}`;
}

export async function getCorretoresUnificados(supabase: SupabaseClient) {
  const [pessoasResult, corretoresResult] = await Promise.all([
    supabase
      .from("pessoas")
      .select("id, nome, telefone, celular, whatsapp, email, cidade, status, observacoes, papeis, ativo")
      .eq("ativo", true)
      .order("nome", { ascending: true }),
    supabase
      .from("corretores")
      .select(
        "id, nome, creci, ativo, especialidade, cidade_base, peso_roleta, leads_recebidos, tempo_medio_resposta_min, taxa_conversao, disponibilidade",
      )
      .eq("ativo", true)
      .order("nome", { ascending: true }),
  ]);

  if (pessoasResult.error || corretoresResult.error) {
    return {
      data: [] as CorretorUnificado[],
      error: pessoasResult.error ?? corretoresResult.error,
    };
  }

  const pessoas = ((pessoasResult.data ?? []) as PessoaCorretor[])
    .filter((pessoa) => hasPapel(pessoa, "corretor"))
    .map((pessoa): CorretorUnificado => ({
      id: `pessoas:${pessoa.id}`,
      sourceId: pessoa.id,
      origem: "pessoas",
      nome: pessoa.nome ?? "Corretor sem nome",
      creci: extrairCreci(pessoa.observacoes),
      telefone: telefonePrincipal(pessoa),
      whatsapp: pessoa.whatsapp,
      email: pessoa.email,
      cidade: pessoa.cidade,
      cidade_base: pessoa.cidade,
      status: pessoa.status ?? (pessoa.ativo ? "ativo" : "inativo"),
      ativo: pessoa.ativo,
      especialidade: "Cadastro Universal",
      peso_roleta: 1,
      leads_recebidos: 0,
      tempo_medio_resposta_min: null,
      taxa_conversao: null,
      disponibilidade: "disponivel",
    }));

  const legados = ((corretoresResult.data ?? []) as CorretorLegado[]).map(
    (corretor): CorretorUnificado => ({
      id: `corretores:${corretor.id}`,
      sourceId: corretor.id,
      origem: "corretores",
      nome: corretor.nome ?? "Corretor sem nome",
      creci: corretor.creci,
      telefone: null,
      whatsapp: null,
      email: null,
      cidade: corretor.cidade_base,
      cidade_base: corretor.cidade_base,
      status: corretor.ativo ? "ativo" : "inativo",
      ativo: corretor.ativo,
      especialidade: corretor.especialidade,
      peso_roleta: corretor.peso_roleta,
      leads_recebidos: corretor.leads_recebidos,
      tempo_medio_resposta_min: corretor.tempo_medio_resposta_min,
      taxa_conversao: corretor.taxa_conversao,
      disponibilidade: corretor.disponibilidade,
    }),
  );

  const deduplicados = new Map<string, CorretorUnificado>();

  for (const corretor of [...pessoas, ...legados]) {
    const chave = chaveDeduplicacao(corretor);
    if (!deduplicados.has(chave)) deduplicados.set(chave, corretor);
  }

  return {
    data: Array.from(deduplicados.values()).sort((a, b) => a.nome.localeCompare(b.nome)),
    error: null,
  };
}

export function getCorretorUnificadoPorId(
  corretores: CorretorUnificado[],
  id: string,
) {
  return corretores.find((corretor) => corretor.id === id) ?? null;
}
