-- Sprint 3C3B: conclusao, cancelamento e reabertura atomica de Atividades.
-- Reabertura cria um novo ciclo; nao modifica a Atividade final anterior.

begin;

do $$
declare
  v_missing_columns text[];
  v_missing_constraints text[];
  v_missing_open_rpcs text[];
  v_existing_final_rpcs text[];
begin
  if to_regclass('public.tarefas') is null
    or to_regclass('public.timeline') is null
    or to_regclass('auth.users') is null then
    raise exception 'Precondition failed: required final Atividade tables do not exist';
  end if;
  if to_regprocedure('public.usuario_tem_papel(text[])') is null then
    raise exception 'Precondition failed: authorization helper does not exist';
  end if;

  select array_agg(required.column_name order by required.column_name)
    into v_missing_columns
  from (values
    ('id','uuid'), ('titulo','text'), ('descricao','text'), ('tipo','text'),
    ('status','text'), ('prioridade','text'), ('origem','text'), ('lead_id','uuid'),
    ('atendimento_id','uuid'), ('negocio_id','uuid'), ('imovel_id','uuid'),
    ('pessoa_id','uuid'), ('responsavel_id','uuid'), ('atividade_anterior_id','uuid'),
    ('criado_por_user_id','uuid'), ('concluido_por_user_id','uuid'),
    ('cancelado_por_user_id','uuid'), ('inicio_planejado_em','timestamp with time zone'),
    ('fim_planejado_em','timestamp with time zone'), ('dia_inteiro','boolean'),
    ('local','text'), ('link_reuniao','text'), ('iniciado_em','timestamp with time zone'),
    ('concluida_em','timestamp with time zone'), ('cancelada_em','timestamp with time zone'),
    ('ultima_interacao_em','timestamp with time zone'), ('resultado','text'),
    ('motivo_cancelamento','text'), ('observacoes_internas','text'), ('ativo','boolean'),
    ('created_at','timestamp with time zone'), ('updated_at','timestamp with time zone')
  ) as required(column_name,data_type)
  where not exists (
    select 1 from pg_catalog.pg_attribute a
    where a.attrelid='public.tarefas'::regclass and a.attname=required.column_name
      and not a.attisdropped and pg_catalog.format_type(a.atttypid,a.atttypmod)=required.data_type
  );
  if v_missing_columns is not null then
    raise exception 'Precondition failed: canonical Atividade columns are missing or incompatible: %', array_to_string(v_missing_columns, ', ');
  end if;

  select array_agg(required.constraint_name order by required.constraint_name)
    into v_missing_constraints
  from (values
    ('tarefas_status_check'), ('tarefas_status_coerente_check'),
    ('tarefas_resultado_length_check'), ('tarefas_motivo_cancelamento_length_check'),
    ('tarefas_planejamento_coerente_check'), ('tarefas_reabertura_sem_autorreferencia_check'),
    ('tarefas_atividade_anterior_id_fkey')
  ) as required(constraint_name)
  where not exists (
    select 1 from pg_catalog.pg_constraint c
    where c.conrelid='public.tarefas'::regclass and c.conname=required.constraint_name
  );
  if v_missing_constraints is not null then
    raise exception 'Precondition failed: canonical Atividade constraints are missing: %', array_to_string(v_missing_constraints, ', ');
  end if;

  if to_regprocedure('public.set_tarefas_updated_at()') is null
    or not exists (
      select 1 from pg_catalog.pg_trigger t
      where t.tgrelid='public.tarefas'::regclass
        and t.tgname='set_tarefas_updated_at_before_update' and not t.tgisinternal
    ) then
    raise exception 'Precondition failed: Atividade updated_at authority is missing';
  end if;

  if exists (
    select 1 from (values
      ('tipo','text'),('titulo','text'),('descricao','text'),('lead_id','uuid'),
      ('origem','text'),('created_at','timestamp with time zone')
    ) as required(column_name,data_type)
    where not exists (
      select 1 from pg_catalog.pg_attribute a
      where a.attrelid='public.timeline'::regclass and a.attname=required.column_name
        and not a.attisdropped and pg_catalog.format_type(a.atttypid,a.atttypmod)=required.data_type
    )
  ) then
    raise exception 'Precondition failed: Timeline structure is incompatible';
  end if;

  select array_agg(required.signature order by required.signature)
    into v_missing_open_rpcs
  from (values
    ('public.criar_atividade(jsonb)'),
    ('public.atualizar_atividade(uuid,timestamp with time zone,jsonb)'),
    ('public.iniciar_atividade(uuid,timestamp with time zone)'),
    ('public.alterar_estado_atividade(uuid,text,timestamp with time zone,text)')
  ) as required(signature)
  where to_regprocedure(required.signature) is null
    or not exists (
      select 1 from pg_catalog.pg_proc p
      where p.oid=to_regprocedure(required.signature)
        and p.prosecdef
        and 'search_path=pg_catalog'=any(coalesce(p.proconfig,array[]::text[]))
    );
  if v_missing_open_rpcs is not null then
    raise exception 'Precondition failed: migration 039 RPCs are missing or incompatible: %', array_to_string(v_missing_open_rpcs, ', ');
  end if;

  select array_agg(p.oid::regprocedure::text order by p.oid::regprocedure::text)
    into v_existing_final_rpcs
  from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public' and p.proname in ('concluir_atividade','cancelar_atividade','reabrir_atividade');
  if v_existing_final_rpcs is not null then
    raise exception 'Precondition failed: migration 040 appears partially applied: %', array_to_string(v_existing_final_rpcs, ', ');
  end if;

  if exists (
    select 1 from public.tarefas t
    where t.atividade_anterior_id is not null
    group by t.atividade_anterior_id having count(*)>1
  ) then
    raise exception 'Precondition failed: duplicate direct Atividade reopenings exist';
  end if;

  if to_regclass('public.idx_tarefas_atividade_anterior_unica') is not null
    and not exists (
      select 1 from pg_catalog.pg_index i
      join pg_catalog.pg_class idx on idx.oid=i.indexrelid
      where idx.oid=to_regclass('public.idx_tarefas_atividade_anterior_unica')
        and i.indrelid='public.tarefas'::regclass and i.indisunique
        and i.indnkeyatts=1
        and i.indkey[0]=(select a.attnum from pg_catalog.pg_attribute a where a.attrelid='public.tarefas'::regclass and a.attname='atividade_anterior_id' and not a.attisdropped)
        and pg_get_expr(i.indpred,i.indrelid)='(atividade_anterior_id IS NOT NULL)'
    ) then
    raise exception 'Precondition failed: reserved reopening index is incompatible';
  end if;
