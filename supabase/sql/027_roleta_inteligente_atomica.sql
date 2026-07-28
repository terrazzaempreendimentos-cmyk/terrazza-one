-- Sprint 2H3: configuracao operacional e motor atomico da Roleta Inteligente.

begin;

do $$
declare
  v_colunas_ausentes text[];
begin
  if to_regclass('public.corretores_configuracoes') is not null then
    raise exception 'Precondition failed: public.corretores_configuracoes already exists';
  end if;

  if to_regclass('public.pessoas') is null
    or to_regclass('public.leads') is null
    or to_regclass('public.roleta_distribuicoes') is null then
    raise exception 'Precondition failed: required CRM tables do not exist';
  end if;

  if to_regprocedure('public.usuario_tem_papel(text[])') is null
    or to_regprocedure('public.distribuir_lead_para_corretor(uuid,uuid,text)') is null then
    raise exception 'Precondition failed: required authorization or distribution function does not exist';
  end if;

  select array_agg(required.table_name || '.' || required.column_name order by required.table_name, required.column_name)
    into v_colunas_ausentes
  from (
    values
      ('pessoas', 'id', 'uuid'),
      ('pessoas', 'nome', 'text'),
      ('pessoas', 'ativo', 'boolean'),
      ('pessoas', 'papeis', 'text[]'),
      ('leads', 'id', 'uuid'),
      ('leads', 'cidade', 'text'),
      ('leads', 'objetivo_imobiliario', 'text'),
      ('leads', 'canal', 'text'),
      ('leads', 'etapa_funil', 'text'),
      ('leads', 'status_operacional', 'text'),
      ('leads', 'responsavel_id', 'uuid'),
      ('roleta_distribuicoes', 'lead_id', 'uuid'),
      ('roleta_distribuicoes', 'corretor_pessoa_id', 'uuid'),
      ('roleta_distribuicoes', 'criterio', 'text'),
      ('roleta_distribuicoes', 'status', 'text'),
      ('roleta_distribuicoes', 'created_at', 'timestamp with time zone')
  ) as required(table_name, column_name, data_type)
  where not exists (
    select 1
    from pg_catalog.pg_attribute attribute
    join pg_catalog.pg_class relation on relation.oid = attribute.attrelid
    join pg_catalog.pg_namespace namespace on namespace.oid = relation.relnamespace
    where namespace.nspname = 'public'
      and relation.relname = required.table_name
      and attribute.attname = required.column_name
      and not attribute.attisdropped
      and pg_catalog.format_type(attribute.atttypid, attribute.atttypmod) = required.data_type
  );

  if v_colunas_ausentes is not null then
    raise exception 'Precondition failed: required CRM columns are missing or incompatible: %',
      array_to_string(v_colunas_ausentes, ', ');
  end if;
end
$$;

-- Helper imutavel exclusivo das constraints de filtros. Nao corrige valores.
create function public.roleta_filtro_texto_valido(
  p_valores text[],
  p_permitidos text[] default null,
  p_case_insensitive boolean default false
)
returns boolean
language sql
immutable
set search_path = pg_catalog
as $$
  select coalesce(
    p_valores is not null
    and array_position(p_valores, null) is null
    and not exists (
      select 1
      from unnest(p_valores) as item(valor)
      where valor = '' or valor <> btrim(valor)
    )
    and (p_permitidos is null or p_valores <@ p_permitidos)
    and cardinality(p_valores) = (
      select count(distinct case when p_case_insensitive then lower(valor) else valor end)
      from unnest(p_valores) as item(valor)
    ),
    false
  );
$$;

revoke all privileges on function public.roleta_filtro_texto_valido(text[], text[], boolean) from public;
revoke all privileges on function public.roleta_filtro_texto_valido(text[], text[], boolean) from anon;
grant execute on function public.roleta_filtro_texto_valido(text[], text[], boolean) to authenticated;

create table public.corretores_configuracoes (
  id uuid primary key default gen_random_uuid(),
  pessoa_id uuid not null unique,
  participa_roleta boolean not null default false,
  disponivel boolean not null default false,
  peso integer not null default 1,
  capacidade_atendimentos integer,
  cidades text[] not null default array[]::text[],
  objetivos_imobiliarios text[] not null default array[]::text[],
  canais text[] not null default array[]::text[],
  observacoes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint corretores_configuracoes_pessoa_id_fkey
    foreign key (pessoa_id) references public.pessoas(id) on delete restrict,
  constraint corretores_configuracoes_peso_check
    check (peso between 1 and 10),
  constraint corretores_configuracoes_capacidade_check
    check (capacidade_atendimentos is null or capacidade_atendimentos between 1 and 100),
  constraint corretores_configuracoes_observacoes_check
    check (observacoes is null or char_length(observacoes) <= 1000),
  constraint corretores_configuracoes_cidades_check
    check (public.roleta_filtro_texto_valido(cidades, null, true)),
  constraint corretores_configuracoes_objetivos_check
    check (public.roleta_filtro_texto_valido(
      objetivos_imobiliarios,
      array['comprar', 'alugar', 'vender', 'anunciar_locacao', 'administrar_imovel', 'avaliar_imovel', 'investir', 'outro']::text[],
      false
    )),
  constraint corretores_configuracoes_canais_check
    check (public.roleta_filtro_texto_valido(
      canais,
      array['manual', 'whatsapp', 'site', 'instagram', 'facebook', 'portal', 'telefone', 'indicacao', 'outro']::text[],
      false
    ))
);

