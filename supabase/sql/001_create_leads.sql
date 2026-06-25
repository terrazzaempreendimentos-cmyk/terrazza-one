create table if not exists leads (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  telefone text,
  tipo_lead text,
  objetivo text,
  cidade text,
  bairro_interesse text,
  origem text default 'manual',
  status text default 'novo',
  responsavel text,
  observacao text,
  created_at timestamptz default now()
);
