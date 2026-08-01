-- Sprint 3C3A: RPCs atomicas de criacao, edicao e estados abertos de Atividades.
-- Nao conclui, cancela, reabre ou sincroniza entidades relacionadas.

begin;

do $$
declare
  v_missing_columns text[];
  v_missing_constraints text[];
  v_existing_rpcs text[];
begin
  if to_regclass('public.tarefas') is null
    or to_regclass('public.timeline') is null
    or to_regclass('public.leads') is null
    or to_regclass('public.atendimentos') is null
    or to_regclass('public.negocios') is null
    or to_regclass('public.imoveis') is null
    or to_regclass('public.pessoas') is null
    or to_regclass('auth.users') is null then
    raise exception 'Precondition failed: required Atividade RPC tables do not exist';
  end if;

  if to_regprocedure('public.usuario_tem_papel(text[])') is null then
    raise exception 'Precondition failed: authorization helper does not exist';
  end if;

  select array_agg(required.column_name order by required.column_name)
    into v_missing_columns
  from (
    values
      ('id','uuid'), ('titulo','text'), ('descricao','text'), ('tipo','text'),
      ('status','text'), ('prioridade','text'), ('origem','text'), ('lead_id','uuid'),
      ('imovel_id','uuid'), ('atendimento_id','uuid'), ('negocio_id','uuid'),
      ('pessoa_id','uuid'), ('responsavel_id','uuid'), ('atividade_anterior_id','uuid'),
      ('criado_por_user_id','uuid'), ('concluido_por_user_id','uuid'),
      ('cancelado_por_user_id','uuid'), ('inicio_planejado_em','timestamp with time zone'),
      ('fim_planejado_em','timestamp with time zone'), ('dia_inteiro','boolean'),
      ('local','text'), ('link_reuniao','text'), ('iniciado_em','timestamp with time zone'),
      ('concluida_em','timestamp with time zone'), ('cancelada_em','timestamp with time zone'),
      ('ultima_interacao_em','timestamp with time zone'), ('resultado','text'),
      ('motivo_cancelamento','text'), ('observacoes_internas','text'), ('ativo','boolean'),
      ('created_at','timestamp with time zone'), ('updated_at','timestamp with time zone')
  ) as required(column_name, data_type)
  where not exists (
    select 1 from pg_catalog.pg_attribute a
    where a.attrelid = 'public.tarefas'::regclass
      and a.attname = required.column_name and not a.attisdropped
      and pg_catalog.format_type(a.atttypid, a.atttypmod) = required.data_type
  );
  if v_missing_columns is not null then
    raise exception 'Precondition failed: migration 038 columns are missing or incompatible: %', array_to_string(v_missing_columns, ', ');
  end if;

  if not exists (
    select 1 from pg_catalog.pg_attribute a
    where a.attrelid = 'public.leads'::regclass
      and a.attname = 'status_operacional'
      and not a.attisdropped
      and pg_catalog.format_type(a.atttypid, a.atttypmod) = 'text'
  ) then
    raise exception 'Precondition failed: canonical Lead status is missing or incompatible';
  end if;

  select array_agg(required.constraint_name order by required.constraint_name)
    into v_missing_constraints
  from (values
    ('tarefas_tipo_check'), ('tarefas_status_check'), ('tarefas_prioridade_check'),
    ('tarefas_origem_check'), ('tarefas_titulo_length_check'),
    ('tarefas_planejamento_coerente_check'), ('tarefas_status_coerente_check'),
    ('tarefas_atendimento_id_fkey'), ('tarefas_negocio_id_fkey'),
    ('tarefas_pessoa_id_fkey'), ('tarefas_responsavel_id_fkey'),
    ('tarefas_criado_por_user_id_fkey')
  ) as required(constraint_name)
  where not exists (
    select 1 from pg_catalog.pg_constraint c
    where c.conrelid = 'public.tarefas'::regclass and c.conname = required.constraint_name
  );
  if v_missing_constraints is not null then
    raise exception 'Precondition failed: migration 038 constraints are missing: %', array_to_string(v_missing_constraints, ', ');
  end if;

  if to_regprocedure('public.set_tarefas_updated_at()') is null
    or not exists (
      select 1 from pg_catalog.pg_trigger t
      where t.tgrelid = 'public.tarefas'::regclass
        and t.tgname = 'set_tarefas_updated_at_before_update'
        and not t.tgisinternal
    ) then
    raise exception 'Precondition failed: migration 038 updated_at authority is missing';
  end if;

  if exists (
    select 1 from (
      values
        ('tipo','text'), ('titulo','text'), ('descricao','text'), ('lead_id','uuid'),
        ('origem','text'), ('created_at','timestamp with time zone')
    ) as required(column_name, data_type)
    where not exists (
      select 1 from pg_catalog.pg_attribute a
      where a.attrelid = 'public.timeline'::regclass
        and a.attname = required.column_name and not a.attisdropped
        and pg_catalog.format_type(a.atttypid, a.atttypmod) = required.data_type
    )
  ) then
    raise exception 'Precondition failed: Timeline structure is incompatible';
  end if;

  select array_agg(p.oid::regprocedure::text order by p.oid::regprocedure::text)
    into v_existing_rpcs
  from pg_catalog.pg_proc p
  join pg_catalog.pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname in ('criar_atividade','atualizar_atividade','iniciar_atividade','alterar_estado_atividade');
  if v_existing_rpcs is not null then
    raise exception 'Precondition failed: migration 039 appears partially applied: %', array_to_string(v_existing_rpcs, ', ');
  end if;

  if not exists (
    select 1 from pg_catalog.pg_class c
    where c.oid = 'public.tarefas'::regclass and c.relrowsecurity
  ) then
    raise exception 'Precondition failed: Atividade RLS is not enabled';
  end if;
