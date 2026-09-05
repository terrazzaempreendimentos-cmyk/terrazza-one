-- P0.4: cria identidades canonicas de responsabilidade sem alterar os vinculos
-- legados. Nao existe relacao deterministica entre public.corretores e
-- public.pessoas; por isso esta migration nao executa backfill e nao infere
-- correspondencias por nome, e-mail, telefone, CRECI ou qualquer outro dado.
-- Registros existentes permanecem com responsavel_pessoa_id nulo ate associacao
-- explicita posterior por Administrador ou Gestor.

begin;

do $$
declare
  tabela text;
begin
  foreach tabela in array array['imoveis', 'pessoas', 'manutencoes_conflitos'] loop
    if to_regclass(format('public.%I', tabela)) is null then
      raise exception 'Precondition failed: public.% ausente', tabela;
    end if;
  end loop;

  if to_regclass('public.pessoas') is null then
    raise exception 'Precondition failed: public.pessoas ausente';
  end if;
end;
$$;

alter table public.imoveis
  add column if not exists responsavel_pessoa_id uuid;
alter table public.pessoas
  add column if not exists responsavel_pessoa_id uuid;
alter table public.manutencoes_conflitos
  add column if not exists responsavel_pessoa_id uuid;

do $$
begin
  if not exists (
    select 1 from pg_catalog.pg_constraint
    where conrelid = 'public.imoveis'::regclass
      and conname = 'imoveis_responsavel_pessoa_id_fkey'
  ) then
    alter table public.imoveis
      add constraint imoveis_responsavel_pessoa_id_fkey
      foreign key (responsavel_pessoa_id) references public.pessoas(id) on delete set null;
  end if;

  if not exists (
    select 1 from pg_catalog.pg_constraint
    where conrelid = 'public.pessoas'::regclass
      and conname = 'pessoas_responsavel_pessoa_id_fkey'
  ) then
    alter table public.pessoas
      add constraint pessoas_responsavel_pessoa_id_fkey
      foreign key (responsavel_pessoa_id) references public.pessoas(id) on delete set null;
  end if;

  if not exists (
    select 1 from pg_catalog.pg_constraint
    where conrelid = 'public.manutencoes_conflitos'::regclass
      and conname = 'manutencoes_conflitos_responsavel_pessoa_id_fkey'
  ) then
    alter table public.manutencoes_conflitos
      add constraint manutencoes_conflitos_responsavel_pessoa_id_fkey
      foreign key (responsavel_pessoa_id) references public.pessoas(id) on delete set null;
  end if;
end;
$$;

create index if not exists idx_imoveis_responsavel_pessoa_id
  on public.imoveis (responsavel_pessoa_id);
create index if not exists idx_pessoas_responsavel_pessoa_id
  on public.pessoas (responsavel_pessoa_id);
create index if not exists idx_manutencoes_conflitos_responsavel_pessoa_id
  on public.manutencoes_conflitos (responsavel_pessoa_id);

comment on column public.imoveis.responsavel_pessoa_id is
  'Pessoa canonica responsavel pela captacao. Sem backfill a partir de public.corretores.';
comment on column public.pessoas.responsavel_pessoa_id is
  'Pessoa-corretora canonica responsavel pelo relacionamento. Sem backfill legado.';
comment on column public.manutencoes_conflitos.responsavel_pessoa_id is
  'Pessoa-corretora canonica responsavel pelo caso. Sem backfill legado.';

commit;

-- Contagem somente leitura sugerida depois da aplicacao manual:
-- select 'imoveis' as tabela, count(*) as sem_responsavel_pessoa
-- from public.imoveis where responsavel_pessoa_id is null
-- union all
-- select 'pessoas', count(*) from public.pessoas where responsavel_pessoa_id is null
-- union all
-- select 'manutencoes_conflitos', count(*)
-- from public.manutencoes_conflitos where responsavel_pessoa_id is null;
