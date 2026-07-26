import { hasPapel } from "../pessoas/papeis";
import type { SupabaseClient } from "@supabase/supabase-js";

export type CorretorOrigem = "pessoas";

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

function extrairCreci(observacoes: string | null) {
  const match = observacoes?.match(/CRECI:\s*(.+)/i);
  return match?.[1]?.trim() ?? null;
}

function telefonePrincipal(pessoa: PessoaCorretor) {
  return pessoa.whatsapp || pessoa.celular || pessoa.telefone || null;
}

export async function getCorretoresUnificados(supabase: SupabaseClient) {
  const pessoasResult = await supabase
    .from("pessoas")
    .select("id, nome, telefone, celular, whatsapp, email, cidade, status, observacoes, papeis, ativo")
    .eq("ativo", true)
    .contains("papeis", ["corretor"])
    .order("nome", { ascending: true });

  if (pessoasResult.error) {
    return {
      data: [] as CorretorUnificado[],
      error: pessoasResult.error,
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

  return {
    data: pessoas.sort((a, b) => a.nome.localeCompare(b.nome)),
    error: null,
  };
}

export function getCorretorUnificadoPorId(
  corretores: CorretorUnificado[],
  id: string,
) {
  return corretores.find((corretor) => corretor.id === id) ?? null;
}
