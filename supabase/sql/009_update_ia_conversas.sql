create table if not exists ia_conversas (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references leads(id) on delete set null,
  mensagem_usuario text not null,
  mensagem_ia text,
  origem text default 'manual',
  created_at timestamptz default now()
);
