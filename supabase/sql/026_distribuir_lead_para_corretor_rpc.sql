-- Sprint 2H1: distribuicao atomica de Lead para Pessoa-corretora.

begin;

-- Valida o contrato estrutural antes de alterar o schema ou criar a RPC.
do $$
declare
  v_colunas_ausentes text[];
begin
  if to_regclass('public.leads') is null
    or to_regclass('public.pessoas') is null
    or to_regclass('public.roleta_distribuicoes') is null
    or to_regclass('public.timeline') is null then
    raise exception 'Precondition failed: required CRM tables do not exist';
  end if;

  if to_regprocedure('public.usuario_tem_papel(text[])') is null then
    raise exception 'Precondition failed: authorization helper does not exist';
  end if;

  select array_agg(required.table_name || '.' || required.column_name order by required.table_name, required.column_name)
    into v_colunas_ausentes
  from (
    values
      ('leads', 'id', 'uuid'),
      ('leads', 'etapa_funil', 'text'),
      ('leads', 'status_operacional', 'text'),
      ('leads', 'status', 'text'),
      ('leads', 'responsavel_id', 'uuid'),
      ('leads', 'responsavel', 'text'),
      ('leads', 'atribuido_em', 'timestamp with time zone'),
      ('leads', 'handoff_status', 'text'),
      ('pessoas', 'id', 'uuid'),
      ('pessoas', 'nome', 'text'),
      ('pessoas', 'ativo', 'boolean'),
      ('pessoas', 'papeis', 'text[]'),
      ('roleta_distribuicoes', 'lead_id', 'uuid'),
      ('roleta_distribuicoes', 'corretor_id', 'uuid'),
      ('roleta_distribuicoes', 'criterio', 'text'),
      ('roleta_distribuicoes', 'motivo', 'text'),
      ('roleta_distribuicoes', 'status', 'text'),
      ('timeline', 'lead_id', 'uuid'),
      ('timeline', 'tipo', 'text'),
      ('timeline', 'titulo', 'text'),
      ('timeline', 'descricao', 'text'),
      ('timeline', 'origem', 'text')
  ) as required(table_name, column_name, data_type)
  where not exists (
    select 1
    from pg_catalog.pg_attribute attribute
    join pg_catalog.pg_class relation on relation.oid = attribute.attrelid
    join pg_catalog.pg_namespace namespace on namespace.oid = relation.relnamespace
    where namespace.nspname = 'public'
      and relation.relname = required.table_name
      and attribute.attname = required.column_name
      and not attribute.attisdropped
      and pg_catalog.format_type(attribute.atttypid, attribute.atttypmod) = required.data_type
  );

  if v_colunas_ausentes is not null then
    raise exception 'Precondition failed: required CRM columns are missing or incompatible: %',
      array_to_string(v_colunas_ausentes, ', ');
  end if;
end
$$;

alter table public.roleta_distribuicoes
  add column corretor_pessoa_id uuid;

alter table public.roleta_distribuicoes
  add constraint roleta_distribuicoes_corretor_pessoa_id_fkey
  foreign key (corretor_pessoa_id)
  references public.pessoas(id)
  on delete set null;

create index idx_roleta_distribuicoes_corretor_pessoa_id
  on public.roleta_distribuicoes (corretor_pessoa_id);

-- As migrations anteriores nao possuem indice equivalente para lead_id.
create index idx_roleta_distribuicoes_lead_id
  on public.roleta_distribuicoes (lead_id);

create or replace function public.distribuir_lead_para_corretor(
  p_lead_id uuid,
  p_corretor_pessoa_id uuid,
  p_motivo text default null
)
returns table (
  lead_id uuid,
  corretor_pessoa_id uuid,
  etapa_anterior text,
  etapa_atual text,
  distribuido_em timestamptz
)
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_etapa_anterior text;
  v_status_anterior text;
  v_responsavel_anterior uuid;
  v_corretor_nome text;
  v_corretor_ativo boolean;
  v_corretor_papeis text[];
  v_motivo text;
  v_distribuido_em timestamptz;
  v_descricao text;
