-- Perfil de acesso ao sistema. Nao reutilizar pessoas.papeis ou
-- pessoa_papeis, que representam papeis comerciais no CRM.
create table if not exists public.usuarios_perfis (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  papel text,
  ativo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint usuarios_perfis_user_id_key unique (user_id),
  constraint usuarios_perfis_user_id_fkey
    foreign key (user_id) references auth.users(id) on delete cascade,
  constraint usuarios_perfis_papel_check
    check (
      papel is null
      or papel in ('administrador', 'gestor', 'corretor', 'atendimento')
    ),
  constraint usuarios_perfis_ativo_exige_papel_check
    check (not ativo or papel is not null)
);

comment on table public.usuarios_perfis is
  'Perfis de acesso ao sistema vinculados ao Supabase Auth; distintos dos papeis comerciais de pessoas.';

comment on column public.usuarios_perfis.user_id is
  'Identidade em auth.users. E-mail e senha nao sao duplicados nesta tabela.';

comment on column public.usuarios_perfis.papel is
  'Papel de acesso ao sistema; nulo enquanto aguarda atribuicao controlada.';

-- A constraint UNIQUE de user_id ja fornece o indice B-tree necessario.
alter table public.usuarios_perfis enable row level security;

revoke all privileges on table public.usuarios_perfis from anon;
revoke all privileges on table public.usuarios_perfis from authenticated;
grant select on table public.usuarios_perfis to authenticated;

drop policy if exists usuarios_perfis_select_proprio
  on public.usuarios_perfis;

create policy usuarios_perfis_select_proprio
  on public.usuarios_perfis
  for select
  to authenticated
  using (auth.uid() = user_id);

-- Nao ha policies de INSERT, UPDATE ou DELETE para usuarios autenticados.
-- updated_at automatico e administracao segura de perfis ficam para etapa futura.
