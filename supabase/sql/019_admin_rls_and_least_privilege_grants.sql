-- Sprint 0F1: acesso operacional inicial exclusivo do administrador ativo.
-- Esta migration preserva dados e aplica o principio do menor privilegio.

begin;

-- Falha antes de qualquer alteracao se o inventario confirmado nao estiver completo.
do $$
declare
  tabela text;
  ausentes text[] := array[]::text[];
begin
  foreach tabela in array array[
    'atendimentos',
    'corretores',
    'ia_conhecimento',
    'ia_conversas',
    'imoveis',
    'inquilinos',
    'leads',
    'manutencoes_conflitos',
    'pessoa_papeis',
    'pessoas',
    'proprietarios',
    'roleta_distribuicoes',
    'tarefas',
    'timeline',
    'uce_interactions',
    'uce_memories',
    'usuarios_perfis'
  ]
  loop
    if to_regclass(format('%I.%I', 'public', tabela)) is null then
      ausentes := array_append(ausentes, tabela);
    end if;
  end loop;

  if cardinality(ausentes) > 0 then
    raise exception 'Sprint 0F1 abortada: tabelas public obrigatorias ausentes: %',
      array_to_string(ausentes, ', ');
  end if;
end;
$$;

-- SECURITY DEFINER evita recursao na RLS de usuarios_perfis. A funcao aceita
-- somente papeis e sempre consulta o usuario da sessao por auth.uid().
create or replace function public.usuario_tem_papel(papeis text[])
returns boolean
language sql
stable
security definer
set search_path = pg_catalog
as $$
  select coalesce(
    exists (
      select 1
      from public.usuarios_perfis as perfil
      where perfil.user_id = auth.uid()
        and perfil.ativo = true
        and perfil.papel = any(coalesce(papeis, array[]::text[]))
    ),
    false
  );
$$;

revoke all privileges on function public.usuario_tem_papel(text[]) from public;
revoke all privileges on function public.usuario_tem_papel(text[]) from anon;
grant execute on function public.usuario_tem_papel(text[]) to authenticated;

-- Remove todos os grants legados, inclusive privilegios perigosos que nao sao
-- controlados por RLS. Nenhum privilegio sera devolvido a anon.
revoke all privileges on table
  public.atendimentos,
  public.corretores,
  public.ia_conhecimento,
  public.ia_conversas,
  public.imoveis,
  public.inquilinos,
  public.leads,
  public.manutencoes_conflitos,
  public.pessoa_papeis,
  public.pessoas,
  public.proprietarios,
  public.roleta_distribuicoes,
  public.tarefas,
  public.timeline,
  public.uce_interactions,
  public.uce_memories
from anon;

revoke all privileges on table
  public.atendimentos,
  public.corretores,
  public.ia_conhecimento,
  public.ia_conversas,
  public.imoveis,
  public.inquilinos,
  public.leads,
  public.manutencoes_conflitos,
  public.pessoa_papeis,
  public.pessoas,
  public.proprietarios,
  public.roleta_distribuicoes,
  public.tarefas,
  public.timeline,
  public.uce_interactions,
  public.uce_memories
from authenticated;

-- Leitura administrativa das 16 tabelas confirmadas.
grant select on table
  public.atendimentos,
  public.corretores,
  public.ia_conhecimento,
  public.ia_conversas,
  public.imoveis,
  public.inquilinos,
  public.leads,
  public.manutencoes_conflitos,
  public.pessoa_papeis,
  public.pessoas,
  public.proprietarios,
  public.roleta_distribuicoes,
  public.tarefas,
  public.timeline,
  public.uce_interactions,
  public.uce_memories
to authenticated;

-- Escrita somente nas tabelas em que o codigo cria registros.
grant insert on table
  public.ia_conhecimento,
  public.ia_conversas,
  public.imoveis,
  public.leads,
  public.manutencoes_conflitos,
  public.pessoas,
  public.roleta_distribuicoes,
  public.tarefas,
  public.timeline,
  public.uce_interactions,
  public.uce_memories
to authenticated;

-- Edicao e arquivamento logico somente onde o codigo executa UPDATE.
grant update on table
  public.corretores,
  public.ia_conversas,
  public.imoveis,
  public.leads,
  public.manutencoes_conflitos,
  public.pessoas
