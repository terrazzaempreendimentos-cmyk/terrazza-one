create table if not exists manutencoes_conflitos (
  id uuid primary key default gen_random_uuid(),
  tipo text not null,
  categoria text,
  titulo text not null,
  resumo text,
  descricao text,
  imovel_id uuid references imoveis(id) on delete set null,
  proprietario_id uuid references proprietarios(id) on delete set null,
  inquilino_id uuid references inquilinos(id) on delete set null,
  responsavel_id uuid references corretores(id) on delete set null,
  prioridade text default 'media',
  status text default 'aberto',
  origem text default 'manual',
  risco text,
  proxima_acao text,
  observacoes text,
  data_abertura timestamptz default now(),
  data_prazo timestamptz,
  data_conclusao timestamptz,
  ativo boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_manutencoes_conflitos_tipo
  on manutencoes_conflitos (tipo);

create index if not exists idx_manutencoes_conflitos_status
  on manutencoes_conflitos (status);

create index if not exists idx_manutencoes_conflitos_prioridade
  on manutencoes_conflitos (prioridade);

create index if not exists idx_manutencoes_conflitos_imovel_id
  on manutencoes_conflitos (imovel_id);

create index if not exists idx_manutencoes_conflitos_proprietario_id
  on manutencoes_conflitos (proprietario_id);

create index if not exists idx_manutencoes_conflitos_inquilino_id
  on manutencoes_conflitos (inquilino_id);

create index if not exists idx_manutencoes_conflitos_ativo
  on manutencoes_conflitos (ativo);

create index if not exists idx_manutencoes_conflitos_created_at_desc
  on manutencoes_conflitos (created_at desc);
