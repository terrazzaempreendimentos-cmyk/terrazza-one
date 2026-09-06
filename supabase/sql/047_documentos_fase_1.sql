-- Modulo Documentos - Fase 1: checklist e arquivos vinculados a Imovel ou
-- Negocio. Esta migration nao altera public.imoveis.upload_pdf.
--
-- Equivalencia lib/auth/permissions.ts -> RLS:
--
-- | Recurso/operacao             | Administrador/Gestor | Corretor                         | Atendimento |
-- |------------------------------|-----------------------|----------------------------------|-------------|
-- | checklist SELECT             | todos                 | todos                            | todos       |
-- | checklist INSERT/UPDATE      | todos                 | somente Imovel proprio           | nenhum      |
-- | documentos SELECT/INSERT     | Imovel e Negocio      | somente Imovel proprio           | nenhum      |
-- | documentos UPDATE logico     | Imovel e Negocio      | nenhum                           | nenhum      |
-- | Storage INSERT/SELECT        | Imovel e Negocio      | somente Imovel proprio           | nenhum      |
--
-- Negocios.responsavel_id referencia public.pessoas(id), mas ownership de
-- documentos de Negocio fica deliberadamente fora desta fase por decisao de
-- produto. Nao ha grant/policy de DELETE fisico nas tabelas nem no Storage.

begin;

do $$
declare
  tabela text;
begin
  foreach tabela in array array[
    'imoveis',
    'negocios',
    'usuarios_perfis'
  ] loop
    if to_regclass(format('public.%I', tabela)) is null then
      raise exception 'Precondition failed: public.% ausente', tabela;
    end if;
  end loop;

  if to_regclass('auth.users') is null then
    raise exception 'Precondition failed: auth.users ausente';
  end if;

  if to_regclass('storage.buckets') is null
     or to_regclass('storage.objects') is null then
    raise exception 'Precondition failed: Supabase Storage ausente';
  end if;

  if to_regprocedure('public.usuario_tem_papel(text[])') is null then
    raise exception 'Precondition failed: public.usuario_tem_papel(text[]) ausente';
  end if;

  if to_regprocedure('public.usuario_pessoa_corretor()') is null then
    raise exception 'Precondition failed: public.usuario_pessoa_corretor() ausente';
  end if;

  if to_regclass('public.checklist_documentos') is not null
     or to_regclass('public.documentos') is not null then
    raise exception 'Precondition failed: tabelas de Documentos ja existem';
  end if;
end;
$$;

create table public.checklist_documentos (
  id uuid primary key default gen_random_uuid(),
  imovel_id uuid,
  negocio_id uuid,
  codigo text not null,
  titulo text not null,
  descricao text,
  obrigatorio boolean not null default true,
  status text not null default 'pendente',
  ordem integer not null default 0,
  observacoes text,
  entregue_em timestamptz,
  entregue_por_user_id uuid,
  dispensado_em timestamptz,
  dispensado_por_user_id uuid,
  motivo_dispensa text,
  ativo boolean not null default true,
  criado_por_user_id uuid not null,
  atualizado_por_user_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint checklist_documentos_imovel_id_fkey
    foreign key (imovel_id) references public.imoveis(id) on delete restrict,
  constraint checklist_documentos_negocio_id_fkey
    foreign key (negocio_id) references public.negocios(id) on delete restrict,
  constraint checklist_documentos_entregue_por_user_id_fkey
    foreign key (entregue_por_user_id) references auth.users(id) on delete set null,
  constraint checklist_documentos_dispensado_por_user_id_fkey
    foreign key (dispensado_por_user_id) references auth.users(id) on delete set null,
  constraint checklist_documentos_criado_por_user_id_fkey
    foreign key (criado_por_user_id) references auth.users(id) on delete restrict,
  constraint checklist_documentos_atualizado_por_user_id_fkey
    foreign key (atualizado_por_user_id) references auth.users(id) on delete set null,
  constraint checklist_documentos_entidade_check
    check (num_nonnulls(imovel_id, negocio_id) = 1),
  constraint checklist_documentos_codigo_check
    check (nullif(btrim(codigo), '') is not null and char_length(codigo) <= 80),
  constraint checklist_documentos_titulo_check
    check (nullif(btrim(titulo), '') is not null and char_length(titulo) <= 160),
  constraint checklist_documentos_descricao_check
    check (descricao is null or char_length(descricao) <= 2000),
  constraint checklist_documentos_status_check
    check (status in ('pendente', 'entregue', 'dispensado')),
  constraint checklist_documentos_ordem_check
    check (ordem >= 0),
  constraint checklist_documentos_observacoes_check
    check (observacoes is null or char_length(observacoes) <= 2000),
  constraint checklist_documentos_motivo_dispensa_check
    check (motivo_dispensa is null or char_length(motivo_dispensa) <= 1000),
  constraint checklist_documentos_estado_check
    check (
      (
        status = 'pendente'
        and entregue_em is null
        and entregue_por_user_id is null
        and dispensado_em is null
        and dispensado_por_user_id is null
        and motivo_dispensa is null
      )
      or (
        status = 'entregue'
        and entregue_em is not null
        and entregue_por_user_id is not null
        and dispensado_em is null
        and dispensado_por_user_id is null
        and motivo_dispensa is null
      )
      or (
        status = 'dispensado'
        and entregue_em is null
        and entregue_por_user_id is null
        and dispensado_em is not null
        and dispensado_por_user_id is not null
        and nullif(btrim(motivo_dispensa), '') is not null
      )
    )
);

