-- Sprint 2G1: movimentacao atomica do funil de Leads com Timeline obrigatoria.

begin;

-- Aborta antes de criar a RPC quando o contrato estrutural esperado diverge.
do $$
declare
  v_colunas_ausentes text[];
begin
  if to_regclass('public.leads') is null then
    raise exception 'Precondition failed: public.leads does not exist';
  end if;

  if to_regclass('public.timeline') is null then
    raise exception 'Precondition failed: public.timeline does not exist';
  end if;

  if to_regprocedure('public.usuario_tem_papel(text[])') is null then
    raise exception 'Precondition failed: authorization helper does not exist';
  end if;

  select array_agg(required.column_name order by required.column_name)
    into v_colunas_ausentes
  from (
    values
      ('leads', 'id', 'uuid'),
      ('leads', 'etapa_funil', 'text'),
      ('leads', 'status_operacional', 'text'),
      ('leads', 'status', 'text'),
      ('leads', 'updated_at', 'timestamp with time zone'),
      ('timeline', 'lead_id', 'uuid'),
      ('timeline', 'tipo', 'text'),
      ('timeline', 'titulo', 'text'),
      ('timeline', 'descricao', 'text'),
      ('timeline', 'origem', 'text')
  ) as required(table_name, column_name, data_type)
  where not exists (
    select 1
    from information_schema.columns existing
    where existing.table_schema = 'public'
      and existing.table_name = required.table_name
      and existing.column_name = required.column_name
      and existing.data_type = required.data_type
  );

  if v_colunas_ausentes is not null then
    raise exception 'Precondition failed: required CRM columns are missing or incompatible: %',
      array_to_string(v_colunas_ausentes, ', ');
  end if;

  if not exists (
    select 1
    from pg_catalog.pg_constraint constraint_definition
    where constraint_definition.contype = 'f'
      and constraint_definition.conrelid = 'public.timeline'::regclass
      and constraint_definition.confrelid = 'public.leads'::regclass
      and constraint_definition.conkey = array[
        (
          select attribute.attnum
          from pg_catalog.pg_attribute attribute
          where attribute.attrelid = 'public.timeline'::regclass
            and attribute.attname = 'lead_id'
            and not attribute.attisdropped
        )::smallint
      ]
  ) then
    raise exception 'Precondition failed: timeline.lead_id foreign key is missing';
  end if;
end
$$;