end
$$;

create function public.criar_atividade(p_payload jsonb)
returns table(atividade_id uuid, status text, updated_at timestamptz)
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_user_id uuid;
  v_allowed_keys constant text[] := array[
    'titulo','descricao','tipo','prioridade','origem','lead_id','atendimento_id',
    'negocio_id','imovel_id','pessoa_id','responsavel_id','inicio_planejado_em',
    'fim_planejado_em','dia_inteiro','local','link_reuniao','observacoes_internas'
  ];
  v_titulo text;
  v_descricao text;
  v_tipo text;
  v_prioridade text;
  v_origem text;
  v_lead_id uuid;
  v_atendimento_id uuid;
  v_negocio_id uuid;
  v_imovel_id uuid;
  v_pessoa_id uuid;
  v_responsavel_id uuid;
  v_inicio timestamptz;
  v_fim timestamptz;
  v_dia_inteiro boolean;
  v_local text;
  v_link text;
  v_observacoes text;
  v_related_lead_id uuid;
  v_lead_status text;
  v_related_active boolean;
  v_related_name text;
  v_atividade_id uuid;
  v_updated_at timestamptz;
  v_rows integer;
  v_timeline_rows integer;
begin
  v_user_id := auth.uid();
  if v_user_id is null or not public.usuario_tem_papel(array['administrador','gestor']::text[]) then
    raise exception using errcode = 'P0001', message = 'Operacao nao autorizada.';
  end if;
  if jsonb_typeof(p_payload) is distinct from 'object'
    or exists (select 1 from jsonb_object_keys(p_payload) k where k <> all(v_allowed_keys)) then
    raise exception using errcode = 'P0001', message = 'Payload invalido.';
  end if;
  if not (p_payload ? 'titulo') or jsonb_typeof(p_payload->'titulo') <> 'string' then
    raise exception using errcode = 'P0001', message = 'Titulo obrigatorio.';
  end if;
  if not (p_payload ? 'tipo') or jsonb_typeof(p_payload->'tipo') <> 'string'
    or not (p_payload ? 'prioridade') or jsonb_typeof(p_payload->'prioridade') <> 'string'
    or not (p_payload ? 'origem') or jsonb_typeof(p_payload->'origem') <> 'string'
    or (p_payload ? 'dia_inteiro' and jsonb_typeof(p_payload->'dia_inteiro') <> 'boolean')
    or exists (
      select 1 from jsonb_each(p_payload) e
      where e.key in ('descricao','local','link_reuniao','observacoes_internas','inicio_planejado_em','fim_planejado_em')
        and jsonb_typeof(e.value) not in ('string','null')
    )
    or exists (
      select 1 from jsonb_each(p_payload) e
      where e.key in ('lead_id','atendimento_id','negocio_id','imovel_id','pessoa_id','responsavel_id')
        and jsonb_typeof(e.value) not in ('string','null')
    ) then
    raise exception using errcode = 'P0001', message = 'Payload invalido.';
  end if;
  if exists (
    select 1 from jsonb_each_text(p_payload) e
    where e.key in ('lead_id','atendimento_id','negocio_id','imovel_id','pessoa_id','responsavel_id')
      and btrim(e.value) = ''
  ) then
    raise exception using errcode = 'P0001', message = 'UUID invalido.';
  end if;

  v_titulo := nullif(btrim(p_payload->>'titulo'), '');
  v_descricao := nullif(btrim(p_payload->>'descricao'), '');
  v_tipo := p_payload->>'tipo';
  v_prioridade := p_payload->>'prioridade';
  v_origem := p_payload->>'origem';
  v_dia_inteiro := coalesce((p_payload->>'dia_inteiro')::boolean, false);
  v_local := nullif(btrim(p_payload->>'local'), '');
  v_link := nullif(btrim(p_payload->>'link_reuniao'), '');
  v_observacoes := nullif(btrim(p_payload->>'observacoes_internas'), '');
  if v_titulo is null then raise exception using errcode='P0001', message='Titulo obrigatorio.'; end if;
  if char_length(v_titulo) > 160 then raise exception using errcode='P0001', message='Titulo excede o limite permitido.'; end if;
  if (v_descricao is not null and char_length(v_descricao) > 2000)
    or (v_local is not null and char_length(v_local) > 300)
    or (v_link is not null and char_length(v_link) > 2048)
    or (v_observacoes is not null and char_length(v_observacoes) > 4000) then
    raise exception using errcode='P0001', message='Texto excede o limite permitido.';
  end if;
  if v_tipo not in ('tarefa_interna','ligacao','mensagem','whatsapp','email','reuniao','visita','avaliacao','retorno','proposta','documentacao','assinatura','entrega_chaves','vistoria','outro') then
    raise exception using errcode='P0001', message='Tipo de Atividade invalido.';
  end if;
  if v_prioridade not in ('baixa','normal','alta','urgente') then raise exception using errcode='P0001', message='Prioridade da Atividade invalida.'; end if;
  if v_origem not in ('manual','lead','atendimento','negocio','agenda','integracao') then raise exception using errcode='P0001', message='Origem da Atividade invalida.'; end if;

  begin
    v_lead_id := case when p_payload ? 'lead_id' then (p_payload->>'lead_id')::uuid else null end;
    v_atendimento_id := case when p_payload ? 'atendimento_id' then (p_payload->>'atendimento_id')::uuid else null end;
    v_negocio_id := case when p_payload ? 'negocio_id' then (p_payload->>'negocio_id')::uuid else null end;
    v_imovel_id := case when p_payload ? 'imovel_id' then (p_payload->>'imovel_id')::uuid else null end;
    v_pessoa_id := case when p_payload ? 'pessoa_id' then (p_payload->>'pessoa_id')::uuid else null end;
    v_responsavel_id := case when p_payload ? 'responsavel_id' then (p_payload->>'responsavel_id')::uuid else null end;
  exception when invalid_text_representation then
    raise exception using errcode='P0001', message='UUID invalido.';
  end;
  begin
    v_inicio := case when p_payload ? 'inicio_planejado_em' then nullif(p_payload->>'inicio_planejado_em','')::timestamptz else null end;
    v_fim := case when p_payload ? 'fim_planejado_em' then nullif(p_payload->>'fim_planejado_em','')::timestamptz else null end;
  exception when invalid_datetime_format or datetime_field_overflow then
    raise exception using errcode='P0001', message='Datas da Atividade incoerentes.';
  end;
  if v_inicio is not null and v_fim is not null and v_fim < v_inicio then raise exception using errcode='P0001', message='Datas da Atividade incoerentes.'; end if;

  if v_lead_id is not null then
    select l.status_operacional into v_lead_status from public.leads l where l.id = v_lead_id for key share;
    if not found or v_lead_status is distinct from 'ativo' then raise exception using errcode='P0001', message='Relacionamento nao encontrado.'; end if;
  end if;
  if v_atendimento_id is not null then
    select a.lead_id into v_related_lead_id from public.atendimentos a where a.id = v_atendimento_id for key share;
    if not found then raise exception using errcode='P0001', message='Relacionamento nao encontrado.'; end if;
    if v_lead_id is not null and v_related_lead_id is distinct from v_lead_id then raise exception using errcode='P0001', message='Relacionamento incompativel.'; end if;
  end if;
  if v_negocio_id is not null then
    select n.lead_id, n.ativo into v_related_lead_id, v_related_active from public.negocios n where n.id = v_negocio_id for key share;
    if not found or v_related_active is distinct from true then raise exception using errcode='P0001', message='Relacionamento nao encontrado.'; end if;
    if v_lead_id is not null and v_related_lead_id is distinct from v_lead_id then raise exception using errcode='P0001', message='Relacionamento incompativel.'; end if;
  end if;
  if v_imovel_id is not null then
    select i.ativo into v_related_active from public.imoveis i where i.id = v_imovel_id for key share;
    if not found or v_related_active is distinct from true then raise exception using errcode='P0001', message='Relacionamento nao encontrado.'; end if;
  end if;
  if v_pessoa_id is not null then
    select p.ativo into v_related_active from public.pessoas p where p.id = v_pessoa_id for key share;
    if not found or v_related_active is distinct from true then raise exception using errcode='P0001', message='Relacionamento nao encontrado.'; end if;
  end if;
  if v_responsavel_id is not null then
    select p.ativo, p.nome into v_related_active, v_related_name from public.pessoas p where p.id = v_responsavel_id for key share;
    if not found or v_related_active is distinct from true or nullif(btrim(v_related_name),'') is null then raise exception using errcode='P0001', message='Responsavel invalido.'; end if;
  end if;

  insert into public.tarefas as created (
    titulo, descricao, tipo, status, prioridade, origem, lead_id, atendimento_id,
    negocio_id, imovel_id, pessoa_id, responsavel_id, inicio_planejado_em,
    fim_planejado_em, dia_inteiro, local, link_reuniao, observacoes_internas,
    criado_por_user_id, ativo
  ) values (
    v_titulo, v_descricao, v_tipo, 'pendente', v_prioridade, v_origem, v_lead_id,
    v_atendimento_id, v_negocio_id, v_imovel_id, v_pessoa_id, v_responsavel_id,
    v_inicio, v_fim, v_dia_inteiro, v_local, v_link, v_observacoes, v_user_id, true
  ) returning created.id, created.updated_at into v_atividade_id, v_updated_at;
  get diagnostics v_rows = row_count;
  if v_rows <> 1 or v_atividade_id is null or v_updated_at is null then raise exception using errcode='P0001', message='Retorno inesperado.'; end if;

  begin
    insert into public.timeline as timeline_event (tipo,titulo,descricao,lead_id,origem)
    values ('atividade_criada','Atividade criada','Nova Atividade operacional criada.',v_lead_id,'rpc_criar_atividade');
    get diagnostics v_timeline_rows = row_count;
    if v_timeline_rows <> 1 then raise exception 'unexpected Timeline row count'; end if;
  exception when others then
    raise exception using errcode='P0001', message='Falha ao registrar Timeline da Atividade.';
  end;
  return query select v_atividade_id, 'pendente'::text, v_updated_at;