begin
  if auth.uid() is null then
    raise exception using
      errcode = 'P0001',
      message = 'Operacao nao autorizada.';
  end if;

  if not public.usuario_tem_papel(array['administrador', 'gestor']::text[]) then
    raise exception using
      errcode = 'P0001',
      message = 'Operacao nao autorizada.';
  end if;

  if p_lead_id is null then
    raise exception using
      errcode = 'P0001',
      message = 'Lead nao informado.';
  end if;

  if p_corretor_pessoa_id is null then
    raise exception using
      errcode = 'P0001',
      message = 'Pessoa-corretora nao informada.';
  end if;

  v_motivo := nullif(btrim(p_motivo), '');
  if v_motivo is not null and char_length(v_motivo) > 500 then
    raise exception using
      errcode = 'P0001',
      message = 'Motivo excede o limite permitido.';
  end if;

  select
    lead.etapa_funil,
    lead.status_operacional,
    lead.responsavel_id
  into
    v_etapa_anterior,
    v_status_anterior,
    v_responsavel_anterior
  from public.leads as lead
  where lead.id = p_lead_id
  for update;

  if not found then
    raise exception using
      errcode = 'P0001',
      message = 'Lead nao encontrado.';
  end if;

  if v_status_anterior = 'arquivado' then
    raise exception using
      errcode = 'P0001',
      message = 'Lead inelegivel para distribuicao.';
  end if;

  if v_etapa_anterior is null
    or v_etapa_anterior not in (
      'novo',
      'qualificacao',
      'atendimento',
      'visita_avaliacao',
      'proposta',
      'negociacao',
      'documentacao',
      'fechado',
      'perdido'
    )
    or v_status_anterior is null
    or v_status_anterior not in ('ativo', 'convertido', 'perdido', 'arquivado') then
    raise exception using
      errcode = 'P0001',
      message = 'Estado atual do Lead inconsistente.';
  end if;

  if (v_etapa_anterior = 'fechado' and v_status_anterior <> 'convertido')
    or (v_etapa_anterior = 'perdido' and v_status_anterior <> 'perdido')
    or (
      v_etapa_anterior in (
        'novo',
        'qualificacao',
        'atendimento',
        'visita_avaliacao',
        'proposta',
        'negociacao',
        'documentacao'
      )
      and v_status_anterior <> 'ativo'
    ) then
    raise exception using
      errcode = 'P0001',
      message = 'Estado atual do Lead inconsistente.';
  end if;

  if v_responsavel_anterior is not null then
    raise exception using
      errcode = 'P0001',
      message = 'Lead ja distribuido.';
  end if;

  if v_status_anterior <> 'ativo'
    or v_etapa_anterior not in ('novo', 'qualificacao') then
    raise exception using
      errcode = 'P0001',
      message = 'Lead inelegivel para distribuicao.';
  end if;

  select
    pessoa.nome,
    pessoa.ativo,
    pessoa.papeis
  into
    v_corretor_nome,
    v_corretor_ativo,
    v_corretor_papeis
  from public.pessoas as pessoa
  where pessoa.id = p_corretor_pessoa_id
  for share;

  if not found then
    raise exception using
      errcode = 'P0001',
      message = 'Pessoa-corretora nao encontrada.';
  end if;

  if v_corretor_ativo is distinct from true then
    raise exception using
      errcode = 'P0001',
      message = 'Pessoa-corretora inativa.';
  end if;

  if not ('corretor' = any(coalesce(v_corretor_papeis, array[]::text[]))) then
    raise exception using
      errcode = 'P0001',
      message = 'Pessoa sem papel corretor.';
  end if;

  v_corretor_nome := btrim(v_corretor_nome);
  if v_corretor_nome is null or v_corretor_nome = '' then
    raise exception using
      errcode = 'P0001',
      message = 'Pessoa-corretora invalida.';
  end if;

  v_distribuido_em := pg_catalog.now();

  update public.leads as lead
  set
    responsavel_id = p_corretor_pessoa_id,
    responsavel = v_corretor_nome,
    atribuido_em = v_distribuido_em,
    etapa_funil = 'atendimento',
    status_operacional = 'ativo',
    status = 'corretor',
    handoff_status = 'humano'
  where lead.id = p_lead_id;

  begin
    insert into public.roleta_distribuicoes (
      lead_id,
      corretor_pessoa_id,
      corretor_id,
      criterio,
      motivo,
      status
    )
    values (
      p_lead_id,
      p_corretor_pessoa_id,
      null,
      'manual',
      v_motivo,
      'distribuido'
    );
  exception
    when others then
      raise exception using
        errcode = 'P0001',
        message = 'Falha ao registrar historico da Roleta.';
  end;

  v_descricao := format(
    'Lead distribuido para Pessoa-corretora e movido de %s para atendimento.%s',
    v_etapa_anterior,
    case
      when v_motivo is null then ''
      else format(' Motivo: %s', v_motivo)
    end
  );

  -- Timeline ainda nao possui identidade canonica da Pessoa-corretora.
  -- corretor_id legado permanece nulo e nao recebe pessoas.id.
  begin
    insert into public.timeline (
      tipo,
      titulo,
      descricao,
      lead_id,
      origem
    )
    values (
      'lead_distribuido',
      'Lead distribuido pela Roleta',
      v_descricao,
      p_lead_id,
      'rpc_distribuir_lead'
    );
  exception
    when others then
      raise exception using
        errcode = 'P0001',
        message = 'Falha ao registrar Timeline da distribuicao.';
  end;

  return query
  select
    p_lead_id,
    p_corretor_pessoa_id,
    v_etapa_anterior,
    'atendimento'::text,
    v_distribuido_em;
