begin;

-- Abort the whole transaction before any schema change when the expected
-- legacy foundation or the authorization helper is unavailable.
do $$
declare
  missing_columns text[];
begin
  if to_regclass('public.imoveis') is null then
    raise exception 'Precondition failed: public.imoveis does not exist';
  end if;

  if to_regclass('public.pessoas') is null then
    raise exception 'Precondition failed: public.pessoas does not exist';
  end if;

  if to_regclass('public.corretores') is null then
    raise exception 'Precondition failed: public.corretores does not exist';
  end if;

  if to_regclass('public.usuarios_perfis') is null then
    raise exception 'Precondition failed: public.usuarios_perfis does not exist';
  end if;

  if to_regprocedure('public.usuario_tem_papel(text[])') is null then
    raise exception 'Precondition failed: public.usuario_tem_papel(text[]) does not exist';
  end if;

  if to_regprocedure('gen_random_uuid()') is null then
    raise exception 'Precondition failed: gen_random_uuid() does not exist';
  end if;

  select array_agg(required.column_name order by required.column_name)
    into missing_columns
  from (
    values
      ('id'),
      ('proprietario_id'),
      ('tipo'),
      ('situacao'),
      ('ativo'),
      ('created_at'),
      ('updated_at')
  ) as required(column_name)
  where not exists (
    select 1
    from information_schema.columns existing
    where existing.table_schema = 'public'
      and existing.table_name = 'imoveis'
      and existing.column_name = required.column_name
  );

  if missing_columns is not null then
    raise exception 'Precondition failed: public.imoveis is missing legacy columns: %',
      array_to_string(missing_columns, ', ');
  end if;
end
$$;

-- Identification and commercial management. New fields remain nullable so
-- the existing legacy property stays valid without an automatic backfill.
alter table public.imoveis add column if not exists codigo text;
alter table public.imoveis add column if not exists titulo text;
alter table public.imoveis add column if not exists complemento text;
alter table public.imoveis add column if not exists subtipo text;
alter table public.imoveis add column if not exists finalidade text;
alter table public.imoveis add column if not exists status text;
alter table public.imoveis add column if not exists responsavel_id uuid
  references public.corretores(id) on delete set null;
alter table public.imoveis add column if not exists origem text default 'manual';
alter table public.imoveis add column if not exists data_captacao date;
alter table public.imoveis add column if not exists exclusividade boolean default false;
alter table public.imoveis add column if not exists observacoes text;

-- Expanded location. endereco, bairro and cidade are legacy fields and are
-- intentionally preserved without type or value changes.
alter table public.imoveis add column if not exists cep text;
alter table public.imoveis add column if not exists numero text;
alter table public.imoveis add column if not exists estado text;
alter table public.imoveis add column if not exists latitude numeric;
alter table public.imoveis add column if not exists longitude numeric;
alter table public.imoveis add column if not exists google_maps text;

-- Commercial and financial values. Legacy aluguel_pretendido and the fields
-- introduced by SQL 003 are not changed.
alter table public.imoveis add column if not exists valor_venda numeric;
alter table public.imoveis add column if not exists valor_locacao numeric;
alter table public.imoveis add column if not exists taxa_administracao numeric;
alter table public.imoveis add column if not exists comissao_venda numeric;
alter table public.imoveis add column if not exists comissao_locacao numeric;
alter table public.imoveis add column if not exists valor_minimo_aceito numeric;
alter table public.imoveis add column if not exists valor_ideal numeric;
alter table public.imoveis add column if not exists valor_anunciado numeric;

-- Areas, quantities and feature flags. Legacy metragem, quartos, banheiros
-- and garagem remain untouched for temporary read compatibility.
alter table public.imoveis add column if not exists area_total numeric;
alter table public.imoveis add column if not exists area_util numeric;
alter table public.imoveis add column if not exists area_construida numeric;
alter table public.imoveis add column if not exists dormitorios integer;
alter table public.imoveis add column if not exists suites integer;
alter table public.imoveis add column if not exists lavabos integer;
alter table public.imoveis add column if not exists garagens integer;
alter table public.imoveis add column if not exists andar integer;
alter table public.imoveis add column if not exists elevadores integer;
alter table public.imoveis add column if not exists ano_construcao integer;
alter table public.imoveis add column if not exists piscina boolean default false;
alter table public.imoveis add column if not exists academia boolean default false;
alter table public.imoveis add column if not exists varanda boolean default false;
alter table public.imoveis add column if not exists varanda_gourmet boolean default false;
alter table public.imoveis add column if not exists sacada boolean default false;
alter table public.imoveis add column if not exists churrasqueira boolean default false;
alter table public.imoveis add column if not exists energia_solar boolean default false;
alter table public.imoveis add column if not exists mobiliado boolean default false;
alter table public.imoveis add column if not exists aceita_pet boolean default false;
alter table public.imoveis add column if not exists ar_condicionado boolean default false;
alter table public.imoveis add column if not exists portaria boolean default false;
alter table public.imoveis add column if not exists condominio_fechado boolean default false;
alter table public.imoveis add column if not exists vista_mar boolean default false;
alter table public.imoveis add column if not exists frente_mar boolean default false;
alter table public.imoveis add column if not exists beira_lago boolean default false;
alter table public.imoveis add column if not exists acessibilidade boolean default false;

-- Documentation.
alter table public.imoveis add column if not exists matricula text;
alter table public.imoveis add column if not exists cartorio text;
alter table public.imoveis add column if not exists iptu_documento text;
alter table public.imoveis add column if not exists habite_se text;
alter table public.imoveis add column if not exists escritura text;
alter table public.imoveis add column if not exists registro text;
alter table public.imoveis add column if not exists documentacao_completa boolean default false;
alter table public.imoveis add column if not exists pendencias_documentacao text;
alter table public.imoveis add column if not exists upload_pdf text;