create or replace function public.movimentar_lead_funil(
  p_lead_id uuid,
  p_etapa_destino text,
  p_motivo text default null
)
returns table (
  lead_id uuid,
  etapa_anterior text,
  etapa_atual text,
  status_operacional text,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_etapas_validas constant text[] := array[
    'novo',
    'qualificacao',
    'atendimento',
    'visita_avaliacao',
    'proposta',
    'negociacao',
    'documentacao',
    'fechado',
    'perdido'
  ];
  v_fluxo_normal constant text[] := array[
    'novo',
    'qualificacao',
    'atendimento',
    'visita_avaliacao',
    'proposta',
    'negociacao',
    'documentacao',
    'fechado'
  ];
  v_etapa_anterior text;
  v_status_anterior text;
  v_novo_status text;
  v_status_legado text;
  v_motivo text;
  v_descricao text;
  v_updated_at timestamptz;
  v_posicao_origem integer;
  v_posicao_destino integer;
begin
  if auth.uid() is null then
    raise exception using
      errcode = 'P0001',
      message = 'Operacao nao autorizada.';
  end if;

  if not public.usuario_tem_papel(array['administrador', 'gestor']::text[]) then
    raise exception using
      errcode = 'P0001',
      message = 'Operacao nao autorizada.';
  end if;

  if p_lead_id is null then
    raise exception using
      errcode = 'P0001',
      message = 'Lead nao informado.';
  end if;

  if p_etapa_destino is null
    or p_etapa_destino <> btrim(p_etapa_destino)
    or not (p_etapa_destino = any(v_etapas_validas)) then
    raise exception using
      errcode = 'P0001',
      message = 'Etapa de destino invalida.';
  end if;

  v_motivo := nullif(btrim(p_motivo), '');
  if v_motivo is not null and char_length(v_motivo) > 500 then
    raise exception using
      errcode = 'P0001',
      message = 'Motivo excede o limite permitido.';
  end if;

  select lead.etapa_funil, lead.status_operacional
    into v_etapa_anterior, v_status_anterior
  from public.leads as lead
  where lead.id = p_lead_id
  for update;

  if not found then
    raise exception using
      errcode = 'P0001',
      message = 'Lead nao encontrado.';
  end if;

  if v_status_anterior = 'arquivado' then
    raise exception using
      errcode = 'P0001',
      message = 'Lead arquivado nao pode ser movimentado.';
  end if;

  if v_status_anterior is null
    or v_status_anterior not in ('ativo', 'convertido', 'perdido', 'arquivado') then
    raise exception using
      errcode = 'P0001',
      message = 'Status operacional atual invalido.';
  end if;

  if v_etapa_anterior is null
    or not (v_etapa_anterior = any(v_etapas_validas)) then
    raise exception using
      errcode = 'P0001',
      message = 'Etapa atual invalida.';
  end if;

  if (v_etapa_anterior = 'fechado' and v_status_anterior <> 'convertido')
    or (v_etapa_anterior = 'perdido' and v_status_anterior <> 'perdido')
    or (
      v_etapa_anterior in (
        'novo',
        'qualificacao',
        'atendimento',
        'visita_avaliacao',
        'proposta',
        'negociacao',
        'documentacao'
      )
      and v_status_anterior <> 'ativo'
    ) then
    raise exception using
      errcode = 'P0001',
      message = 'Estado atual do Lead inconsistente.';
  end if;

  if v_etapa_anterior = p_etapa_destino then
    raise exception using
      errcode = 'P0001',
      message = 'Origem e destino devem ser diferentes.';
  end if;

  if v_etapa_anterior = 'fechado' then
    raise exception using
      errcode = 'P0001',
      message = 'Lead fechado nao pode ser reaberto.';
  elsif v_etapa_anterior = 'perdido' then
    if p_etapa_destino in ('fechado', 'perdido') then
      raise exception using
        errcode = 'P0001',
        message = 'Transicao de etapa nao permitida.';
    end if;
  elsif p_etapa_destino <> 'perdido' then
    v_posicao_origem := array_position(v_fluxo_normal, v_etapa_anterior);
    v_posicao_destino := array_position(v_fluxo_normal, p_etapa_destino);

    if v_posicao_origem is null
      or v_posicao_destino is null
      or abs(v_posicao_destino - v_posicao_origem) <> 1 then
      raise exception using
        errcode = 'P0001',
        message = 'Transicao de etapa nao permitida.';
    end if;
  end if;

  v_novo_status := case p_etapa_destino
    when 'fechado' then 'convertido'
    when 'perdido' then 'perdido'
    else 'ativo'
  end;

  v_status_legado := case p_etapa_destino
    when 'novo' then 'novo'
    when 'qualificacao' then 'ia_qualificando'
    when 'atendimento' then 'corretor'
    when 'visita_avaliacao' then 'visita'
    when 'proposta' then 'proposta'
    when 'negociacao' then 'negociacao'
    when 'documentacao' then 'documentacao'
    when 'fechado' then 'fechado'
    when 'perdido' then 'perdido'
  end;

  update public.leads as lead
  set
    etapa_funil = p_etapa_destino,
    status_operacional = v_novo_status,
    status = v_status_legado
  where lead.id = p_lead_id
  returning lead.updated_at into v_updated_at;

  v_descricao := format(
    'Etapa alterada de %s para %s.%s',
    v_etapa_anterior,
    p_etapa_destino,
    case
      when v_motivo is null then ''
      else format(' Motivo: %s', v_motivo)
    end
  );

  begin
    insert into public.timeline (
      tipo,
      titulo,
      descricao,
      lead_id,
      origem
    )
    values (
      'lead_etapa_alterada',
      'Movimentacao do funil',
      v_descricao,
      p_lead_id,
      'rpc_movimentar_lead_funil'
    );
  exception
    when others then
      raise exception using
        errcode = 'P0001',
        message = 'Falha ao registrar historico da movimentacao.';
  end;

  return query
  select
    p_lead_id,
    v_etapa_anterior,
    p_etapa_destino,
    v_novo_status,
    v_updated_at;
exception
  when sqlstate 'P0001' then
    raise;
  when others then
    raise exception using
      errcode = 'P0001',
      message = 'Nao foi possivel movimentar o Lead.';
end;
$$;

revoke all privileges on function public.movimentar_lead_funil(uuid, text, text)
  from public;
revoke all privileges on function public.movimentar_lead_funil(uuid, text, text)
  from anon;
grant execute on function public.movimentar_lead_funil(uuid, text, text)
  to authenticated;

commit;

-- TESTES PLANEJADOS, NAO EXECUTADOS:
-- 1. Sem sessao: negar.
-- 2. Perfil ausente ou inativo: negar.
-- 3. Corretor e atendimento: negar.
-- 4. Administrador e gestor ativos: autorizar transicoes validas.
-- 5. Lead inexistente: falhar sem revelar identificador.
-- 6. Etapa desconhecida ou igual a atual: falhar.
-- 7. Avanco adjacente e retorno adjacente: permitir e criar Timeline.
-- 8. Salto nao adjacente: falhar sem alterar Lead ou Timeline.
-- 9. Etapa nao final para perdido: permitir e definir status perdido.
-- 10. Perdido para etapa operacional escolhida: permitir e definir ativo.
-- 11. Fechado para qualquer etapa: negar.
-- 12. Arquivado: negar.
-- 13. Induzir falha de Timeline em ambiente isolado: confirmar rollback do Lead.
-- 14. Duas sessoes concorrentes: confirmar espera, releitura e revalidacao.
-- 15. Etapa e status incoerentes: bloquear sem alterar Lead ou Timeline.

-- CONSULTAS MANUAIS INDEPENDENTES DE VERIFICACAO.

-- Registrar antes da aplicacao; repetir depois e confirmar totais identicos.
-- select
--   (select count(*) from public.leads) as leads_total,
--   (select count(*) from public.timeline) as timeline_total;

-- Existencia e assinatura exata.
-- select to_regprocedure(
--   'public.movimentar_lead_funil(uuid,text,text)'
-- ) as rpc;

-- Definicao completa para revisao de SECURITY DEFINER e search_path.
-- select pg_get_functiondef(
--   'public.movimentar_lead_funil(uuid,text,text)'::regprocedure
-- );

-- Privilegios esperados: somente authenticated recebe EXECUTE alem do owner.
-- select grantee, privilege_type
-- from information_schema.routine_privileges
-- where routine_schema = 'public'
--   and routine_name = 'movimentar_lead_funil'
-- order by grantee, privilege_type;

-- Rollback manual documentado pela assinatura exata, sem execucao automatica:
-- remover a funcao public.movimentar_lead_funil(uuid, text, text).