create index idx_corretores_configuracoes_elegiveis
  on public.corretores_configuracoes (peso, pessoa_id)
  where participa_roleta = true and disponivel = true;

create index idx_corretores_configuracoes_cidades_gin
  on public.corretores_configuracoes using gin (cidades);
create index idx_corretores_configuracoes_objetivos_gin
  on public.corretores_configuracoes using gin (objetivos_imobiliarios);
create index idx_corretores_configuracoes_canais_gin
  on public.corretores_configuracoes using gin (canais);

create function public.set_corretores_configuracoes_updated_at()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  new.updated_at := pg_catalog.now();
  return new;
end;
$$;

revoke all privileges on function public.set_corretores_configuracoes_updated_at() from public;
revoke all privileges on function public.set_corretores_configuracoes_updated_at() from anon;

create trigger set_corretores_configuracoes_updated_at_before_update
before update on public.corretores_configuracoes
for each row execute function public.set_corretores_configuracoes_updated_at();

alter table public.corretores_configuracoes enable row level security;
revoke all privileges on table public.corretores_configuracoes from public;
revoke all privileges on table public.corretores_configuracoes from anon;
revoke all privileges on table public.corretores_configuracoes from authenticated;
grant select, insert, update on table public.corretores_configuracoes to authenticated;

create policy administrador_ativo_select_corretores_configuracoes
  on public.corretores_configuracoes for select to authenticated
  using (public.usuario_tem_papel(array['administrador']::text[]));
create policy administrador_ativo_insert_corretores_configuracoes
  on public.corretores_configuracoes for insert to authenticated
  with check (public.usuario_tem_papel(array['administrador']::text[]));
create policy administrador_ativo_update_corretores_configuracoes
  on public.corretores_configuracoes for update to authenticated
  using (public.usuario_tem_papel(array['administrador']::text[]))
  with check (public.usuario_tem_papel(array['administrador']::text[]));

create function public.distribuir_lead_roleta_automatica(
  p_lead_id uuid,
  p_motivo text default null
)
returns table (
  lead_id uuid,
  corretor_pessoa_id uuid,
  etapa_anterior text,
  etapa_atual text,
  distribuido_em timestamptz,
  criterio text
)
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_lock_namespace constant integer := 202602;
  v_lock_operation constant integer := 3;
  v_motivo text;
  v_cidade text;
  v_objetivo text;
  v_canal text;
  v_etapa text;
  v_status text;
  v_responsavel uuid;
  v_pessoa_escolhida uuid;
  v_result_lead_id uuid;
  v_result_pessoa_id uuid;
  v_result_etapa_anterior text;
  v_result_etapa_atual text;
  v_result_distribuido_em timestamptz;
  v_linhas_atualizadas integer;