exception
  when sqlstate 'P0001' then raise;
  when check_violation or not_null_violation or invalid_text_representation or invalid_datetime_format or datetime_field_overflow then raise exception using errcode='P0001', message='Payload invalido.';
  when foreign_key_violation then raise exception using errcode='P0001', message='Relacionamento nao encontrado.';
  when others then raise exception using errcode='P0001', message='Nao foi possivel criar a Atividade.';
end;
$$;

create function public.atualizar_atividade(p_atividade_id uuid, p_updated_at_esperado timestamptz, p_payload jsonb)
returns table(atividade_id uuid, status text, updated_at timestamptz)
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_current public.tarefas%rowtype;
  v_allowed_keys constant text[] := array[
    'titulo','descricao','tipo','prioridade','origem','lead_id','atendimento_id',
    'negocio_id','imovel_id','pessoa_id','responsavel_id','inicio_planejado_em',
    'fim_planejado_em','dia_inteiro','local','link_reuniao','observacoes_internas'
  ];
  v_titulo text; v_descricao text; v_tipo text; v_prioridade text; v_origem text;
  v_lead_id uuid; v_atendimento_id uuid; v_negocio_id uuid; v_imovel_id uuid;
  v_pessoa_id uuid; v_responsavel_id uuid; v_inicio timestamptz; v_fim timestamptz;
  v_dia_inteiro boolean; v_local text; v_link text; v_observacoes text;
  v_related_lead_id uuid; v_lead_status text; v_related_active boolean; v_related_name text;
  v_updated_at timestamptz; v_rows integer; v_timeline_rows integer;
