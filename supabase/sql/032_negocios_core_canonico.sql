-- Sprint 3B2: nucleo canonico de Negocios e suas Pessoas participantes.

begin;

do $$
declare
  v_identidades_invalidas text[];
begin
  if to_regclass('public.negocios') is not null
    or to_regclass('public.negocios_partes') is not null then
    raise exception 'Precondition failed: canonical Negocio tables already exist';
  end if;

  if to_regclass('public.leads') is null
    or to_regclass('public.atendimentos') is null
    or to_regclass('public.imoveis') is null
    or to_regclass('public.pessoas') is null
    or to_regclass('public.timeline') is null
    or to_regclass('public.usuarios_perfis') is null
    or to_regclass('auth.users') is null then
    raise exception 'Precondition failed: required canonical tables do not exist';
  end if;

  if to_regprocedure('public.usuario_tem_papel(text[])') is null then
    raise exception 'Precondition failed: authorization helper does not exist';
  end if;

  if to_regprocedure('public.set_negocios_updated_at()') is not null
    or to_regprocedure('public.set_negocios_partes_updated_at()') is not null then
    raise exception 'Precondition failed: Negocio updated_at helpers already exist';
  end if;

  select array_agg(required.relation_name || '.id' order by required.relation_name)
    into v_identidades_invalidas
  from (
    values
      ('public', 'leads'),
      ('public', 'atendimentos'),
      ('public', 'imoveis'),
      ('public', 'pessoas'),
      ('auth', 'users')
  ) as required(schema_name, relation_name)
  where not exists (
    select 1
    from pg_catalog.pg_attribute as attribute
    join pg_catalog.pg_class as relation on relation.oid = attribute.attrelid
    join pg_catalog.pg_namespace as namespace on namespace.oid = relation.relnamespace
    where namespace.nspname = required.schema_name
      and relation.relname = required.relation_name
      and attribute.attname = 'id'
      and attribute.atttypid = 'uuid'::regtype
      and not attribute.attisdropped
  );

  if v_identidades_invalidas is not null then
    raise exception 'Precondition failed: canonical UUID identities are missing or incompatible: %',
      array_to_string(v_identidades_invalidas, ', ');
  end if;
end
$$;

