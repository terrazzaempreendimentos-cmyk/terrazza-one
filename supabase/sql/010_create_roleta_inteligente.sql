create table if not exists roleta_distribuicoes (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references leads(id) on delete set null,
  corretor_id uuid references corretores(id) on delete set null,
  criterio text default 'manual',
  motivo text,
  status text default 'distribuido',
  created_at timestamptz default now()
);

alter table corretores
add column if not exists especialidade text,
add column if not exists cidade_base text,
add column if not exists peso_roleta integer default 1,
add column if not exists leads_recebidos integer default 0,
add column if not exists tempo_medio_resposta_min integer,
add column if not exists taxa_conversao numeric,
add column if not exists disponibilidade text default 'disponivel';
