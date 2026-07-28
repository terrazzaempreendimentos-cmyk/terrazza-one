-- Sprint 3A2: nucleo canonico de Atendimentos.
-- Preserva colunas e FK legadas; a tabela deve continuar vazia ate a Sprint 3A3.

begin;

do $$
declare
  v_colunas_ausentes text[];
  v_novas_colunas_existentes text[];
begin
  if to_regclass('public.atendimentos') is null
    or to_regclass('public.leads') is null
    or to_regclass('public.pessoas') is null
    or to_regclass('auth.users') is null then
    raise exception 'Precondition failed: required Atendimento tables do not exist';
  end if;

  if to_regprocedure('public.usuario_tem_papel(text[])') is null then
    raise exception 'Precondition failed: authorization helper does not exist';
  end if;

  select array_agg(required.column_name order by required.column_name)
    into v_colunas_ausentes
  from (
    values
      ('id', 'uuid'),
      ('proprietario_id', 'uuid'),
      ('status', 'text'),
      ('score', 'text'),
      ('origem', 'text'),
      ('observacao', 'text'),
      ('created_at', 'timestamp with time zone')
  ) as required(column_name, data_type)
  where not exists (
    select 1
    from pg_catalog.pg_attribute as attribute
    where attribute.attrelid = 'public.atendimentos'::regclass
      and attribute.attname = required.column_name
      and not attribute.attisdropped
      and pg_catalog.format_type(attribute.atttypid, attribute.atttypmod) = required.data_type
  );

  if v_colunas_ausentes is not null then
    raise exception 'Precondition failed: legacy Atendimento columns are missing or incompatible: %', array_to_string(v_colunas_ausentes, ', ');
  end if;

  if not exists (
    select 1
    from pg_catalog.pg_constraint
    where conrelid = 'public.atendimentos'::regclass
      and conname = 'atendimentos_pkey'
      and contype = 'p'
      and conkey = array[(select attnum from pg_catalog.pg_attribute where attrelid = 'public.atendimentos'::regclass and attname = 'id' and not attisdropped)]::smallint[]
  ) then
    raise exception 'Precondition failed: legacy Atendimento primary key is missing or incompatible';
  end if;

  if not exists (
    select 1
    from pg_catalog.pg_constraint as constraint_row
    where constraint_row.conrelid = 'public.atendimentos'::regclass
      and constraint_row.conname = 'atendimentos_proprietario_id_fkey'
      and constraint_row.contype = 'f'
      and constraint_row.confrelid = 'public.proprietarios'::regclass
      and constraint_row.conkey = array[(select attnum from pg_catalog.pg_attribute where attrelid = 'public.atendimentos'::regclass and attname = 'proprietario_id' and not attisdropped)]::smallint[]
      and constraint_row.confkey = array[(select attnum from pg_catalog.pg_attribute where attrelid = 'public.proprietarios'::regclass and attname = 'id' and not attisdropped)]::smallint[]
  ) then
    raise exception 'Precondition failed: legacy proprietario FK is missing or incompatible';
  end if;

  if exists (select 1 from public.atendimentos limit 1) then
    raise exception 'Precondition failed: public.atendimentos must be empty';
  end if;

  if not exists (
    select 1 from pg_catalog.pg_attribute
    where attrelid = 'public.leads'::regclass and attname = 'id'
      and atttypid = 'uuid'::regtype and not attisdropped
  ) or not exists (
    select 1 from pg_catalog.pg_attribute
    where attrelid = 'public.pessoas'::regclass and attname = 'id'
      and atttypid = 'uuid'::regtype and not attisdropped
  ) or not exists (
    select 1 from pg_catalog.pg_attribute
    where attrelid = 'auth.users'::regclass and attname = 'id'
      and atttypid = 'uuid'::regtype and not attisdropped
  ) then
    raise exception 'Precondition failed: canonical identity columns are missing or incompatible';
  end if;

  select array_agg(attribute.attname order by attribute.attname)
    into v_novas_colunas_existentes
  from pg_catalog.pg_attribute as attribute
  where attribute.attrelid = 'public.atendimentos'::regclass
    and attribute.attname = any(array[
      'lead_id', 'responsavel_id', 'atendimento_anterior_id',
      'criado_por_user_id', 'encerrado_por_user_id', 'prioridade', 'canal',
      'resultado', 'assunto', 'resumo', 'observacoes_internas',
      'motivo_cancelamento', 'resultado_detalhe', 'updated_at', 'iniciado_em',
      'assumido_em', 'primeira_resposta_em', 'ultima_interacao_em',
      'concluido_em', 'cancelado_em', 'proxima_acao_em',
      'prazo_primeira_resposta_em', 'prazo_resolucao_em'
    ])
    and not attribute.attisdropped;

  if v_novas_colunas_existentes is not null then
    raise exception 'Precondition failed: canonical Atendimento columns already exist: %', array_to_string(v_novas_colunas_existentes, ', ');
  end if;

  if to_regprocedure('public.set_atendimentos_updated_at()') is not null then
    raise exception 'Precondition failed: Atendimento updated_at helper already exists';
  end if;