create table public.documentos (
  id uuid primary key default gen_random_uuid(),
  imovel_id uuid,
  negocio_id uuid,
  checklist_documento_id uuid,
  categoria text not null,
  titulo text,
  nome_original text not null,
  bucket_id text not null default 'crm-documentos',
  storage_path text not null,
  mime_type text not null,
  tamanho_bytes bigint not null,
  checksum_sha256 text,
  versao integer not null default 1,
  estado_arquivo text not null default 'pendente_upload',
  enviado_por_user_id uuid not null,
  disponibilizado_em timestamptz,
  ativo boolean not null default true,
  excluido_em timestamptz,
  excluido_por_user_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint documentos_imovel_id_fkey
    foreign key (imovel_id) references public.imoveis(id) on delete restrict,
  constraint documentos_negocio_id_fkey
    foreign key (negocio_id) references public.negocios(id) on delete restrict,
  constraint documentos_checklist_documento_id_fkey
    foreign key (checklist_documento_id) references public.checklist_documentos(id) on delete set null,
  constraint documentos_enviado_por_user_id_fkey
    foreign key (enviado_por_user_id) references auth.users(id) on delete restrict,
  constraint documentos_excluido_por_user_id_fkey
    foreign key (excluido_por_user_id) references auth.users(id) on delete set null,
  constraint documentos_entidade_check
    check (num_nonnulls(imovel_id, negocio_id) = 1),
  constraint documentos_categoria_check
    check (nullif(btrim(categoria), '') is not null and char_length(categoria) <= 80),
  constraint documentos_titulo_check
    check (titulo is null or (nullif(btrim(titulo), '') is not null and char_length(titulo) <= 160)),
  constraint documentos_nome_original_check
    check (nullif(btrim(nome_original), '') is not null and char_length(nome_original) <= 255),
  constraint documentos_bucket_check
    check (bucket_id = 'crm-documentos'),
  constraint documentos_storage_path_unico unique (storage_path),
  constraint documentos_storage_path_check
    check (
      storage_path !~ '[\\]'
      and storage_path !~ '(^|/)\.\.(/|$)'
      and (
        (
          imovel_id is not null
          and storage_path ~ (
            '^imoveis/' || imovel_id::text || '/' || id::text ||
            '/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(pdf|jpg|jpeg|png)$'
          )
        )
        or (
          negocio_id is not null
          and storage_path ~ (
            '^negocios/' || negocio_id::text || '/' || id::text ||
            '/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(pdf|jpg|jpeg|png)$'
          )
        )
      )
    ),
  constraint documentos_mime_type_check
    check (mime_type in ('application/pdf', 'image/jpeg', 'image/png')),
  constraint documentos_extensao_mime_check
    check (
      (mime_type = 'application/pdf' and storage_path ~ '\.pdf$')
      or (mime_type = 'image/jpeg' and storage_path ~ '\.(jpg|jpeg)$')
      or (mime_type = 'image/png' and storage_path ~ '\.png$')
    ),
  constraint documentos_tamanho_check
    check (tamanho_bytes > 0 and tamanho_bytes <= 6291456),
  constraint documentos_checksum_check
    check (checksum_sha256 is null or checksum_sha256 ~ '^[0-9a-f]{64}$'),
  constraint documentos_versao_check
    check (versao > 0),
  constraint documentos_estado_arquivo_check
    check (estado_arquivo in ('pendente_upload', 'disponivel', 'falhou', 'excluido')),
  constraint documentos_disponibilidade_check
    check (
      (estado_arquivo = 'disponivel' and disponibilizado_em is not null)
      or (
        estado_arquivo in ('pendente_upload', 'falhou')
        and disponibilizado_em is null
      )
      or estado_arquivo = 'excluido'
    ),
  constraint documentos_exclusao_logica_check
    check (
      (
        estado_arquivo = 'excluido'
        and ativo is false
        and excluido_em is not null
        and excluido_por_user_id is not null
      )
      or (
        estado_arquivo <> 'excluido'
        and ativo is true
        and excluido_em is null
        and excluido_por_user_id is null
      )
    )
);

