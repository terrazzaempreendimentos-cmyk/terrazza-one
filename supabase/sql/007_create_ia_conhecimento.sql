create table if not exists ia_conhecimento (
  id uuid primary key default gen_random_uuid(),
  categoria text not null,
  titulo text not null,
  conteudo text not null,
  ativo boolean default true,
  origem text default 'manual',
  created_at timestamptz default now()
);