end
$$;

alter table public.atendimentos
  alter column status set default 'aguardando',
  alter column status set not null,
  alter column origem set default 'criacao_manual',
  alter column origem set not null,
  alter column created_at set default now(),
  alter column created_at set not null,
  add column lead_id uuid not null,
  add column responsavel_id uuid,
  add column atendimento_anterior_id uuid,
  add column criado_por_user_id uuid,
  add column encerrado_por_user_id uuid,
  add column prioridade text not null default 'normal',
  add column canal text not null default 'manual',
  add column resultado text,
  add column assunto text,
  add column resumo text,
  add column observacoes_internas text,
  add column motivo_cancelamento text,
  add column resultado_detalhe text,
  add column updated_at timestamptz not null default now(),
  add column iniciado_em timestamptz,
  add column assumido_em timestamptz,
  add column primeira_resposta_em timestamptz,
  add column ultima_interacao_em timestamptz,
  add column concluido_em timestamptz,
  add column cancelado_em timestamptz,
  add column proxima_acao_em timestamptz,
  add column prazo_primeira_resposta_em timestamptz,
  add column prazo_resolucao_em timestamptz;

alter table public.atendimentos
  add constraint atendimentos_lead_id_fkey
    foreign key (lead_id) references public.leads(id) on delete restrict,
  add constraint atendimentos_responsavel_id_fkey
    foreign key (responsavel_id) references public.pessoas(id) on delete set null,
  add constraint atendimentos_atendimento_anterior_id_fkey
    foreign key (atendimento_anterior_id) references public.atendimentos(id) on delete set null,
  add constraint atendimentos_criado_por_user_id_fkey
    foreign key (criado_por_user_id) references auth.users(id) on delete set null,
  add constraint atendimentos_encerrado_por_user_id_fkey
    foreign key (encerrado_por_user_id) references auth.users(id) on delete set null,
  add constraint atendimentos_status_check
    check (status in ('aguardando', 'em_atendimento', 'aguardando_cliente', 'aguardando_interno', 'concluido', 'cancelado')),
  add constraint atendimentos_prioridade_check
    check (prioridade in ('baixa', 'normal', 'alta', 'urgente')),
  add constraint atendimentos_canal_check
    check (canal in ('manual', 'whatsapp', 'email', 'site', 'instagram', 'facebook', 'portal', 'telefone', 'indicacao', 'outro')),
  add constraint atendimentos_origem_check
    check (origem in ('distribuicao_manual', 'roleta_automatica', 'handoff_ia', 'criacao_manual', 'reabertura', 'integracao')),
  add constraint atendimentos_resultado_check
    check (resultado is null or resultado in ('qualificado', 'visita_agendada', 'proposta_iniciada', 'encaminhado_negocio', 'convertido', 'sem_interesse', 'sem_contato', 'atendimento_duplicado', 'cancelado_solicitante', 'outro')),
  add constraint atendimentos_assunto_length_check
    check (assunto is null or char_length(assunto) <= 160),
  add constraint atendimentos_resumo_length_check
    check (resumo is null or char_length(resumo) <= 2000),
  add constraint atendimentos_observacoes_internas_length_check
    check (observacoes_internas is null or char_length(observacoes_internas) <= 4000),
  add constraint atendimentos_motivo_cancelamento_length_check
    check (motivo_cancelamento is null or char_length(motivo_cancelamento) <= 1000),
  add constraint atendimentos_resultado_detalhe_length_check
    check (resultado_detalhe is null or char_length(resultado_detalhe) <= 2000),
  add constraint atendimentos_reabertura_sem_autorreferencia_check
    check (atendimento_anterior_id is null or atendimento_anterior_id <> id),
  add constraint atendimentos_encerramento_coerente_check
    check (
      (
        status in ('aguardando', 'em_atendimento', 'aguardando_cliente', 'aguardando_interno')
        and resultado is null
        and concluido_em is null
        and cancelado_em is null
        and encerrado_por_user_id is null
        and motivo_cancelamento is null
      )
      or (
        status = 'concluido'
        and resultado in ('qualificado', 'visita_agendada', 'proposta_iniciada', 'encaminhado_negocio', 'convertido', 'sem_interesse', 'sem_contato', 'outro')
        and concluido_em is not null
        and cancelado_em is null
        and encerrado_por_user_id is not null
        and motivo_cancelamento is null
      )
      or (
        status = 'cancelado'
        and resultado in ('sem_interesse', 'sem_contato', 'atendimento_duplicado', 'cancelado_solicitante', 'outro')
        and cancelado_em is not null
        and concluido_em is null
        and encerrado_por_user_id is not null
        and nullif(btrim(motivo_cancelamento), '') is not null
      )
    ),
  add constraint atendimentos_assuncao_coerente_check
    check (
      (status = 'aguardando' and assumido_em is null)
      or (status in ('em_atendimento', 'aguardando_cliente', 'aguardando_interno', 'concluido') and responsavel_id is not null and assumido_em is not null)
      or (status = 'cancelado' and ((responsavel_id is null and assumido_em is null) or (responsavel_id is not null and assumido_em is not null)))
    );