begin
  if auth.uid() is null
    or not public.usuario_tem_papel(array['administrador', 'gestor']::text[]) then
    raise exception using errcode = 'P0001', message = 'Operacao nao autorizada.';
  end if;

  if p_lead_id is null then
    raise exception using errcode = 'P0001', message = 'Lead nao informado.';
  end if;

  v_motivo := nullif(btrim(p_motivo), '');
  if v_motivo is not null and char_length(v_motivo) > 500 then
    raise exception using errcode = 'P0001', message = 'Motivo excede o limite permitido.';
  end if;

  -- Lock exclusivo da Roleta automatica. Serializa fotografia e escolha global.
  perform pg_catalog.pg_advisory_xact_lock(v_lock_namespace, v_lock_operation);

  select
    nullif(btrim(lead.cidade), ''),
    lead.objetivo_imobiliario,
    lead.canal,
    lead.etapa_funil,
    lead.status_operacional,
    lead.responsavel_id
  into v_cidade, v_objetivo, v_canal, v_etapa, v_status, v_responsavel
  from public.leads as lead
  where lead.id = p_lead_id
  for update;

  if not found then
    raise exception using errcode = 'P0001', message = 'Lead nao encontrado.';
  end if;

  if v_status = 'arquivado' then
    raise exception using errcode = 'P0001', message = 'Lead inelegivel para distribuicao.';
  end if;

  if v_etapa is null
    or v_etapa not in ('novo', 'qualificacao', 'atendimento', 'visita_avaliacao', 'proposta', 'negociacao', 'documentacao', 'fechado', 'perdido')
    or v_status is null
    or v_status not in ('ativo', 'convertido', 'perdido', 'arquivado')
    or (v_etapa = 'fechado' and v_status <> 'convertido')
    or (v_etapa = 'perdido' and v_status <> 'perdido')
    or (v_etapa in ('novo', 'qualificacao', 'atendimento', 'visita_avaliacao', 'proposta', 'negociacao', 'documentacao') and v_status <> 'ativo') then
    raise exception using errcode = 'P0001', message = 'Estado atual do Lead inconsistente.';
  end if;

  if v_responsavel is not null then
    raise exception using errcode = 'P0001', message = 'Lead ja distribuido.';
  end if;

  if v_status <> 'ativo' or v_etapa not in ('novo', 'qualificacao') then
    raise exception using errcode = 'P0001', message = 'Lead inelegivel para distribuicao.';
  end if;

  select pessoa.id
    into v_pessoa_escolhida
  from public.corretores_configuracoes as configuracao
  join public.pessoas as pessoa on pessoa.id = configuracao.pessoa_id
  left join lateral (
    select count(*)::integer as total, max(distribuicao.created_at) as ultima
    from public.roleta_distribuicoes as distribuicao
    where distribuicao.corretor_pessoa_id = pessoa.id
      and distribuicao.status = 'distribuido'
  ) as historico on true
  left join lateral (
    select count(*)::integer as total
    from public.leads as lead_ativo
    where lead_ativo.responsavel_id = pessoa.id
      and lead_ativo.status_operacional = 'ativo'
      and lead_ativo.etapa_funil in ('atendimento', 'visita_avaliacao', 'proposta', 'negociacao', 'documentacao')
  ) as carga on true
  where configuracao.participa_roleta = true
    and configuracao.disponivel = true
    and pessoa.ativo = true
    and 'corretor' = any(coalesce(pessoa.papeis, array[]::text[]))
    and nullif(btrim(pessoa.nome), '') is not null
    and (configuracao.capacidade_atendimentos is null or carga.total < configuracao.capacidade_atendimentos)
    and (
      cardinality(configuracao.cidades) = 0
      or (v_cidade is not null and exists (
        select 1 from unnest(configuracao.cidades) as item(cidade)
        where lower(btrim(cidade)) = lower(v_cidade)
      ))
    )
    and (cardinality(configuracao.objetivos_imobiliarios) = 0 or (v_objetivo is not null and v_objetivo = any(configuracao.objetivos_imobiliarios)))
    and (cardinality(configuracao.canais) = 0 or (v_canal is not null and v_canal = any(configuracao.canais)))
  order by
    (historico.total::numeric / configuracao.peso::numeric) asc,
    carga.total asc,
    (historico.total = 0) desc,
    historico.ultima asc nulls first,
    lower(btrim(pessoa.nome)) asc,
    pessoa.id asc
  limit 1;

  if v_pessoa_escolhida is null then
    raise exception using errcode = 'P0001', message = 'Nenhuma Pessoa-corretora elegivel para distribuicao.';
  end if;

  begin
    select resultado.lead_id, resultado.corretor_pessoa_id, resultado.etapa_anterior,
      resultado.etapa_atual, resultado.distribuido_em
    into strict v_result_lead_id, v_result_pessoa_id, v_result_etapa_anterior,
      v_result_etapa_atual, v_result_distribuido_em
    from public.distribuir_lead_para_corretor(p_lead_id, v_pessoa_escolhida, v_motivo) as resultado;
  exception
    when no_data_found or too_many_rows then
      raise exception using errcode = 'P0001', message = 'Retorno inesperado da distribuicao.';
  end;

  if v_result_lead_id <> p_lead_id
    or v_result_pessoa_id <> v_pessoa_escolhida
    or v_result_etapa_anterior not in ('novo', 'qualificacao')
    or v_result_etapa_atual <> 'atendimento'
    or v_result_distribuido_em is null then
    raise exception using errcode = 'P0001', message = 'Retorno inesperado da distribuicao.';
  end if;

  -- Promove apenas a linha criada pela RPC manual nesta mesma transacao.
  update public.roleta_distribuicoes as distribuicao
  set criterio = 'roleta_automatica'
  where distribuicao.lead_id = p_lead_id
    and distribuicao.corretor_pessoa_id = v_pessoa_escolhida
    and distribuicao.status = 'distribuido'
    and distribuicao.criterio = 'manual'
    and distribuicao.created_at = v_result_distribuido_em;

  get diagnostics v_linhas_atualizadas = row_count;
  if v_linhas_atualizadas <> 1 then
    raise exception using errcode = 'P0001', message = 'Falha ao registrar criterio automatico.';
  end if;

  return query select v_result_lead_id, v_result_pessoa_id, v_result_etapa_anterior,
    v_result_etapa_atual, v_result_distribuido_em, 'roleta_automatica'::text;