create table public.negocios (
  id uuid primary key default gen_random_uuid(),
  negocio_anterior_id uuid,
  lead_id uuid not null,
  atendimento_id uuid,
  imovel_id uuid,
  responsavel_id uuid,
  tipo text not null,
  etapa text not null default 'estruturacao',
  status_operacional text not null default 'ativo',
  ativo boolean not null default true,
  titulo text not null,
  descricao text,
  resultado text,
  motivo_encerramento text,
  observacoes_internas text,
  moeda text not null default 'BRL',
  valor_anunciado numeric,
  valor_proposto numeric,
  valor_negociado numeric,
  valor_fechado numeric,
  comissao_percentual numeric,
  comissao_prevista numeric,
  comissao_efetiva numeric,
  sinal numeric,
  valor_financiado numeric,
  condicoes_comerciais text,
  observacao_financeira text,
  criado_por_user_id uuid,
  encerrado_por_user_id uuid,
  aberto_em timestamptz not null default now(),
  proposta_em timestamptz,
  previsao_fechamento date,
  contrato_enviado_em timestamptz,
  contrato_assinado_em timestamptz,
  inicio_vigencia date,
  fim_vigencia date,
  fechado_em timestamptz,
  perdido_em timestamptz,
  cancelado_em timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint negocios_negocio_anterior_id_fkey
    foreign key (negocio_anterior_id) references public.negocios(id) on delete restrict,
  constraint negocios_lead_id_fkey
    foreign key (lead_id) references public.leads(id) on delete restrict,
  constraint negocios_atendimento_id_fkey
    foreign key (atendimento_id) references public.atendimentos(id) on delete set null,
  constraint negocios_imovel_id_fkey
    foreign key (imovel_id) references public.imoveis(id) on delete restrict,
  constraint negocios_responsavel_id_fkey
    foreign key (responsavel_id) references public.pessoas(id) on delete set null,
  constraint negocios_criado_por_user_id_fkey
    foreign key (criado_por_user_id) references auth.users(id) on delete set null,
  constraint negocios_encerrado_por_user_id_fkey
    foreign key (encerrado_por_user_id) references auth.users(id) on delete restrict,
  constraint negocios_sem_autorreferencia_check
    check (negocio_anterior_id is null or negocio_anterior_id <> id),
  constraint negocios_tipo_check
    check (tipo in ('venda', 'locacao', 'administracao', 'outro')),
  constraint negocios_etapa_check
    check (etapa in ('estruturacao', 'proposta', 'negociacao', 'documentacao', 'contrato', 'assinatura')),
  constraint negocios_status_operacional_check
    check (status_operacional in ('ativo', 'concluido', 'perdido', 'cancelado')),
  constraint negocios_titulo_check
    check (nullif(btrim(titulo), '') is not null and char_length(titulo) <= 160),
  constraint negocios_descricao_length_check
    check (descricao is null or char_length(descricao) <= 4000),
  constraint negocios_motivo_encerramento_check
    check (motivo_encerramento is null or (nullif(btrim(motivo_encerramento), '') is not null and char_length(motivo_encerramento) <= 1000)),
  constraint negocios_observacoes_internas_length_check
    check (observacoes_internas is null or char_length(observacoes_internas) <= 4000),
  constraint negocios_condicoes_comerciais_length_check
    check (condicoes_comerciais is null or char_length(condicoes_comerciais) <= 4000),
  constraint negocios_observacao_financeira_length_check
    check (observacao_financeira is null or char_length(observacao_financeira) <= 2000),
  constraint negocios_moeda_check
    check (moeda ~ '^[A-Z]{3}$'),
  constraint negocios_valores_nao_negativos_check
    check (
      (valor_anunciado is null or valor_anunciado >= 0)
      and (valor_proposto is null or valor_proposto >= 0)
      and (valor_negociado is null or valor_negociado >= 0)
      and (valor_fechado is null or valor_fechado >= 0)
      and (comissao_prevista is null or comissao_prevista >= 0)
      and (comissao_efetiva is null or comissao_efetiva >= 0)
      and (sinal is null or sinal >= 0)
      and (valor_financiado is null or valor_financiado >= 0)
    ),
  constraint negocios_comissao_percentual_check
    check (comissao_percentual is null or (comissao_percentual >= 0 and comissao_percentual <= 100)),
  constraint negocios_imovel_por_tipo_check
    check (tipo = 'outro' or imovel_id is not null),
  constraint negocios_vigencia_check
    check (inicio_vigencia is null or fim_vigencia is null or fim_vigencia >= inicio_vigencia),
  constraint negocios_encerramento_coerente_check
    check (
      (
        status_operacional = 'ativo'
        and resultado is null
        and motivo_encerramento is null
        and fechado_em is null
        and perdido_em is null
        and cancelado_em is null
        and encerrado_por_user_id is null
      )
      or (
        status_operacional = 'concluido'
        and resultado in ('venda_fechada', 'locacao_fechada', 'administracao_contratada', 'parceria_concluida', 'outro')
        and fechado_em is not null
        and perdido_em is null
        and cancelado_em is null
        and encerrado_por_user_id is not null
      )
      or (
        status_operacional = 'perdido'
        and resultado in ('preco', 'documentacao', 'imovel_indisponivel', 'proprietario_desistiu', 'cliente_desistiu', 'concorrencia', 'financiamento_reprovado', 'sem_acordo', 'outro')
        and nullif(btrim(motivo_encerramento), '') is not null
        and fechado_em is null
        and perdido_em is not null
        and cancelado_em is null
        and encerrado_por_user_id is not null
      )
      or (
        status_operacional = 'cancelado'
        and resultado in ('duplicidade', 'cadastro_incorreto', 'operacao_invalida', 'solicitacao_administrativa', 'outro')
        and nullif(btrim(motivo_encerramento), '') is not null
        and fechado_em is null
        and perdido_em is null
        and cancelado_em is not null
        and encerrado_por_user_id is not null
      )
    )
);