comment on table public.checklist_documentos is
  'Itens documentais de Imoveis ou Negocios; status independe da existencia de arquivo.';
comment on table public.documentos is
  'Metadata de arquivos privados no bucket crm-documentos; nunca armazena URL publica.';
comment on column public.documentos.storage_path is
  'Path canonico composto apenas por tipo da entidade e UUIDs; nome original fica fora do path.';

create index idx_checklist_documentos_imovel_status
  on public.checklist_documentos (imovel_id, status)
  where ativo = true and imovel_id is not null;

create index idx_checklist_documentos_negocio_status
  on public.checklist_documentos (negocio_id, status)
  where ativo = true and negocio_id is not null;

create unique index idx_checklist_documentos_imovel_codigo_ativo
  on public.checklist_documentos (imovel_id, codigo)
  where ativo = true and imovel_id is not null;

create unique index idx_checklist_documentos_negocio_codigo_ativo
  on public.checklist_documentos (negocio_id, codigo)
  where ativo = true and negocio_id is not null;

create index idx_documentos_imovel_ativos
  on public.documentos (imovel_id, created_at desc)
  where ativo = true and imovel_id is not null;

create index idx_documentos_negocio_ativos
  on public.documentos (negocio_id, created_at desc)
  where ativo = true and negocio_id is not null;

create index idx_documentos_checklist_ativos
  on public.documentos (checklist_documento_id, created_at desc)
  where ativo = true and checklist_documento_id is not null;

create index idx_documentos_estado_arquivo
  on public.documentos (estado_arquivo, created_at)
  where estado_arquivo <> 'excluido';

create function public.set_documentos_updated_at()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  new.updated_at := pg_catalog.now();
  return new;
end;
$$;

create function public.validar_documento_checklist_vinculo()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_imovel_id uuid;
  v_negocio_id uuid;
begin
  if new.checklist_documento_id is null then
    return new;
  end if;

  select checklist.imovel_id, checklist.negocio_id
    into v_imovel_id, v_negocio_id
  from public.checklist_documentos as checklist
  where checklist.id = new.checklist_documento_id
    and checklist.ativo is true;

  if not found
     or new.imovel_id is distinct from v_imovel_id
     or new.negocio_id is distinct from v_negocio_id then
    raise exception using
      errcode = '23514',
      message = 'Checklist documental nao pertence a mesma entidade do arquivo.';
  end if;

  return new;
end;
$$;

