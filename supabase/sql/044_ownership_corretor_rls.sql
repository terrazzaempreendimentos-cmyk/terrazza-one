-- P0.4: ownership de Corretor. Esta migration e aditiva e nao altera nem
-- remove as policies de Administrador/Gestor criadas pela migration 042.
--
-- Equivalencia TypeScript -> RLS:
-- | Recurso                 | Permissao TS do Corretor                         | Regra RLS |
-- |-------------------------|--------------------------------------------------|-----------|
-- | pessoas                 | visualizar global; criar/editar/arquivar         | SELECT global; INSERT/UPDATE responsavel_pessoa_id = pessoa autenticada |
-- | imoveis                 | visualizar global; criar/editar/arquivar         | SELECT global; INSERT/UPDATE responsavel_pessoa_id = pessoa autenticada |
-- | leads                   | visualizar/editar/kanban                         | SELECT/UPDATE responsavel_id = pessoa autenticada |
-- | tarefas                 | agenda/atividades visualizar/editar              | SELECT/UPDATE responsavel_id = pessoa autenticada |
-- | atendimentos            | visualizar/editar/assumir                        | SELECT/UPDATE responsavel_id = pessoa autenticada |
-- | roleta_distribuicoes    | roleta.visualizar                                | SELECT corretor_pessoa_id = pessoa autenticada |
-- | imovel_proprietarios    | suporte ao cadastro de imovel proprio            | SELECT global; INSERT/UPDATE somente se o imovel pertence ao Corretor |
--
-- Corretor sem usuarios_perfis.pessoa_id ativo falha fechado: a funcao abaixo
-- retorna NULL e nenhuma condicao de ownership e satisfeita.

begin;

create or replace function public.usuario_pessoa_corretor()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select perfil.pessoa_id
  from public.usuarios_perfis as perfil
  where perfil.user_id = auth.uid()
    and perfil.ativo is true
    and perfil.papel = 'corretor'
    and perfil.pessoa_id is not null
  limit 1
$$;

revoke all privileges on function public.usuario_pessoa_corretor() from public;
revoke all privileges on function public.usuario_pessoa_corretor() from anon;
grant execute on function public.usuario_pessoa_corretor() to authenticated;

alter table public.imovel_proprietarios enable row level security;
grant select, insert, update on table public.imovel_proprietarios to authenticated;

drop policy if exists admin_gestor_ativo_select_imovel_proprietarios on public.imovel_proprietarios;
drop policy if exists admin_gestor_ativo_insert_imovel_proprietarios on public.imovel_proprietarios;
drop policy if exists admin_gestor_ativo_update_imovel_proprietarios on public.imovel_proprietarios;
create policy admin_gestor_ativo_select_imovel_proprietarios on public.imovel_proprietarios
  for select to authenticated
  using (public.usuario_tem_papel(array['administrador','gestor']::text[]));
create policy admin_gestor_ativo_insert_imovel_proprietarios on public.imovel_proprietarios
  for insert to authenticated
  with check (public.usuario_tem_papel(array['administrador','gestor']::text[]));
create policy admin_gestor_ativo_update_imovel_proprietarios on public.imovel_proprietarios
  for update to authenticated
  using (public.usuario_tem_papel(array['administrador','gestor']::text[]))
  with check (public.usuario_tem_papel(array['administrador','gestor']::text[]));

drop policy if exists corretor_select_pessoas on public.pessoas;
drop policy if exists corretor_insert_pessoas_proprias on public.pessoas;
drop policy if exists corretor_update_pessoas_proprias on public.pessoas;
create policy corretor_select_pessoas on public.pessoas for select to authenticated
  using (public.usuario_tem_papel(array['corretor']::text[]));
create policy corretor_insert_pessoas_proprias on public.pessoas for insert to authenticated
  with check (responsavel_pessoa_id = public.usuario_pessoa_corretor());
create policy corretor_update_pessoas_proprias on public.pessoas for update to authenticated
  using (responsavel_pessoa_id = public.usuario_pessoa_corretor())
  with check (responsavel_pessoa_id = public.usuario_pessoa_corretor());