comment on column public.atendimentos.proprietario_id is 'LEGADO: vinculo com public.proprietarios preservado, sem uso em novos fluxos.';
comment on column public.atendimentos.score is 'LEGADO: classificacao textual preservada, sem uso no nucleo canonico.';
comment on column public.atendimentos.observacao is 'LEGADO: texto preservado, sem sincronizacao com resumo ou observacoes internas.';
comment on column public.atendimentos.lead_id is 'Lead canonico ao qual pertence a unidade operacional de Atendimento.';
comment on column public.atendimentos.responsavel_id is 'Pessoa canonica responsavel pela conducao do Atendimento.';
comment on column public.atendimentos.atendimento_anterior_id is 'Atendimento finalizado que originou uma reabertura; mesma Lead e estado final serao validados por RPC.';
comment on column public.atendimentos.status is 'Estado operacional canonico do Atendimento.';
comment on column public.atendimentos.prioridade is 'Prioridade da fila e do SLA; nao altera etapa ou permissao.';
comment on column public.atendimentos.canal is 'Canal de comunicacao do Atendimento, distinto da origem operacional.';
comment on column public.atendimentos.origem is 'Forma controlada pela qual o Atendimento foi criado.';
comment on column public.atendimentos.resultado is 'Resultado controlado, obrigatorio somente em estados finais.';
comment on column public.atendimentos.primeira_resposta_em is 'Timestamp preparatorio dependente do futuro modelo de interacoes ou mensagens.';
comment on column public.atendimentos.ultima_interacao_em is 'Timestamp preparatorio dependente do futuro modelo de interacoes ou mensagens.';

create unique index idx_atendimentos_lead_aberto_unico
  on public.atendimentos (lead_id)
  where status in ('aguardando', 'em_atendimento', 'aguardando_cliente', 'aguardando_interno');

create index idx_atendimentos_status
  on public.atendimentos (status);

create index idx_atendimentos_prioridade
  on public.atendimentos (prioridade);

create index idx_atendimentos_responsavel_status
  on public.atendimentos (responsavel_id, status);

create index idx_atendimentos_lead_created_at
  on public.atendimentos (lead_id, created_at desc);

create index idx_atendimentos_proxima_acao_em
  on public.atendimentos (proxima_acao_em)
  where proxima_acao_em is not null;

create index idx_atendimentos_prazo_primeira_resposta_aberto
  on public.atendimentos (prazo_primeira_resposta_em)
  where prazo_primeira_resposta_em is not null
    and status in ('aguardando', 'em_atendimento', 'aguardando_cliente', 'aguardando_interno');

create index idx_atendimentos_prazo_resolucao_aberto
  on public.atendimentos (prazo_resolucao_em)
  where prazo_resolucao_em is not null
    and status in ('aguardando', 'em_atendimento', 'aguardando_cliente', 'aguardando_interno');