end
$$;

create unique index if not exists idx_tarefas_atividade_anterior_unica
  on public.tarefas (atividade_anterior_id)
  where atividade_anterior_id is not null;

create function public.concluir_atividade(
  p_atividade_id uuid,
  p_status_esperado text,
  p_updated_at_esperado timestamptz,
  p_resultado text default null,
  p_observacao text default null
)
returns table(atividade_id uuid,status_anterior text,status_atual text,concluida_em timestamptz,updated_at timestamptz)
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_user_id uuid; v_current public.tarefas%rowtype; v_resultado text; v_observacao text;
  v_concluida_em timestamptz; v_updated_at timestamptz; v_descricao_timeline text;
  v_rows integer; v_timeline_rows integer;
begin
  v_user_id:=auth.uid();
  if v_user_id is null or not public.usuario_tem_papel(array['administrador','gestor']::text[]) then raise exception using errcode='P0001',message='Operacao nao autorizada.'; end if;
  if p_atividade_id is null or p_status_esperado is null or p_updated_at_esperado is null then raise exception using errcode='P0001',message='Argumento obrigatorio ausente.'; end if;
  if p_status_esperado<>btrim(p_status_esperado) or p_status_esperado not in('pendente','em_andamento','aguardando') then raise exception using errcode='P0001',message='Estado da Atividade invalido.'; end if;
  v_resultado:=nullif(btrim(p_resultado),''); v_observacao:=nullif(btrim(p_observacao),'');
  if v_resultado is not null and char_length(v_resultado)>1000 then raise exception using errcode='P0001',message='Resultado excede o limite permitido.'; end if;
  if v_observacao is not null and char_length(v_observacao)>500 then raise exception using errcode='P0001',message='Observacao excede o limite permitido.'; end if;
  select t.* into v_current from public.tarefas t where t.id=p_atividade_id for update;
  if not found then raise exception using errcode='P0001',message='Atividade nao encontrada.'; end if;
  if v_current.ativo is distinct from true then raise exception using errcode='P0001',message='Atividade inativa.'; end if;
  if v_current.status not in('pendente','em_andamento','aguardando','concluida','cancelada') then raise exception using errcode='P0001',message='Estado da Atividade invalido.'; end if;
  if v_current.status not in('pendente','em_andamento','aguardando') then raise exception using errcode='P0001',message='Transicao de estado nao permitida.'; end if;
  if v_current.status is distinct from p_status_esperado then raise exception using errcode='P0001',message='Estado atual da Atividade divergente.'; end if;
  if v_current.updated_at is distinct from p_updated_at_esperado then raise exception using errcode='P0001',message='Atividade atualizada por outra operacao.'; end if;
  update public.tarefas as target set status='concluida',concluida_em=pg_catalog.now(),concluido_por_user_id=v_user_id,resultado=v_resultado
    where target.id=p_atividade_id returning target.concluida_em,target.updated_at into v_concluida_em,v_updated_at;
  get diagnostics v_rows=row_count; if v_rows<>1 or v_concluida_em is null or v_updated_at is null then raise exception using errcode='P0001',message='Retorno inesperado.'; end if;
  v_descricao_timeline:=case when v_observacao is null then 'Atividade operacional concluida.' else 'Atividade operacional concluida. Observacao: '||v_observacao end;
  begin insert into public.timeline as timeline_event(tipo,titulo,descricao,lead_id,origem) values('atividade_concluida','Atividade concluida',v_descricao_timeline,v_current.lead_id,'rpc_concluir_atividade'); get diagnostics v_timeline_rows=row_count; if v_timeline_rows<>1 then raise exception 'unexpected Timeline row count'; end if; exception when others then raise exception using errcode='P0001',message='Falha ao registrar Timeline da Atividade.'; end;
  return query select p_atividade_id,v_current.status,'concluida'::text,v_concluida_em,v_updated_at;