revoke all privileges on function public.set_documentos_updated_at() from public;
revoke all privileges on function public.set_documentos_updated_at() from anon;
revoke all privileges on function public.set_documentos_updated_at() from authenticated;
revoke all privileges on function public.validar_documento_checklist_vinculo() from public;
revoke all privileges on function public.validar_documento_checklist_vinculo() from anon;
revoke all privileges on function public.validar_documento_checklist_vinculo() from authenticated;

create trigger set_checklist_documentos_updated_at_before_update
before update on public.checklist_documentos
for each row execute function public.set_documentos_updated_at();

create trigger set_documentos_updated_at_before_update
before update on public.documentos
for each row execute function public.set_documentos_updated_at();

create trigger validar_documento_checklist_vinculo_before_write
before insert or update of checklist_documento_id, imovel_id, negocio_id
on public.documentos
for each row execute function public.validar_documento_checklist_vinculo();

alter table public.checklist_documentos enable row level security;
alter table public.documentos enable row level security;

revoke all privileges on table public.checklist_documentos from public;
revoke all privileges on table public.checklist_documentos from anon;
revoke all privileges on table public.checklist_documentos from authenticated;
grant select, insert, update on table public.checklist_documentos to authenticated;

revoke all privileges on table public.documentos from public;
revoke all privileges on table public.documentos from anon;
revoke all privileges on table public.documentos from authenticated;
grant select, insert, update on table public.documentos to authenticated;

drop policy if exists papeis_ativos_select_checklist_documentos on public.checklist_documentos;
drop policy if exists admin_gestor_corretor_insert_checklist_documentos on public.checklist_documentos;
drop policy if exists admin_gestor_corretor_update_checklist_documentos on public.checklist_documentos;

create policy papeis_ativos_select_checklist_documentos
  on public.checklist_documentos for select to authenticated
  using (
    public.usuario_tem_papel(
      array['administrador','gestor','corretor','atendimento']::text[]
    )
  );

create policy admin_gestor_corretor_insert_checklist_documentos
  on public.checklist_documentos for insert to authenticated
  with check (
    criado_por_user_id = auth.uid()
    and (
      public.usuario_tem_papel(array['administrador','gestor']::text[])
      or (
        public.usuario_tem_papel(array['corretor']::text[])
        and negocio_id is null
        and exists (
          select 1
          from public.imoveis as imovel
          where imovel.id = checklist_documentos.imovel_id
            and imovel.responsavel_pessoa_id = public.usuario_pessoa_corretor()
        )
      )
    )
  );

create policy admin_gestor_corretor_update_checklist_documentos
  on public.checklist_documentos for update to authenticated
  using (
    public.usuario_tem_papel(array['administrador','gestor']::text[])
    or (
      public.usuario_tem_papel(array['corretor']::text[])
      and negocio_id is null
      and exists (
        select 1
        from public.imoveis as imovel
        where imovel.id = checklist_documentos.imovel_id
          and imovel.responsavel_pessoa_id = public.usuario_pessoa_corretor()
      )
    )
  )
  with check (
    atualizado_por_user_id = auth.uid()
    and (
      public.usuario_tem_papel(array['administrador','gestor']::text[])
      or (
        public.usuario_tem_papel(array['corretor']::text[])
        and negocio_id is null
        and exists (
          select 1
          from public.imoveis as imovel
          where imovel.id = checklist_documentos.imovel_id
            and imovel.responsavel_pessoa_id = public.usuario_pessoa_corretor()
        )
      )
    )
  );

drop policy if exists admin_gestor_corretor_select_documentos on public.documentos;
drop policy if exists admin_gestor_corretor_insert_documentos on public.documentos;
drop policy if exists admin_gestor_update_documentos on public.documentos;

create policy admin_gestor_corretor_select_documentos
  on public.documentos for select to authenticated
  using (
    public.usuario_tem_papel(array['administrador','gestor']::text[])
    or (
      ativo is true
      and negocio_id is null
      and public.usuario_tem_papel(array['corretor']::text[])
      and exists (
        select 1
        from public.imoveis as imovel
        where imovel.id = documentos.imovel_id
          and imovel.responsavel_pessoa_id = public.usuario_pessoa_corretor()
      )
    )
  );

