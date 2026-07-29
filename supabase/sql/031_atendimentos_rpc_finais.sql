-- Sprint 3A3B: conclusao, cancelamento e reabertura atomica de Atendimentos.

begin;

do $$
declare
  v_colunas_ausentes text[];
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

  if to_regprocedure('public.criar_atendimento_lead(uuid,text,text,text,text)') is null
    or to_regprocedure('public.assumir_atendimento(uuid,timestamp with time zone)') is null
    or to_regprocedure('public.alterar_estado_atendimento(uuid,text,text,timestamp with time zone,text,timestamp with time zone)') is null then
    raise exception 'Precondition failed: migration 030 RPCs are missing';
  end if;

  if to_regprocedure('public.concluir_atendimento(uuid,text,timestamp with time zone,text,text,text)') is not null
    or to_regprocedure('public.cancelar_atendimento(uuid,text,timestamp with time zone,text,text,text)') is not null
    or to_regprocedure('public.reabrir_atendimento(uuid,timestamp with time zone,text,text,text,text)') is not null then
    raise exception 'Precondition failed: one or more final Atendimento RPCs already exist';
  end if;

  if not exists (
    select 1 from pg_catalog.pg_constraint
    where conrelid = 'public.atendimentos'::regclass
      and conname = 'atendimentos_encerramento_coerente_check'
  ) or not exists (
    select 1 from pg_catalog.pg_constraint
    where conrelid = 'public.atendimentos'::regclass
      and conname = 'atendimentos_assuncao_coerente_check'
  ) then
    raise exception 'Precondition failed: migration 029 coherence constraints are missing';
  end if;

  if to_regclass('public.idx_atendimentos_lead_aberto_unico') is null then
    raise exception 'Precondition failed: unique open Atendimento index is missing';
  end if;

  select array_agg(required.table_name || '.' || required.column_name order by required.table_name, required.column_name)
    into v_colunas_ausentes
  from (
    values
      ('atendimentos', 'id', 'uuid'),
      ('atendimentos', 'lead_id', 'uuid'),
      ('atendimentos', 'responsavel_id', 'uuid'),
      ('atendimentos', 'atendimento_anterior_id', 'uuid'),
      ('atendimentos', 'status', 'text'),
      ('atendimentos', 'prioridade', 'text'),
      ('atendimentos', 'canal', 'text'),
      ('atendimentos', 'origem', 'text'),
      ('atendimentos', 'resultado', 'text'),
      ('atendimentos', 'resultado_detalhe', 'text'),
      ('atendimentos', 'motivo_cancelamento', 'text'),
      ('atendimentos', 'assunto', 'text'),
      ('atendimentos', 'resumo', 'text'),
      ('atendimentos', 'assumido_em', 'timestamp with time zone'),
      ('atendimentos', 'concluido_em', 'timestamp with time zone'),
      ('atendimentos', 'cancelado_em', 'timestamp with time zone'),
      ('atendimentos', 'proxima_acao_em', 'timestamp with time zone'),
      ('atendimentos', 'encerrado_por_user_id', 'uuid'),
      ('atendimentos', 'criado_por_user_id', 'uuid'),
      ('atendimentos', 'created_at', 'timestamp with time zone'),
      ('atendimentos', 'updated_at', 'timestamp with time zone'),
      ('leads', 'id', 'uuid'),
      ('leads', 'responsavel_id', 'uuid'),
      ('leads', 'etapa_funil', 'text'),
      ('leads', 'status_operacional', 'text'),
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
    raise exception 'Precondition failed: required final Atendimento columns are missing or incompatible: %', array_to_string(v_colunas_ausentes, ', ');
  end if;
end
$$;

alter table public.atendimentos
  drop constraint atendimentos_assuncao_coerente_check;

alter table public.atendimentos
  add constraint atendimentos_assuncao_coerente_check
  check (
    (status = 'aguardando' and assumido_em is null)
    or (status in ('em_atendimento', 'aguardando_cliente', 'aguardando_interno', 'concluido') and responsavel_id is not null and assumido_em is not null)
    or (status = 'cancelado' and (assumido_em is null or responsavel_id is not null))
  );

create function public.concluir_atendimento(
  p_atendimento_id uuid,
  p_status_esperado text,
  p_updated_at_esperado timestamptz,
  p_resultado text,
  p_resultado_detalhe text default null,
  p_resumo text default null
)
returns table (
  atendimento_id uuid,
  lead_id uuid,
  responsavel_id uuid,
  status_anterior text,
  status_atual text,
  resultado text,
  concluido_em timestamptz,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_user_id uuid;
  v_lead_id uuid;
  v_responsavel_id uuid;
  v_status_atual text;
  v_assumido_em timestamptz;
  v_updated_at timestamptz;
  v_resultado_detalhe text;
  v_resumo text;
  v_operacao_em timestamptz;
  v_concluido_em timestamptz;
  v_updated_at_retorno timestamptz;
  v_timeline_rows integer;
begin
  v_user_id := auth.uid();
  if v_user_id is null
    or not public.usuario_tem_papel(array['administrador', 'gestor']::text[]) then
    raise exception using errcode = 'P0001', message = 'Operacao nao autorizada.';
  end if;
  if p_atendimento_id is null then
    raise exception using errcode = 'P0001', message = 'Atendimento nao informado.';
  end if;
  if p_status_esperado is null or p_status_esperado not in ('aguardando', 'em_atendimento', 'aguardando_cliente', 'aguardando_interno', 'concluido', 'cancelado') then
    raise exception using errcode = 'P0001', message = 'Status esperado invalido.';
  end if;
  if p_updated_at_esperado is null then
    raise exception using errcode = 'P0001', message = 'Atendimento atualizado por outra operacao.';
  end if;
  if p_resultado is null or p_resultado = '' then
    raise exception using errcode = 'P0001', message = 'Resultado obrigatorio.';
  end if;
  if p_resultado not in ('qualificado', 'visita_agendada', 'proposta_iniciada', 'encaminhado_negocio', 'convertido', 'sem_interesse', 'sem_contato', 'outro') then
    raise exception using errcode = 'P0001', message = 'Resultado invalido.';
  end if;

  v_resultado_detalhe := nullif(pg_catalog.btrim(p_resultado_detalhe), '');
  v_resumo := nullif(pg_catalog.btrim(p_resumo), '');
  if v_resultado_detalhe is not null and pg_catalog.char_length(v_resultado_detalhe) > 2000 then
    raise exception using errcode = 'P0001', message = 'Detalhe do resultado excede o limite permitido.';
  end if;
  if v_resumo is not null and pg_catalog.char_length(v_resumo) > 2000 then
    raise exception using errcode = 'P0001', message = 'Resumo excede o limite permitido.';
  end if;

  select atendimento.lead_id, atendimento.responsavel_id, atendimento.status,
         atendimento.assumido_em, atendimento.updated_at
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
  if v_status_atual not in ('em_atendimento', 'aguardando_cliente', 'aguardando_interno')
    or v_responsavel_id is null or v_assumido_em is null then
    raise exception using errcode = 'P0001', message = 'Conclusao de Atendimento bloqueada.';
  end if;

  v_operacao_em := pg_catalog.clock_timestamp();
  update public.atendimentos as atendimento
  set
    status = 'concluido',
    resultado = p_resultado,
    resultado_detalhe = v_resultado_detalhe,
    resumo = coalesce(v_resumo, atendimento.resumo),
    concluido_em = v_operacao_em,
    cancelado_em = null,
    motivo_cancelamento = null,
    encerrado_por_user_id = v_user_id,
    proxima_acao_em = null
  where atendimento.id = p_atendimento_id
  returning atendimento.concluido_em, atendimento.updated_at
    into v_concluido_em, v_updated_at_retorno;

  if v_concluido_em is null or v_updated_at_retorno is null then
    raise exception using errcode = 'P0001', message = 'Retorno inesperado do Atendimento.';
  end if;

  begin
    insert into public.timeline (tipo, titulo, descricao, lead_id, origem)
    values (
      'atendimento_concluido',
      'Atendimento concluido',
      pg_catalog.format('Atendimento concluido com resultado %s.', p_resultado),
      v_lead_id,
      'rpc_concluir_atendimento'
    );
    get diagnostics v_timeline_rows = row_count;
    if v_timeline_rows <> 1 then raise exception 'unexpected Timeline row count'; end if;
  exception
    when others then
      raise exception using errcode = 'P0001', message = 'Falha ao registrar Timeline do Atendimento.';
  end;

  return query select p_atendimento_id, v_lead_id, v_responsavel_id,
    v_status_atual, 'concluido'::text, p_resultado, v_concluido_em, v_updated_at_retorno;
exception
  when sqlstate 'P0001' then raise;
  when others then
    raise exception using errcode = 'P0001', message = 'Nao foi possivel concluir o Atendimento.';
end;
$$;

create function public.cancelar_atendimento(
  p_atendimento_id uuid,
  p_status_esperado text,
  p_updated_at_esperado timestamptz,
  p_resultado text,
  p_motivo text,
  p_resultado_detalhe text default null
)
returns table (
  atendimento_id uuid,
  lead_id uuid,
  responsavel_id uuid,
  status_anterior text,
  status_atual text,
  resultado text,
  cancelado_em timestamptz,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_user_id uuid;
  v_lead_id uuid;
  v_responsavel_id uuid;
  v_status_atual text;
  v_updated_at timestamptz;
  v_motivo text;
  v_resultado_detalhe text;
  v_operacao_em timestamptz;
  v_cancelado_em timestamptz;
  v_updated_at_retorno timestamptz;
  v_timeline_rows integer;
begin
  v_user_id := auth.uid();
  if v_user_id is null
    or not public.usuario_tem_papel(array['administrador', 'gestor']::text[]) then
    raise exception using errcode = 'P0001', message = 'Operacao nao autorizada.';
  end if;
  if p_atendimento_id is null then
    raise exception using errcode = 'P0001', message = 'Atendimento nao informado.';
  end if;
  if p_status_esperado is null or p_status_esperado not in ('aguardando', 'em_atendimento', 'aguardando_cliente', 'aguardando_interno', 'concluido', 'cancelado') then
    raise exception using errcode = 'P0001', message = 'Status esperado invalido.';
  end if;
  if p_updated_at_esperado is null then
    raise exception using errcode = 'P0001', message = 'Atendimento atualizado por outra operacao.';
  end if;
  if p_resultado is null or p_resultado = '' then
    raise exception using errcode = 'P0001', message = 'Resultado obrigatorio.';
  end if;
  if p_resultado not in ('sem_interesse', 'sem_contato', 'atendimento_duplicado', 'cancelado_solicitante', 'outro') then
    raise exception using errcode = 'P0001', message = 'Resultado invalido.';
  end if;

  v_motivo := nullif(pg_catalog.btrim(p_motivo), '');
  v_resultado_detalhe := nullif(pg_catalog.btrim(p_resultado_detalhe), '');
  if v_motivo is null then
    raise exception using errcode = 'P0001', message = 'Motivo obrigatorio.';
  end if;
  if pg_catalog.char_length(v_motivo) < 3 then
    raise exception using errcode = 'P0001', message = 'Motivo muito curto.';
  end if;
  if pg_catalog.char_length(v_motivo) > 1000 then
    raise exception using errcode = 'P0001', message = 'Motivo excede o limite permitido.';
  end if;
  if v_resultado_detalhe is not null and pg_catalog.char_length(v_resultado_detalhe) > 2000 then
    raise exception using errcode = 'P0001', message = 'Detalhe do resultado excede o limite permitido.';
  end if;

  select atendimento.lead_id, atendimento.responsavel_id, atendimento.status, atendimento.updated_at
    into v_lead_id, v_responsavel_id, v_status_atual, v_updated_at
  from public.atendimentos as atendimento
  where atendimento.id = p_atendimento_id
  for update;

  if not found then
    raise exception using errcode = 'P0001', message = 'Atendimento nao encontrado.';
  end if;
  if v_status_atual <> p_status_esperado or v_updated_at is distinct from p_updated_at_esperado then
    raise exception using errcode = 'P0001', message = 'Atendimento atualizado por outra operacao.';
  end if;
  if v_status_atual not in ('aguardando', 'em_atendimento', 'aguardando_cliente', 'aguardando_interno') then
    raise exception using errcode = 'P0001', message = 'Cancelamento de Atendimento bloqueado.';
  end if;

  v_operacao_em := pg_catalog.clock_timestamp();
  update public.atendimentos as atendimento
  set
    status = 'cancelado',
    resultado = p_resultado,
    resultado_detalhe = v_resultado_detalhe,
    motivo_cancelamento = v_motivo,
    cancelado_em = v_operacao_em,
    concluido_em = null,
    encerrado_por_user_id = v_user_id,
    proxima_acao_em = null
  where atendimento.id = p_atendimento_id
  returning atendimento.cancelado_em, atendimento.updated_at
    into v_cancelado_em, v_updated_at_retorno;

  if v_cancelado_em is null or v_updated_at_retorno is null then
    raise exception using errcode = 'P0001', message = 'Retorno inesperado do Atendimento.';
  end if;

  begin
    insert into public.timeline (tipo, titulo, descricao, lead_id, origem)
    values (
      'atendimento_cancelado',
      'Atendimento cancelado',
      pg_catalog.format('Atendimento cancelado com resultado %s.', p_resultado),
      v_lead_id,
      'rpc_cancelar_atendimento'
    );
    get diagnostics v_timeline_rows = row_count;
    if v_timeline_rows <> 1 then raise exception 'unexpected Timeline row count'; end if;
  exception
    when others then
      raise exception using errcode = 'P0001', message = 'Falha ao registrar Timeline do Atendimento.';
  end;

  return query select p_atendimento_id, v_lead_id, v_responsavel_id,
    v_status_atual, 'cancelado'::text, p_resultado, v_cancelado_em, v_updated_at_retorno;
exception
  when sqlstate 'P0001' then raise;
  when others then
    raise exception using errcode = 'P0001', message = 'Nao foi possivel cancelar o Atendimento.';
end;
$$;

create function public.reabrir_atendimento(
  p_atendimento_id_anterior uuid,
  p_updated_at_esperado timestamptz,
  p_motivo text,
  p_prioridade text default null,
  p_assunto text default null,
  p_resumo text default null
)
returns table (
  atendimento_id uuid,
  atendimento_anterior_id uuid,
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
  v_lead_id uuid;
  v_status_anterior text;
  v_updated_at_anterior timestamptz;
  v_prioridade_anterior text;
  v_canal_anterior text;
  v_assunto_anterior text;
  v_lead_etapa text;
  v_lead_status text;
  v_lead_responsavel_id uuid;
  v_responsavel_ativo boolean;
  v_responsavel_papeis text[];
  v_motivo text;
  v_prioridade text;
  v_assunto_informado text;
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
  if p_atendimento_id_anterior is null then
    raise exception using errcode = 'P0001', message = 'Atendimento nao informado.';
  end if;
  if p_updated_at_esperado is null then
    raise exception using errcode = 'P0001', message = 'Atendimento atualizado por outra operacao.';
  end if;

  v_motivo := nullif(pg_catalog.btrim(p_motivo), '');
  if v_motivo is null then
    raise exception using errcode = 'P0001', message = 'Motivo obrigatorio.';
  end if;
  if pg_catalog.char_length(v_motivo) < 3 then
    raise exception using errcode = 'P0001', message = 'Motivo muito curto.';
  end if;
  if pg_catalog.char_length(v_motivo) > 500 then
    raise exception using errcode = 'P0001', message = 'Motivo excede o limite permitido.';
  end if;
  if p_prioridade is not null and (p_prioridade = '' or p_prioridade not in ('baixa', 'normal', 'alta', 'urgente')) then
    raise exception using errcode = 'P0001', message = 'Prioridade invalida.';
  end if;

  v_assunto_informado := nullif(pg_catalog.btrim(p_assunto), '');
  v_resumo := nullif(pg_catalog.btrim(p_resumo), '');
  if v_assunto_informado is not null and pg_catalog.char_length(v_assunto_informado) > 160 then
    raise exception using errcode = 'P0001', message = 'Assunto excede o limite permitido.';
  end if;
  if v_resumo is not null and pg_catalog.char_length(v_resumo) > 2000 then
    raise exception using errcode = 'P0001', message = 'Resumo excede o limite permitido.';
  end if;

  select atendimento.lead_id, atendimento.status, atendimento.updated_at,
         atendimento.prioridade, atendimento.canal, atendimento.assunto
    into v_lead_id, v_status_anterior, v_updated_at_anterior,
         v_prioridade_anterior, v_canal_anterior, v_assunto_anterior
  from public.atendimentos as atendimento
  where atendimento.id = p_atendimento_id_anterior
  for update;

  if not found then
    raise exception using errcode = 'P0001', message = 'Atendimento nao encontrado.';
  end if;
  if v_updated_at_anterior is distinct from p_updated_at_esperado then
    raise exception using errcode = 'P0001', message = 'Atendimento atualizado por outra operacao.';
  end if;
  if v_lead_id is null then
    raise exception using errcode = 'P0001', message = 'Retorno inesperado do Atendimento.';
  end if;
  if v_status_anterior not in ('concluido', 'cancelado') then
    raise exception using errcode = 'P0001', message = 'Atendimento nao finalizado para reabertura.';
  end if;

  select lead.etapa_funil, lead.status_operacional, lead.responsavel_id
    into v_lead_etapa, v_lead_status, v_lead_responsavel_id
  from public.leads as lead
  where lead.id = v_lead_id
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
    where atendimento.lead_id = v_lead_id
      and atendimento.status in ('aguardando', 'em_atendimento', 'aguardando_cliente', 'aguardando_interno')
  ) then
    raise exception using errcode = 'P0001', message = 'Este Lead ja possui um Atendimento aberto.';
  end if;

  v_prioridade := coalesce(p_prioridade, v_prioridade_anterior);
  if v_prioridade not in ('baixa', 'normal', 'alta', 'urgente')
    or v_canal_anterior not in ('manual', 'whatsapp', 'email', 'site', 'instagram', 'facebook', 'portal', 'telefone', 'indicacao', 'outro') then
    raise exception using errcode = 'P0001', message = 'Retorno inesperado do Atendimento.';
  end if;
  v_assunto := coalesce(v_assunto_informado, v_assunto_anterior);

  insert into public.atendimentos (
    lead_id, atendimento_anterior_id, responsavel_id, status, prioridade,
    canal, origem, assunto, resumo, criado_por_user_id
  ) values (
    v_lead_id, p_atendimento_id_anterior, v_lead_responsavel_id, 'aguardando',
    v_prioridade, v_canal_anterior, 'reabertura', v_assunto, v_resumo, v_user_id
  )
  returning atendimentos.id, atendimentos.created_at
    into v_atendimento_id, v_created_at;

  if v_atendimento_id is null or v_created_at is null or v_atendimento_id = p_atendimento_id_anterior then
    raise exception using errcode = 'P0001', message = 'Retorno inesperado do Atendimento.';
  end if;

  begin
    insert into public.timeline (tipo, titulo, descricao, lead_id, origem)
    values (
      'atendimento_reaberto',
      'Atendimento reaberto',
      pg_catalog.format('Atendimento reaberto. Motivo: %s', v_motivo),
      v_lead_id,
      'rpc_reabrir_atendimento'
    );
    get diagnostics v_timeline_rows = row_count;
    if v_timeline_rows <> 1 then raise exception 'unexpected Timeline row count'; end if;
  exception
    when others then
      raise exception using errcode = 'P0001', message = 'Falha ao registrar Timeline do Atendimento.';
  end;

  return query select v_atendimento_id, p_atendimento_id_anterior, v_lead_id,
    v_lead_responsavel_id, 'aguardando'::text, v_prioridade, v_canal_anterior,
    'reabertura'::text, v_created_at;
exception
  when unique_violation then
    raise exception using errcode = 'P0001', message = 'Este Lead ja possui um Atendimento aberto.';
  when sqlstate 'P0001' then raise;
  when others then
    raise exception using errcode = 'P0001', message = 'Nao foi possivel reabrir o Atendimento.';
end;
$$;

revoke all privileges on function public.concluir_atendimento(uuid, text, timestamptz, text, text, text) from public;
revoke all privileges on function public.concluir_atendimento(uuid, text, timestamptz, text, text, text) from anon;
grant execute on function public.concluir_atendimento(uuid, text, timestamptz, text, text, text) to authenticated;

revoke all privileges on function public.cancelar_atendimento(uuid, text, timestamptz, text, text, text) from public;
revoke all privileges on function public.cancelar_atendimento(uuid, text, timestamptz, text, text, text) from anon;
grant execute on function public.cancelar_atendimento(uuid, text, timestamptz, text, text, text) to authenticated;

revoke all privileges on function public.reabrir_atendimento(uuid, timestamptz, text, text, text, text) from public;
revoke all privileges on function public.reabrir_atendimento(uuid, timestamptz, text, text, text, text) from anon;
grant execute on function public.reabrir_atendimento(uuid, timestamptz, text, text, text, text) to authenticated;

commit;

-- CONSULTAS INDEPENDENTES DE VERIFICACAO (comentadas; fora da transacao).
-- select count(*) as atendimentos from public.atendimentos;
-- select pg_get_constraintdef(oid) from pg_catalog.pg_constraint where conrelid = 'public.atendimentos'::regclass and conname = 'atendimentos_assuncao_coerente_check';
-- select to_regprocedure('public.concluir_atendimento(uuid,text,timestamp with time zone,text,text,text)') as concluir, to_regprocedure('public.cancelar_atendimento(uuid,text,timestamp with time zone,text,text,text)') as cancelar, to_regprocedure('public.reabrir_atendimento(uuid,timestamp with time zone,text,text,text,text)') as reabrir;
-- select to_regprocedure('public.criar_atendimento_lead(uuid,text,text,text,text)') as criar_030, to_regprocedure('public.assumir_atendimento(uuid,timestamp with time zone)') as assumir_030, to_regprocedure('public.alterar_estado_atendimento(uuid,text,text,timestamp with time zone,text,timestamp with time zone)') as alterar_030;
-- select p.oid::regprocedure as assinatura, p.prosecdef as security_definer, p.proconfig as configuracao, pg_get_functiondef(p.oid) as definicao from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname in ('concluir_atendimento', 'cancelar_atendimento', 'reabrir_atendimento') order by p.proname;
-- select routine_name, grantee, privilege_type from information_schema.routine_privileges where routine_schema = 'public' and routine_name in ('concluir_atendimento', 'cancelar_atendimento', 'reabrir_atendimento') order by routine_name, grantee;
-- select relrowsecurity, relforcerowsecurity from pg_catalog.pg_class where oid in ('public.atendimentos'::regclass, 'public.timeline'::regclass) order by oid::regclass::text;
-- select tablename, policyname, cmd, roles, qual, with_check from pg_catalog.pg_policies where schemaname = 'public' and tablename in ('atendimentos', 'timeline') order by tablename, policyname;
-- select table_name, grantee, privilege_type from information_schema.role_table_grants where table_schema = 'public' and table_name in ('atendimentos', 'timeline') order by table_name, grantee, privilege_type;
-- A migration nao chama as RPCs e nao cria Atendimento: a contagem deve permanecer igual a registrada antes da aplicacao.

-- TESTES MANUAIS PLANEJADOS, NAO EXECUTADOS.
-- 1-12. Conclusao: sessao/perfil, existencia, fotografia, estado, resultado,
-- limites, sucesso, Timeline, rollback e concorrencia.
-- 13-28. Cancelamento: todos os estados abertos, antes/depois da assuncao,
-- final bloqueado, motivo, resultado, preservacao, Timeline, rollback e concorrencia.
-- 29-46. Reabertura: anterior, fotografia, Lead, duplicidade, prioridade, textos,
-- responsavel, novo UUID/vinculo, anterior e resumo preservados, Timeline e concorrencia.
