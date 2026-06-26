create table if not exists timeline (
  id uuid primary key default gen_random_uuid(),
  tipo text,
  titulo text,
  descricao text,
  lead_id uuid references leads(id) on delete set null,
  proprietario_id uuid references proprietarios(id) on delete set null,
  inquilino_id uuid references inquilinos(id) on delete set null,
  imovel_id uuid references imoveis(id) on delete set null,
  corretor_id uuid references corretores(id) on delete set null,
  origem text default 'manual',
  created_at timestamptz default now()
);