create function public.set_atendimentos_updated_at()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  new.updated_at := pg_catalog.now();
  return new;
end;
$$;

revoke all privileges on function public.set_atendimentos_updated_at() from public;
revoke all privileges on function public.set_atendimentos_updated_at() from anon;
revoke all privileges on function public.set_atendimentos_updated_at() from authenticated;

create trigger set_atendimentos_updated_at_before_update
before update on public.atendimentos
for each row
execute function public.set_atendimentos_updated_at();

commit;

-- CONSULTAS INDEPENDENTES DE PRE-VERIFICACAO (executar manualmente antes da migration).
-- select count(*) as atendimentos_antes from public.atendimentos;
-- select column_name, data_type, is_nullable, column_default from information_schema.columns where table_schema = 'public' and table_name = 'atendimentos' order by ordinal_position;
-- select conname, contype, pg_get_constraintdef(oid) as definition from pg_catalog.pg_constraint where conrelid = 'public.atendimentos'::regclass order by conname;
-- select indexname, indexdef from pg_catalog.pg_indexes where schemaname = 'public' and tablename = 'atendimentos' order by indexname;
-- select policyname, cmd, roles, qual, with_check from pg_catalog.pg_policies where schemaname = 'public' and tablename = 'atendimentos' order by policyname;
-- select grantee, privilege_type from information_schema.role_table_grants where table_schema = 'public' and table_name = 'atendimentos' order by grantee, privilege_type;

-- CONSULTAS INDEPENDENTES DE POS-VERIFICACAO (executar manualmente apos a migration).
-- select count(*) as atendimentos_depois from public.atendimentos; -- deve continuar zero
-- select column_name, data_type, is_nullable, column_default from information_schema.columns where table_schema = 'public' and table_name = 'atendimentos' order by ordinal_position;
-- select conname, contype, pg_get_constraintdef(oid) as definition from pg_catalog.pg_constraint where conrelid = 'public.atendimentos'::regclass order by conname;
-- select indexname, indexdef from pg_catalog.pg_indexes where schemaname = 'public' and tablename = 'atendimentos' order by indexname;
-- select trigger_name, event_manipulation, action_timing from information_schema.triggers where event_object_schema = 'public' and event_object_table = 'atendimentos' order by trigger_name;
-- select to_regprocedure('public.set_atendimentos_updated_at()') as updated_at_function;
-- select relrowsecurity, relforcerowsecurity from pg_catalog.pg_class where oid = 'public.atendimentos'::regclass;
-- select policyname, cmd, roles, qual, with_check from pg_catalog.pg_policies where schemaname = 'public' and tablename = 'atendimentos' order by policyname;
-- select grantee, privilege_type from information_schema.role_table_grants where table_schema = 'public' and table_name = 'atendimentos' order by grantee, privilege_type;
-- select count(*) as anon_privileges from information_schema.role_table_grants where table_schema = 'public' and table_name = 'atendimentos' and grantee = 'anon';
-- select count(*) as write_policies from pg_catalog.pg_policies where schemaname = 'public' and tablename = 'atendimentos' and cmd in ('INSERT', 'UPDATE', 'DELETE', 'ALL');
-- select count(*) as dangerous_grants from information_schema.role_table_grants where table_schema = 'public' and table_name = 'atendimentos' and privilege_type in ('INSERT', 'UPDATE', 'DELETE', 'TRUNCATE');

-- ROLLBACK MANUAL DOCUMENTADO, NAO EXECUTAR AUTOMATICAMENTE.
-- Enquanto a tabela permanecer vazia e nenhuma interface usar o nucleo canonico:
-- 1. remover trigger set_atendimentos_updated_at_before_update;
-- 2. remover funcao public.set_atendimentos_updated_at();
-- 3. remover os oito indices idx_atendimentos_* criados acima;
-- 4. remover somente as novas FKs e CHECKs atendimentos_* desta migration;
-- 5. remover somente as novas colunas adicionadas nesta migration;
-- 6. restaurar status nullable default 'novo', origem nullable default 'whatsapp'
--    e created_at nullable default now().
-- Nunca remover tabela, PK, proprietario_id, FK legada, score ou observacao.
-- Depois de qualquer Atendimento real, nao usar rollback destrutivo: corrigir por
-- nova migration preservando dados.