begin
  if auth.uid() is null or not public.usuario_tem_papel(array['administrador','gestor']::text[]) then raise exception using errcode='P0001', message='Operacao nao autorizada.'; end if;
  if p_atividade_id is null or p_updated_at_esperado is null then raise exception using errcode='P0001', message='Atividade atualizada por outra operacao.'; end if;
  if jsonb_typeof(p_payload) is distinct from 'object' or p_payload = '{}'::jsonb
    or exists (select 1 from jsonb_object_keys(p_payload) k where k <> all(v_allowed_keys)) then raise exception using errcode='P0001', message='Payload invalido.'; end if;
  if (p_payload ? 'titulo' and jsonb_typeof(p_payload->'titulo') <> 'string')
    or (p_payload ? 'tipo' and jsonb_typeof(p_payload->'tipo') <> 'string')
    or (p_payload ? 'prioridade' and jsonb_typeof(p_payload->'prioridade') <> 'string')
    or (p_payload ? 'origem' and jsonb_typeof(p_payload->'origem') <> 'string')
    or (p_payload ? 'dia_inteiro' and jsonb_typeof(p_payload->'dia_inteiro') <> 'boolean')
    or exists (select 1 from jsonb_each(p_payload) e where e.key in ('descricao','local','link_reuniao','observacoes_internas','inicio_planejado_em','fim_planejado_em') and jsonb_typeof(e.value) not in ('string','null'))
    or exists (select 1 from jsonb_each(p_payload) e where e.key in ('lead_id','atendimento_id','negocio_id','imovel_id','pessoa_id','responsavel_id') and jsonb_typeof(e.value) not in ('string','null')) then
    raise exception using errcode='P0001', message='Payload invalido.';
  end if;
  if exists (select 1 from jsonb_each_text(p_payload) e where e.key in ('lead_id','atendimento_id','negocio_id','imovel_id','pessoa_id','responsavel_id') and btrim(e.value)='') then raise exception using errcode='P0001', message='UUID invalido.'; end if;

  select t.* into v_current from public.tarefas t where t.id = p_atividade_id for update;
  if not found then raise exception using errcode='P0001', message='Atividade nao encontrada.'; end if;
  if v_current.ativo is distinct from true then raise exception using errcode='P0001', message='Atividade inativa.'; end if;
  if v_current.status not in ('pendente','em_andamento','aguardando') then raise exception using errcode='P0001', message='Estado da Atividade invalido.'; end if;
  if v_current.updated_at is distinct from p_updated_at_esperado then raise exception using errcode='P0001', message='Atividade atualizada por outra operacao.'; end if;

  v_titulo := case when p_payload ? 'titulo' then nullif(btrim(p_payload->>'titulo'),'') else v_current.titulo end;
  v_descricao := case when p_payload ? 'descricao' then nullif(btrim(p_payload->>'descricao'),'') else v_current.descricao end;
  v_tipo := case when p_payload ? 'tipo' then p_payload->>'tipo' else v_current.tipo end;
  v_prioridade := case when p_payload ? 'prioridade' then p_payload->>'prioridade' else v_current.prioridade end;
  v_origem := case when p_payload ? 'origem' then p_payload->>'origem' else v_current.origem end;
  v_dia_inteiro := case when p_payload ? 'dia_inteiro' then (p_payload->>'dia_inteiro')::boolean else v_current.dia_inteiro end;
  v_local := case when p_payload ? 'local' then nullif(btrim(p_payload->>'local'),'') else v_current.local end;
  v_link := case when p_payload ? 'link_reuniao' then nullif(btrim(p_payload->>'link_reuniao'),'') else v_current.link_reuniao end;
  v_observacoes := case when p_payload ? 'observacoes_internas' then nullif(btrim(p_payload->>'observacoes_internas'),'') else v_current.observacoes_internas end;
  if v_titulo is null then raise exception using errcode='P0001', message='Titulo obrigatorio.'; end if;
  if char_length(v_titulo)>160 then raise exception using errcode='P0001', message='Titulo excede o limite permitido.'; end if;
  if (v_descricao is not null and char_length(v_descricao)>2000) or (v_local is not null and char_length(v_local)>300) or (v_link is not null and char_length(v_link)>2048) or (v_observacoes is not null and char_length(v_observacoes)>4000) then raise exception using errcode='P0001', message='Texto excede o limite permitido.'; end if;
  if v_tipo not in ('tarefa_interna','ligacao','mensagem','whatsapp','email','reuniao','visita','avaliacao','retorno','proposta','documentacao','assinatura','entrega_chaves','vistoria','outro') then raise exception using errcode='P0001', message='Tipo de Atividade invalido.'; end if;
  if v_prioridade not in ('baixa','normal','alta','urgente') then raise exception using errcode='P0001', message='Prioridade da Atividade invalida.'; end if;
  if v_origem not in ('manual','lead','atendimento','negocio','agenda','integracao') then raise exception using errcode='P0001', message='Origem da Atividade invalida.'; end if;
  begin
    v_lead_id:=case when p_payload?'lead_id' then (p_payload->>'lead_id')::uuid else v_current.lead_id end;
    v_atendimento_id:=case when p_payload?'atendimento_id' then (p_payload->>'atendimento_id')::uuid else v_current.atendimento_id end;
    v_negocio_id:=case when p_payload?'negocio_id' then (p_payload->>'negocio_id')::uuid else v_current.negocio_id end;
    v_imovel_id:=case when p_payload?'imovel_id' then (p_payload->>'imovel_id')::uuid else v_current.imovel_id end;
    v_pessoa_id:=case when p_payload?'pessoa_id' then (p_payload->>'pessoa_id')::uuid else v_current.pessoa_id end;
    v_responsavel_id:=case when p_payload?'responsavel_id' then (p_payload->>'responsavel_id')::uuid else v_current.responsavel_id end;
  exception when invalid_text_representation then raise exception using errcode='P0001', message='UUID invalido.'; end;
  begin
    v_inicio:=case when p_payload?'inicio_planejado_em' then nullif(p_payload->>'inicio_planejado_em','')::timestamptz else v_current.inicio_planejado_em end;
    v_fim:=case when p_payload?'fim_planejado_em' then nullif(p_payload->>'fim_planejado_em','')::timestamptz else v_current.fim_planejado_em end;
  exception when invalid_datetime_format or datetime_field_overflow then raise exception using errcode='P0001', message='Datas da Atividade incoerentes.'; end;
  if v_inicio is not null and v_fim is not null and v_fim<v_inicio then raise exception using errcode='P0001', message='Datas da Atividade incoerentes.'; end if;

  if v_lead_id is not null then select l.status_operacional into v_lead_status from public.leads l where l.id=v_lead_id for key share; if not found or v_lead_status is distinct from 'ativo' then raise exception using errcode='P0001', message='Relacionamento nao encontrado.'; end if; end if;
  if v_atendimento_id is not null then select a.lead_id into v_related_lead_id from public.atendimentos a where a.id=v_atendimento_id for key share; if not found then raise exception using errcode='P0001', message='Relacionamento nao encontrado.'; end if; if v_lead_id is not null and v_related_lead_id is distinct from v_lead_id then raise exception using errcode='P0001', message='Relacionamento incompativel.'; end if; end if;
  if v_negocio_id is not null then select n.lead_id,n.ativo into v_related_lead_id,v_related_active from public.negocios n where n.id=v_negocio_id for key share; if not found or v_related_active is distinct from true then raise exception using errcode='P0001', message='Relacionamento nao encontrado.'; end if; if v_lead_id is not null and v_related_lead_id is distinct from v_lead_id then raise exception using errcode='P0001', message='Relacionamento incompativel.'; end if; end if;
  if v_imovel_id is not null then select i.ativo into v_related_active from public.imoveis i where i.id=v_imovel_id for key share; if not found or v_related_active is distinct from true then raise exception using errcode='P0001', message='Relacionamento nao encontrado.'; end if; end if;
  if v_pessoa_id is not null then select p.ativo into v_related_active from public.pessoas p where p.id=v_pessoa_id for key share; if not found or v_related_active is distinct from true then raise exception using errcode='P0001', message='Relacionamento nao encontrado.'; end if; end if;
  if v_responsavel_id is not null then select p.ativo,p.nome into v_related_active,v_related_name from public.pessoas p where p.id=v_responsavel_id for key share; if not found or v_related_active is distinct from true or nullif(btrim(v_related_name),'') is null then raise exception using errcode='P0001', message='Responsavel invalido.'; end if; end if;

  update public.tarefas as target set titulo=v_titulo,descricao=v_descricao,tipo=v_tipo,prioridade=v_prioridade,origem=v_origem,
    lead_id=v_lead_id,atendimento_id=v_atendimento_id,negocio_id=v_negocio_id,imovel_id=v_imovel_id,pessoa_id=v_pessoa_id,responsavel_id=v_responsavel_id,
    inicio_planejado_em=v_inicio,fim_planejado_em=v_fim,dia_inteiro=v_dia_inteiro,local=v_local,link_reuniao=v_link,observacoes_internas=v_observacoes
  where target.id=p_atividade_id returning target.updated_at into v_updated_at;
  get diagnostics v_rows=row_count;
  if v_rows<>1 or v_updated_at is null then raise exception using errcode='P0001', message='Retorno inesperado.'; end if;
  begin insert into public.timeline as timeline_event(tipo,titulo,descricao,lead_id,origem) values('atividade_atualizada','Atividade atualizada','Dados operacionais da Atividade atualizados.',v_lead_id,'rpc_atualizar_atividade'); get diagnostics v_timeline_rows=row_count; if v_timeline_rows<>1 then raise exception 'unexpected Timeline row count'; end if; exception when others then raise exception using errcode='P0001', message='Falha ao registrar Timeline da Atividade.'; end;
  return query select p_atividade_id,v_current.status,v_updated_at;
