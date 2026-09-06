-- Melhora a visibilidade operacional do funil de Negocios sem alterar RLS,
-- permissoes ou as regras existentes de transicao entre etapas.
--
-- Para registros anteriores a esta migration, etapa_alterada_em recebe
-- coalesce(updated_at, created_at, now()). Esse backfill e apenas uma
-- aproximacao: antes desta coluna nao havia historico confiavel da data da
-- ultima troca de etapa, e updated_at tambem podia mudar em outras edicoes.

begin;

do $$
begin
  if to_regclass('public.negocios') is null then
    raise exception 'Precondition failed: public.negocios ausente';
  end if;

  if to_regprocedure('public.movimentar_negocio(uuid,text,timestamp with time zone,text)') is null then
    raise exception 'Precondition failed: public.movimentar_negocio(uuid,text,timestamptz,text) ausente';
  end if;
end;
$$;

alter table public.negocios
  add column if not exists etapa_alterada_em timestamptz;

update public.negocios
set etapa_alterada_em = coalesce(updated_at, created_at, pg_catalog.now())
where etapa_alterada_em is null;

alter table public.negocios
  alter column etapa_alterada_em set default pg_catalog.now(),
  alter column etapa_alterada_em set not null;

comment on column public.negocios.etapa_alterada_em is
  'Data da ultima troca efetiva de etapa. Para dados anteriores a migration 050, o valor inicial e uma aproximacao baseada em updated_at/created_at.';

create index if not exists idx_negocios_ativos_etapa_alterada_em
  on public.negocios (status_operacional, etapa_alterada_em)
  where ativo = true and status_operacional = 'ativo';

create or replace function public.movimentar_negocio(
  p_negocio_id uuid,
  p_etapa_destino text,
  p_updated_at_esperado timestamptz,
  p_observacao text default null
)
returns table(
  negocio_id uuid,
  etapa_anterior text,
  etapa_atual text,
  status_operacional text,
  ativo boolean,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_etapas constant text[] := array['estruturacao','proposta','negociacao','documentacao','contrato','assinatura'];
  v_etapa text;
  v_status text;
  v_ativo boolean;
  v_lead_id uuid;
  v_updated timestamptz;
  v_obs text;
  v_origem integer;
  v_destino integer;
begin
  if auth.uid() is null or not public.usuario_tem_papel(array['administrador','gestor']::text[]) then
    raise exception using errcode = 'P0001', message = 'Operacao nao autorizada.';
  end if;

  if p_negocio_id is null or p_updated_at_esperado is null then
    raise exception using errcode = 'P0001', message = 'Negocio atualizado por outra operacao.';
  end if;

  if p_etapa_destino is null
    or p_etapa_destino <> btrim(p_etapa_destino)
    or not (p_etapa_destino = any(v_etapas)) then
    raise exception using errcode = 'P0001', message = 'Transicao de etapa nao permitida.';
  end if;

  v_obs := nullif(btrim(p_observacao), '');
  if v_obs is not null and char_length(v_obs) > 500 then
    raise exception using errcode = 'P0001', message = 'Observacao excede o limite permitido.';
  end if;

  select
    negocio.etapa,
    negocio.status_operacional,
    negocio.ativo,
    negocio.lead_id,
    negocio.updated_at
  into
    v_etapa,
    v_status,
    v_ativo,
    v_lead_id,
    v_updated
  from public.negocios as negocio
  where negocio.id = p_negocio_id
  for update;

  if not found then
    raise exception using errcode = 'P0001', message = 'Negocio nao encontrado.';
  end if;

  if v_updated is distinct from p_updated_at_esperado then
    raise exception using errcode = 'P0001', message = 'Negocio atualizado por outra operacao.';
  end if;

  if not v_ativo then
    raise exception using errcode = 'P0001', message = 'Negocio arquivado.';
  end if;

  if v_status <> 'ativo' then
    raise exception using errcode = 'P0001', message = 'Negocio encerrado.';
  end if;

  v_origem := array_position(v_etapas, v_etapa);
  v_destino := array_position(v_etapas, p_etapa_destino);

  if v_origem is null
    or v_destino is null
    or v_origem = v_destino
    or abs(v_destino - v_origem) <> 1 then
    raise exception using errcode = 'P0001', message = 'Transicao de etapa nao permitida.';
  end if;

  update public.negocios as negocio
  set
    etapa = p_etapa_destino,
    etapa_alterada_em = pg_catalog.now()
  where negocio.id = p_negocio_id
  returning negocio.updated_at into v_updated;

  begin
    insert into public.timeline(tipo, titulo, descricao, lead_id, origem)
    values (
      'negocio_etapa_alterada',
      'Etapa do Negocio alterada',
      case
        when v_obs is null then format('Etapa alterada de %s para %s.', v_etapa, p_etapa_destino)
        else format('Etapa alterada de %s para %s. Observacao: %s', v_etapa, p_etapa_destino, v_obs)
      end,
      v_lead_id,
      'rpc_movimentar_negocio'
    );
  exception
    when others then
      raise exception using errcode = 'P0001', message = 'Falha ao registrar Timeline do Negocio.';
  end;

  return query
    select p_negocio_id, v_etapa, p_etapa_destino, 'ativo'::text, true, v_updated;
exception
  when sqlstate 'P0001' then
    raise;
  when others then
    raise exception using errcode = 'P0001', message = 'Nao foi possivel movimentar o Negocio.';
end;
$$;

revoke all privileges on function public.movimentar_negocio(uuid,text,timestamptz,text) from public;
revoke all privileges on function public.movimentar_negocio(uuid,text,timestamptz,text) from anon;
grant execute on function public.movimentar_negocio(uuid,text,timestamptz,text) to authenticated;

commit;

-- Verificacoes manuais apos aplicar:
-- select count(*) from public.negocios where etapa_alterada_em is null; -- deve ser 0
-- select column_name,data_type,is_nullable,column_default from information_schema.columns where table_schema='public' and table_name='negocios' and column_name='etapa_alterada_em';
-- select indexdef from pg_catalog.pg_indexes where schemaname='public' and tablename='negocios' and indexname='idx_negocios_ativos_etapa_alterada_em';
-- select pg_get_functiondef('public.movimentar_negocio(uuid,text,timestamp with time zone,text)'::regprocedure);
