create table if not exists pessoas (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  tipo_pessoa text default 'fisica',
  cpf_cnpj text,
  rg_ie text,
  data_nascimento date,
  estado_civil text,
  profissao text,
  email text,
  telefone text,
  celular text,
  whatsapp text,
  cep text,
  endereco text,
  numero text,
  complemento text,
  bairro text,
  cidade text,
  estado text,
  papeis text[],
  origem text default 'manual',
  status text default 'ativo',
  responsavel_id uuid references corretores(id) on delete set null,
  temperatura text,
  score_relacionamento integer default 0,
  perfil_comportamental text,
  resumo_uce text,
  observacoes_uce text,
  observacoes text,
  ativo boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_pessoas_nome
  on pessoas (nome);

create index if not exists idx_pessoas_cpf_cnpj
  on pessoas (cpf_cnpj);

create index if not exists idx_pessoas_email
  on pessoas (email);

create index if not exists idx_pessoas_celular
  on pessoas (celular);

create index if not exists idx_pessoas_whatsapp
  on pessoas (whatsapp);

create index if not exists idx_pessoas_status
  on pessoas (status);

create index if not exists idx_pessoas_ativo
  on pessoas (ativo);

create index if not exists idx_pessoas_created_at_desc
  on pessoas (created_at desc);

create table if not exists pessoa_papeis (
  id uuid primary key default gen_random_uuid(),
  pessoa_id uuid references pessoas(id) on delete cascade,
  papel text not null,
  ativo boolean default true,
  created_at timestamptz default now()
);

create index if not exists idx_pessoa_papeis_pessoa_id
  on pessoa_papeis (pessoa_id);

create index if not exists idx_pessoa_papeis_papel
  on pessoa_papeis (papel);