exception when sqlstate 'P0001' then raise; when check_violation or not_null_violation then raise exception using errcode='P0001',message='Estado da Atividade invalido.'; when others then raise exception using errcode='P0001',message='Nao foi possivel concluir a Atividade.'; end;
$$;

create function public.cancelar_atividade(
  p_atividade_id uuid,
  p_status_esperado text,
  p_updated_at_esperado timestamptz,
  p_motivo text,
  p_resultado text default null,
  p_observacao text default null
)
returns table(atividade_id uuid,status_anterior text,status_atual text,cancelada_em timestamptz,updated_at timestamptz)
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_user_id uuid; v_current public.tarefas%rowtype; v_motivo text; v_resultado text; v_observacao text;
  v_cancelada_em timestamptz; v_updated_at timestamptz; v_descricao_timeline text;
  v_rows integer; v_timeline_rows integer;
begin
  v_user_id:=auth.uid();
  if v_user_id is null or not public.usuario_tem_papel(array['administrador','gestor']::text[]) then raise exception using errcode='P0001',message='Operacao nao autorizada.'; end if;
  if p_atividade_id is null or p_status_esperado is null or p_updated_at_esperado is null then raise exception using errcode='P0001',message='Argumento obrigatorio ausente.'; end if;
  if p_status_esperado<>btrim(p_status_esperado) or p_status_esperado not in('pendente','em_andamento','aguardando') then raise exception using errcode='P0001',message='Estado da Atividade invalido.'; end if;
  v_motivo:=nullif(btrim(p_motivo),''); v_resultado:=nullif(btrim(p_resultado),''); v_observacao:=nullif(btrim(p_observacao),'');
  if v_motivo is null or char_length(v_motivo)<3 then raise exception using errcode='P0001',message='Motivo obrigatorio.'; end if;
  if char_length(v_motivo)>1000 then raise exception using errcode='P0001',message='Motivo excede o limite permitido.'; end if;
  if v_resultado is not null and char_length(v_resultado)>1000 then raise exception using errcode='P0001',message='Resultado excede o limite permitido.'; end if;
  if v_observacao is not null and char_length(v_observacao)>500 then raise exception using errcode='P0001',message='Observacao excede o limite permitido.'; end if;
  select t.* into v_current from public.tarefas t where t.id=p_atividade_id for update;
  if not found then raise exception using errcode='P0001',message='Atividade nao encontrada.'; end if;
  if v_current.ativo is distinct from true then raise exception using errcode='P0001',message='Atividade inativa.'; end if;
  if v_current.status not in('pendente','em_andamento','aguardando','concluida','cancelada') then raise exception using errcode='P0001',message='Estado da Atividade invalido.'; end if;
  if v_current.status not in('pendente','em_andamento','aguardando') then raise exception using errcode='P0001',message='Transicao de estado nao permitida.'; end if;
  if v_current.status is distinct from p_status_esperado then raise exception using errcode='P0001',message='Estado atual da Atividade divergente.'; end if;
  if v_current.updated_at is distinct from p_updated_at_esperado then raise exception using errcode='P0001',message='Atividade atualizada por outra operacao.'; end if;
  update public.tarefas as target set status='cancelada',cancelada_em=pg_catalog.now(),cancelado_por_user_id=v_user_id,motivo_cancelamento=v_motivo,resultado=v_resultado
    where target.id=p_atividade_id returning target.cancelada_em,target.updated_at into v_cancelada_em,v_updated_at;
  get diagnostics v_rows=row_count; if v_rows<>1 or v_cancelada_em is null or v_updated_at is null then raise exception using errcode='P0001',message='Retorno inesperado.'; end if;
  v_descricao_timeline:=case when v_observacao is null then 'Atividade operacional cancelada.' else 'Atividade operacional cancelada. Observacao: '||v_observacao end;
  begin insert into public.timeline as timeline_event(tipo,titulo,descricao,lead_id,origem) values('atividade_cancelada','Atividade cancelada',v_descricao_timeline,v_current.lead_id,'rpc_cancelar_atividade'); get diagnostics v_timeline_rows=row_count; if v_timeline_rows<>1 then raise exception 'unexpected Timeline row count'; end if; exception when others then raise exception using errcode='P0001',message='Falha ao registrar Timeline da Atividade.'; end;
  return query select p_atividade_id,v_current.status,'cancelada'::text,v_cancelada_em,v_updated_at;