exception when sqlstate 'P0001' then raise; when check_violation or not_null_violation or invalid_text_representation or invalid_datetime_format or datetime_field_overflow then raise exception using errcode='P0001', message='Payload invalido.'; when foreign_key_violation then raise exception using errcode='P0001', message='Relacionamento nao encontrado.'; when others then raise exception using errcode='P0001', message='Nao foi possivel atualizar a Atividade.'; end;
$$;

create function public.iniciar_atividade(p_atividade_id uuid, p_updated_at_esperado timestamptz)
returns table(atividade_id uuid, status_anterior text, status_atual text, iniciado_em timestamptz, updated_at timestamptz)
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare v_current public.tarefas%rowtype; v_iniciado_em timestamptz; v_updated_at timestamptz; v_rows integer; v_timeline_rows integer;
begin
  if auth.uid() is null or not public.usuario_tem_papel(array['administrador','gestor']::text[]) then raise exception using errcode='P0001', message='Operacao nao autorizada.'; end if;
  if p_atividade_id is null or p_updated_at_esperado is null then raise exception using errcode='P0001', message='Atividade atualizada por outra operacao.'; end if;
  select t.* into v_current from public.tarefas t where t.id=p_atividade_id for update;
  if not found then raise exception using errcode='P0001', message='Atividade nao encontrada.'; end if;
  if v_current.ativo is distinct from true then raise exception using errcode='P0001', message='Atividade inativa.'; end if;
  if v_current.updated_at is distinct from p_updated_at_esperado then raise exception using errcode='P0001', message='Atividade atualizada por outra operacao.'; end if;
  if v_current.status not in ('pendente','em_andamento','aguardando','concluida','cancelada') then raise exception using errcode='P0001', message='Estado da Atividade invalido.'; end if;
  if v_current.status<>'pendente' then raise exception using errcode='P0001', message='Transicao de estado nao permitida.'; end if;
  update public.tarefas as target set status='em_andamento',iniciado_em=coalesce(target.iniciado_em,pg_catalog.now()) where target.id=p_atividade_id returning target.iniciado_em,target.updated_at into v_iniciado_em,v_updated_at;
  get diagnostics v_rows=row_count; if v_rows<>1 or v_iniciado_em is null or v_updated_at is null then raise exception using errcode='P0001', message='Retorno inesperado.'; end if;
  begin insert into public.timeline as timeline_event(tipo,titulo,descricao,lead_id,origem) values('atividade_iniciada','Atividade iniciada','Atividade operacional iniciada.',v_current.lead_id,'rpc_iniciar_atividade'); get diagnostics v_timeline_rows=row_count; if v_timeline_rows<>1 then raise exception 'unexpected Timeline row count'; end if; exception when others then raise exception using errcode='P0001', message='Falha ao registrar Timeline da Atividade.'; end;
  return query select p_atividade_id,v_current.status,'em_andamento'::text,v_iniciado_em,v_updated_at;
