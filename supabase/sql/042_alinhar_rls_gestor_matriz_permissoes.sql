-- Alinha o acesso direto via RLS com lib/auth/permissions.ts para Administrador
-- e Gestor. Corretor e Atendimento ficam deliberadamente fora desta migration:
-- os escopos proprio/atribuido/relacionado de FUTURE_PERMISSION_SCOPES ainda
-- precisam ser implementados antes de qualquer ampliacao de RLS para esses papeis.
--
-- Equivalencia TypeScript -> RLS usada nesta migration:
--
-- | Tabela                  | SELECT (permissao TS)             | INSERT (permissao TS)          | UPDATE (permissao TS) |
-- |-------------------------|-----------------------------------|--------------------------------|-----------------------|
-- | atendimentos            | atendimentos.visualizar           | atendimentos.criar             | atendimentos.editar/assumir/concluir/cancelar/reabrir |
-- | corretores              | corretores.visualizar             | corretores.administrar         | corretores.administrar/arquivar |
-- | ia_conhecimento         | ia_conhecimento.visualizar        | ia_conhecimento.criar          | ia_conhecimento.editar |
-- | ia_conversas            | ia.usar                           | ia.usar                        | ia.usar |
-- | imoveis                 | imoveis.visualizar                | imoveis.criar                  | imoveis.editar/arquivar |
-- | leads                   | leads.visualizar                  | leads.criar                    | leads.editar/arquivar/distribuir + kanban.usar |
-- | manutencoes_conflitos   | manutencoes.visualizar            | manutencoes.criar              | manutencoes.editar/arquivar |
-- | pessoas                 | pessoas.visualizar                | pessoas.criar                  | pessoas.editar/arquivar |
-- | tarefas                 | agenda/atividades.visualizar      | agenda/atividades.criar        | agenda/atividades.editar/concluir/cancelar/reabrir |
-- | roleta_distribuicoes    | roleta.visualizar                 | roleta.usar/leads.distribuir   | roleta.usar/leads.distribuir |
--
-- Administrador possui todas as permissoes e Gestor possui todas as permissoes
-- acima na matriz atual. DELETE fisico nao possui equivalente na matriz e
-- permanece sem grant e sem policy. RPCs continuam responsaveis por invariantes
-- transacionais; estas policies tambem cobrem os acessos diretos ja existentes.

begin;

do $$
declare
  tabela text;
begin
  if to_regprocedure('public.usuario_tem_papel(text[])') is null then
    raise exception 'Precondition failed: public.usuario_tem_papel(text[]) ausente';
  end if;

  foreach tabela in array array[
    'atendimentos',
    'corretores',
    'ia_conhecimento',
    'ia_conversas',
    'imoveis',
    'leads',
    'manutencoes_conflitos',
    'pessoas',
    'tarefas',
    'roleta_distribuicoes'
  ] loop
    if to_regclass(format('public.%I', tabela)) is null then
      raise exception 'Precondition failed: public.% ausente', tabela;
    end if;
  end loop;
end;
$$;

alter table public.atendimentos enable row level security;
alter table public.corretores enable row level security;
alter table public.ia_conhecimento enable row level security;
alter table public.ia_conversas enable row level security;
alter table public.imoveis enable row level security;
alter table public.leads enable row level security;
alter table public.manutencoes_conflitos enable row level security;
alter table public.pessoas enable row level security;
alter table public.tarefas enable row level security;
alter table public.roleta_distribuicoes enable row level security;

revoke all privileges on table
  public.atendimentos,
  public.corretores,
  public.ia_conhecimento,
  public.ia_conversas,
  public.imoveis,
  public.leads,
  public.manutencoes_conflitos,
  public.pessoas,
  public.tarefas,
  public.roleta_distribuicoes
from anon;

revoke delete, truncate, references, trigger on table
  public.atendimentos,
  public.corretores,
  public.ia_conhecimento,
  public.ia_conversas,
  public.imoveis,
  public.leads,
  public.manutencoes_conflitos,
  public.pessoas,
  public.tarefas,
  public.roleta_distribuicoes
from authenticated;