-- Media remains text because the current application serializes these fields
-- as strings rather than JSON values.
alter table public.imoveis add column if not exists fotos text;
alter table public.imoveis add column if not exists foto_principal text;
alter table public.imoveis add column if not exists thumbnail text;
alter table public.imoveis add column if not exists videos text;
alter table public.imoveis add column if not exists tour_360 text;
alter table public.imoveis add column if not exists drone text;
alter table public.imoveis add column if not exists planta text;
alter table public.imoveis add column if not exists ordenacao_midias text;

-- Publication.
alter table public.imoveis add column if not exists portal_proprio boolean default false;
alter table public.imoveis add column if not exists site boolean default false;
alter table public.imoveis add column if not exists chaves_na_mao boolean default false;
alter table public.imoveis add column if not exists olx boolean default false;
alter table public.imoveis add column if not exists viva_real boolean default false;
alter table public.imoveis add column if not exists zap boolean default false;
alter table public.imoveis add column if not exists status_publicacao text default 'nao_publicado';
alter table public.imoveis add column if not exists data_publicacao date;
alter table public.imoveis add column if not exists ultima_atualizacao_publicacao timestamptz;

-- UCE and commercial analysis fields. No value is generated automatically;
-- only neutral score defaults are used.
alter table public.imoveis add column if not exists resumo_comercial text;
alter table public.imoveis add column if not exists resumo_tecnico text;
alter table public.imoveis add column if not exists perfil_ideal text;
alter table public.imoveis add column if not exists observacoes_ia text;
alter table public.imoveis add column if not exists score_comercial integer default 0;
alter table public.imoveis add column if not exists score_locacao integer default 0;
alter table public.imoveis add column if not exists liquidez text;

-- Partial normalized uniqueness preserves the existing property when codigo
-- or matricula is null/blank and matches the application's normalization.
create unique index if not exists idx_imoveis_codigo_normalizado_unico_ativo
  on public.imoveis ((upper(regexp_replace(btrim(coalesce(codigo, '')), '\s+', '', 'g'))))
  where ativo = true
    and nullif(btrim(coalesce(codigo, '')), '') is not null;

create unique index if not exists idx_imoveis_matricula_normalizada_unica_ativa
  on public.imoveis ((upper(regexp_replace(btrim(coalesce(matricula, '')), '\s+', '', 'g'))))
  where ativo = true
    and nullif(btrim(coalesce(matricula, '')), '') is not null;

create index if not exists idx_imoveis_finalidade on public.imoveis (finalidade);
create index if not exists idx_imoveis_status on public.imoveis (status);
create index if not exists idx_imoveis_cidade on public.imoveis (cidade);
create index if not exists idx_imoveis_bairro on public.imoveis (bairro);
create index if not exists idx_imoveis_responsavel_id on public.imoveis (responsavel_id);
create index if not exists idx_imoveis_ativo on public.imoveis (ativo);
create index if not exists idx_imoveis_created_at on public.imoveis (created_at);

-- RESTRICT is intentional: both source entities use logical deletion and a
-- physical deletion must never silently erase ownership history.
create table if not exists public.imovel_proprietarios (
  id uuid primary key default gen_random_uuid(),
  imovel_id uuid not null
    references public.imoveis(id) on delete restrict,
  pessoa_id uuid not null
    references public.pessoas(id) on delete restrict,
  percentual_participacao numeric,
  contato_principal boolean not null default false,
  observacoes text,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint imovel_proprietarios_percentual_check
    check (
      percentual_participacao is null
      or percentual_participacao between 0 and 100
    )
);

create index if not exists idx_imovel_proprietarios_imovel_id
  on public.imovel_proprietarios (imovel_id);

create index if not exists idx_imovel_proprietarios_pessoa_id
  on public.imovel_proprietarios (pessoa_id);

create unique index if not exists idx_imovel_proprietarios_vinculo_ativo_unico
  on public.imovel_proprietarios (imovel_id, pessoa_id)
  where ativo = true;

create unique index if not exists idx_imovel_proprietarios_contato_principal_ativo_unico
  on public.imovel_proprietarios (imovel_id)
  where ativo = true and contato_principal = true;

alter table public.imovel_proprietarios enable row level security;

revoke all privileges on table public.imovel_proprietarios from public;
revoke all privileges on table public.imovel_proprietarios from anon;
revoke all privileges on table public.imovel_proprietarios from authenticated;

grant select, insert, update on table public.imovel_proprietarios to authenticated;

drop policy if exists admin_ativo_select_imovel_proprietarios
  on public.imovel_proprietarios;
drop policy if exists admin_ativo_insert_imovel_proprietarios
  on public.imovel_proprietarios;
drop policy if exists admin_ativo_update_imovel_proprietarios
  on public.imovel_proprietarios;

create policy admin_ativo_select_imovel_proprietarios
  on public.imovel_proprietarios
  for select
  to authenticated
  using (public.usuario_tem_papel(array['administrador']::text[]));

create policy admin_ativo_insert_imovel_proprietarios
  on public.imovel_proprietarios
  for insert
  to authenticated
  with check (public.usuario_tem_papel(array['administrador']::text[]));

create policy admin_ativo_update_imovel_proprietarios
  on public.imovel_proprietarios
  for update
  to authenticated
  using (public.usuario_tem_papel(array['administrador']::text[]))
  with check (public.usuario_tem_papel(array['administrador']::text[]));

commit;
