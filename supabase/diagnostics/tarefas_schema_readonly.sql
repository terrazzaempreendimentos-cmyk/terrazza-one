-- DIAGNOSTICO ADMINISTRATIVO SOMENTE DE LEITURA — NAO EXECUTADO PELO CODEX
-- Revise manualmente antes de usar no SQL Editor. RLS nao substitui essa revisao.

select count(*) as tarefas_count from public.tarefas;

select column_name, data_type, udt_name, is_nullable, column_default
from information_schema.columns
where table_schema = 'public' and table_name = 'tarefas'
order by ordinal_position;

select c.conname as constraint_name, c.contype as constraint_type,
       pg_get_constraintdef(c.oid, true) as definition
from pg_catalog.pg_constraint c
where c.conrelid = 'public.tarefas'::regclass
order by c.conname;

select c.conname as foreign_key_name,
       c.confrelid::regclass::text as referenced_table,
       pg_get_constraintdef(c.oid, true) as definition
from pg_catalog.pg_constraint c
where c.conrelid = 'public.tarefas'::regclass and c.contype = 'f'
order by c.conname;

select indexname, indexdef
from pg_catalog.pg_indexes
where schemaname = 'public' and tablename = 'tarefas'
order by indexname;

select t.tgname as trigger_name, pg_get_triggerdef(t.oid, true) as definition
from pg_catalog.pg_trigger t
where t.tgrelid = 'public.tarefas'::regclass and not t.tgisinternal
order by t.tgname;

select c.relrowsecurity as rls_enabled, c.relforcerowsecurity as rls_forced
from pg_catalog.pg_class c
where c.oid = 'public.tarefas'::regclass;

select policyname, permissive, roles, cmd, qual, with_check
from pg_catalog.pg_policies
where schemaname = 'public' and tablename = 'tarefas'
order by policyname;

select grantee, privilege_type, is_grantable
from information_schema.role_table_grants
where table_schema = 'public' and table_name = 'tarefas'
order by grantee, privilege_type;