grant select, insert, update on table
  public.atendimentos,
  public.corretores,
  public.ia_conhecimento,
  public.ia_conversas,
  public.imoveis,
  public.leads,
  public.manutencoes_conflitos,
  public.pessoas,
  public.tarefas,
  public.roleta_distribuicoes
to authenticated;

-- Policies legadas da migration 019.
drop policy if exists admin_ativo_select_atendimentos on public.atendimentos;
drop policy if exists admin_ativo_select_corretores on public.corretores;
drop policy if exists admin_ativo_update_corretores on public.corretores;
drop policy if exists admin_ativo_select_ia_conhecimento on public.ia_conhecimento;
drop policy if exists admin_ativo_insert_ia_conhecimento on public.ia_conhecimento;
drop policy if exists admin_ativo_select_ia_conversas on public.ia_conversas;
drop policy if exists admin_ativo_insert_ia_conversas on public.ia_conversas;
drop policy if exists admin_ativo_update_ia_conversas on public.ia_conversas;
drop policy if exists admin_ativo_select_imoveis on public.imoveis;
drop policy if exists admin_ativo_insert_imoveis on public.imoveis;
drop policy if exists admin_ativo_update_imoveis on public.imoveis;
drop policy if exists admin_ativo_select_leads on public.leads;
drop policy if exists admin_ativo_insert_leads on public.leads;
drop policy if exists admin_ativo_update_leads on public.leads;
drop policy if exists admin_ativo_select_manutencoes_conflitos on public.manutencoes_conflitos;
drop policy if exists admin_ativo_insert_manutencoes_conflitos on public.manutencoes_conflitos;
drop policy if exists admin_ativo_update_manutencoes_conflitos on public.manutencoes_conflitos;
drop policy if exists admin_ativo_select_pessoas on public.pessoas;
drop policy if exists admin_ativo_insert_pessoas on public.pessoas;
drop policy if exists admin_ativo_update_pessoas on public.pessoas;
drop policy if exists admin_ativo_select_tarefas on public.tarefas;
drop policy if exists admin_ativo_insert_tarefas on public.tarefas;
drop policy if exists admin_ativo_select_roleta_distribuicoes on public.roleta_distribuicoes;
drop policy if exists admin_ativo_insert_roleta_distribuicoes on public.roleta_distribuicoes;

-- Permite reaplicacao segura durante revisao/desenvolvimento.
drop policy if exists admin_gestor_ativo_select_atendimentos on public.atendimentos;
drop policy if exists admin_gestor_ativo_insert_atendimentos on public.atendimentos;
drop policy if exists admin_gestor_ativo_update_atendimentos on public.atendimentos;
drop policy if exists admin_gestor_ativo_select_corretores on public.corretores;
drop policy if exists admin_gestor_ativo_insert_corretores on public.corretores;
drop policy if exists admin_gestor_ativo_update_corretores on public.corretores;
drop policy if exists admin_gestor_ativo_select_ia_conhecimento on public.ia_conhecimento;
drop policy if exists admin_gestor_ativo_insert_ia_conhecimento on public.ia_conhecimento;
drop policy if exists admin_gestor_ativo_update_ia_conhecimento on public.ia_conhecimento;
drop policy if exists admin_gestor_ativo_select_ia_conversas on public.ia_conversas;
drop policy if exists admin_gestor_ativo_insert_ia_conversas on public.ia_conversas;
drop policy if exists admin_gestor_ativo_update_ia_conversas on public.ia_conversas;
drop policy if exists admin_gestor_ativo_select_imoveis on public.imoveis;
drop policy if exists admin_gestor_ativo_insert_imoveis on public.imoveis;
drop policy if exists admin_gestor_ativo_update_imoveis on public.imoveis;
drop policy if exists admin_gestor_ativo_select_leads on public.leads;
drop policy if exists admin_gestor_ativo_insert_leads on public.leads;
drop policy if exists admin_gestor_ativo_update_leads on public.leads;
drop policy if exists admin_gestor_ativo_select_manutencoes_conflitos on public.manutencoes_conflitos;
drop policy if exists admin_gestor_ativo_insert_manutencoes_conflitos on public.manutencoes_conflitos;
drop policy if exists admin_gestor_ativo_update_manutencoes_conflitos on public.manutencoes_conflitos;
drop policy if exists admin_gestor_ativo_select_pessoas on public.pessoas;
drop policy if exists admin_gestor_ativo_insert_pessoas on public.pessoas;
drop policy if exists admin_gestor_ativo_update_pessoas on public.pessoas;
drop policy if exists admin_gestor_ativo_select_tarefas on public.tarefas;
drop policy if exists admin_gestor_ativo_insert_tarefas on public.tarefas;
drop policy if exists admin_gestor_ativo_update_tarefas on public.tarefas;
drop policy if exists admin_gestor_ativo_select_roleta_distribuicoes on public.roleta_distribuicoes;
drop policy if exists admin_gestor_ativo_insert_roleta_distribuicoes on public.roleta_distribuicoes;
drop policy if exists admin_gestor_ativo_update_roleta_distribuicoes on public.roleta_distribuicoes;