exception when sqlstate 'P0001' then raise; when check_violation or not_null_violation then raise exception using errcode='P0001',message='Estado da Atividade invalido.'; when others then raise exception using errcode='P0001',message='Nao foi possivel cancelar a Atividade.'; end;
$$;

create function public.reabrir_atividade(
  p_atividade_id uuid,
  p_updated_at_esperado timestamptz,
  p_motivo text,
  p_titulo text default null,
  p_inicio_planejado_em timestamptz default null,
  p_fim_planejado_em timestamptz default null
)
returns table(atividade_anterior_id uuid,atividade_nova_id uuid,status_atual text,created_at timestamptz,updated_at timestamptz)
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_user_id uuid; v_previous public.tarefas%rowtype; v_motivo text; v_titulo text;
  v_new_id uuid; v_created_at timestamptz; v_updated_at timestamptz;
  v_rows integer; v_timeline_rows integer;
begin
  v_user_id:=auth.uid();
  if v_user_id is null or not public.usuario_tem_papel(array['administrador','gestor']::text[]) then raise exception using errcode='P0001',message='Operacao nao autorizada.'; end if;
  if p_atividade_id is null or p_updated_at_esperado is null then raise exception using errcode='P0001',message='Argumento obrigatorio ausente.'; end if;
  v_motivo:=nullif(btrim(p_motivo),'');
  if v_motivo is null or char_length(v_motivo)<3 then raise exception using errcode='P0001',message='Motivo obrigatorio.'; end if;
  if char_length(v_motivo)>500 then raise exception using errcode='P0001',message='Motivo excede o limite permitido.'; end if;
  if p_inicio_planejado_em is not null and p_fim_planejado_em is not null and p_fim_planejado_em<p_inicio_planejado_em then raise exception using errcode='P0001',message='Datas da Atividade incoerentes.'; end if;
  select t.* into v_previous from public.tarefas t where t.id=p_atividade_id for update;
  if not found then raise exception using errcode='P0001',message='Atividade nao encontrada.'; end if;
  if v_previous.ativo is distinct from true then raise exception using errcode='P0001',message='Atividade inativa.'; end if;
  if v_previous.status not in('pendente','em_andamento','aguardando','concluida','cancelada') then raise exception using errcode='P0001',message='Estado da Atividade invalido.'; end if;
  if v_previous.status not in('concluida','cancelada') then raise exception using errcode='P0001',message='Transicao de estado nao permitida.'; end if;
  if v_previous.updated_at is distinct from p_updated_at_esperado then raise exception using errcode='P0001',message='Atividade atualizada por outra operacao.'; end if;
  if exists(select 1 from public.tarefas successor where successor.atividade_anterior_id=p_atividade_id) then raise exception using errcode='P0001',message='Esta Atividade ja possui uma reabertura.'; end if;
  v_titulo:=coalesce(nullif(btrim(p_titulo),''),v_previous.titulo);
  if v_titulo is null or char_length(v_titulo)<1 or char_length(v_titulo)>160 then raise exception using errcode='P0001',message='Titulo invalido.'; end if;
  insert into public.tarefas as reopened(
    titulo,descricao,tipo,status,prioridade,origem,lead_id,atendimento_id,negocio_id,
    imovel_id,pessoa_id,responsavel_id,atividade_anterior_id,criado_por_user_id,
    inicio_planejado_em,fim_planejado_em,dia_inteiro,local,link_reuniao,
    iniciado_em,concluida_em,cancelada_em,ultima_interacao_em,resultado,
    motivo_cancelamento,observacoes_internas,ativo
  ) values (
    v_titulo,v_previous.descricao,v_previous.tipo,'pendente',v_previous.prioridade,
    v_previous.origem,v_previous.lead_id,v_previous.atendimento_id,v_previous.negocio_id,
    v_previous.imovel_id,v_previous.pessoa_id,null,p_atividade_id,v_user_id,
    p_inicio_planejado_em,p_fim_planejado_em,v_previous.dia_inteiro,v_previous.local,
    v_previous.link_reuniao,null,null,null,null,null,null,v_previous.observacoes_internas,true
  ) returning reopened.id,reopened.created_at,reopened.updated_at into v_new_id,v_created_at,v_updated_at;
  get diagnostics v_rows=row_count; if v_rows<>1 or v_new_id is null or v_created_at is null or v_updated_at is null then raise exception using errcode='P0001',message='Retorno inesperado.'; end if;
  begin insert into public.timeline as timeline_event(tipo,titulo,descricao,lead_id,origem) values('atividade_reaberta','Atividade reaberta','Novo ciclo da Atividade criado. Motivo: '||v_motivo,v_previous.lead_id,'rpc_reabrir_atividade'); get diagnostics v_timeline_rows=row_count; if v_timeline_rows<>1 then raise exception 'unexpected Timeline row count'; end if; exception when others then raise exception using errcode='P0001',message='Falha ao registrar Timeline da Atividade.'; end;
  return query select p_atividade_id,v_new_id,'pendente'::text,v_created_at,v_updated_at;
