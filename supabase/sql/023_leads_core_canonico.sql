-- Sprint 2C1: nucleo canonico de Leads.
-- Preserva integralmente os campos legados e nao migra identidades textuais.

begin;

-- Aborta antes de qualquer alteracao quando a base estrutural esperada nao existe.
do $$
begin
  if to_regclass('public.leads') is null then
    raise exception 'Precondition failed: public.leads does not exist';
  end if;

  if to_regclass('public.pessoas') is null then
    raise exception 'Precondition failed: public.pessoas does not exist';
  end if;

  if not exists (
    select 1
    from pg_catalog.pg_attribute
    where attrelid = 'public.pessoas'::regclass
      and attname = 'id'
      and atttypid = 'uuid'::regtype
      and not attisdropped
  ) then
    raise exception 'Precondition failed: public.pessoas.id UUID does not exist';
  end if;

  if not exists (
    select 1
    from pg_catalog.pg_attribute
    where attrelid = 'public.leads'::regclass
      and attname = 'created_at'
      and atttypid = 'timestamptz'::regtype
      and not attisdropped
  ) then
    raise exception 'Precondition failed: public.leads.created_at timestamptz does not exist';
  end if;
end
$$;

-- Defaults seguros tornam a alteracao compativel com registros preexistentes.
-- Campos que exigem classificacao ou identidade real permanecem nulos.
alter table public.leads
  add column etapa_funil text not null default 'novo',
  add column status_operacional text not null default 'ativo',
  add column temperatura text,
  add column tipo_relacionamento text,
  add column objetivo_imobiliario text,
  add column canal text not null default 'manual',
  add column origem_detalhe text,
  add column handoff_status text not null default 'humano',
  add column responsavel_id uuid,
  add column atribuido_em timestamptz,
  add column updated_at timestamptz not null default now();

alter table public.leads
  add constraint leads_etapa_funil_check
    check (etapa_funil in (
      'novo',
      'qualificacao',
      'atendimento',
      'visita_avaliacao',
      'proposta',
      'negociacao',
      'documentacao',
      'fechado',
      'perdido'
    )),
  add constraint leads_status_operacional_check
    check (status_operacional in (
      'ativo',
      'convertido',
      'perdido',
      'arquivado'
    )),
  add constraint leads_temperatura_check
    check (temperatura is null or temperatura in (
      'frio',
      'morno',
      'quente'
    )),
  add constraint leads_tipo_relacionamento_check
    check (tipo_relacionamento is null or tipo_relacionamento in (
      'interessado_imovel',
      'proprietario_anunciante',
      'proprietario_administracao',
      'avaliacao_imovel',
      'investidor',
      'parceiro',
      'outro'
    )),
  add constraint leads_objetivo_imobiliario_check
    check (objetivo_imobiliario is null or objetivo_imobiliario in (
      'comprar',
      'alugar',
      'vender',
      'anunciar_locacao',
      'administrar_imovel',
      'avaliar_imovel',
      'investir',
      'outro'
    )),
  add constraint leads_canal_check
    check (canal in (
      'manual',
      'whatsapp',
      'site',
      'instagram',
      'facebook',
      'portal',
      'telefone',
      'indicacao',
      'outro'
    )),
  add constraint leads_handoff_status_check
    check (handoff_status in (
      'ia',
      'aguardando_humano',
      'humano',
      'devolvido_ia',
      'encerrado'
    )),
  add constraint leads_responsavel_id_fkey
    foreign key (responsavel_id)
    references public.pessoas(id)
    on delete set null;

-- Os compostos atendem Kanban e carteira sem duplicar indices isolados com
-- status_operacional ou responsavel_id como primeira coluna.
create index idx_leads_etapa_funil
  on public.leads (etapa_funil);

create index idx_leads_status_operacional_etapa_funil
  on public.leads (status_operacional, etapa_funil);

create index idx_leads_temperatura
  on public.leads (temperatura);

create index idx_leads_canal
  on public.leads (canal);

create index idx_leads_responsavel_id_status_operacional
  on public.leads (responsavel_id, status_operacional);