create policy admin_gestor_ativo_select_atendimentos on public.atendimentos
  for select to authenticated
  using (public.usuario_tem_papel(array['administrador','gestor']::text[]));
create policy admin_gestor_ativo_insert_atendimentos on public.atendimentos
  for insert to authenticated
  with check (public.usuario_tem_papel(array['administrador','gestor']::text[]));
create policy admin_gestor_ativo_update_atendimentos on public.atendimentos
  for update to authenticated
  using (public.usuario_tem_papel(array['administrador','gestor']::text[]))
  with check (public.usuario_tem_papel(array['administrador','gestor']::text[]));

create policy admin_gestor_ativo_select_corretores on public.corretores
  for select to authenticated
  using (public.usuario_tem_papel(array['administrador','gestor']::text[]));
create policy admin_gestor_ativo_insert_corretores on public.corretores
  for insert to authenticated
  with check (public.usuario_tem_papel(array['administrador','gestor']::text[]));
create policy admin_gestor_ativo_update_corretores on public.corretores
  for update to authenticated
  using (public.usuario_tem_papel(array['administrador','gestor']::text[]))
  with check (public.usuario_tem_papel(array['administrador','gestor']::text[]));

create policy admin_gestor_ativo_select_ia_conhecimento on public.ia_conhecimento
  for select to authenticated
  using (public.usuario_tem_papel(array['administrador','gestor']::text[]));
create policy admin_gestor_ativo_insert_ia_conhecimento on public.ia_conhecimento
  for insert to authenticated
  with check (public.usuario_tem_papel(array['administrador','gestor']::text[]));
create policy admin_gestor_ativo_update_ia_conhecimento on public.ia_conhecimento
  for update to authenticated
  using (public.usuario_tem_papel(array['administrador','gestor']::text[]))
  with check (public.usuario_tem_papel(array['administrador','gestor']::text[]));

create policy admin_gestor_ativo_select_ia_conversas on public.ia_conversas
  for select to authenticated
  using (public.usuario_tem_papel(array['administrador','gestor']::text[]));
create policy admin_gestor_ativo_insert_ia_conversas on public.ia_conversas
  for insert to authenticated
  with check (public.usuario_tem_papel(array['administrador','gestor']::text[]));
create policy admin_gestor_ativo_update_ia_conversas on public.ia_conversas
  for update to authenticated
  using (public.usuario_tem_papel(array['administrador','gestor']::text[]))
  with check (public.usuario_tem_papel(array['administrador','gestor']::text[]));

create policy admin_gestor_ativo_select_imoveis on public.imoveis
  for select to authenticated
  using (public.usuario_tem_papel(array['administrador','gestor']::text[]));
create policy admin_gestor_ativo_insert_imoveis on public.imoveis
  for insert to authenticated
  with check (public.usuario_tem_papel(array['administrador','gestor']::text[]));
create policy admin_gestor_ativo_update_imoveis on public.imoveis
  for update to authenticated
  using (public.usuario_tem_papel(array['administrador','gestor']::text[]))
  with check (public.usuario_tem_papel(array['administrador','gestor']::text[]));