to authenticated;

-- Mantem usuarios_perfis somente leitura para o proprio usuario, conforme 018.
revoke all privileges on table public.usuarios_perfis from anon;
revoke all privileges on table public.usuarios_perfis from authenticated;
grant select on table public.usuarios_perfis to authenticated;

alter table public.atendimentos enable row level security;
alter table public.corretores enable row level security;
alter table public.ia_conhecimento enable row level security;
alter table public.ia_conversas enable row level security;
alter table public.imoveis enable row level security;
alter table public.inquilinos enable row level security;
alter table public.leads enable row level security;
alter table public.manutencoes_conflitos enable row level security;
alter table public.pessoa_papeis enable row level security;
alter table public.pessoas enable row level security;
alter table public.proprietarios enable row level security;
alter table public.roleta_distribuicoes enable row level security;
alter table public.tarefas enable row level security;
alter table public.timeline enable row level security;
alter table public.uce_interactions enable row level security;
alter table public.uce_memories enable row level security;

-- Remove somente policies pertencentes a esta migration.
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
drop policy if exists admin_ativo_select_inquilinos on public.inquilinos;
drop policy if exists admin_ativo_select_leads on public.leads;
drop policy if exists admin_ativo_insert_leads on public.leads;
drop policy if exists admin_ativo_update_leads on public.leads;
drop policy if exists admin_ativo_select_manutencoes_conflitos on public.manutencoes_conflitos;
drop policy if exists admin_ativo_insert_manutencoes_conflitos on public.manutencoes_conflitos;
drop policy if exists admin_ativo_update_manutencoes_conflitos on public.manutencoes_conflitos;
drop policy if exists admin_ativo_select_pessoa_papeis on public.pessoa_papeis;
drop policy if exists admin_ativo_select_pessoas on public.pessoas;
drop policy if exists admin_ativo_insert_pessoas on public.pessoas;
drop policy if exists admin_ativo_update_pessoas on public.pessoas;
drop policy if exists admin_ativo_select_proprietarios on public.proprietarios;
drop policy if exists admin_ativo_select_roleta_distribuicoes on public.roleta_distribuicoes;
drop policy if exists admin_ativo_insert_roleta_distribuicoes on public.roleta_distribuicoes;
drop policy if exists admin_ativo_select_tarefas on public.tarefas;
drop policy if exists admin_ativo_insert_tarefas on public.tarefas;
drop policy if exists admin_ativo_select_timeline on public.timeline;
drop policy if exists admin_ativo_insert_timeline on public.timeline;
drop policy if exists admin_ativo_select_uce_interactions on public.uce_interactions;
drop policy if exists admin_ativo_insert_uce_interactions on public.uce_interactions;
drop policy if exists admin_ativo_select_uce_memories on public.uce_memories;
drop policy if exists admin_ativo_insert_uce_memories on public.uce_memories;

create policy admin_ativo_select_atendimentos
  on public.atendimentos for select to authenticated
  using (public.usuario_tem_papel(array['administrador']::text[]));

create policy admin_ativo_select_corretores
  on public.corretores for select to authenticated
  using (public.usuario_tem_papel(array['administrador']::text[]));
create policy admin_ativo_update_corretores
  on public.corretores for update to authenticated
  using (public.usuario_tem_papel(array['administrador']::text[]))
  with check (public.usuario_tem_papel(array['administrador']::text[]));

create policy admin_ativo_select_ia_conhecimento
  on public.ia_conhecimento for select to authenticated
  using (public.usuario_tem_papel(array['administrador']::text[]));
create policy admin_ativo_insert_ia_conhecimento
  on public.ia_conhecimento for insert to authenticated
  with check (public.usuario_tem_papel(array['administrador']::text[]));

create policy admin_ativo_select_ia_conversas
  on public.ia_conversas for select to authenticated
  using (public.usuario_tem_papel(array['administrador']::text[]));
create policy admin_ativo_insert_ia_conversas
  on public.ia_conversas for insert to authenticated
  with check (public.usuario_tem_papel(array['administrador']::text[]));
create policy admin_ativo_update_ia_conversas
  on public.ia_conversas for update to authenticated
  using (public.usuario_tem_papel(array['administrador']::text[]))
  with check (public.usuario_tem_papel(array['administrador']::text[]));

