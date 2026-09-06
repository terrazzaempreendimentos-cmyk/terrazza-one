-- Alinha as policies RLS de Negocios e conversas da IA com a matriz atual em
-- lib/auth/permissions.ts. Esta migration nao altera a matriz TypeScript e nao
-- implementa ownership de Corretor em Negocios; o escopo "proprio" permanece
-- deliberadamente futuro.
--
-- Equivalencia TypeScript -> RLS usada nesta migration:
--
-- | Tabela           | SELECT                                  | INSERT                    | UPDATE |
-- |------------------|-----------------------------------------|---------------------------|--------|
-- | negocios         | negocios.visualizar: todos os papeis   | negocios.criar: Admin/Gestor | negocios.editar: Admin/Gestor |
-- | negocios_partes  | acompanha negocios.visualizar          | acompanha negocios.criar  | acompanha negocios.editar |
-- | ia_conversas     | ia.usar: todos os papeis                | ia.usar: todos os papeis  | ia.usar: todos os papeis |
--
-- "Todos os papeis" significa Administrador, Gestor, Corretor e Atendimento,
-- sempre com perfil ativo validado por public.usuario_tem_papel(text[]).
-- DELETE fisico nao possui equivalente na matriz e permanece sem grant/policy.

begin;

do $$
declare
  tabela text;
begin
  if to_regprocedure('public.usuario_tem_papel(text[])') is null then
    raise exception 'Precondition failed: public.usuario_tem_papel(text[]) ausente';
  end if;

  foreach tabela in array array[
    'negocios',
    'negocios_partes',
    'ia_conversas'
  ] loop
    if to_regclass(format('public.%I', tabela)) is null then
      raise exception 'Precondition failed: public.% ausente', tabela;
    end if;
  end loop;
end;
$$;

alter table public.negocios enable row level security;
alter table public.negocios_partes enable row level security;
alter table public.ia_conversas enable row level security;

revoke all privileges on table
  public.negocios,
  public.negocios_partes,
  public.ia_conversas
from anon;

revoke delete, truncate, references, trigger on table
  public.negocios,
  public.negocios_partes,
  public.ia_conversas
from authenticated;

grant select, insert, update on table
  public.negocios,
  public.negocios_partes,
  public.ia_conversas
to authenticated;

-- Policies legadas de Negocios da migration 032.
drop policy if exists admin_ativo_select_negocios on public.negocios;
drop policy if exists admin_ativo_insert_negocios on public.negocios;
drop policy if exists admin_ativo_update_negocios on public.negocios;
drop policy if exists admin_ativo_select_negocios_partes on public.negocios_partes;
drop policy if exists admin_ativo_insert_negocios_partes on public.negocios_partes;
drop policy if exists admin_ativo_update_negocios_partes on public.negocios_partes;

-- Policies legadas de ia_conversas das migrations 019 e 042.
drop policy if exists admin_ativo_select_ia_conversas on public.ia_conversas;
drop policy if exists admin_ativo_insert_ia_conversas on public.ia_conversas;
drop policy if exists admin_ativo_update_ia_conversas on public.ia_conversas;
drop policy if exists admin_gestor_ativo_select_ia_conversas on public.ia_conversas;
drop policy if exists admin_gestor_ativo_insert_ia_conversas on public.ia_conversas;
drop policy if exists admin_gestor_ativo_update_ia_conversas on public.ia_conversas;

-- Policies desta migration, removidas antes da recriacao para idempotencia.
drop policy if exists papeis_ativos_select_negocios on public.negocios;
drop policy if exists admin_gestor_ativo_insert_negocios on public.negocios;
drop policy if exists admin_gestor_ativo_update_negocios on public.negocios;
drop policy if exists papeis_ativos_select_negocios_partes on public.negocios_partes;
drop policy if exists admin_gestor_ativo_insert_negocios_partes on public.negocios_partes;
drop policy if exists admin_gestor_ativo_update_negocios_partes on public.negocios_partes;
drop policy if exists papeis_ativos_select_ia_conversas on public.ia_conversas;
drop policy if exists papeis_ativos_insert_ia_conversas on public.ia_conversas;
drop policy if exists papeis_ativos_update_ia_conversas on public.ia_conversas;

create policy papeis_ativos_select_negocios
  on public.negocios for select to authenticated
  using (
    public.usuario_tem_papel(
      array['administrador','gestor','corretor','atendimento']::text[]
    )
  );

create policy admin_gestor_ativo_insert_negocios
  on public.negocios for insert to authenticated
  with check (
    public.usuario_tem_papel(array['administrador','gestor']::text[])
  );

create policy admin_gestor_ativo_update_negocios
  on public.negocios for update to authenticated
  using (
    public.usuario_tem_papel(array['administrador','gestor']::text[])
  )
  with check (
    public.usuario_tem_papel(array['administrador','gestor']::text[])
  );

create policy papeis_ativos_select_negocios_partes
  on public.negocios_partes for select to authenticated
  using (
    public.usuario_tem_papel(
      array['administrador','gestor','corretor','atendimento']::text[]
    )
  );

create policy admin_gestor_ativo_insert_negocios_partes
  on public.negocios_partes for insert to authenticated
  with check (
    public.usuario_tem_papel(array['administrador','gestor']::text[])
  );

create policy admin_gestor_ativo_update_negocios_partes
  on public.negocios_partes for update to authenticated
  using (
    public.usuario_tem_papel(array['administrador','gestor']::text[])
  )
  with check (
    public.usuario_tem_papel(array['administrador','gestor']::text[])
  );

create policy papeis_ativos_select_ia_conversas
  on public.ia_conversas for select to authenticated
  using (
    public.usuario_tem_papel(
      array['administrador','gestor','corretor','atendimento']::text[]
    )
  );

create policy papeis_ativos_insert_ia_conversas
  on public.ia_conversas for insert to authenticated
  with check (
    public.usuario_tem_papel(
      array['administrador','gestor','corretor','atendimento']::text[]
    )
  );

create policy papeis_ativos_update_ia_conversas
  on public.ia_conversas for update to authenticated
  using (
    public.usuario_tem_papel(
      array['administrador','gestor','corretor','atendimento']::text[]
    )
  )
  with check (
    public.usuario_tem_papel(
      array['administrador','gestor','corretor','atendimento']::text[]
    )
  );

commit;

-- CONSULTAS MANUAIS DE VERIFICACAO (comentadas; fora da transacao).
-- select tablename, policyname, cmd, roles, qual, with_check
-- from pg_catalog.pg_policies
-- where schemaname = 'public'
--   and tablename in ('negocios', 'negocios_partes', 'ia_conversas')
-- order by tablename, policyname;
--
-- select table_name, grantee, privilege_type
-- from information_schema.role_table_grants
-- where table_schema = 'public'
--   and table_name in ('negocios', 'negocios_partes', 'ia_conversas')
-- order by table_name, grantee, privilege_type;