create table public.negocios_partes (
  id uuid primary key default gen_random_uuid(),
  negocio_id uuid not null,
  pessoa_id uuid not null,
  papel text not null,
  principal boolean not null default false,
  participacao_percentual numeric,
  observacoes text,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint negocios_partes_negocio_id_fkey
    foreign key (negocio_id) references public.negocios(id) on delete restrict,
  constraint negocios_partes_pessoa_id_fkey
    foreign key (pessoa_id) references public.pessoas(id) on delete restrict,
  constraint negocios_partes_papel_check
    check (papel in ('proprietario', 'vendedor', 'comprador', 'locador', 'locatario', 'contratante', 'parceiro', 'outro')),
  constraint negocios_partes_participacao_percentual_check
    check (participacao_percentual is null or (participacao_percentual >= 0 and participacao_percentual <= 100)),
  constraint negocios_partes_observacoes_length_check
    check (observacoes is null or char_length(observacoes) <= 2000)
);

comment on table public.negocios is 'Unidade comercial canonica de uma operacao imobiliaria concreta.';
comment on column public.negocios.ativo is 'Arquivamento logico: false preserva etapa, status, resultado e datas historicas.';
comment on column public.negocios.negocio_anterior_id is 'Negocio encerrado que originou um novo ciclo; coerencia relacional sera validada por RPC.';
comment on column public.negocios.responsavel_id is 'Pessoa canonica responsavel; nunca identidade legada ou inferida por texto.';
comment on table public.negocios_partes is 'Pessoas canonicas participantes de um Negocio, com papel contextual controlado.';

create index idx_negocios_lead_status
  on public.negocios (lead_id, status_operacional)
  where ativo = true;

create index idx_negocios_responsavel_status
  on public.negocios (responsavel_id, status_operacional)
  where ativo = true and responsavel_id is not null;

create index idx_negocios_imovel_id
  on public.negocios (imovel_id)
  where imovel_id is not null;

create index idx_negocios_tipo_status
  on public.negocios (tipo, status_operacional)
  where ativo = true;

create index idx_negocios_etapa_ativos
  on public.negocios (etapa)
  where ativo = true and status_operacional = 'ativo';

create index idx_negocios_previsao_fechamento_ativos
  on public.negocios (previsao_fechamento)
  where ativo = true and status_operacional = 'ativo' and previsao_fechamento is not null;

create index idx_negocios_updated_at_desc
  on public.negocios (updated_at desc);

create index idx_negocios_negocio_anterior_id
  on public.negocios (negocio_anterior_id)
  where negocio_anterior_id is not null;

create index idx_negocios_partes_negocio_id
  on public.negocios_partes (negocio_id);

create index idx_negocios_partes_pessoa_id
  on public.negocios_partes (pessoa_id);

create unique index idx_negocios_partes_vinculo_ativo_unico
  on public.negocios_partes (negocio_id, pessoa_id, papel)
  where ativo = true;

create unique index idx_negocios_partes_principal_ativo_unico
  on public.negocios_partes (negocio_id, papel)
  where ativo = true and principal = true;

create function public.set_negocios_updated_at()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  new.updated_at := pg_catalog.now();
  return new;
end;
$$;

create function public.set_negocios_partes_updated_at()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  new.updated_at := pg_catalog.now();
  return new;
end;
$$;

revoke all privileges on function public.set_negocios_updated_at() from public;
revoke all privileges on function public.set_negocios_updated_at() from anon;
revoke all privileges on function public.set_negocios_updated_at() from authenticated;
revoke all privileges on function public.set_negocios_partes_updated_at() from public;
revoke all privileges on function public.set_negocios_partes_updated_at() from anon;
revoke all privileges on function public.set_negocios_partes_updated_at() from authenticated;

create trigger set_negocios_updated_at_before_update
before update on public.negocios
for each row execute function public.set_negocios_updated_at();

create trigger set_negocios_partes_updated_at_before_update
before update on public.negocios_partes
for each row execute function public.set_negocios_partes_updated_at();

alter table public.negocios enable row level security;
alter table public.negocios_partes enable row level security;

revoke all privileges on table public.negocios from public;
revoke all privileges on table public.negocios from anon;
revoke all privileges on table public.negocios from authenticated;
grant select, insert, update on table public.negocios to authenticated;

revoke all privileges on table public.negocios_partes from public;
revoke all privileges on table public.negocios_partes from anon;
revoke all privileges on table public.negocios_partes from authenticated;
grant select, insert, update on table public.negocios_partes to authenticated;

create policy admin_ativo_select_negocios
  on public.negocios for select to authenticated
  using (public.usuario_tem_papel(array['administrador']::text[]));

