create table if not exists inquilinos (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  telefone text,
  email text,
  cpf text,
  cidade_interesse text,
  bairro_interesse text,
  faixa_aluguel numeric,
  quartos_desejados integer,
  possui_pet boolean default false,
  status text default 'prospect',
  observacao text,
  created_at timestamptz default now()
);