exception when sqlstate 'P0001' then raise; when check_violation then raise exception using errcode='P0001', message='Estado da Atividade invalido.'; when others then raise exception using errcode='P0001', message='Nao foi possivel iniciar a Atividade.'; end;
$$;

create function public.alterar_estado_atividade(p_atividade_id uuid, p_status_destino text, p_updated_at_esperado timestamptz, p_observacao text default null)
returns table(atividade_id uuid, status_anterior text, status_atual text, iniciado_em timestamptz, updated_at timestamptz)
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare v_current public.tarefas%rowtype; v_observacao text; v_iniciado_em timestamptz; v_updated_at timestamptz; v_descricao_timeline text; v_rows integer; v_timeline_rows integer;
begin
  if auth.uid() is null or not public.usuario_tem_papel(array['administrador','gestor']::text[]) then raise exception using errcode='P0001', message='Operacao nao autorizada.'; end if;
  if p_atividade_id is null or p_updated_at_esperado is null then raise exception using errcode='P0001', message='Atividade atualizada por outra operacao.'; end if;
  if p_status_destino is null or p_status_destino<>btrim(p_status_destino) or p_status_destino not in ('pendente','em_andamento','aguardando','concluida','cancelada') then raise exception using errcode='P0001', message='Estado da Atividade invalido.'; end if;
  v_observacao:=nullif(btrim(p_observacao),''); if v_observacao is not null and char_length(v_observacao)>500 then raise exception using errcode='P0001', message='Observacao excede o limite permitido.'; end if;
  select t.* into v_current from public.tarefas t where t.id=p_atividade_id for update;
  if not found then raise exception using errcode='P0001', message='Atividade nao encontrada.'; end if;
  if v_current.ativo is distinct from true then raise exception using errcode='P0001', message='Atividade inativa.'; end if;
  if v_current.updated_at is distinct from p_updated_at_esperado then raise exception using errcode='P0001', message='Atividade atualizada por outra operacao.'; end if;
  if v_current.status not in ('pendente','em_andamento','aguardando','concluida','cancelada') then raise exception using errcode='P0001', message='Estado da Atividade invalido.'; end if;
  if not ((v_current.status='pendente' and p_status_destino='aguardando') or (v_current.status='em_andamento' and p_status_destino='aguardando') or (v_current.status='aguardando' and p_status_destino='em_andamento')) then raise exception using errcode='P0001', message='Transicao de estado nao permitida.'; end if;
  update public.tarefas as target set status=p_status_destino,iniciado_em=case when p_status_destino='em_andamento' then coalesce(target.iniciado_em,pg_catalog.now()) else target.iniciado_em end where target.id=p_atividade_id returning target.iniciado_em,target.updated_at into v_iniciado_em,v_updated_at;
  get diagnostics v_rows=row_count; if v_rows<>1 or v_updated_at is null then raise exception using errcode='P0001', message='Retorno inesperado.'; end if;
  v_descricao_timeline:=case when v_observacao is null then 'Estado da Atividade alterado de '||v_current.status||' para '||p_status_destino||'.' else 'Estado da Atividade alterado de '||v_current.status||' para '||p_status_destino||'. Observacao: '||v_observacao end;
  begin insert into public.timeline as timeline_event(tipo,titulo,descricao,lead_id,origem) values('atividade_estado_alterado','Estado da Atividade alterado',v_descricao_timeline,v_current.lead_id,'rpc_alterar_estado_atividade'); get diagnostics v_timeline_rows=row_count; if v_timeline_rows<>1 then raise exception 'unexpected Timeline row count'; end if; exception when others then raise exception using errcode='P0001', message='Falha ao registrar Timeline da Atividade.'; end;
  return query select p_atividade_id,v_current.status,p_status_destino,v_iniciado_em,v_updated_at;