create policy admin_gestor_corretor_insert_documentos
  on public.documentos for insert to authenticated
  with check (
    enviado_por_user_id = auth.uid()
    and estado_arquivo = 'pendente_upload'
    and ativo is true
    and disponibilizado_em is null
    and excluido_em is null
    and excluido_por_user_id is null
    and (
      public.usuario_tem_papel(array['administrador','gestor']::text[])
      or (
        public.usuario_tem_papel(array['corretor']::text[])
        and negocio_id is null
        and exists (
          select 1
          from public.imoveis as imovel
          where imovel.id = documentos.imovel_id
            and imovel.responsavel_pessoa_id = public.usuario_pessoa_corretor()
        )
      )
    )
  );

create policy admin_gestor_update_documentos
  on public.documentos for update to authenticated
  using (public.usuario_tem_papel(array['administrador','gestor']::text[]))
  with check (
    public.usuario_tem_papel(array['administrador','gestor']::text[])
    and (
      estado_arquivo <> 'excluido'
      or excluido_por_user_id = auth.uid()
    )
  );

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'crm-documentos',
  'crm-documentos',
  false,
  6291456,
  array['application/pdf','image/jpeg','image/png']::text[]
)
on conflict (id) do update
set name = excluded.name,
    public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create function public.usuario_pode_acessar_documento_storage(
  p_storage_path text,
  p_operacao text
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    auth.uid() is not null
    and p_operacao in ('enviar', 'baixar')
    and exists (
      select 1
      from public.documentos as documento
      left join public.imoveis as imovel
        on imovel.id = documento.imovel_id
      where documento.bucket_id = 'crm-documentos'
        and documento.storage_path = p_storage_path
        and documento.ativo is true
        and (
          (
            p_operacao = 'enviar'
            and documento.estado_arquivo = 'pendente_upload'
            and documento.enviado_por_user_id = auth.uid()
            and (
              public.usuario_tem_papel(array['administrador','gestor']::text[])
              or (
                documento.negocio_id is null
                and public.usuario_tem_papel(array['corretor']::text[])
                and imovel.responsavel_pessoa_id = public.usuario_pessoa_corretor()
              )
            )
          )
          or (
            p_operacao = 'baixar'
            and documento.estado_arquivo = 'disponivel'
            and (
              public.usuario_tem_papel(array['administrador','gestor']::text[])
              or (
                documento.negocio_id is null
                and public.usuario_tem_papel(array['corretor']::text[])
                and imovel.responsavel_pessoa_id = public.usuario_pessoa_corretor()
              )
            )
          )
        )
    )
$$;

revoke all privileges on function public.usuario_pode_acessar_documento_storage(text, text) from public;
revoke all privileges on function public.usuario_pode_acessar_documento_storage(text, text) from anon;
grant execute on function public.usuario_pode_acessar_documento_storage(text, text) to authenticated;

drop policy if exists crm_documentos_insert_autorizado on storage.objects;
drop policy if exists crm_documentos_select_autorizado on storage.objects;

create policy crm_documentos_insert_autorizado
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'crm-documentos'
    and public.usuario_pode_acessar_documento_storage(name, 'enviar')
  );

create policy crm_documentos_select_autorizado
  on storage.objects for select to authenticated
  using (
    bucket_id = 'crm-documentos'
    and public.usuario_pode_acessar_documento_storage(name, 'baixar')
  );

commit;

-- CONSULTAS MANUAIS DE VERIFICACAO (comentadas; fora da transacao).
-- select table_name, column_name, data_type, is_nullable, column_default
-- from information_schema.columns
-- where table_schema = 'public'
--   and table_name in ('checklist_documentos', 'documentos')
-- order by table_name, ordinal_position;
--
-- select tablename, policyname, cmd, roles, qual, with_check
-- from pg_catalog.pg_policies
-- where (schemaname = 'public' and tablename in ('checklist_documentos', 'documentos'))
--    or (schemaname = 'storage' and tablename = 'objects')
-- order by schemaname, tablename, policyname;
--
-- select id, name, public, file_size_limit, allowed_mime_types
-- from storage.buckets
-- where id = 'crm-documentos';
