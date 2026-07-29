-- Sprint 3A3A: criacao, assuncao e movimentacao de estados abertos de Atendimentos.

begin;

do $$
declare
  v_colunas_ausentes text[];
  v_constraints_ausentes text[];
begin
  if to_regclass('public.atendimentos') is null
    or to_regclass('public.leads') is null
    or to_regclass('public.pessoas') is null
    or to_regclass('public.timeline') is null then
    raise exception 'Precondition failed: required Atendimento tables do not exist';
  end if;

  if to_regprocedure('public.usuario_tem_papel(text[])') is null then
    raise exception 'Precondition failed: authorization helper does not exist';
  end if;

  if to_regprocedure('public.criar_atendimento_lead(uuid,text,text,text,text)') is not null
    or to_regprocedure('public.assumir_atendimento(uuid,timestamp with time zone)') is not null
    or to_regprocedure('public.alterar_estado_atendimento(uuid,text,text,timestamp with time zone,text,timestamp with time zone)') is not null then
    raise exception 'Precondition failed: one or more Atendimento RPCs already exist';
  end if;

  select array_agg(required.table_name || '.' || required.column_name order by required.table_name, required.column_name)
    into v_colunas_ausentes
  from (
    values
      ('atendimentos', 'id', 'uuid'),
      ('atendimentos', 'lead_id', 'uuid'),
      ('atendimentos', 'responsavel_id', 'uuid'),
      ('atendimentos', 'status', 'text'),
      ('atendimentos', 'prioridade', 'text'),
      ('atendimentos', 'canal', 'text'),
      ('atendimentos', 'origem', 'text'),
      ('atendimentos', 'assunto', 'text'),
      ('atendimentos', 'resumo', 'text'),
      ('atendimentos', 'criado_por_user_id', 'uuid'),
      ('atendimentos', 'iniciado_em', 'timestamp with time zone'),
      ('atendimentos', 'assumido_em', 'timestamp with time zone'),
      ('atendimentos', 'proxima_acao_em', 'timestamp with time zone'),
      ('atendimentos', 'created_at', 'timestamp with time zone'),
      ('atendimentos', 'updated_at', 'timestamp with time zone'),
      ('leads', 'id', 'uuid'),
      ('leads', 'responsavel_id', 'uuid'),
      ('leads', 'etapa_funil', 'text'),
      ('leads', 'status_operacional', 'text'),
      ('leads', 'canal', 'text'),
      ('pessoas', 'id', 'uuid'),
      ('pessoas', 'ativo', 'boolean'),
      ('pessoas', 'papeis', 'text[]'),
      ('timeline', 'tipo', 'text'),
      ('timeline', 'titulo', 'text'),
      ('timeline', 'descricao', 'text'),
      ('timeline', 'lead_id', 'uuid'),
      ('timeline', 'origem', 'text')
  ) as required(table_name, column_name, data_type)
  where not exists (
    select 1
    from pg_catalog.pg_attribute as attribute
    join pg_catalog.pg_class as relation on relation.oid = attribute.attrelid
    join pg_catalog.pg_namespace as namespace on namespace.oid = relation.relnamespace
    where namespace.nspname = 'public'
      and relation.relname = required.table_name
      and attribute.attname = required.column_name
      and not attribute.attisdropped
      and pg_catalog.format_type(attribute.atttypid, attribute.atttypmod) = required.data_type
  );

  if v_colunas_ausentes is not null then
    raise exception 'Precondition failed: required Atendimento columns are missing or incompatible: %', array_to_string(v_colunas_ausentes, ', ');
  end if;

  select array_agg(expected.name order by expected.name)
    into v_constraints_ausentes
  from unnest(array[
    'atendimentos_pkey',
    'atendimentos_proprietario_id_fkey',
    'atendimentos_lead_id_fkey',
    'atendimentos_responsavel_id_fkey',
    'atendimentos_atendimento_anterior_id_fkey',
    'atendimentos_criado_por_user_id_fkey',
    'atendimentos_encerrado_por_user_id_fkey',
    'atendimentos_status_check',
    'atendimentos_prioridade_check',
    'atendimentos_canal_check',
    'atendimentos_origem_check',
    'atendimentos_resultado_check',
    'atendimentos_assunto_length_check',
    'atendimentos_resumo_length_check',
    'atendimentos_observacoes_internas_length_check',
    'atendimentos_motivo_cancelamento_length_check',
    'atendimentos_resultado_detalhe_length_check',
    'atendimentos_reabertura_sem_autorreferencia_check',
    'atendimentos_encerramento_coerente_check',
    'atendimentos_assuncao_coerente_check'
  ]) as expected(name)
  where not exists (
    select 1 from pg_catalog.pg_constraint
    where conrelid = 'public.atendimentos'::regclass
      and conname = expected.name
  );

  if v_constraints_ausentes is not null then
    raise exception 'Precondition failed: migration 029 constraints are missing: %', array_to_string(v_constraints_ausentes, ', ');
  end if;

  if to_regclass('public.idx_atendimentos_lead_aberto_unico') is null
    or to_regprocedure('public.set_atendimentos_updated_at()') is null then
    raise exception 'Precondition failed: migration 029 uniqueness or updated_at structures are missing';
  end if;