exception when sqlstate 'P0001' then raise; when check_violation then raise exception using errcode='P0001', message='Estado da Atividade invalido.'; when others then raise exception using errcode='P0001', message='Nao foi possivel alterar o estado da Atividade.'; end;
$$;

revoke all privileges on function public.criar_atividade(jsonb) from public;
revoke all privileges on function public.criar_atividade(jsonb) from anon;
grant execute on function public.criar_atividade(jsonb) to authenticated;
revoke all privileges on function public.atualizar_atividade(uuid,timestamptz,jsonb) from public;
revoke all privileges on function public.atualizar_atividade(uuid,timestamptz,jsonb) from anon;
grant execute on function public.atualizar_atividade(uuid,timestamptz,jsonb) to authenticated;
revoke all privileges on function public.iniciar_atividade(uuid,timestamptz) from public;
revoke all privileges on function public.iniciar_atividade(uuid,timestamptz) from anon;
grant execute on function public.iniciar_atividade(uuid,timestamptz) to authenticated;
revoke all privileges on function public.alterar_estado_atividade(uuid,text,timestamptz,text) from public;
revoke all privileges on function public.alterar_estado_atividade(uuid,text,timestamptz,text) from anon;
grant execute on function public.alterar_estado_atividade(uuid,text,timestamptz,text) to authenticated;