exception when sqlstate 'P0001' then raise; when unique_violation then raise exception using errcode='P0001',message='Esta Atividade ja possui uma reabertura.'; when check_violation or not_null_violation then raise exception using errcode='P0001',message='Estado da Atividade invalido.'; when foreign_key_violation then raise exception using errcode='P0001',message='Relacionamento nao encontrado.'; when others then raise exception using errcode='P0001',message='Nao foi possivel reabrir a Atividade.'; end;
$$;

revoke all privileges on function public.concluir_atividade(uuid,text,timestamptz,text,text) from public;
revoke all privileges on function public.concluir_atividade(uuid,text,timestamptz,text,text) from anon;
grant execute on function public.concluir_atividade(uuid,text,timestamptz,text,text) to authenticated;
revoke all privileges on function public.cancelar_atividade(uuid,text,timestamptz,text,text,text) from public;
revoke all privileges on function public.cancelar_atividade(uuid,text,timestamptz,text,text,text) from anon;
grant execute on function public.cancelar_atividade(uuid,text,timestamptz,text,text,text) to authenticated;
revoke all privileges on function public.reabrir_atividade(uuid,timestamptz,text,text,timestamptz,timestamptz) from public;
revoke all privileges on function public.reabrir_atividade(uuid,timestamptz,text,text,timestamptz,timestamptz) from anon;
grant execute on function public.reabrir_atividade(uuid,timestamptz,text,text,timestamptz,timestamptz) to authenticated;