end
$$;

create function public.criar_atendimento_lead(
  p_lead_id uuid,
  p_prioridade text default 'normal',
  p_canal text default null,
  p_assunto text default null,
  p_resumo text default null
)
returns table (
  atendimento_id uuid,
  lead_id uuid,
  responsavel_id uuid,
  status text,
  prioridade text,
  canal text,
  origem text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_user_id uuid;
  v_lead_etapa text;
  v_lead_status text;
  v_lead_responsavel_id uuid;
  v_lead_canal text;
  v_responsavel_ativo boolean;
  v_responsavel_papeis text[];
  v_prioridade text;
  v_canal text;
  v_assunto text;
  v_resumo text;
  v_atendimento_id uuid;
  v_created_at timestamptz;
  v_timeline_rows integer;
begin
  v_user_id := auth.uid();
  if v_user_id is null
    or not public.usuario_tem_papel(array['administrador', 'gestor']::text[]) then
    raise exception using errcode = 'P0001', message = 'Operacao nao autorizada.';
  end if;

  if p_lead_id is null then
    raise exception using errcode = 'P0001', message = 'Lead nao informado.';
  end if;

  v_prioridade := p_prioridade;
  if v_prioridade is null or v_prioridade not in ('baixa', 'normal', 'alta', 'urgente') then
    raise exception using errcode = 'P0001', message = 'Prioridade invalida.';
  end if;

  if p_canal is not null and (p_canal = '' or p_canal not in ('manual', 'whatsapp', 'email', 'site', 'instagram', 'facebook', 'portal', 'telefone', 'indicacao', 'outro')) then
    raise exception using errcode = 'P0001', message = 'Canal invalido.';
  end if;

  v_assunto := nullif(pg_catalog.btrim(p_assunto), '');
  v_resumo := nullif(pg_catalog.btrim(p_resumo), '');
  if v_assunto is not null and pg_catalog.char_length(v_assunto) > 160 then
    raise exception using errcode = 'P0001', message = 'Assunto excede o limite permitido.';
  end if;
  if v_resumo is not null and pg_catalog.char_length(v_resumo) > 2000 then
    raise exception using errcode = 'P0001', message = 'Resumo excede o limite permitido.';
  end if;

  select lead.etapa_funil, lead.status_operacional, lead.responsavel_id, lead.canal
    into v_lead_etapa, v_lead_status, v_lead_responsavel_id, v_lead_canal
  from public.leads as lead
  where lead.id = p_lead_id
  for update;

  if not found then
    raise exception using errcode = 'P0001', message = 'Lead nao encontrado.';
  end if;

  if v_lead_etapa is null
    or v_lead_etapa not in ('novo', 'qualificacao', 'atendimento', 'visita_avaliacao', 'proposta', 'negociacao', 'documentacao', 'fechado', 'perdido')
    or v_lead_status is null
    or v_lead_status not in ('ativo', 'convertido', 'perdido', 'arquivado')
    or (v_lead_etapa = 'fechado' and v_lead_status <> 'convertido')
    or (v_lead_etapa = 'perdido' and v_lead_status <> 'perdido')
    or (v_lead_etapa in ('novo', 'qualificacao', 'atendimento', 'visita_avaliacao', 'proposta', 'negociacao', 'documentacao') and v_lead_status <> 'ativo') then
    raise exception using errcode = 'P0001', message = 'Estado atual do Lead inconsistente.';
  end if;

  if v_lead_status <> 'ativo'
    or v_lead_etapa not in ('novo', 'qualificacao', 'atendimento', 'visita_avaliacao', 'proposta', 'negociacao', 'documentacao') then
    raise exception using errcode = 'P0001', message = 'Lead inelegivel para Atendimento.';
  end if;

  if v_lead_responsavel_id is not null then
    select pessoa.ativo, pessoa.papeis
      into v_responsavel_ativo, v_responsavel_papeis
    from public.pessoas as pessoa
    where pessoa.id = v_lead_responsavel_id;

    if not found then
      raise exception using errcode = 'P0001', message = 'Responsavel do Lead invalido.';
    end if;
    if v_responsavel_ativo is distinct from true then
      raise exception using errcode = 'P0001', message = 'Pessoa responsavel inativa.';
    end if;
    if not ('corretor' = any(coalesce(v_responsavel_papeis, array[]::text[]))) then
      raise exception using errcode = 'P0001', message = 'Pessoa sem papel corretor.';
    end if;
  end if;

  if exists (
    select 1 from public.atendimentos as atendimento
    where atendimento.lead_id = p_lead_id
      and atendimento.status in ('aguardando', 'em_atendimento', 'aguardando_cliente', 'aguardando_interno')
  ) then
    raise exception using errcode = 'P0001', message = 'Este Lead ja possui um Atendimento aberto.';
  end if;

  if p_canal is not null then
    v_canal := p_canal;
  elsif v_lead_canal in ('manual', 'whatsapp', 'site', 'instagram', 'facebook', 'portal', 'telefone', 'indicacao', 'outro') then
    v_canal := v_lead_canal;
  else
    v_canal := 'manual';
  end if;

  insert into public.atendimentos (
    lead_id,
    responsavel_id,
    status,
    prioridade,
    canal,
    origem,
    assunto,
    resumo,
    criado_por_user_id
  ) values (
    p_lead_id,
    v_lead_responsavel_id,
    'aguardando',
    v_prioridade,
    v_canal,
    'criacao_manual',
    v_assunto,
    v_resumo,
    v_user_id
  )
  returning id, atendimentos.created_at
    into v_atendimento_id, v_created_at;

  if v_atendimento_id is null or v_created_at is null then
    raise exception using errcode = 'P0001', message = 'Retorno inesperado do Atendimento.';
  end if;

  begin
    insert into public.timeline (tipo, titulo, descricao, lead_id, origem)
    values (
      'atendimento_criado',
      'Atendimento criado',
      'Atendimento criado para acompanhamento operacional.',
      p_lead_id,
      'rpc_criar_atendimento'
    );
    get diagnostics v_timeline_rows = row_count;
    if v_timeline_rows <> 1 then
      raise exception 'unexpected Timeline row count';
    end if;
  exception
    when others then
      raise exception using errcode = 'P0001', message = 'Falha ao registrar Timeline do Atendimento.';
  end;

  return query select
    v_atendimento_id,
    p_lead_id,
    v_lead_responsavel_id,
    'aguardando'::text,
    v_prioridade,
    v_canal,
    'criacao_manual'::text,
    v_created_at;
exception
  when unique_violation then
    raise exception using errcode = 'P0001', message = 'Este Lead ja possui um Atendimento aberto.';
  when sqlstate 'P0001' then raise;
  when others then
    raise exception using errcode = 'P0001', message = 'Nao foi possivel criar o Atendimento.';
end;
$$;

create function public.assumir_atendimento(
  p_atendimento_id uuid,
  p_updated_at_esperado timestamptz
)
returns table (
  atendimento_id uuid,
  lead_id uuid,
  responsavel_id uuid,
  status text,
  assumido_em timestamptz,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_lead_id uuid;
  v_responsavel_id uuid;
  v_status text;
  v_updated_at timestamptz;
  v_responsavel_ativo boolean;
  v_responsavel_papeis text[];
  v_operacao_em timestamptz;
  v_assumido_em timestamptz;
  v_updated_at_retorno timestamptz;
  v_timeline_rows integer;
begin
  if auth.uid() is null
    or not public.usuario_tem_papel(array['administrador', 'gestor']::text[]) then
    raise exception using errcode = 'P0001', message = 'Operacao nao autorizada.';
  end if;
  if p_atendimento_id is null then
    raise exception using errcode = 'P0001', message = 'Atendimento nao informado.';
  end if;
  if p_updated_at_esperado is null then
    raise exception using errcode = 'P0001', message = 'Atendimento atualizado por outra operacao.';
  end if;

  select atendimento.lead_id, atendimento.responsavel_id, atendimento.status, atendimento.updated_at
    into v_lead_id, v_responsavel_id, v_status, v_updated_at
  from public.atendimentos as atendimento
  where atendimento.id = p_atendimento_id
  for update;

  if not found then
    raise exception using errcode = 'P0001', message = 'Atendimento nao encontrado.';
  end if;
  if v_updated_at is distinct from p_updated_at_esperado then
    raise exception using errcode = 'P0001', message = 'Atendimento atualizado por outra operacao.';
  end if;
  if v_status <> 'aguardando' then
    raise exception using errcode = 'P0001', message = 'Atendimento ja assumido.';
  end if;
  if v_responsavel_id is null then
    raise exception using errcode = 'P0001', message = 'Atendimento sem responsavel.';
  end if;

  select pessoa.ativo, pessoa.papeis
    into v_responsavel_ativo, v_responsavel_papeis
  from public.pessoas as pessoa
  where pessoa.id = v_responsavel_id;

  if not found then
    raise exception using errcode = 'P0001', message = 'Responsavel do Lead invalido.';
  end if;
  if v_responsavel_ativo is distinct from true then
    raise exception using errcode = 'P0001', message = 'Pessoa responsavel inativa.';
  end if;
  if not ('corretor' = any(coalesce(v_responsavel_papeis, array[]::text[]))) then
    raise exception using errcode = 'P0001', message = 'Pessoa sem papel corretor.';
  end if;

  v_operacao_em := pg_catalog.clock_timestamp();
  update public.atendimentos as atendimento
  set
    status = 'em_atendimento',
    iniciado_em = coalesce(atendimento.iniciado_em, v_operacao_em),
    assumido_em = v_operacao_em
  where atendimento.id = p_atendimento_id
  returning atendimento.assumido_em, atendimento.updated_at
    into v_assumido_em, v_updated_at_retorno;

  if v_assumido_em is null or v_updated_at_retorno is null then
    raise exception using errcode = 'P0001', message = 'Retorno inesperado do Atendimento.';
  end if;

  begin
    insert into public.timeline (tipo, titulo, descricao, lead_id, origem)
    values (
      'atendimento_assumido',
      'Atendimento assumido',
      'Atendimento iniciado pela equipe responsavel.',
      v_lead_id,
      'rpc_assumir_atendimento'
    );
    get diagnostics v_timeline_rows = row_count;
    if v_timeline_rows <> 1 then
      raise exception 'unexpected Timeline row count';
    end if;
  exception
    when others then
      raise exception using errcode = 'P0001', message = 'Falha ao registrar Timeline do Atendimento.';
  end;

  return query select
    p_atendimento_id,
    v_lead_id,
    v_responsavel_id,
    'em_atendimento'::text,
    v_assumido_em,
    v_updated_at_retorno;
exception
  when sqlstate 'P0001' then raise;
  when others then
    raise exception using errcode = 'P0001', message = 'Nao foi possivel assumir o Atendimento.';
end;
$$;

create function public.alterar_estado_atendimento(
  p_atendimento_id uuid,
  p_status_esperado text,
  p_status_destino text,
  p_updated_at_esperado timestamptz,
  p_resumo text default null,
  p_proxima_acao_em timestamptz default null
)
returns table (
  atendimento_id uuid,
  lead_id uuid,
  responsavel_id uuid,
  status_anterior text,
  status_atual text,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_lead_id uuid;
  v_responsavel_id uuid;
  v_status_atual text;
  v_assumido_em timestamptz;
  v_updated_at timestamptz;
  v_resumo text;
  v_updated_at_retorno timestamptz;
  v_timeline_rows integer;
begin
  if auth.uid() is null
    or not public.usuario_tem_papel(array['administrador', 'gestor']::text[]) then
    raise exception using errcode = 'P0001', message = 'Operacao nao autorizada.';
  end if;
  if p_atendimento_id is null then
    raise exception using errcode = 'P0001', message = 'Atendimento nao informado.';
  end if;
  if p_status_esperado is null or p_status_esperado not in ('em_atendimento', 'aguardando_cliente', 'aguardando_interno') then
    raise exception using errcode = 'P0001', message = 'Status esperado invalido.';
  end if;
  if p_status_destino is null or p_status_destino not in ('em_atendimento', 'aguardando_cliente', 'aguardando_interno') then
    raise exception using errcode = 'P0001', message = 'Status de destino invalido.';
  end if;
  if p_status_esperado = p_status_destino then
    raise exception using errcode = 'P0001', message = 'O Atendimento ja esta nesta situacao.';
  end if;
  if p_updated_at_esperado is null then
    raise exception using errcode = 'P0001', message = 'Atendimento atualizado por outra operacao.';
  end if;

  v_resumo := nullif(pg_catalog.btrim(p_resumo), '');
  if v_resumo is not null and pg_catalog.char_length(v_resumo) > 2000 then
    raise exception using errcode = 'P0001', message = 'Resumo excede o limite permitido.';
  end if;

  if not (
    (p_status_esperado = 'em_atendimento' and p_status_destino in ('aguardando_cliente', 'aguardando_interno'))
    or (p_status_esperado = 'aguardando_cliente' and p_status_destino in ('em_atendimento', 'aguardando_interno'))
    or (p_status_esperado = 'aguardando_interno' and p_status_destino in ('em_atendimento', 'aguardando_cliente'))
  ) then
    raise exception using errcode = 'P0001', message = 'Transicao de Atendimento bloqueada.';
  end if;

  select atendimento.lead_id, atendimento.responsavel_id, atendimento.status, atendimento.assumido_em, atendimento.updated_at
    into v_lead_id, v_responsavel_id, v_status_atual, v_assumido_em, v_updated_at
  from public.atendimentos as atendimento
  where atendimento.id = p_atendimento_id
  for update;

  if not found then
    raise exception using errcode = 'P0001', message = 'Atendimento nao encontrado.';
  end if;
  if v_status_atual <> p_status_esperado or v_updated_at is distinct from p_updated_at_esperado then
    raise exception using errcode = 'P0001', message = 'Atendimento atualizado por outra operacao.';
  end if;
  if v_responsavel_id is null or v_assumido_em is null then
    raise exception using errcode = 'P0001', message = 'Atendimento sem responsavel.';
  end if;

  update public.atendimentos as atendimento
  set
    status = p_status_destino,
    resumo = coalesce(v_resumo, atendimento.resumo),
    proxima_acao_em = coalesce(p_proxima_acao_em, atendimento.proxima_acao_em)
  where atendimento.id = p_atendimento_id
  returning atendimento.updated_at into v_updated_at_retorno;

  if v_updated_at_retorno is null then
    raise exception using errcode = 'P0001', message = 'Retorno inesperado do Atendimento.';
  end if;

  begin
    insert into public.timeline (tipo, titulo, descricao, lead_id, origem)
    values (
      'atendimento_estado_alterado',
      'Estado do Atendimento alterado',
      pg_catalog.format('Estado alterado de %s para %s.', p_status_esperado, p_status_destino),
      v_lead_id,
      'rpc_alterar_estado_atendimento'
    );
    get diagnostics v_timeline_rows = row_count;
    if v_timeline_rows <> 1 then
      raise exception 'unexpected Timeline row count';
    end if;
  exception
    when others then
      raise exception using errcode = 'P0001', message = 'Falha ao registrar Timeline do Atendimento.';
  end;

  return query select
    p_atendimento_id,
    v_lead_id,
    v_responsavel_id,
    p_status_esperado,
    p_status_destino,
    v_updated_at_retorno;
exception
  when sqlstate 'P0001' then raise;
  when others then
    raise exception using errcode = 'P0001', message = 'Nao foi possivel alterar o estado do Atendimento.';
end;
$$;

revoke all privileges on function public.criar_atendimento_lead(uuid, text, text, text, text) from public;
revoke all privileges on function public.criar_atendimento_lead(uuid, text, text, text, text) from anon;
grant execute on function public.criar_atendimento_lead(uuid, text, text, text, text) to authenticated;

revoke all privileges on function public.assumir_atendimento(uuid, timestamptz) from public;
revoke all privileges on function public.assumir_atendimento(uuid, timestamptz) from anon;
grant execute on function public.assumir_atendimento(uuid, timestamptz) to authenticated;

revoke all privileges on function public.alterar_estado_atendimento(uuid, text, text, timestamptz, text, timestamptz) from public;
revoke all privileges on function public.alterar_estado_atendimento(uuid, text, text, timestamptz, text, timestamptz) from anon;
grant execute on function public.alterar_estado_atendimento(uuid, text, text, timestamptz, text, timestamptz) to authenticated;

commit;

-- CONSULTAS INDEPENDENTES DE VERIFICACAO (comentadas; nao fazem parte da transacao).
-- select (select count(*) from public.atendimentos) as atendimentos, (select count(*) from public.timeline) as timeline;
-- select to_regprocedure('public.criar_atendimento_lead(uuid,text,text,text,text)') as criar, to_regprocedure('public.assumir_atendimento(uuid,timestamp with time zone)') as assumir, to_regprocedure('public.alterar_estado_atendimento(uuid,text,text,timestamp with time zone,text,timestamp with time zone)') as alterar_estado;
-- select p.oid::regprocedure as assinatura, p.prosecdef as security_definer, p.proconfig as configuracao, pg_get_functiondef(p.oid) as definicao from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname in ('criar_atendimento_lead', 'assumir_atendimento', 'alterar_estado_atendimento') order by p.proname;
-- select routine_name, grantee, privilege_type from information_schema.routine_privileges where routine_schema = 'public' and routine_name in ('criar_atendimento_lead', 'assumir_atendimento', 'alterar_estado_atendimento') order by routine_name, grantee;
-- select relrowsecurity, relforcerowsecurity from pg_catalog.pg_class where oid in ('public.atendimentos'::regclass, 'public.timeline'::regclass) order by oid::regclass::text;
-- select tablename, policyname, cmd, roles, qual, with_check from pg_catalog.pg_policies where schemaname = 'public' and tablename in ('atendimentos', 'timeline') order by tablename, policyname;
-- select table_name, grantee, privilege_type from information_schema.role_table_grants where table_schema = 'public' and table_name in ('atendimentos', 'timeline') order by table_name, grantee, privilege_type;
-- select count(*) as direct_atendimentos_write_grants from information_schema.role_table_grants where table_schema = 'public' and table_name = 'atendimentos' and grantee in ('anon', 'authenticated') and privilege_type in ('INSERT', 'UPDATE', 'DELETE', 'TRUNCATE');
-- select count(*) as direct_timeline_update_delete_grants from information_schema.role_table_grants where table_schema = 'public' and table_name = 'timeline' and grantee in ('anon', 'authenticated') and privilege_type in ('UPDATE', 'DELETE', 'TRUNCATE');
-- A migration nao executa as RPCs: Atendimentos e Timeline devem manter as contagens registradas antes da aplicacao.

-- TESTES MANUAIS PLANEJADOS, NAO EXECUTADOS.
-- 1-13. Criacao: sessao/perfil, Lead, coerencia, prioridade, canal, textos,
-- responsavel, sem/com responsavel, duplicidade e rollback da Timeline.
-- 14-22. Assuncao: existencia, fotografia, status, responsavel/Pessoa, sucesso,
-- Timeline e concorrencia.
-- 23-34. Movimentacao: estados, mesma situacao, allowlist, fotografia, resumo,
-- tres transicoes, preservacao de resumo/proxima acao, Timeline e rollback.