create policy admin_ativo_insert_negocios
  on public.negocios for insert to authenticated
  with check (public.usuario_tem_papel(array['administrador']::text[]));

create policy admin_ativo_update_negocios
  on public.negocios for update to authenticated
  using (public.usuario_tem_papel(array['administrador']::text[]))
  with check (public.usuario_tem_papel(array['administrador']::text[]));

create policy admin_ativo_select_negocios_partes
  on public.negocios_partes for select to authenticated
  using (public.usuario_tem_papel(array['administrador']::text[]));

create policy admin_ativo_insert_negocios_partes
  on public.negocios_partes for insert to authenticated
  with check (public.usuario_tem_papel(array['administrador']::text[]));

create policy admin_ativo_update_negocios_partes
  on public.negocios_partes for update to authenticated
  using (public.usuario_tem_papel(array['administrador']::text[]))
  with check (public.usuario_tem_papel(array['administrador']::text[]));

commit;

-- CONSULTAS MANUAIS DE VERIFICACAO (comentadas; fora da transacao).
-- select to_regclass('public.negocios') as negocios, to_regclass('public.negocios_partes') as negocios_partes;
-- select (select count(*) from public.negocios) as negocios, (select count(*) from public.negocios_partes) as negocios_partes; -- ambos zero
-- select table_name, column_name, data_type, udt_name, is_nullable, column_default from information_schema.columns where table_schema = 'public' and table_name in ('negocios', 'negocios_partes') order by table_name, ordinal_position;
-- select conrelid::regclass as tabela, conname, contype, pg_get_constraintdef(oid, true) as definicao from pg_catalog.pg_constraint where conrelid in ('public.negocios'::regclass, 'public.negocios_partes'::regclass) order by conrelid::regclass::text, conname;
-- select tablename, indexname, indexdef from pg_catalog.pg_indexes where schemaname = 'public' and tablename in ('negocios', 'negocios_partes') order by tablename, indexname;
-- select event_object_table, trigger_name, action_timing, event_manipulation from information_schema.triggers where event_object_schema = 'public' and event_object_table in ('negocios', 'negocios_partes') order by event_object_table, trigger_name;
-- select to_regprocedure('public.set_negocios_updated_at()') as negocios_updated_at, to_regprocedure('public.set_negocios_partes_updated_at()') as partes_updated_at;
-- select p.oid::regprocedure as funcao, p.proconfig as configuracao, pg_get_functiondef(p.oid) as definicao from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname in ('set_negocios_updated_at', 'set_negocios_partes_updated_at') order by p.proname;
-- select oid::regclass as tabela, relrowsecurity, relforcerowsecurity from pg_catalog.pg_class where oid in ('public.negocios'::regclass, 'public.negocios_partes'::regclass) order by oid::regclass::text;
-- select tablename, policyname, cmd, roles, qual, with_check from pg_catalog.pg_policies where schemaname = 'public' and tablename in ('negocios', 'negocios_partes') order by tablename, policyname;
-- select table_name, grantee, privilege_type from information_schema.role_table_grants where table_schema = 'public' and table_name in ('negocios', 'negocios_partes') order by table_name, grantee, privilege_type;
-- select count(*) as privilegios_anon from information_schema.role_table_grants where table_schema = 'public' and table_name in ('negocios', 'negocios_partes') and grantee = 'anon';
-- select count(*) as privilegios_perigosos from information_schema.role_table_grants where table_schema = 'public' and table_name in ('negocios', 'negocios_partes') and privilege_type in ('DELETE', 'TRUNCATE', 'TRIGGER', 'REFERENCES');

-- ROLLBACK MANUAL DOCUMENTADO; SOMENTE ANTES DE QUALQUER DADO REAL.
-- 1. Remover nominalmente as seis policies desta migration.
-- 2. Revogar os grants concedidos a authenticated.
-- 3. Remover os dois triggers exclusivos.
-- 4. Remover as duas funcoes exclusivas de updated_at.
-- 5. Remover public.negocios_partes sem propagacao automatica.
-- 6. Remover public.negocios sem propagacao automatica.
-- Apos qualquer dado real, nao remover tabelas ou colunas: criar migration corretiva
-- e preservar integralmente o historico comercial.