create policy admin_ativo_select_imoveis
  on public.imoveis for select to authenticated
  using (public.usuario_tem_papel(array['administrador']::text[]));
create policy admin_ativo_insert_imoveis
  on public.imoveis for insert to authenticated
  with check (public.usuario_tem_papel(array['administrador']::text[]));
create policy admin_ativo_update_imoveis
  on public.imoveis for update to authenticated
  using (public.usuario_tem_papel(array['administrador']::text[]))
  with check (public.usuario_tem_papel(array['administrador']::text[]));

create policy admin_ativo_select_inquilinos
  on public.inquilinos for select to authenticated
  using (public.usuario_tem_papel(array['administrador']::text[]));

create policy admin_ativo_select_leads
  on public.leads for select to authenticated
  using (public.usuario_tem_papel(array['administrador']::text[]));
create policy admin_ativo_insert_leads
  on public.leads for insert to authenticated
  with check (public.usuario_tem_papel(array['administrador']::text[]));
create policy admin_ativo_update_leads
  on public.leads for update to authenticated
  using (public.usuario_tem_papel(array['administrador']::text[]))
  with check (public.usuario_tem_papel(array['administrador']::text[]));

create policy admin_ativo_select_manutencoes_conflitos
  on public.manutencoes_conflitos for select to authenticated
  using (public.usuario_tem_papel(array['administrador']::text[]));
create policy admin_ativo_insert_manutencoes_conflitos
  on public.manutencoes_conflitos for insert to authenticated
  with check (public.usuario_tem_papel(array['administrador']::text[]));
create policy admin_ativo_update_manutencoes_conflitos
  on public.manutencoes_conflitos for update to authenticated
  using (public.usuario_tem_papel(array['administrador']::text[]))
  with check (public.usuario_tem_papel(array['administrador']::text[]));

create policy admin_ativo_select_pessoa_papeis
  on public.pessoa_papeis for select to authenticated
  using (public.usuario_tem_papel(array['administrador']::text[]));

create policy admin_ativo_select_pessoas
  on public.pessoas for select to authenticated
  using (public.usuario_tem_papel(array['administrador']::text[]));
create policy admin_ativo_insert_pessoas
  on public.pessoas for insert to authenticated
  with check (public.usuario_tem_papel(array['administrador']::text[]));
create policy admin_ativo_update_pessoas
  on public.pessoas for update to authenticated
  using (public.usuario_tem_papel(array['administrador']::text[]))
  with check (public.usuario_tem_papel(array['administrador']::text[]));

create policy admin_ativo_select_proprietarios
  on public.proprietarios for select to authenticated
  using (public.usuario_tem_papel(array['administrador']::text[]));

create policy admin_ativo_select_roleta_distribuicoes
  on public.roleta_distribuicoes for select to authenticated
  using (public.usuario_tem_papel(array['administrador']::text[]));
create policy admin_ativo_insert_roleta_distribuicoes
  on public.roleta_distribuicoes for insert to authenticated
  with check (public.usuario_tem_papel(array['administrador']::text[]));

create policy admin_ativo_select_tarefas
  on public.tarefas for select to authenticated
  using (public.usuario_tem_papel(array['administrador']::text[]));
create policy admin_ativo_insert_tarefas
  on public.tarefas for insert to authenticated
  with check (public.usuario_tem_papel(array['administrador']::text[]));

create policy admin_ativo_select_timeline
  on public.timeline for select to authenticated
  using (public.usuario_tem_papel(array['administrador']::text[]));
create policy admin_ativo_insert_timeline
  on public.timeline for insert to authenticated
  with check (public.usuario_tem_papel(array['administrador']::text[]));

create policy admin_ativo_select_uce_interactions
  on public.uce_interactions for select to authenticated
  using (public.usuario_tem_papel(array['administrador']::text[]));
create policy admin_ativo_insert_uce_interactions
  on public.uce_interactions for insert to authenticated
  with check (public.usuario_tem_papel(array['administrador']::text[]));

create policy admin_ativo_select_uce_memories
  on public.uce_memories for select to authenticated
  using (public.usuario_tem_papel(array['administrador']::text[]));
create policy admin_ativo_insert_uce_memories
  on public.uce_memories for insert to authenticated
  with check (public.usuario_tem_papel(array['administrador']::text[]));

commit;