exception
  when sqlstate 'P0001' then raise;
  when others then
    raise exception using errcode = 'P0001', message = 'Nao foi possivel distribuir o Lead automaticamente.';
end;
$$;

revoke all privileges on function public.distribuir_lead_roleta_automatica(uuid, text) from public;
revoke all privileges on function public.distribuir_lead_roleta_automatica(uuid, text) from anon;
grant execute on function public.distribuir_lead_roleta_automatica(uuid, text) to authenticated;

commit;

-- TESTES PLANEJADOS, NAO EXECUTADOS:
-- 1. Sem sessao; 2. perfil ausente/inativo; 3. corretor/atendimento negados.
-- 4. Gestor e administrador autorizados a distribuir.
-- 5. Pessoa sem configuracao; 6. participa_roleta=false; 7. indisponivel.
-- 8. Pessoa sem papel corretor; 9. Pessoa inativa; 10. capacidade atingida.
-- 11. Cidade incompativel; 12. objetivo incompativel; 13. canal incompativel.
-- 14. Arrays vazios aceitam qualquer valor, inclusive campo nulo do Lead.
-- 15. Pesos iguais; 16. pesos diferentes; 17. empate total deterministico.
-- 18. Lead inelegivel; 19. Lead ja atribuido; 20. nenhuma Pessoa elegivel.
-- 21. Distribuicao valida; 22. criterio roleta_automatica; 23. Timeline criada.
-- 24. Falha interna reverte Lead, historico e Timeline.
-- 25. Duas distribuicoes simultaneas sao serializadas pelo advisory xact lock.

-- CONSULTAS MANUAIS INDEPENDENTES DE VERIFICACAO.
-- Registrar antes e repetir depois; Leads, Pessoas, Roleta e Timeline nao mudam.
-- select (select count(*) from public.leads) leads,
--   (select count(*) from public.pessoas) pessoas,
--   (select count(*) from public.roleta_distribuicoes) roleta,
--   (select count(*) from public.timeline) timeline;

-- select to_regclass('public.corretores_configuracoes') as tabela;
-- select column_name, data_type, udt_name, is_nullable, column_default
-- from information_schema.columns where table_schema = 'public'
--   and table_name = 'corretores_configuracoes' order by ordinal_position;
-- select conname, contype, pg_get_constraintdef(oid) definition
-- from pg_catalog.pg_constraint
-- where conrelid = 'public.corretores_configuracoes'::regclass order by conname;
-- select indexname, indexdef from pg_catalog.pg_indexes
-- where schemaname = 'public' and tablename = 'corretores_configuracoes' order by indexname;
-- select tgname, pg_get_triggerdef(oid) from pg_catalog.pg_trigger
-- where tgrelid = 'public.corretores_configuracoes'::regclass and not tgisinternal;
-- select relrowsecurity, relforcerowsecurity from pg_catalog.pg_class
-- where oid = 'public.corretores_configuracoes'::regclass;
-- select policyname, cmd, roles, qual, with_check from pg_catalog.pg_policies
-- where schemaname = 'public' and tablename = 'corretores_configuracoes' order by policyname;
-- select grantee, privilege_type from information_schema.role_table_grants
-- where table_schema = 'public' and table_name = 'corretores_configuracoes'
-- order by grantee, privilege_type;
-- select to_regprocedure('public.distribuir_lead_roleta_automatica(uuid,text)') rpc_automatica,
--   to_regprocedure('public.distribuir_lead_para_corretor(uuid,uuid,text)') rpc_manual_preservada;
-- select pg_get_functiondef('public.distribuir_lead_roleta_automatica(uuid,text)'::regprocedure);
-- select p.prosecdef as security_definer, p.proconfig as function_config
-- from pg_catalog.pg_proc p
-- where p.oid = 'public.distribuir_lead_roleta_automatica(uuid,text)'::regprocedure;
-- select grantee, privilege_type from information_schema.routine_privileges
-- where routine_schema = 'public' and routine_name = 'distribuir_lead_roleta_automatica'
-- order by grantee, privilege_type;

-- ROLLBACK MANUAL DOCUMENTADO, NAO AUTOMATICO:
-- Antes de uso real: remover RPC automatica, policies, trigger, tabela e helpers
-- exclusivos, nesta ordem. Depois de uso real, corrigir por nova migration e
-- preservar configuracoes e historico. A RPC manual nunca faz parte do rollback.