create index idx_leads_created_at
  on public.leads (created_at);

create index idx_leads_updated_at
  on public.leads (updated_at);

-- Nao existe helper local reutilizavel. Esta funcao e exclusiva de Leads,
-- nao usa SQL dinamico e nao altera created_at.
create or replace function public.set_leads_updated_at()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  new.updated_at := pg_catalog.now();
  return new;
end;
$$;

drop trigger if exists set_leads_updated_at_before_update on public.leads;

create trigger set_leads_updated_at_before_update
before update on public.leads
for each row
execute function public.set_leads_updated_at();

commit;

-- CONSULTAS INDEPENDENTES DE VERIFICACAO (executar manualmente, nao fazem
-- parte da transacao acima).

-- Pre-verificacao: registrar este total antes de aplicar a migration.
-- select count(*) as leads_antes from public.leads;

-- Pos-verificacao: deve ser igual a leads_antes.
-- select count(*) as leads_depois from public.leads;

-- Estrutura, defaults e nullabilidade das novas colunas.
-- select
--   column_name,
--   data_type,
--   is_nullable,
--   column_default
-- from information_schema.columns
-- where table_schema = 'public'
--   and table_name = 'leads'
--   and column_name in (
--     'etapa_funil', 'status_operacional', 'temperatura',
--     'tipo_relacionamento', 'objetivo_imobiliario', 'canal',
--     'origem_detalhe', 'handoff_status', 'responsavel_id',
--     'atribuido_em', 'updated_at'
--   )
-- order by ordinal_position;

-- Constraints e FK, incluindo definicao exata.
-- select
--   constraint_name,
--   constraint_type,
--   pg_get_constraintdef(pc.oid) as definition
-- from information_schema.table_constraints tc
-- join pg_catalog.pg_constraint pc
--   on pc.conname = tc.constraint_name
--  and pc.conrelid = 'public.leads'::regclass
-- where tc.table_schema = 'public'
--   and tc.table_name = 'leads'
--   and tc.constraint_name like 'leads_%'
-- order by tc.constraint_name;

-- Indices do nucleo canonico.
-- select indexname, indexdef
-- from pg_catalog.pg_indexes
-- where schemaname = 'public'
--   and tablename = 'leads'
-- order by indexname;

-- Trigger e funcao de updated_at.
-- select
--   t.tgname as trigger_name,
--   p.proname as function_name,
--   pg_get_triggerdef(t.oid) as definition
-- from pg_catalog.pg_trigger t
-- join pg_catalog.pg_proc p on p.oid = t.tgfoid
-- where t.tgrelid = 'public.leads'::regclass
--   and not t.tgisinternal;

-- RLS permanece habilitado.
-- select relrowsecurity, relforcerowsecurity
-- from pg_catalog.pg_class
-- where oid = 'public.leads'::regclass;

-- Policies atuais continuam cobrindo a tabela e todas as suas colunas.
-- select policyname, cmd, roles, qual, with_check
-- from pg_catalog.pg_policies
-- where schemaname = 'public' and tablename = 'leads'
-- order by policyname;

-- Grants perigosos: o resultado esperado para anon e zero linhas; revisar
-- qualquer DELETE ou TRUNCATE concedido a outro papel.
-- select grantee, privilege_type
-- from information_schema.role_table_grants
-- where table_schema = 'public'
--   and table_name = 'leads'
--   and (
--     grantee = 'anon'
--     or privilege_type in ('DELETE', 'TRUNCATE')
--   )
-- order by grantee, privilege_type;

-- ROLLBACK DOCUMENTADO, NAO EXECUTAR AUTOMATICAMENTE:
-- Antes de qualquer dado real usar as novas colunas, um rollback manual deve
-- remover, nesta ordem: trigger, funcao exclusiva, FK/check constraints,
-- indices e somente entao as novas colunas. Apos uso real, nao remover colunas:
-- corrigir por nova migration preservando dados. Nenhuma tabela, coluna legada
-- ou dado legado deve ser removido em qualquer desses cenarios.