exception
  when sqlstate 'P0001' then
    raise;
  when others then
    raise exception using
      errcode = 'P0001',
      message = 'Nao foi possivel distribuir o Lead.';
end;
$$;

revoke all privileges on function public.distribuir_lead_para_corretor(uuid, uuid, text)
  from public;
revoke all privileges on function public.distribuir_lead_para_corretor(uuid, uuid, text)
  from anon;
grant execute on function public.distribuir_lead_para_corretor(uuid, uuid, text)
  to authenticated;

commit;

-- TESTES PLANEJADOS, NAO EXECUTADOS:
-- 1. Sem sessao ou perfil ativo: negar.
-- 2. Perfil diferente de administrador/gestor: negar.
-- 3. Administrador e gestor ativos: permitir casos elegiveis.
-- 4. Lead inexistente: falhar sem revelar identificador.
-- 5. Lead arquivado, perdido, convertido ou fechado: negar.
-- 6. Lead ja atribuido: negar como distribuicao duplicada.
-- 7. Lead em etapa diferente de novo/qualificacao: negar.
-- 8. Pessoa inexistente: negar.
-- 9. Pessoa inativa: negar.
-- 10. Pessoa sem papel corretor: negar.
-- 11. Distribuir Lead novo: atribuir e mover para atendimento.
-- 12. Distribuir Lead em qualificacao: atribuir e mover para atendimento.
-- 13. Falha no INSERT da Roleta: reverter Lead e nao criar Timeline.
-- 14. Falha no INSERT da Timeline: reverter Lead e Roleta.
-- 15. Duas distribuicoes simultaneas: a segunda deve falhar apos o lock.
-- 16. Motivo acima de 500 caracteres: negar antes de qualquer escrita.

-- CONSULTAS MANUAIS INDEPENDENTES DE VERIFICACAO.

-- Registrar antes e repetir depois da migration; os totais devem ser identicos.
-- select
--   (select count(*) from public.leads) as leads_total,
--   (select count(*) from public.roleta_distribuicoes) as roleta_total,
--   (select count(*) from public.timeline) as timeline_total;

-- Nova coluna e nullabilidade.
-- select column_name, data_type, is_nullable, column_default
-- from information_schema.columns
-- where table_schema = 'public'
--   and table_name = 'roleta_distribuicoes'
--   and column_name = 'corretor_pessoa_id';

-- FK canonica.
-- select conname, pg_get_constraintdef(oid) as definition
-- from pg_catalog.pg_constraint
-- where conrelid = 'public.roleta_distribuicoes'::regclass
--   and conname = 'roleta_distribuicoes_corretor_pessoa_id_fkey';

-- Indices de corretor canonico e Lead.
-- select indexname, indexdef
-- from pg_catalog.pg_indexes
-- where schemaname = 'public'
--   and tablename = 'roleta_distribuicoes'
--   and indexname in (
--     'idx_roleta_distribuicoes_corretor_pessoa_id',
--     'idx_roleta_distribuicoes_lead_id'
--   )
-- order by indexname;

-- Assinatura e definicao completa da RPC.
-- select to_regprocedure(
--   'public.distribuir_lead_para_corretor(uuid,uuid,text)'
-- ) as rpc;
-- select pg_get_functiondef(
--   'public.distribuir_lead_para_corretor(uuid,uuid,text)'::regprocedure
-- );

-- Privilegios esperados: somente authenticated recebe EXECUTE alem do owner.
-- select grantee, privilege_type
-- from information_schema.routine_privileges
-- where routine_schema = 'public'
--   and routine_name = 'distribuir_lead_para_corretor'
-- order by grantee, privilege_type;

-- RLS e policies permanecem inalterados nas tres tabelas operacionais.
-- select relation.relname, relation.relrowsecurity, relation.relforcerowsecurity
-- from pg_catalog.pg_class relation
-- where relation.oid in (
--   'public.leads'::regclass,
--   'public.roleta_distribuicoes'::regclass,
--   'public.timeline'::regclass
-- )
-- order by relation.relname;
-- select schemaname, tablename, policyname, cmd, roles
-- from pg_catalog.pg_policies
-- where schemaname = 'public'
--   and tablename in ('leads', 'roleta_distribuicoes', 'timeline')
-- order by tablename, policyname;

-- ROLLBACK MANUAL DOCUMENTADO, NAO AUTOMATICO:
-- Antes de uso real, remover nesta ordem: RPC, indice do corretor canonico,
-- indice de lead criado nesta migration, FK e coluna corretor_pessoa_id.
-- Apos uso real, corrigir por nova migration e preservar todo o historico.