commit;

-- CONSULTAS MANUAIS DE VERIFICACAO (comentadas e fora da transacao).
-- select to_regprocedure('public.criar_atividade(jsonb)'), to_regprocedure('public.atualizar_atividade(uuid,timestamp with time zone,jsonb)'), to_regprocedure('public.iniciar_atividade(uuid,timestamp with time zone)'), to_regprocedure('public.alterar_estado_atividade(uuid,text,timestamp with time zone,text)');
-- select p.oid::regprocedure,p.prosecdef,p.proconfig,pg_get_functiondef(p.oid) from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in ('criar_atividade','atualizar_atividade','iniciar_atividade','alterar_estado_atividade') order by p.proname;
-- select routine_name,grantee,privilege_type from information_schema.routine_privileges where routine_schema='public' and routine_name in ('criar_atividade','atualizar_atividade','iniciar_atividade','alterar_estado_atividade') order by routine_name,grantee;
-- select relname,relrowsecurity,relforcerowsecurity from pg_catalog.pg_class where oid in ('public.tarefas'::regclass,'public.timeline'::regclass) order by relname;
-- select tablename,policyname,cmd,roles,qual,with_check from pg_catalog.pg_policies where schemaname='public' and tablename in ('tarefas','timeline') order by tablename,policyname;
-- select table_name,grantee,privilege_type from information_schema.role_table_grants where table_schema='public' and table_name in ('tarefas','timeline') order by table_name,grantee,privilege_type;
-- select count(*) as anon_rpc_access from information_schema.routine_privileges where routine_schema='public' and routine_name in ('criar_atividade','atualizar_atividade','iniciar_atividade','alterar_estado_atividade') and grantee='anon'; -- zero
-- select (select count(*) from public.tarefas) as atividades, (select count(*) from public.timeline) as timeline; -- registrar antes e comparar depois; a migration nao altera dados
-- select to_regprocedure('public.set_tarefas_updated_at()') as helper_038;
-- select trigger_name,event_manipulation,action_timing from information_schema.triggers where event_object_schema='public' and event_object_table='tarefas' and trigger_name='set_tarefas_updated_at_before_update';

-- TESTES PLANEJADOS, NAO EXECUTADOS.
-- Criacao: autorizacao, allowlist, tipos JSON, catalogos, UUIDs, textos, datas, relacionamentos, responsavel, Timeline e rollback.
-- Edicao: inexistente/inativa/final, concorrencia, omitido/null, campos protegidos, relacionamentos, um UPDATE, Timeline e rollback.
-- Inicio: somente pendente, preservacao de iniciado_em, concorrencia, um UPDATE, Timeline e rollback.
-- Estado aberto: tres transicoes permitidas, inicio exclusivo, finais bloqueados, observacao, concorrencia, Timeline e rollback.
