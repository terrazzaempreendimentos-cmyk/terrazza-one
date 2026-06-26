create table if not exists ia_conversas (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references leads(id) on delete set null,
  mensagem_usuario text,
  mensagem_ia text,
  created_at timestamptz default now()
);

create table if not exists ia_memorias (
  id uuid primary key default gen_random_uuid(),
  categoria text,
  titulo text,
  conteudo text,
  ativo boolean default true,
  created_at timestamptz default now()
);

create table if not exists ia_logs (
  id uuid primary key default gen_random_uuid(),
  acao text,
  origem text,
  created_at timestamptz default now()
);
