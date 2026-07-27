-- Sprint 2E1: identidade de contato e deduplicacao operacional de Leads.
-- Nao realiza backfill: contatos legados exigem validacao pela aplicacao.

begin;

do $$
begin
  if to_regclass('public.leads') is null then
    raise exception 'Precondition failed: public.leads does not exist';
  end if;

  if not exists (
    select 1
    from pg_catalog.pg_attribute
    where attrelid = 'public.leads'::regclass
      and attname = 'status_operacional'
      and atttypid = 'text'::regtype
      and not attisdropped
  ) then
    raise exception 'Precondition failed: public.leads.status_operacional text does not exist';
  end if;

  if not exists (
    select 1
    from pg_catalog.pg_attribute
    where attrelid = 'public.leads'::regclass
      and attname = 'telefone'
      and atttypid = 'text'::regtype
      and not attisdropped
  ) then
    raise exception 'Precondition failed: public.leads.telefone text does not exist';
  end if;
end
$$;

alter table public.leads
  add column telefone_normalizado text,
  add column email text,
  add column email_normalizado text;

alter table public.leads
  add constraint leads_telefone_normalizado_check
    check (
      telefone_normalizado is null
      or telefone_normalizado ~ '^\+55[0-9]{10,11}$'
    ),
  add constraint leads_email_normalizado_check
    check (
      email_normalizado is null
      or (
        char_length(email_normalizado) <= 254
        and email_normalizado = lower(email_normalizado)
        and email_normalizado = btrim(email_normalizado)
        and email_normalizado ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
      )
    );

create unique index idx_leads_telefone_normalizado_unico_ativo
  on public.leads (telefone_normalizado)
  where telefone_normalizado is not null
    and status_operacional = 'ativo';

create unique index idx_leads_email_normalizado_unico_ativo
  on public.leads (email_normalizado)
  where email_normalizado is not null
    and status_operacional = 'ativo';

commit;

-- CONSULTAS MANUAIS INDEPENDENTES DE VERIFICACAO.

-- Executar antes da migration e registrar o resultado.
-- select count(*) as leads_antes from public.leads;

-- Executar depois; deve ser igual a leads_antes.
-- select count(*) as leads_depois from public.leads;

-- Novas colunas, tipos e nullabilidade.
-- select column_name, data_type, is_nullable, column_default
-- from information_schema.columns
-- where table_schema = 'public'
--   and table_name = 'leads'
--   and column_name in ('telefone_normalizado', 'email', 'email_normalizado')
-- order by ordinal_position;

-- Constraints de formato.
-- select conname, pg_get_constraintdef(oid) as definition
-- from pg_catalog.pg_constraint
-- where conrelid = 'public.leads'::regclass
--   and conname in (
--     'leads_telefone_normalizado_check',
--     'leads_email_normalizado_check'
--   )
-- order by conname;

-- Indices unicos parciais e seus predicados.
-- select indexname, indexdef
-- from pg_catalog.pg_indexes
-- where schemaname = 'public'
--   and tablename = 'leads'
--   and indexname in (
--     'idx_leads_telefone_normalizado_unico_ativo',
--     'idx_leads_email_normalizado_unico_ativo'
--   )
-- order by indexname;

-- RLS permanece habilitado.
-- select relrowsecurity, relforcerowsecurity
-- from pg_catalog.pg_class
-- where oid = 'public.leads'::regclass;

-- Policies existentes permanecem inalteradas.
-- select policyname, cmd, roles, qual, with_check
-- from pg_catalog.pg_policies
-- where schemaname = 'public' and tablename = 'leads'
-- order by policyname;

-- Grants perigosos: anon deve retornar zero linhas; revisar tambem qualquer
-- privilegio destrutivo concedido a outros papeis.
-- select grantee, privilege_type
-- from information_schema.role_table_grants
-- where table_schema = 'public'
--   and table_name = 'leads'
--   and (
--     grantee = 'anon'
--     or privilege_type in ('DELETE', 'TRUNCATE')
--   )
-- order by grantee, privilege_type;

-- ROLLBACK DOCUMENTADO, NAO AUTOMATICO:
-- Antes do uso real, remover primeiro os dois indices, depois as duas
-- constraints e por ultimo as tres colunas. Depois que houver dados reais,
-- corrigir por uma nova migration preservando o historico. Nunca apagar Leads
-- para resolver conflitos de identidade.