commit;

-- CONSULTAS MANUAIS DE VERIFICACAO (comentadas e fora da transacao).
-- select to_regprocedure('public.concluir_atividade(uuid,text,timestamp with time zone,text,text)'),to_regprocedure('public.cancelar_atividade(uuid,text,timestamp with time zone,text,text,text)'),to_regprocedure('public.reabrir_atividade(uuid,timestamp with time zone,text,text,timestamp with time zone,timestamp with time zone)');
-- select to_regprocedure('public.criar_atividade(jsonb)'),to_regprocedure('public.atualizar_atividade(uuid,timestamp with time zone,jsonb)'),to_regprocedure('public.iniciar_atividade(uuid,timestamp with time zone)'),to_regprocedure('public.alterar_estado_atividade(uuid,text,timestamp with time zone,text)');
-- select p.oid::regprocedure,p.prosecdef,p.proconfig,pg_get_functiondef(p.oid) from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in('concluir_atividade','cancelar_atividade','reabrir_atividade') order by p.proname;
-- select routine_name,grantee,privilege_type from information_schema.routine_privileges where routine_schema='public' and routine_name in('concluir_atividade','cancelar_atividade','reabrir_atividade') order by routine_name,grantee;
-- select indexname,indexdef from pg_catalog.pg_indexes where schemaname='public' and tablename='tarefas' and indexname in('idx_tarefas_atividade_anterior','idx_tarefas_atividade_anterior_unica') order by indexname;
-- select relname,relrowsecurity,relforcerowsecurity from pg_catalog.pg_class where oid in('public.tarefas'::regclass,'public.timeline'::regclass) order by relname;
-- select tablename,policyname,cmd,roles,qual,with_check from pg_catalog.pg_policies where schemaname='public' and tablename in('tarefas','timeline') order by tablename,policyname;
-- select table_name,grantee,privilege_type from information_schema.role_table_grants where table_schema='public' and table_name in('tarefas','timeline') order by table_name,grantee,privilege_type;
-- select count(*) as anon_rpc_access from information_schema.routine_privileges where routine_schema='public' and routine_name in('concluir_atividade','cancelar_atividade','reabrir_atividade') and grantee='anon'; -- zero
-- select (select count(*) from public.tarefas) as atividades,(select count(*) from public.timeline) as timeline; -- registrar antes/depois; a migration nao altera dados
-- select to_regprocedure('public.set_tarefas_updated_at()') as helper_038;
-- select trigger_name,event_manipulation,action_timing from information_schema.triggers where event_object_schema='public' and event_object_table='tarefas' and trigger_name='set_tarefas_updated_at_before_update';

-- TESTES PLANEJADOS, NAO EXECUTADOS.
-- Conclusao: tres estados abertos, esperado divergente, concorrencia, resultado/observacao, autoria, Timeline e rollback.
-- Cancelamento: tres estados abertos, motivo 3/1000, resultado/observacao, autoria, Timeline e rollback.
-- Reabertura: final/inativa/concorrencia, copia seletiva, responsavel null, datas novas, titulo, predecessora intacta, Timeline e rollback.
-- Duplicidade: duas reaberturas diretas concorrentes; somente uma sucessora e nenhum evento da tentativa rejeitada.
