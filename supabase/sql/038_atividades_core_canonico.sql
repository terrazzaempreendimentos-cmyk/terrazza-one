-- Sprint 3C2: evolui public.tarefas para o nucleo canonico de Atividades.
-- A tabela deve estar vazia; nenhum dado e criado, inferido ou migrado.

begin;

do $$
declare
  v_legacy_problem text[];
  v_new_columns text[];
  v_partial_objects text[];
begin
  if to_regclass('public.tarefas') is null
    or to_regclass('public.leads') is null
    or to_regclass('public.atendimentos') is null
    or to_regclass('public.negocios') is null
    or to_regclass('public.imoveis') is null
    or to_regclass('public.pessoas') is null
    or to_regclass('auth.users') is null then
    raise exception 'Precondition failed: required Atividade tables do not exist';
  end if;

  if to_regprocedure('public.usuario_tem_papel(text[])') is null then
    raise exception 'Precondition failed: authorization helper does not exist';
  end if;

  select array_agg(required.column_name order by required.column_name)
    into v_legacy_problem
  from (
    values
      ('id', 'uuid', true, 'gen_random_uuid()'),
      ('titulo', 'text', true, null),
      ('descricao', 'text', false, null),
      ('tipo', 'text', false, '''tarefa''::text'),
      ('status', 'text', false, '''pendente''::text'),
      ('prioridade', 'text', false, '''media''::text'),
      ('data', 'date', false, null),
      ('hora', 'time without time zone', false, null),
      ('lead_id', 'uuid', false, null),
      ('proprietario_id', 'uuid', false, null),
      ('imovel_id', 'uuid', false, null),
      ('inquilino_id', 'uuid', false, null),
      ('corretor_id', 'uuid', false, null),
      ('responsavel', 'text', false, null),
      ('origem', 'text', false, '''manual''::text'),
      ('created_at', 'timestamp with time zone', false, 'now()')
  ) as required(column_name, data_type, expected_not_null, expected_default)
  where not exists (
    select 1
    from pg_catalog.pg_attribute as attribute
    left join pg_catalog.pg_attrdef as attribute_default
      on attribute_default.adrelid = attribute.attrelid
     and attribute_default.adnum = attribute.attnum
    where attribute.attrelid = 'public.tarefas'::regclass
      and attribute.attname = required.column_name
      and not attribute.attisdropped
      and pg_catalog.format_type(attribute.atttypid, attribute.atttypmod) = required.data_type
      and attribute.attnotnull = required.expected_not_null
      and pg_get_expr(attribute_default.adbin, attribute_default.adrelid) is not distinct from required.expected_default
  );

  if v_legacy_problem is not null then
    raise exception 'Precondition failed: legacy Atividade columns are missing or incompatible: %', array_to_string(v_legacy_problem, ', ');
  end if;

  if not exists (
    select 1
    from pg_catalog.pg_constraint
    where conrelid = 'public.tarefas'::regclass
      and conname = 'tarefas_pkey'
      and contype = 'p'
      and conkey = array[(select attnum from pg_catalog.pg_attribute where attrelid = 'public.tarefas'::regclass and attname = 'id' and not attisdropped)]::smallint[]
  ) then
    raise exception 'Precondition failed: legacy Atividade primary key is missing or incompatible';
  end if;

  if not exists (
    select 1 from pg_catalog.pg_constraint c
    where c.conrelid = 'public.tarefas'::regclass and c.conname = 'tarefas_lead_id_fkey'
      and c.contype = 'f' and c.confrelid = 'public.leads'::regclass and c.confdeltype = 'n'
      and c.conkey = array[(select attnum from pg_catalog.pg_attribute where attrelid = 'public.tarefas'::regclass and attname = 'lead_id' and not attisdropped)]::smallint[]
      and c.confkey = array[(select attnum from pg_catalog.pg_attribute where attrelid = 'public.leads'::regclass and attname = 'id' and not attisdropped)]::smallint[]
  ) or not exists (
    select 1 from pg_catalog.pg_constraint c
    where c.conrelid = 'public.tarefas'::regclass and c.conname = 'tarefas_imovel_id_fkey'
      and c.contype = 'f' and c.confrelid = 'public.imoveis'::regclass and c.confdeltype = 'n'
      and c.conkey = array[(select attnum from pg_catalog.pg_attribute where attrelid = 'public.tarefas'::regclass and attname = 'imovel_id' and not attisdropped)]::smallint[]
      and c.confkey = array[(select attnum from pg_catalog.pg_attribute where attrelid = 'public.imoveis'::regclass and attname = 'id' and not attisdropped)]::smallint[]
  ) or not exists (
    select 1 from pg_catalog.pg_constraint c
    where c.conrelid = 'public.tarefas'::regclass and c.conname = 'tarefas_proprietario_id_fkey'
      and c.contype = 'f' and c.confrelid = 'public.proprietarios'::regclass and c.confdeltype = 'n'
      and c.conkey = array[(select attnum from pg_catalog.pg_attribute where attrelid = 'public.tarefas'::regclass and attname = 'proprietario_id' and not attisdropped)]::smallint[]
      and c.confkey = array[(select attnum from pg_catalog.pg_attribute where attrelid = 'public.proprietarios'::regclass and attname = 'id' and not attisdropped)]::smallint[]
  ) or not exists (
    select 1 from pg_catalog.pg_constraint c
    where c.conrelid = 'public.tarefas'::regclass and c.conname = 'tarefas_inquilino_id_fkey'
      and c.contype = 'f' and c.confrelid = 'public.inquilinos'::regclass and c.confdeltype = 'n'
      and c.conkey = array[(select attnum from pg_catalog.pg_attribute where attrelid = 'public.tarefas'::regclass and attname = 'inquilino_id' and not attisdropped)]::smallint[]
      and c.confkey = array[(select attnum from pg_catalog.pg_attribute where attrelid = 'public.inquilinos'::regclass and attname = 'id' and not attisdropped)]::smallint[]
  ) or not exists (
    select 1 from pg_catalog.pg_constraint c
    where c.conrelid = 'public.tarefas'::regclass and c.conname = 'tarefas_corretor_id_fkey'
      and c.contype = 'f' and c.confrelid = 'public.corretores'::regclass and c.confdeltype = 'n'
      and c.conkey = array[(select attnum from pg_catalog.pg_attribute where attrelid = 'public.tarefas'::regclass and attname = 'corretor_id' and not attisdropped)]::smallint[]
      and c.confkey = array[(select attnum from pg_catalog.pg_attribute where attrelid = 'public.corretores'::regclass and attname = 'id' and not attisdropped)]::smallint[]
  ) then
    raise exception 'Precondition failed: a legacy Atividade foreign key is missing or incompatible';
  end if;

  if exists (select 1 from public.tarefas limit 1) then
    raise exception 'Precondition failed: public.tarefas must be empty';
  end if;

  if exists (
    select 1
    from (values
      ('public.leads'::regclass), ('public.atendimentos'::regclass),
      ('public.negocios'::regclass), ('public.imoveis'::regclass),
      ('public.pessoas'::regclass), ('auth.users'::regclass)
    ) as required_table(table_oid)
    where not exists (
      select 1 from pg_catalog.pg_attribute
      where attrelid = required_table.table_oid and attname = 'id'
        and atttypid = 'uuid'::regtype and not attisdropped
    )
  ) then
    raise exception 'Precondition failed: a canonical referenced id is missing or incompatible';
  end if;

  select array_agg(attribute.attname order by attribute.attname)
    into v_new_columns
  from pg_catalog.pg_attribute as attribute
  where attribute.attrelid = 'public.tarefas'::regclass
    and attribute.attname = any(array[
      'atendimento_id', 'negocio_id', 'pessoa_id', 'responsavel_id', 'atividade_anterior_id',
      'criado_por_user_id', 'concluido_por_user_id', 'cancelado_por_user_id',
      'inicio_planejado_em', 'fim_planejado_em', 'dia_inteiro', 'local', 'link_reuniao',
      'iniciado_em', 'concluida_em', 'cancelada_em', 'ultima_interacao_em',
      'resultado', 'motivo_cancelamento', 'observacoes_internas', 'ativo', 'updated_at'
    ])
    and not attribute.attisdropped;

  if v_new_columns is not null then
    raise exception 'Precondition failed: canonical Atividade columns already exist: %', array_to_string(v_new_columns, ', ');
  end if;

  if to_regprocedure('public.set_tarefas_updated_at()') is not null then
    raise exception 'Precondition failed: Atividade updated_at helper already exists';
  end if;

  select array_agg(object_name order by object_name)
    into v_partial_objects
  from (
    select conname as object_name from pg_catalog.pg_constraint
      where conrelid = 'public.tarefas'::regclass and conname like 'tarefas_%_check'
    union all
    select relname from pg_catalog.pg_class
      where relnamespace = 'public'::regnamespace and relname like 'idx_tarefas_%'
    union all
    select tgname from pg_catalog.pg_trigger
      where tgrelid = 'public.tarefas'::regclass and tgname = 'set_tarefas_updated_at_before_update' and not tgisinternal
  ) as partial;

  if v_partial_objects is not null then
    raise exception 'Precondition failed: migration 038 appears partially applied: %', array_to_string(v_partial_objects, ', ');
  end if;

  if not exists (
    select 1 from pg_catalog.pg_class
    where oid = 'public.tarefas'::regclass and relrowsecurity and not relforcerowsecurity
  ) then
    raise exception 'Precondition failed: expected Atividade RLS state is incompatible';
  end if;
end
$$;

alter table public.tarefas
  alter column tipo set default 'tarefa_interna',
  alter column tipo set not null,
  alter column status set default 'pendente',
  alter column status set not null,
  alter column prioridade set default 'normal',
  alter column prioridade set not null,
  alter column origem set default 'manual',
  alter column origem set not null,
  alter column created_at set default now(),
  alter column created_at set not null,
  add column atendimento_id uuid,
  add column negocio_id uuid,
  add column pessoa_id uuid,
  add column responsavel_id uuid,
  add column atividade_anterior_id uuid,
  add column criado_por_user_id uuid,
  add column concluido_por_user_id uuid,
  add column cancelado_por_user_id uuid,
  add column inicio_planejado_em timestamptz,
  add column fim_planejado_em timestamptz,
  add column dia_inteiro boolean not null default false,
  add column local text,
  add column link_reuniao text,
  add column iniciado_em timestamptz,
  add column concluida_em timestamptz,
  add column cancelada_em timestamptz,
  add column ultima_interacao_em timestamptz,
  add column resultado text,
  add column motivo_cancelamento text,
  add column observacoes_internas text,
  add column ativo boolean not null default true,
  add column updated_at timestamptz not null default now();

alter table public.tarefas
  add constraint tarefas_atendimento_id_fkey foreign key (atendimento_id) references public.atendimentos(id) on delete set null,
  add constraint tarefas_negocio_id_fkey foreign key (negocio_id) references public.negocios(id) on delete set null,
  add constraint tarefas_pessoa_id_fkey foreign key (pessoa_id) references public.pessoas(id) on delete set null,
  add constraint tarefas_responsavel_id_fkey foreign key (responsavel_id) references public.pessoas(id) on delete set null,
  add constraint tarefas_atividade_anterior_id_fkey foreign key (atividade_anterior_id) references public.tarefas(id) on delete set null,
  add constraint tarefas_criado_por_user_id_fkey foreign key (criado_por_user_id) references auth.users(id) on delete set null,
  add constraint tarefas_concluido_por_user_id_fkey foreign key (concluido_por_user_id) references auth.users(id) on delete restrict,
  add constraint tarefas_cancelado_por_user_id_fkey foreign key (cancelado_por_user_id) references auth.users(id) on delete restrict,
  add constraint tarefas_tipo_check check (tipo in (
    'tarefa_interna', 'ligacao', 'mensagem', 'whatsapp', 'email', 'reuniao', 'visita',
    'avaliacao', 'retorno', 'proposta', 'documentacao', 'assinatura', 'entrega_chaves',
    'vistoria', 'outro'
  )),
  add constraint tarefas_status_check check (status in ('pendente', 'em_andamento', 'aguardando', 'concluida', 'cancelada')),
  add constraint tarefas_prioridade_check check (prioridade in ('baixa', 'normal', 'alta', 'urgente')),
  add constraint tarefas_origem_check check (origem in ('manual', 'lead', 'atendimento', 'negocio', 'agenda', 'integracao')),
  add constraint tarefas_titulo_length_check check (char_length(btrim(titulo)) between 1 and 160),
  add constraint tarefas_descricao_length_check check (descricao is null or char_length(descricao) <= 2000),
  add constraint tarefas_local_length_check check (local is null or char_length(local) <= 300),
  add constraint tarefas_link_reuniao_length_check check (link_reuniao is null or char_length(link_reuniao) <= 2048),
  add constraint tarefas_resultado_length_check check (resultado is null or char_length(resultado) <= 1000),
  add constraint tarefas_motivo_cancelamento_length_check check (motivo_cancelamento is null or char_length(motivo_cancelamento) <= 1000),
  add constraint tarefas_observacoes_internas_length_check check (observacoes_internas is null or char_length(observacoes_internas) <= 4000),
  add constraint tarefas_planejamento_coerente_check check (
    inicio_planejado_em is null or fim_planejado_em is null or fim_planejado_em >= inicio_planejado_em
  ),
  add constraint tarefas_execucao_coerente_check check (
    not (concluida_em is not null and cancelada_em is not null)
    and (iniciado_em is null or concluida_em is null or iniciado_em <= concluida_em)
  ),
  add constraint tarefas_reabertura_sem_autorreferencia_check check (
    atividade_anterior_id is null or atividade_anterior_id <> id
  ),
  add constraint tarefas_status_coerente_check check (
    (
      status in ('pendente', 'em_andamento', 'aguardando')
      and concluida_em is null and cancelada_em is null
      and concluido_por_user_id is null and cancelado_por_user_id is null
      and motivo_cancelamento is null
    )
    or (
      status = 'concluida'
      and concluida_em is not null and concluido_por_user_id is not null
      and cancelada_em is null and cancelado_por_user_id is null
      and motivo_cancelamento is null
    )
    or (
      status = 'cancelada'
      and cancelada_em is not null and cancelado_por_user_id is not null
      and concluida_em is null and concluido_por_user_id is null
      and char_length(btrim(motivo_cancelamento)) between 3 and 1000
    )
  );

comment on column public.tarefas.data is 'LEGADO: data isolada preservada, fora dos novos fluxos canonicos.';
comment on column public.tarefas.hora is 'LEGADO: hora isolada preservada, fora dos novos fluxos canonicos.';
comment on column public.tarefas.proprietario_id is 'LEGADO: vinculo com public.proprietarios preservado, fora dos novos fluxos canonicos.';
comment on column public.tarefas.inquilino_id is 'LEGADO: vinculo com public.inquilinos preservado, fora dos novos fluxos canonicos.';
comment on column public.tarefas.corretor_id is 'LEGADO: vinculo com public.corretores preservado, fora dos novos fluxos canonicos.';
comment on column public.tarefas.responsavel is 'LEGADO: responsavel textual preservado, sem autoridade nos novos fluxos canonicos.';
comment on column public.tarefas.origem is 'Origem controlada da Atividade; agenda indica somente a interface de criacao, nunca uma fonte paralela.';
comment on column public.tarefas.responsavel_id is 'Pessoa canonica responsavel; nullable enquanto a Atividade estiver em fila sem atribuicao.';
comment on column public.tarefas.atividade_anterior_id is 'Atividade final anterior em eventual reabertura administrativa futura.';

create index idx_tarefas_status on public.tarefas (status);
create index idx_tarefas_prioridade on public.tarefas (prioridade);
create index idx_tarefas_inicio_planejado_em on public.tarefas (inicio_planejado_em);
create index idx_tarefas_fim_planejado_em on public.tarefas (fim_planejado_em);
create index idx_tarefas_responsavel_status on public.tarefas (responsavel_id, status);
create index idx_tarefas_lead_created_at on public.tarefas (lead_id, created_at desc);
create index idx_tarefas_atendimento_created_at on public.tarefas (atendimento_id, created_at desc);
create index idx_tarefas_negocio_created_at on public.tarefas (negocio_id, created_at desc);
create index idx_tarefas_imovel_created_at on public.tarefas (imovel_id, created_at desc);
create index idx_tarefas_pessoa_created_at on public.tarefas (pessoa_id, created_at desc);
create index idx_tarefas_abertas_prazo
  on public.tarefas ((coalesce(fim_planejado_em, inicio_planejado_em)))
  where ativo = true
    and status in ('pendente', 'em_andamento', 'aguardando')
    and coalesce(fim_planejado_em, inicio_planejado_em) is not null;
create index idx_tarefas_ativas on public.tarefas (created_at desc) where ativo = true;
create index idx_tarefas_atividade_anterior on public.tarefas (atividade_anterior_id) where atividade_anterior_id is not null;

create function public.set_tarefas_updated_at()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  new.updated_at := pg_catalog.now();
  return new;
end;
$$;

revoke all privileges on function public.set_tarefas_updated_at() from public;
revoke all privileges on function public.set_tarefas_updated_at() from anon;
revoke all privileges on function public.set_tarefas_updated_at() from authenticated;

create trigger set_tarefas_updated_at_before_update
before update on public.tarefas
for each row
execute function public.set_tarefas_updated_at();

commit;

-- CONSULTAS INDEPENDENTES DE PRE-VERIFICACAO (executar manualmente antes da migration).
-- select count(*) as tarefas_antes from public.tarefas; -- deve ser zero
-- select column_name, data_type, udt_name, is_nullable, column_default from information_schema.columns where table_schema = 'public' and table_name = 'tarefas' order by ordinal_position;
-- select conname, contype, pg_get_constraintdef(oid, true) as definition from pg_catalog.pg_constraint where conrelid = 'public.tarefas'::regclass order by conname;
-- select indexname, indexdef from pg_catalog.pg_indexes where schemaname = 'public' and tablename = 'tarefas' order by indexname;
-- select relrowsecurity, relforcerowsecurity from pg_catalog.pg_class where oid = 'public.tarefas'::regclass;
-- select policyname, cmd, roles, qual, with_check from pg_catalog.pg_policies where schemaname = 'public' and tablename = 'tarefas' order by policyname;
-- select grantee, privilege_type from information_schema.role_table_grants where table_schema = 'public' and table_name = 'tarefas' order by grantee, privilege_type;

-- CONSULTAS INDEPENDENTES DE POS-VERIFICACAO (executar manualmente depois da migration).
-- select count(*) as tarefas_depois from public.tarefas; -- deve continuar zero
-- select column_name, data_type, udt_name, is_nullable, column_default from information_schema.columns where table_schema = 'public' and table_name = 'tarefas' order by ordinal_position;
-- select conname, contype, pg_get_constraintdef(oid, true) as definition from pg_catalog.pg_constraint where conrelid = 'public.tarefas'::regclass order by conname;
-- select c.conname, c.confrelid::regclass::text as referenced_table, pg_get_constraintdef(c.oid, true) as definition from pg_catalog.pg_constraint c where c.conrelid = 'public.tarefas'::regclass and c.contype = 'f' order by c.conname;
-- select indexname, indexdef from pg_catalog.pg_indexes where schemaname = 'public' and tablename = 'tarefas' order by indexname;
-- select trigger_name, event_manipulation, action_timing from information_schema.triggers where event_object_schema = 'public' and event_object_table = 'tarefas' order by trigger_name;
-- select to_regprocedure('public.set_tarefas_updated_at()') as updated_at_function;
-- select relrowsecurity, relforcerowsecurity from pg_catalog.pg_class where oid = 'public.tarefas'::regclass;
-- select policyname, cmd, roles, qual, with_check from pg_catalog.pg_policies where schemaname = 'public' and tablename = 'tarefas' order by policyname;
-- select grantee, privilege_type from information_schema.role_table_grants where table_schema = 'public' and table_name = 'tarefas' order by grantee, privilege_type;
-- select count(*) as anon_privileges from information_schema.role_table_grants where table_schema = 'public' and table_name = 'tarefas' and grantee = 'anon'; -- deve ser zero
-- select count(*) as authenticated_update_delete from information_schema.role_table_grants where table_schema = 'public' and table_name = 'tarefas' and grantee = 'authenticated' and privilege_type in ('UPDATE', 'DELETE', 'TRUNCATE'); -- deve ser zero

-- ROLLBACK MANUAL DOCUMENTADO, SOMENTE ANTES DE QUALQUER USO REAL.
-- 1. remover trigger set_tarefas_updated_at_before_update;
-- 2. remover funcao public.set_tarefas_updated_at();
-- 3. remover somente os treze indices idx_tarefas_* desta migration;
-- 4. remover somente as novas FKs e constraints tarefas_* desta migration;
-- 5. remover somente as novas colunas canonicas desta migration;
-- 6. restaurar tipo/status/prioridade/origem/created_at para nullability e defaults legados.
-- Nunca remover a PK, colunas legadas, FKs legadas ou dados.
-- Depois de qualquer uso real, corrigir somente por nova migration preservando o historico.