create policy admin_gestor_ativo_select_leads on public.leads
  for select to authenticated
  using (public.usuario_tem_papel(array['administrador','gestor']::text[]));
create policy admin_gestor_ativo_insert_leads on public.leads
  for insert to authenticated
  with check (public.usuario_tem_papel(array['administrador','gestor']::text[]));
create policy admin_gestor_ativo_update_leads on public.leads
  for update to authenticated
  using (public.usuario_tem_papel(array['administrador','gestor']::text[]))
  with check (public.usuario_tem_papel(array['administrador','gestor']::text[]));

create policy admin_gestor_ativo_select_manutencoes_conflitos on public.manutencoes_conflitos
  for select to authenticated
  using (public.usuario_tem_papel(array['administrador','gestor']::text[]));
create policy admin_gestor_ativo_insert_manutencoes_conflitos on public.manutencoes_conflitos
  for insert to authenticated
  with check (public.usuario_tem_papel(array['administrador','gestor']::text[]));
create policy admin_gestor_ativo_update_manutencoes_conflitos on public.manutencoes_conflitos
  for update to authenticated
  using (public.usuario_tem_papel(array['administrador','gestor']::text[]))
  with check (public.usuario_tem_papel(array['administrador','gestor']::text[]));

create policy admin_gestor_ativo_select_pessoas on public.pessoas
  for select to authenticated
  using (public.usuario_tem_papel(array['administrador','gestor']::text[]));
create policy admin_gestor_ativo_insert_pessoas on public.pessoas
  for insert to authenticated
  with check (public.usuario_tem_papel(array['administrador','gestor']::text[]));
create policy admin_gestor_ativo_update_pessoas on public.pessoas
  for update to authenticated
  using (public.usuario_tem_papel(array['administrador','gestor']::text[]))
  with check (public.usuario_tem_papel(array['administrador','gestor']::text[]));

create policy admin_gestor_ativo_select_tarefas on public.tarefas
  for select to authenticated
  using (public.usuario_tem_papel(array['administrador','gestor']::text[]));
create policy admin_gestor_ativo_insert_tarefas on public.tarefas
  for insert to authenticated
  with check (public.usuario_tem_papel(array['administrador','gestor']::text[]));
create policy admin_gestor_ativo_update_tarefas on public.tarefas
  for update to authenticated
  using (public.usuario_tem_papel(array['administrador','gestor']::text[]))
  with check (public.usuario_tem_papel(array['administrador','gestor']::text[]));

create policy admin_gestor_ativo_select_roleta_distribuicoes on public.roleta_distribuicoes
  for select to authenticated
  using (public.usuario_tem_papel(array['administrador','gestor']::text[]));
create policy admin_gestor_ativo_insert_roleta_distribuicoes on public.roleta_distribuicoes
  for insert to authenticated
  with check (public.usuario_tem_papel(array['administrador','gestor']::text[]));
create policy admin_gestor_ativo_update_roleta_distribuicoes on public.roleta_distribuicoes
  for update to authenticated
  using (public.usuario_tem_papel(array['administrador','gestor']::text[]))
  with check (public.usuario_tem_papel(array['administrador','gestor']::text[]));

commit;

-- Verificacao somente leitura sugerida apos aplicacao manual:
-- select tablename, policyname, cmd, roles, qual, with_check
-- from pg_catalog.pg_policies
-- where schemaname = 'public'
--   and tablename in ('atendimentos','corretores','ia_conhecimento','ia_conversas','imoveis','leads','manutencoes_conflitos','pessoas','tarefas','roleta_distribuicoes')
-- order by tablename, cmd, policyname;
--
-- select table_name, grantee, privilege_type
-- from information_schema.role_table_grants
-- where table_schema = 'public'
--   and grantee in ('anon','authenticated')
--   and table_name in ('atendimentos','corretores','ia_conhecimento','ia_conversas','imoveis','leads','manutencoes_conflitos','pessoas','tarefas','roleta_distribuicoes')
-- order by table_name, grantee, privilege_type;
