alter table proprietarios add column if not exists ativo boolean default true;
alter table proprietarios add column if not exists updated_at timestamptz default now();

alter table inquilinos add column if not exists ativo boolean default true;
alter table inquilinos add column if not exists updated_at timestamptz default now();

alter table imoveis add column if not exists ativo boolean default true;
alter table imoveis add column if not exists updated_at timestamptz default now();

alter table corretores add column if not exists updated_at timestamptz default now();
