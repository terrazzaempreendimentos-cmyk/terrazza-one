-- Sprint 2H5A: reatribuicao atomica e auditavel de Leads.

begin;

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

  if exists (
    select 1 from pg_catalog.pg_attribute
    where attrelid = 'public.roleta_distribuicoes'::regclass
      and attname in ('corretor_anterior_pessoa_id', 'reatribuido_em')
      and not attisdropped
  ) then
    raise exception 'Precondition failed: reassignment columns already exist';
  end if;

  select array_agg(required.table_name || '.' || required.column_name order by required.table_name, required.column_name)
    into v_colunas_ausentes
  from (
    values
      ('leads', 'id', 'uuid'),
      ('leads', 'responsavel_id', 'uuid'),
      ('leads', 'responsavel', 'text'),
      ('leads', 'atribuido_em', 'timestamp with time zone'),
      ('leads', 'etapa_funil', 'text'),
      ('leads', 'status_operacional', 'text'),
      ('leads', 'status', 'text'),
      ('leads', 'handoff_status', 'text'),
      ('pessoas', 'id', 'uuid'),
      ('pessoas', 'nome', 'text'),
      ('pessoas', 'ativo', 'boolean'),
      ('pessoas', 'papeis', 'text[]'),
      ('roleta_distribuicoes', 'lead_id', 'uuid'),
      ('roleta_distribuicoes', 'corretor_pessoa_id', 'uuid'),
      ('roleta_distribuicoes', 'corretor_id', 'uuid'),
      ('roleta_distribuicoes', 'criterio', 'text'),
      ('roleta_distribuicoes', 'motivo', 'text'),
      ('roleta_distribuicoes', 'status', 'text'),
      ('roleta_distribuicoes', 'created_at', 'timestamp with time zone'),
      ('timeline', 'tipo', 'text'),
      ('timeline', 'titulo', 'text'),
      ('timeline', 'descricao', 'text'),
      ('timeline', 'lead_id', 'uuid'),
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
    raise exception 'Precondition failed: required CRM columns are missing or incompatible: %', array_to_string(v_colunas_ausentes, ', ');
  end if;

  if to_regprocedure('public.movimentar_lead_funil(uuid,text,text)') is null
    or to_regprocedure('public.distribuir_lead_para_corretor(uuid,uuid,text)') is null
    or to_regprocedure('public.distribuir_lead_roleta_automatica(uuid,text)') is null then
    raise exception 'Precondition failed: existing Lead RPCs are missing';
  end if;
end
$$;

alter table public.roleta_distribuicoes
  add column corretor_anterior_pessoa_id uuid,
  add column reatribuido_em timestamptz;

alter table public.roleta_distribuicoes
  add constraint roleta_distribuicoes_corretor_anterior_pessoa_id_fkey
  foreign key (corretor_anterior_pessoa_id)
  references public.pessoas(id)
  on delete set null;

-- lead_id e corretor_pessoa_id ja possuem indices criados na migration 026.
create index idx_roleta_distribuicoes_corretor_anterior_pessoa_id
  on public.roleta_distribuicoes (corretor_anterior_pessoa_id)
  where corretor_anterior_pessoa_id is not null;

create index idx_roleta_distribuicoes_reatribuido_em
  on public.roleta_distribuicoes (reatribuido_em desc)
  where reatribuido_em is not null;

create function public.reatribuir_lead_corretor(
  p_lead_id uuid,
  p_responsavel_esperado_id uuid,
  p_novo_corretor_pessoa_id uuid,
  p_motivo text
)
returns table (
  lead_id uuid,
  corretor_anterior_pessoa_id uuid,
  corretor_atual_pessoa_id uuid,
  etapa_atual text,
  status_operacional text,
  reatribuido_em timestamptz
)
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_responsavel_atual uuid;
  v_etapa_atual text;
  v_status_operacional text;
  v_novo_corretor_nome text;
  v_novo_corretor_ativo boolean;
  v_novo_corretor_papeis text[];
  v_motivo text;
  v_reatribuido_em timestamptz;
  v_linhas_atualizadas integer;
  v_descricao text;
begin
  if auth.uid() is null
    or not public.usuario_tem_papel(array['administrador', 'gestor']::text[]) then
    raise exception using errcode = 'P0001', message = 'Operacao nao autorizada.';
  end if;

  if p_lead_id is null then
    raise exception using errcode = 'P0001', message = 'Lead nao informado.';
  end if;
  if p_responsavel_esperado_id is null then
    raise exception using errcode = 'P0001', message = 'Responsavel esperado nao informado.';
  end if;
  if p_novo_corretor_pessoa_id is null then
    raise exception using errcode = 'P0001', message = 'Nova Pessoa-corretora nao informada.';
  end if;

  v_motivo := nullif(btrim(p_motivo), '');
  if v_motivo is null then
    raise exception using errcode = 'P0001', message = 'Motivo obrigatorio.';
  end if;
  if char_length(v_motivo) < 3 then
    raise exception using errcode = 'P0001', message = 'Motivo muito curto.';
  end if;
  if char_length(v_motivo) > 500 then
    raise exception using errcode = 'P0001', message = 'Motivo excede o limite permitido.';
  end if;

  select lead.responsavel_id, lead.etapa_funil, lead.status_operacional
    into v_responsavel_atual, v_etapa_atual, v_status_operacional
  from public.leads as lead
  where lead.id = p_lead_id
  for update;

  if not found then
    raise exception using errcode = 'P0001', message = 'Lead nao encontrado.';
  end if;
  if v_responsavel_atual is null then
    raise exception using errcode = 'P0001', message = 'Lead sem responsavel.';
  end if;
  if v_responsavel_atual <> p_responsavel_esperado_id then
    raise exception using errcode = 'P0001', message = 'Responsavel alterado por outra operacao.';
  end if;

  if v_etapa_atual is null
    or v_etapa_atual not in ('novo', 'qualificacao', 'atendimento', 'visita_avaliacao', 'proposta', 'negociacao', 'documentacao', 'fechado', 'perdido')
    or v_status_operacional is null
    or v_status_operacional not in ('ativo', 'convertido', 'perdido', 'arquivado')
    or (v_etapa_atual = 'fechado' and v_status_operacional <> 'convertido')
    or (v_etapa_atual = 'perdido' and v_status_operacional <> 'perdido')
    or (v_etapa_atual in ('novo', 'qualificacao', 'atendimento', 'visita_avaliacao', 'proposta', 'negociacao', 'documentacao') and v_status_operacional <> 'ativo') then
    raise exception using errcode = 'P0001', message = 'Estado atual do Lead inconsistente.';
  end if;

  if v_status_operacional <> 'ativo'
    or v_etapa_atual not in ('atendimento', 'visita_avaliacao', 'proposta', 'negociacao', 'documentacao') then
    raise exception using errcode = 'P0001', message = 'Lead inelegivel para reatribuicao.';
  end if;

  if p_novo_corretor_pessoa_id = v_responsavel_atual then
    raise exception using errcode = 'P0001', message = 'O novo responsavel deve ser diferente do atual.';
  end if;

  select pessoa.nome, pessoa.ativo, pessoa.papeis
    into v_novo_corretor_nome, v_novo_corretor_ativo, v_novo_corretor_papeis
  from public.pessoas as pessoa
  where pessoa.id = p_novo_corretor_pessoa_id
  for share;

  if not found then
    raise exception using errcode = 'P0001', message = 'Pessoa-corretora nao encontrada.';
  end if;
  if v_novo_corretor_ativo is distinct from true then
    raise exception using errcode = 'P0001', message = 'Pessoa-corretora inativa.';
  end if;
  if not ('corretor' = any(coalesce(v_novo_corretor_papeis, array[]::text[]))) then
    raise exception using errcode = 'P0001', message = 'Pessoa sem papel corretor.';
  end if;

  v_novo_corretor_nome := btrim(v_novo_corretor_nome);
  if v_novo_corretor_nome is null or v_novo_corretor_nome = '' then
    raise exception using errcode = 'P0001', message = 'Pessoa-corretora invalida.';
  end if;

  v_reatribuido_em := pg_catalog.clock_timestamp();

  update public.leads as lead
  set responsavel_id = p_novo_corretor_pessoa_id,
      responsavel = v_novo_corretor_nome,
      atribuido_em = v_reatribuido_em
  where lead.id = p_lead_id;

  get diagnostics v_linhas_atualizadas = row_count;
  if v_linhas_atualizadas <> 1 then
    raise exception using errcode = 'P0001', message = 'Nao foi possivel reatribuir o Lead.';
  end if;

  begin
    insert into public.roleta_distribuicoes (
      lead_id,
      corretor_anterior_pessoa_id,
      corretor_pessoa_id,
      corretor_id,
      criterio,
      motivo,
      status,
      reatribuido_em
    ) values (
      p_lead_id,
      v_responsavel_atual,
      p_novo_corretor_pessoa_id,
      null,
      'reatribuicao_manual',
      v_motivo,
      'distribuido',
      v_reatribuido_em
    );
  exception
    when others then
      raise exception using errcode = 'P0001', message = 'Falha ao registrar historico da reatribuicao.';
  end;

  v_descricao := format('Atendimento transferido entre Pessoas-corretoras. Motivo: %s', v_motivo);
  begin
    insert into public.timeline (tipo, titulo, descricao, lead_id, origem)
    values (
      'lead_reatribuido',
      'Atendimento transferido',
      v_descricao,
      p_lead_id,
      'rpc_reatribuir_lead'
    );
  exception
    when others then
      raise exception using errcode = 'P0001', message = 'Falha ao registrar Timeline da reatribuicao.';
  end;

  return query
  select p_lead_id, v_responsavel_atual, p_novo_corretor_pessoa_id,
    v_etapa_atual, v_status_operacional, v_reatribuido_em;
exception
  when sqlstate 'P0001' then raise;
  when others then
    raise exception using errcode = 'P0001', message = 'Nao foi possivel reatribuir o Lead.';
end;
$$;

revoke all privileges on function public.reatribuir_lead_corretor(uuid, uuid, uuid, text) from public;
revoke all privileges on function public.reatribuir_lead_corretor(uuid, uuid, uuid, text) from anon;
grant execute on function public.reatribuir_lead_corretor(uuid, uuid, uuid, text) to authenticated;

commit;

-- TESTES PLANEJADOS, NAO EXECUTADOS:
-- 1. Sem sessao; 2. perfil ausente/inativo; 3. corretor/atendimento negados.
-- 4. Administrador autorizado; 5. gestor autorizado.
-- 6. Motivo vazio; 7. motivo curto; 8. motivo excessivo.
-- 9. Lead inexistente; 10. Lead sem responsavel; 11. Lead arquivado.
-- 12. Lead perdido; 13. Lead convertido; 14. Lead fechado; 15. etapa inelegivel.
-- 16. Pessoa nova inexistente; 17. Pessoa nova inativa; 18. sem papel corretor.
-- 19. Mesmo responsavel; 20. responsavel esperado divergente.
-- 21. Reatribuicao valida; 22. etapa preservada; 23. status preservado.
-- 24. Historico anterior preservado; 25. novo historico criado; 26. Timeline criada.
-- 27. Falha no historico reverte Lead; 28. falha na Timeline reverte tudo.
-- 29. Duas reatribuicoes simultaneas: segunda detecta fotografia divergente.
-- 30. Pessoa fora da Roleta automatica pode receber transferencia manual autorizada.

-- CONSULTAS MANUAIS INDEPENDENTES DE VERIFICACAO.
-- Registrar antes e repetir depois; os totais devem permanecer identicos.
-- select (select count(*) from public.leads) leads,
--   (select count(*) from public.roleta_distribuicoes) roleta,
--   (select count(*) from public.timeline) timeline;

-- select column_name, data_type, is_nullable, column_default
-- from information_schema.columns
-- where table_schema = 'public' and table_name = 'roleta_distribuicoes'
--   and column_name in ('corretor_anterior_pessoa_id', 'reatribuido_em')
-- order by ordinal_position;
-- select conname, pg_get_constraintdef(oid) definition
-- from pg_catalog.pg_constraint
-- where conrelid = 'public.roleta_distribuicoes'::regclass
--   and conname = 'roleta_distribuicoes_corretor_anterior_pessoa_id_fkey';
-- select indexname, indexdef from pg_catalog.pg_indexes
-- where schemaname = 'public' and tablename = 'roleta_distribuicoes'
-- order by indexname;
-- select to_regprocedure('public.reatribuir_lead_corretor(uuid,uuid,uuid,text)') rpc;
-- select pg_get_functiondef('public.reatribuir_lead_corretor(uuid,uuid,uuid,text)'::regprocedure);
-- select p.prosecdef security_definer, p.proconfig function_config
-- from pg_catalog.pg_proc p
-- where p.oid = 'public.reatribuir_lead_corretor(uuid,uuid,uuid,text)'::regprocedure;
-- select grantee, privilege_type from information_schema.routine_privileges
-- where routine_schema = 'public' and routine_name = 'reatribuir_lead_corretor'
-- order by grantee, privilege_type;
-- select relrowsecurity, relforcerowsecurity from pg_catalog.pg_class
-- where oid = 'public.roleta_distribuicoes'::regclass;
-- select policyname, cmd, roles, qual, with_check from pg_catalog.pg_policies
-- where schemaname = 'public' and tablename = 'roleta_distribuicoes' order by policyname;
-- select grantee, privilege_type from information_schema.role_table_grants
-- where table_schema = 'public' and table_name = 'roleta_distribuicoes'
--   and (grantee = 'anon' or privilege_type in ('DELETE', 'TRUNCATE'));
-- select to_regprocedure('public.movimentar_lead_funil(uuid,text,text)') movimentar,
--   to_regprocedure('public.distribuir_lead_para_corretor(uuid,uuid,text)') distribuir_manual,
--   to_regprocedure('public.distribuir_lead_roleta_automatica(uuid,text)') distribuir_automatica;

-- ROLLBACK MANUAL, NAO EXECUTAR AUTOMATICAMENTE:
-- Antes de uso real: revogar EXECUTE, remover a RPC pela assinatura exata,
-- remover os dois indices, a FK e somente entao as duas colunas.
-- Depois de uso real: nao remover colunas nem historico; corrigir por migration nova.