drop policy if exists corretor_select_imoveis on public.imoveis;
drop policy if exists corretor_insert_imoveis_proprios on public.imoveis;
drop policy if exists corretor_update_imoveis_proprios on public.imoveis;
create policy corretor_select_imoveis on public.imoveis for select to authenticated
  using (public.usuario_tem_papel(array['corretor']::text[]));
create policy corretor_insert_imoveis_proprios on public.imoveis for insert to authenticated
  with check (responsavel_pessoa_id = public.usuario_pessoa_corretor());
create policy corretor_update_imoveis_proprios on public.imoveis for update to authenticated
  using (responsavel_pessoa_id = public.usuario_pessoa_corretor())
  with check (responsavel_pessoa_id = public.usuario_pessoa_corretor());

drop policy if exists corretor_select_leads_atribuidos on public.leads;
drop policy if exists corretor_update_leads_atribuidos on public.leads;
create policy corretor_select_leads_atribuidos on public.leads for select to authenticated
  using (responsavel_id = public.usuario_pessoa_corretor());
create policy corretor_update_leads_atribuidos on public.leads for update to authenticated
  using (responsavel_id = public.usuario_pessoa_corretor())
  with check (responsavel_id = public.usuario_pessoa_corretor());

drop policy if exists corretor_select_tarefas_proprias on public.tarefas;
drop policy if exists corretor_update_tarefas_proprias on public.tarefas;
create policy corretor_select_tarefas_proprias on public.tarefas for select to authenticated
  using (responsavel_id = public.usuario_pessoa_corretor());
create policy corretor_update_tarefas_proprias on public.tarefas for update to authenticated
  using (responsavel_id = public.usuario_pessoa_corretor())
  with check (responsavel_id = public.usuario_pessoa_corretor());

drop policy if exists corretor_select_atendimentos_atribuidos on public.atendimentos;
drop policy if exists corretor_update_atendimentos_atribuidos on public.atendimentos;
create policy corretor_select_atendimentos_atribuidos on public.atendimentos for select to authenticated
  using (responsavel_id = public.usuario_pessoa_corretor());
create policy corretor_update_atendimentos_atribuidos on public.atendimentos for update to authenticated
  using (responsavel_id = public.usuario_pessoa_corretor())
  with check (responsavel_id = public.usuario_pessoa_corretor());

drop policy if exists corretor_select_roleta_propria on public.roleta_distribuicoes;
create policy corretor_select_roleta_propria on public.roleta_distribuicoes for select to authenticated
  using (corretor_pessoa_id = public.usuario_pessoa_corretor());

drop policy if exists corretor_select_imovel_proprietarios on public.imovel_proprietarios;
drop policy if exists corretor_insert_imovel_proprietarios_proprios on public.imovel_proprietarios;
drop policy if exists corretor_update_imovel_proprietarios_proprios on public.imovel_proprietarios;
create policy corretor_select_imovel_proprietarios on public.imovel_proprietarios for select to authenticated
  using (public.usuario_tem_papel(array['corretor']::text[]));
create policy corretor_insert_imovel_proprietarios_proprios on public.imovel_proprietarios for insert to authenticated
  with check (exists (
    select 1 from public.imoveis
    where imoveis.id = imovel_proprietarios.imovel_id
      and imoveis.responsavel_pessoa_id = public.usuario_pessoa_corretor()
  ));
create policy corretor_update_imovel_proprietarios_proprios on public.imovel_proprietarios for update to authenticated
  using (exists (
    select 1 from public.imoveis
    where imoveis.id = imovel_proprietarios.imovel_id
      and imoveis.responsavel_pessoa_id = public.usuario_pessoa_corretor()
  ))
  with check (exists (
    select 1 from public.imoveis
    where imoveis.id = imovel_proprietarios.imovel_id
      and imoveis.responsavel_pessoa_id = public.usuario_pessoa_corretor()
  ));

commit;
