-- Sprint 3B3B: encerramento, reabertura e arquivamento atomicos de Negocios.

begin;

do $$
declare
  v_colunas_ausentes text[];
begin
  if to_regclass('public.negocios') is null
    or to_regclass('public.negocios_partes') is null
    or to_regclass('public.leads') is null
    or to_regclass('public.pessoas') is null
    or to_regclass('public.timeline') is null
    or to_regclass('public.usuarios_perfis') is null then
    raise exception 'Precondition failed: required canonical tables do not exist';
  end if;

  if to_regprocedure('public.usuario_tem_papel(text[])') is null
    or to_regprocedure('public.set_negocios_updated_at()') is null
    or to_regprocedure('public.set_negocios_partes_updated_at()') is null then
    raise exception 'Precondition failed: required helpers do not exist';
  end if;

  if to_regprocedure('public.criar_negocio(jsonb,jsonb)') is null
    or to_regprocedure('public.atualizar_negocio(uuid,timestamp with time zone,jsonb,jsonb)') is null
    or to_regprocedure('public.movimentar_negocio(uuid,text,timestamp with time zone,text)') is null then
    raise exception 'Precondition failed: migration 033 RPCs are missing';
  end if;

  if to_regprocedure('public.concluir_negocio(uuid,timestamp with time zone,text,numeric,numeric,text)') is not null
    or to_regprocedure('public.perder_negocio(uuid,timestamp with time zone,text,text,text)') is not null
    or to_regprocedure('public.cancelar_negocio(uuid,timestamp with time zone,text,text,text)') is not null
    or to_regprocedure('public.reabrir_negocio(uuid,timestamp with time zone,text,text,date)') is not null
    or to_regprocedure('public.arquivar_negocio(uuid,timestamp with time zone,text)') is not null then
    raise exception 'Precondition failed: one or more final Negocio RPCs already exist';
  end if;

  if not exists (select 1 from pg_catalog.pg_constraint where conrelid='public.negocios'::regclass and conname='negocios_encerramento_coerente_check')
    or not exists (select 1 from pg_catalog.pg_constraint where conrelid='public.negocios'::regclass and conname='negocios_tipo_check')
    or not exists (select 1 from pg_catalog.pg_constraint where conrelid='public.negocios'::regclass and conname='negocios_etapa_check')
    or not exists (select 1 from pg_catalog.pg_constraint where conrelid='public.negocios'::regclass and conname='negocios_status_operacional_check')
    or not exists (select 1 from pg_catalog.pg_constraint where conrelid='public.negocios_partes'::regclass and conname='negocios_partes_papel_check') then
    raise exception 'Precondition failed: essential Negocio constraints are missing';
  end if;

  if to_regclass('public.idx_negocios_partes_vinculo_ativo_unico') is null
    or to_regclass('public.idx_negocios_partes_principal_ativo_unico') is null then
    raise exception 'Precondition failed: essential Negocio indexes are missing';
  end if;
  if to_regclass('public.idx_negocios_negocio_anterior_unico') is not null then
    raise exception 'Precondition failed: reopen index already exists';
  end if;

  select array_agg(required.table_name||'.'||required.column_name order by required.table_name,required.column_name)
    into v_colunas_ausentes
  from (values
    ('negocios','id','uuid'),('negocios','negocio_anterior_id','uuid'),('negocios','lead_id','uuid'),
    ('negocios','atendimento_id','uuid'),('negocios','imovel_id','uuid'),('negocios','responsavel_id','uuid'),
    ('negocios','tipo','text'),('negocios','etapa','text'),('negocios','status_operacional','text'),
    ('negocios','ativo','boolean'),('negocios','titulo','text'),('negocios','descricao','text'),
    ('negocios','resultado','text'),('negocios','motivo_encerramento','text'),('negocios','observacoes_internas','text'),
    ('negocios','moeda','text'),('negocios','valor_anunciado','numeric'),('negocios','valor_fechado','numeric'),
    ('negocios','comissao_percentual','numeric'),('negocios','comissao_prevista','numeric'),('negocios','comissao_efetiva','numeric'),
    ('negocios','condicoes_comerciais','text'),('negocios','observacao_financeira','text'),
    ('negocios','criado_por_user_id','uuid'),('negocios','encerrado_por_user_id','uuid'),
    ('negocios','aberto_em','timestamp with time zone'),('negocios','previsao_fechamento','date'),
    ('negocios','fechado_em','timestamp with time zone'),('negocios','perdido_em','timestamp with time zone'),
    ('negocios','cancelado_em','timestamp with time zone'),('negocios','created_at','timestamp with time zone'),
    ('negocios','updated_at','timestamp with time zone'),
    ('negocios_partes','negocio_id','uuid'),('negocios_partes','pessoa_id','uuid'),
    ('negocios_partes','papel','text'),('negocios_partes','principal','boolean'),
    ('negocios_partes','participacao_percentual','numeric'),('negocios_partes','observacoes','text'),
    ('negocios_partes','ativo','boolean'),('leads','id','uuid'),
    ('pessoas','id','uuid'),('pessoas','ativo','boolean'),('pessoas','papeis','text[]'),
    ('timeline','tipo','text'),('timeline','titulo','text'),('timeline','descricao','text'),
    ('timeline','lead_id','uuid'),('timeline','origem','text')
  ) required(table_name,column_name,data_type)
  where not exists (
    select 1 from pg_catalog.pg_attribute attribute
    join pg_catalog.pg_class relation on relation.oid=attribute.attrelid
    join pg_catalog.pg_namespace namespace on namespace.oid=relation.relnamespace
    where namespace.nspname='public' and relation.relname=required.table_name
      and attribute.attname=required.column_name and not attribute.attisdropped
      and pg_catalog.format_type(attribute.atttypid,attribute.atttypmod)=required.data_type
  );
  if v_colunas_ausentes is not null then
    raise exception 'Precondition failed: required columns are missing or incompatible: %',array_to_string(v_colunas_ausentes,', ');
  end if;

  if exists (
    select 1 from public.negocios
    where negocio_anterior_id is not null
    group by negocio_anterior_id having count(*)>1
  ) then raise exception 'Precondition failed: duplicate Negocio reopenings exist'; end if;
end
$$;

create unique index idx_negocios_negocio_anterior_unico
  on public.negocios(negocio_anterior_id)
  where negocio_anterior_id is not null;

-- A partir desta migration, somente reabrir_negocio pode criar um sucessor.
-- CREATE OR REPLACE preserva assinatura e privilegios existentes da migration 033.
create or replace function public.criar_negocio(p_payload jsonb, p_partes jsonb)
returns table (
  negocio_id uuid, lead_id uuid, tipo text, etapa text, status_operacional text,
  ativo boolean, partes_ativas bigint, created_at timestamptz, updated_at timestamptz
)
language plpgsql security definer set search_path = pg_catalog
as $$
declare
  v_user_id uuid;
  v_allowed constant text[] := array['negocio_anterior_id','lead_id','atendimento_id','imovel_id','responsavel_id','tipo','titulo','descricao','observacoes_internas','moeda','valor_anunciado','valor_proposto','valor_negociado','valor_fechado','comissao_percentual','comissao_prevista','comissao_efetiva','sinal','valor_financiado','condicoes_comerciais','observacao_financeira','proposta_em','previsao_fechamento','contrato_enviado_em','contrato_assinado_em','inicio_vigencia','fim_vigencia'];
  v_item jsonb; v_key text; v_id uuid; v_lead_id uuid; v_atendimento_id uuid;
  v_imovel_id uuid; v_responsavel_id uuid; v_tipo text; v_titulo text; v_moeda text;
  v_created_at timestamptz; v_updated_at timestamptz; v_partes bigint := 0;
  v_pessoa_id uuid; v_papel text; v_principal boolean; v_participacao numeric; v_observacoes text;
begin
  v_user_id := auth.uid();
  if v_user_id is null or not public.usuario_tem_papel(array['administrador','gestor']::text[]) then
    raise exception using errcode = 'P0001', message = 'Operacao nao autorizada.';
  end if;
  if p_payload is null or jsonb_typeof(p_payload) <> 'object' then raise exception using errcode='P0001', message='Payload invalido.'; end if;
  for v_key in select jsonb_object_keys(p_payload) loop
    if not (v_key = any(v_allowed)) then raise exception using errcode='P0001', message='Campo desconhecido no payload.'; end if;
  end loop;
  if exists (
    select 1 from jsonb_each(p_payload) entry
    where (entry.key in ('negocio_anterior_id','lead_id','atendimento_id','imovel_id','responsavel_id','tipo','titulo','descricao','observacoes_internas','moeda','condicoes_comerciais','observacao_financeira','proposta_em','previsao_fechamento','contrato_enviado_em','contrato_assinado_em','inicio_vigencia','fim_vigencia') and jsonb_typeof(entry.value) not in ('string','null'))
      or (entry.key in ('valor_anunciado','valor_proposto','valor_negociado','valor_fechado','comissao_percentual','comissao_prevista','comissao_efetiva','sinal','valor_financiado') and jsonb_typeof(entry.value) not in ('number','null'))
  ) then raise exception using errcode='P0001', message='Payload invalido.'; end if;
  if p_payload ? 'negocio_anterior_id' and p_payload->'negocio_anterior_id' <> 'null'::jsonb then
    raise exception using errcode='P0001', message='Reabertura bloqueada.';
  end if;
  if p_partes is null or jsonb_typeof(p_partes) <> 'array' then raise exception using errcode='P0001', message='Payload de partes invalido.'; end if;

  begin
    v_lead_id := nullif(p_payload->>'lead_id','')::uuid;
    v_atendimento_id := nullif(p_payload->>'atendimento_id','')::uuid;
    v_imovel_id := nullif(p_payload->>'imovel_id','')::uuid;
    v_responsavel_id := nullif(p_payload->>'responsavel_id','')::uuid;
  exception when invalid_text_representation then raise exception using errcode='P0001', message='Relacionamento invalido.'; end;
  v_tipo := p_payload->>'tipo'; v_titulo := nullif(btrim(p_payload->>'titulo'),''); v_moeda := coalesce(nullif(p_payload->>'moeda',''),'BRL');
  if v_lead_id is null or v_tipo not in ('venda','locacao','administracao','outro') or v_titulo is null then raise exception using errcode='P0001', message='Payload invalido.'; end if;
  if char_length(v_titulo)>160 or v_moeda !~ '^[A-Z]{3}$' then raise exception using errcode='P0001', message='Payload invalido.'; end if;
  if v_tipo <> 'outro' and v_imovel_id is null then raise exception using errcode='P0001', message='Imovel invalido.'; end if;

  perform 1 from public.leads where id=v_lead_id for update;
  if not found then raise exception using errcode='P0001', message='Lead nao encontrado.'; end if;
  if v_atendimento_id is not null and not exists(select 1 from public.atendimentos where id=v_atendimento_id and lead_id=v_lead_id) then raise exception using errcode='P0001', message='Atendimento incompativel.'; end if;
  if v_imovel_id is not null and not exists(select 1 from public.imoveis where id=v_imovel_id and ativo=true) then raise exception using errcode='P0001', message='Imovel invalido.'; end if;
  if v_responsavel_id is not null and not exists(select 1 from public.pessoas where id=v_responsavel_id and ativo=true and 'corretor'=any(coalesce(papeis,array[]::text[]))) then raise exception using errcode='P0001', message='Responsavel invalido.'; end if;

  for v_item in select value from jsonb_array_elements(p_partes) loop
    if jsonb_typeof(v_item)<>'object' or exists(select 1 from jsonb_object_keys(v_item) k where k<>all(array['pessoa_id','papel','principal','participacao_percentual','observacoes'])) then raise exception using errcode='P0001', message='Payload de partes invalido.'; end if;
    if jsonb_typeof(v_item->'pessoa_id')<>'string' or jsonb_typeof(v_item->'papel')<>'string'
      or (v_item?'principal' and jsonb_typeof(v_item->'principal')<>'boolean')
      or (v_item?'participacao_percentual' and jsonb_typeof(v_item->'participacao_percentual') not in ('number','null'))
      or (v_item?'observacoes' and jsonb_typeof(v_item->'observacoes') not in ('string','null')) then raise exception using errcode='P0001', message='Parte invalida.'; end if;
    begin v_pessoa_id := nullif(v_item->>'pessoa_id','')::uuid; v_participacao := nullif(v_item->>'participacao_percentual','')::numeric; exception when others then raise exception using errcode='P0001', message='Parte invalida.'; end;
    v_papel:=v_item->>'papel'; v_principal:=coalesce((v_item->>'principal')::boolean,false); v_observacoes:=nullif(btrim(v_item->>'observacoes'),'');
    if v_pessoa_id is null or v_papel not in ('proprietario','vendedor','comprador','locador','locatario','contratante','parceiro','outro') then raise exception using errcode='P0001', message='Parte invalida.'; end if;
    if v_participacao is not null and (v_participacao<0 or v_participacao>100) then raise exception using errcode='P0001', message='Participacao invalida.'; end if;
    if v_observacoes is not null and char_length(v_observacoes)>2000 then raise exception using errcode='P0001', message='Parte invalida.'; end if;
    if not exists(select 1 from public.pessoas where id=v_pessoa_id and ativo=true) then raise exception using errcode='P0001', message='Pessoa invalida.'; end if;
    if (select count(*) from jsonb_array_elements(p_partes) x where x->>'pessoa_id'=v_item->>'pessoa_id' and x->>'papel'=v_papel)>1 then raise exception using errcode='P0001', message='Parte duplicada.'; end if;
    if v_principal and (select count(*) from jsonb_array_elements(p_partes) x where x->>'papel'=v_papel and coalesce((x->>'principal')::boolean,false))>1 then raise exception using errcode='P0001', message='Parte principal duplicada.'; end if;
  end loop;

  begin
    insert into public.negocios (negocio_anterior_id,lead_id,atendimento_id,imovel_id,responsavel_id,tipo,titulo,descricao,observacoes_internas,moeda,valor_anunciado,valor_proposto,valor_negociado,valor_fechado,comissao_percentual,comissao_prevista,comissao_efetiva,sinal,valor_financiado,condicoes_comerciais,observacao_financeira,proposta_em,previsao_fechamento,contrato_enviado_em,contrato_assinado_em,inicio_vigencia,fim_vigencia,etapa,status_operacional,ativo,criado_por_user_id,aberto_em)
    values (null,v_lead_id,v_atendimento_id,v_imovel_id,v_responsavel_id,v_tipo,v_titulo,nullif(btrim(p_payload->>'descricao'),''),nullif(btrim(p_payload->>'observacoes_internas'),''),v_moeda,nullif(p_payload->>'valor_anunciado','')::numeric,nullif(p_payload->>'valor_proposto','')::numeric,nullif(p_payload->>'valor_negociado','')::numeric,nullif(p_payload->>'valor_fechado','')::numeric,nullif(p_payload->>'comissao_percentual','')::numeric,nullif(p_payload->>'comissao_prevista','')::numeric,nullif(p_payload->>'comissao_efetiva','')::numeric,nullif(p_payload->>'sinal','')::numeric,nullif(p_payload->>'valor_financiado','')::numeric,nullif(btrim(p_payload->>'condicoes_comerciais'),''),nullif(btrim(p_payload->>'observacao_financeira'),''),nullif(p_payload->>'proposta_em','')::timestamptz,nullif(p_payload->>'previsao_fechamento','')::date,nullif(p_payload->>'contrato_enviado_em','')::timestamptz,nullif(p_payload->>'contrato_assinado_em','')::timestamptz,nullif(p_payload->>'inicio_vigencia','')::date,nullif(p_payload->>'fim_vigencia','')::date,'estruturacao','ativo',true,v_user_id,pg_catalog.clock_timestamp())
    returning id,created_at,updated_at into v_id,v_created_at,v_updated_at;
  exception when check_violation or invalid_text_representation or invalid_datetime_format or numeric_value_out_of_range or datetime_field_overflow then raise exception using errcode='P0001', message='Payload invalido.'; end;

  for v_item in select value from jsonb_array_elements(p_partes) loop
    insert into public.negocios_partes(negocio_id,pessoa_id,papel,principal,participacao_percentual,observacoes)
    values(v_id,(v_item->>'pessoa_id')::uuid,v_item->>'papel',coalesce((v_item->>'principal')::boolean,false),nullif(v_item->>'participacao_percentual','')::numeric,nullif(btrim(v_item->>'observacoes'),''));
  end loop;
  select count(*) into v_partes from public.negocios_partes where negocio_id=v_id and ativo=true;
  begin insert into public.timeline(tipo,titulo,descricao,lead_id,origem) values('negocio_criado','Negocio criado','Novo Negocio comercial criado.',v_lead_id,'rpc_criar_negocio'); exception when others then raise exception using errcode='P0001', message='Falha ao registrar Timeline do Negocio.'; end;
  if v_id is null or v_created_at is null or v_updated_at is null then raise exception using errcode='P0001', message='Retorno inesperado do Negocio.'; end if;
  return query select v_id,v_lead_id,v_tipo,'estruturacao'::text,'ativo'::text,true,v_partes,v_created_at,v_updated_at;
exception when sqlstate 'P0001' then raise; when unique_violation then raise exception using errcode='P0001', message='Relacionamento duplicado.'; when foreign_key_violation then raise exception using errcode='P0001', message='Relacionamento invalido.'; when others then raise exception using errcode='P0001', message='Nao foi possivel salvar o Negocio.'; end;
$$;

create function public.concluir_negocio(
  p_negocio_id uuid,
  p_updated_at_esperado timestamptz,
  p_resultado text,
  p_valor_fechado numeric default null,
  p_comissao_efetiva numeric default null,
  p_observacao text default null
)
returns table(negocio_id uuid,lead_id uuid,status_anterior text,status_atual text,resultado text,fechado_em timestamptz,ativo boolean,updated_at timestamptz)
language plpgsql security definer set search_path = pg_catalog
as $$
declare
  v_user_id uuid; v_lead_id uuid; v_tipo text; v_etapa text; v_status text; v_ativo boolean;
  v_updated_at timestamptz; v_valor_atual numeric; v_comissao_atual numeric; v_valor_final numeric;
  v_comissao_final numeric; v_observacao text; v_operacao_em timestamptz; v_updated_retorno timestamptz;
begin
  v_user_id:=auth.uid();
  if v_user_id is null or not public.usuario_tem_papel(array['administrador','gestor']::text[]) then raise exception using errcode='P0001',message='Operacao nao autorizada.'; end if;
  if p_negocio_id is null then raise exception using errcode='P0001',message='Negocio nao encontrado.'; end if;
  if p_updated_at_esperado is null then raise exception using errcode='P0001',message='Negocio atualizado por outra operacao.'; end if;
  if p_resultado is null or p_resultado not in('venda_fechada','locacao_fechada','administracao_contratada','parceria_concluida','outro') then raise exception using errcode='P0001',message='Resultado invalido.'; end if;
  if p_valor_fechado is not null and (p_valor_fechado<0 or p_valor_fechado::text in('NaN','Infinity','-Infinity')) then raise exception using errcode='P0001',message='Valor final invalido.'; end if;
  if p_comissao_efetiva is not null and (p_comissao_efetiva<0 or p_comissao_efetiva::text in('NaN','Infinity','-Infinity')) then raise exception using errcode='P0001',message='Comissao invalida.'; end if;
  v_observacao:=nullif(btrim(p_observacao),'');
  if v_observacao is not null and char_length(v_observacao)>500 then raise exception using errcode='P0001',message='Observacao excede o limite permitido.'; end if;

  select lead_id,tipo,etapa,status_operacional,ativo,updated_at,valor_fechado,comissao_efetiva
    into v_lead_id,v_tipo,v_etapa,v_status,v_ativo,v_updated_at,v_valor_atual,v_comissao_atual
  from public.negocios where id=p_negocio_id for update;
  if not found then raise exception using errcode='P0001',message='Negocio nao encontrado.'; end if;
  if v_updated_at is distinct from p_updated_at_esperado then raise exception using errcode='P0001',message='Negocio atualizado por outra operacao.'; end if;
  if not v_ativo then raise exception using errcode='P0001',message='Negocio arquivado.'; end if;
  if v_status<>'ativo' then raise exception using errcode='P0001',message='Negocio encerrado.'; end if;
  if v_etapa not in('estruturacao','proposta','negociacao','documentacao','contrato','assinatura') then raise exception using errcode='P0001',message='Estado do Negocio invalido.'; end if;
  if (p_resultado='venda_fechada' and v_tipo<>'venda') or (p_resultado='locacao_fechada' and v_tipo<>'locacao') or (p_resultado='administracao_contratada' and v_tipo<>'administracao') then raise exception using errcode='P0001',message='Resultado incompativel com o tipo.'; end if;

  if v_tipo='venda' and (not exists(select 1 from public.negocios_partes where negocio_id=p_negocio_id and ativo=true and papel in('proprietario','vendedor')) or not exists(select 1 from public.negocios_partes where negocio_id=p_negocio_id and ativo=true and papel='comprador')) then raise exception using errcode='P0001',message='Partes insuficientes para conclusao.'; end if;
  if v_tipo='locacao' and (not exists(select 1 from public.negocios_partes where negocio_id=p_negocio_id and ativo=true and papel in('proprietario','locador')) or not exists(select 1 from public.negocios_partes where negocio_id=p_negocio_id and ativo=true and papel='locatario')) then raise exception using errcode='P0001',message='Partes insuficientes para conclusao.'; end if;
  if v_tipo='administracao' and not exists(select 1 from public.negocios_partes where negocio_id=p_negocio_id and ativo=true and papel in('proprietario','contratante')) then raise exception using errcode='P0001',message='Partes insuficientes para conclusao.'; end if;
  if v_tipo='outro' and not exists(select 1 from public.negocios_partes where negocio_id=p_negocio_id and ativo=true) then raise exception using errcode='P0001',message='Partes insuficientes para conclusao.'; end if;

  v_valor_final:=coalesce(p_valor_fechado,v_valor_atual); v_comissao_final:=coalesce(p_comissao_efetiva,v_comissao_atual);
  if v_tipo in('venda','locacao') and (v_valor_final is null or v_valor_final<=0) then raise exception using errcode='P0001',message='Valor final obrigatorio.'; end if;
  if v_valor_final is not null and (v_valor_final<0 or v_valor_final::text in('NaN','Infinity','-Infinity')) then raise exception using errcode='P0001',message='Valor final invalido.'; end if;
  if v_comissao_final is not null and (v_comissao_final<0 or v_comissao_final::text in('NaN','Infinity','-Infinity')) then raise exception using errcode='P0001',message='Comissao invalida.'; end if;

  v_operacao_em:=clock_timestamp();
  update public.negocios set status_operacional='concluido',resultado=p_resultado,valor_fechado=v_valor_final,
    comissao_efetiva=v_comissao_final,fechado_em=v_operacao_em,perdido_em=null,cancelado_em=null,
    motivo_encerramento=null,encerrado_por_user_id=v_user_id
  where id=p_negocio_id returning updated_at into v_updated_retorno;
  begin
    insert into public.timeline(tipo,titulo,descricao,lead_id,origem) values(
      'negocio_concluido','Negocio concluido',
      case when v_observacao is null then format('Negocio concluido com resultado %s.',p_resultado) else format('Negocio concluido com resultado %s. Observacao: %s',p_resultado,v_observacao) end,
      v_lead_id,'rpc_concluir_negocio');
  exception when others then raise exception using errcode='P0001',message='Falha ao registrar Timeline do Negocio.'; end;
  if v_updated_retorno is null then raise exception using errcode='P0001',message='Retorno inesperado do Negocio.'; end if;
  return query select p_negocio_id,v_lead_id,v_status,'concluido'::text,p_resultado,v_operacao_em,true,v_updated_retorno;
exception when sqlstate 'P0001' then raise; when others then raise exception using errcode='P0001',message='Nao foi possivel concluir o Negocio.'; end;
$$;

create function public.perder_negocio(p_negocio_id uuid,p_updated_at_esperado timestamptz,p_resultado text,p_motivo text,p_observacao text default null)
returns table(negocio_id uuid,lead_id uuid,status_anterior text,status_atual text,resultado text,perdido_em timestamptz,ativo boolean,updated_at timestamptz)
language plpgsql security definer set search_path = pg_catalog
as $$
declare v_user_id uuid; v_lead_id uuid; v_status text; v_ativo boolean; v_updated_at timestamptz; v_motivo text; v_observacao text; v_operacao_em timestamptz; v_updated_retorno timestamptz;
begin
  v_user_id:=auth.uid(); if v_user_id is null or not public.usuario_tem_papel(array['administrador','gestor']::text[]) then raise exception using errcode='P0001',message='Operacao nao autorizada.'; end if;
  if p_negocio_id is null then raise exception using errcode='P0001',message='Negocio nao encontrado.'; end if;
  if p_updated_at_esperado is null then raise exception using errcode='P0001',message='Negocio atualizado por outra operacao.'; end if;
  if p_resultado is null or p_resultado not in('preco','documentacao','imovel_indisponivel','proprietario_desistiu','cliente_desistiu','concorrencia','financiamento_reprovado','sem_acordo','outro') then raise exception using errcode='P0001',message='Resultado invalido.'; end if;
  v_motivo:=nullif(btrim(p_motivo),''); v_observacao:=nullif(btrim(p_observacao),'');
  if v_motivo is null or char_length(v_motivo)<3 or char_length(v_motivo)>1000 then raise exception using errcode='P0001',message='Motivo invalido.'; end if;
  if v_observacao is not null and char_length(v_observacao)>500 then raise exception using errcode='P0001',message='Observacao excede o limite permitido.'; end if;
  select lead_id,status_operacional,ativo,updated_at into v_lead_id,v_status,v_ativo,v_updated_at from public.negocios where id=p_negocio_id for update;
  if not found then raise exception using errcode='P0001',message='Negocio nao encontrado.'; end if;
  if v_updated_at is distinct from p_updated_at_esperado then raise exception using errcode='P0001',message='Negocio atualizado por outra operacao.'; end if;
  if not v_ativo then raise exception using errcode='P0001',message='Negocio arquivado.'; end if;
  if v_status<>'ativo' then raise exception using errcode='P0001',message='Negocio encerrado.'; end if;
  v_operacao_em:=clock_timestamp();
  update public.negocios set status_operacional='perdido',resultado=p_resultado,motivo_encerramento=v_motivo,
    perdido_em=v_operacao_em,fechado_em=null,cancelado_em=null,encerrado_por_user_id=v_user_id
  where id=p_negocio_id returning updated_at into v_updated_retorno;
  if v_updated_retorno is null then raise exception using errcode='P0001',message='Retorno inesperado do Negocio.'; end if;
  begin insert into public.timeline(tipo,titulo,descricao,lead_id,origem) values('negocio_perdido','Negocio perdido',case when v_observacao is null then format('Negocio perdido com resultado %s.',p_resultado) else format('Negocio perdido com resultado %s. Observacao: %s',p_resultado,v_observacao) end,v_lead_id,'rpc_perder_negocio'); exception when others then raise exception using errcode='P0001',message='Falha ao registrar Timeline do Negocio.'; end;
  return query select p_negocio_id,v_lead_id,v_status,'perdido'::text,p_resultado,v_operacao_em,true,v_updated_retorno;
exception when sqlstate 'P0001' then raise; when others then raise exception using errcode='P0001',message='Nao foi possivel registrar a perda do Negocio.'; end;
$$;

create function public.cancelar_negocio(p_negocio_id uuid,p_updated_at_esperado timestamptz,p_resultado text,p_motivo text,p_observacao text default null)
returns table(negocio_id uuid,lead_id uuid,status_anterior text,status_atual text,resultado text,cancelado_em timestamptz,ativo boolean,updated_at timestamptz)
language plpgsql security definer set search_path = pg_catalog
as $$
declare v_user_id uuid; v_lead_id uuid; v_status text; v_ativo boolean; v_updated_at timestamptz; v_motivo text; v_observacao text; v_operacao_em timestamptz; v_updated_retorno timestamptz;
begin
  v_user_id:=auth.uid(); if v_user_id is null or not public.usuario_tem_papel(array['administrador','gestor']::text[]) then raise exception using errcode='P0001',message='Operacao nao autorizada.'; end if;
  if p_negocio_id is null then raise exception using errcode='P0001',message='Negocio nao encontrado.'; end if;
  if p_updated_at_esperado is null then raise exception using errcode='P0001',message='Negocio atualizado por outra operacao.'; end if;
  if p_resultado is null or p_resultado not in('duplicidade','cadastro_incorreto','operacao_invalida','solicitacao_administrativa','outro') then raise exception using errcode='P0001',message='Resultado invalido.'; end if;
  v_motivo:=nullif(btrim(p_motivo),''); v_observacao:=nullif(btrim(p_observacao),'');
  if v_motivo is null or char_length(v_motivo)<3 or char_length(v_motivo)>1000 then raise exception using errcode='P0001',message='Motivo invalido.'; end if;
  if v_observacao is not null and char_length(v_observacao)>500 then raise exception using errcode='P0001',message='Observacao excede o limite permitido.'; end if;
  select lead_id,status_operacional,ativo,updated_at into v_lead_id,v_status,v_ativo,v_updated_at from public.negocios where id=p_negocio_id for update;
  if not found then raise exception using errcode='P0001',message='Negocio nao encontrado.'; end if;
  if v_updated_at is distinct from p_updated_at_esperado then raise exception using errcode='P0001',message='Negocio atualizado por outra operacao.'; end if;
  if not v_ativo then raise exception using errcode='P0001',message='Negocio arquivado.'; end if;
  if v_status<>'ativo' then raise exception using errcode='P0001',message='Negocio encerrado.'; end if;
  v_operacao_em:=clock_timestamp();
  update public.negocios set status_operacional='cancelado',resultado=p_resultado,motivo_encerramento=v_motivo,
    cancelado_em=v_operacao_em,fechado_em=null,perdido_em=null,encerrado_por_user_id=v_user_id
  where id=p_negocio_id returning updated_at into v_updated_retorno;
  if v_updated_retorno is null then raise exception using errcode='P0001',message='Retorno inesperado do Negocio.'; end if;
  begin insert into public.timeline(tipo,titulo,descricao,lead_id,origem) values('negocio_cancelado','Negocio cancelado',case when v_observacao is null then format('Negocio cancelado com resultado %s.',p_resultado) else format('Negocio cancelado com resultado %s. Observacao: %s',p_resultado,v_observacao) end,v_lead_id,'rpc_cancelar_negocio'); exception when others then raise exception using errcode='P0001',message='Falha ao registrar Timeline do Negocio.'; end;
  return query select p_negocio_id,v_lead_id,v_status,'cancelado'::text,p_resultado,v_operacao_em,true,v_updated_retorno;
exception when sqlstate 'P0001' then raise; when others then raise exception using errcode='P0001',message='Nao foi possivel cancelar o Negocio.'; end;
$$;

create function public.reabrir_negocio(p_negocio_id_anterior uuid,p_updated_at_esperado timestamptz,p_motivo text,p_titulo text default null,p_previsao_fechamento date default null)
returns table(negocio_id uuid,negocio_anterior_id uuid,lead_id uuid,tipo text,etapa text,status_operacional text,ativo boolean,partes_ativas bigint,created_at timestamptz,updated_at timestamptz)
language plpgsql security definer set search_path = pg_catalog
as $$
declare v_user_id uuid; v_anterior public.negocios%rowtype; v_motivo text; v_titulo text; v_novo_id uuid; v_created timestamptz; v_updated timestamptz; v_partes bigint;
begin
  v_user_id:=auth.uid(); if v_user_id is null or not public.usuario_tem_papel(array['administrador','gestor']::text[]) then raise exception using errcode='P0001',message='Operacao nao autorizada.'; end if;
  if p_negocio_id_anterior is null then raise exception using errcode='P0001',message='Negocio nao encontrado.'; end if;
  if p_updated_at_esperado is null then raise exception using errcode='P0001',message='Negocio atualizado por outra operacao.'; end if;
  v_motivo:=nullif(btrim(p_motivo),''); if v_motivo is null or char_length(v_motivo)<3 or char_length(v_motivo)>500 then raise exception using errcode='P0001',message='Motivo invalido.'; end if;
  v_titulo:=nullif(btrim(p_titulo),''); if v_titulo is not null and char_length(v_titulo)>160 then raise exception using errcode='P0001',message='Titulo invalido.'; end if;
  select * into v_anterior from public.negocios where id=p_negocio_id_anterior for update;
  if not found then raise exception using errcode='P0001',message='Negocio nao encontrado.'; end if;
  if v_anterior.updated_at is distinct from p_updated_at_esperado then raise exception using errcode='P0001',message='Negocio atualizado por outra operacao.'; end if;
  if not v_anterior.ativo then raise exception using errcode='P0001',message='Negocio arquivado.'; end if;
  if v_anterior.status_operacional not in('concluido','perdido','cancelado') then raise exception using errcode='P0001',message='Reabertura bloqueada.'; end if;
  perform 1 from public.leads where id=v_anterior.lead_id for update;
  if not found then raise exception using errcode='P0001',message='Lead nao encontrado.'; end if;
  if v_anterior.responsavel_id is not null and not exists(select 1 from public.pessoas where id=v_anterior.responsavel_id and ativo=true and 'corretor'=any(coalesce(papeis,array[]::text[]))) then raise exception using errcode='P0001',message='Responsavel invalido.'; end if;
  if exists(
    select 1
    from public.negocios_partes parte
    left join public.pessoas pessoa on pessoa.id=parte.pessoa_id
    where parte.negocio_id=p_negocio_id_anterior
      and parte.ativo=true
      and (pessoa.id is null or pessoa.ativo is distinct from true)
  ) then raise exception using errcode='P0001',message='Pessoa participante invalida.'; end if;
  if exists(select 1 from public.negocios where negocio_anterior_id=p_negocio_id_anterior) then raise exception using errcode='P0001',message='Este Negocio ja possui uma reabertura.'; end if;
  insert into public.negocios(negocio_anterior_id,lead_id,atendimento_id,imovel_id,responsavel_id,tipo,etapa,status_operacional,ativo,titulo,descricao,observacoes_internas,moeda,valor_anunciado,comissao_percentual,comissao_prevista,condicoes_comerciais,observacao_financeira,previsao_fechamento,criado_por_user_id,aberto_em)
  values(p_negocio_id_anterior,v_anterior.lead_id,null,v_anterior.imovel_id,v_anterior.responsavel_id,v_anterior.tipo,'estruturacao','ativo',true,coalesce(v_titulo,v_anterior.titulo),v_anterior.descricao,v_anterior.observacoes_internas,v_anterior.moeda,v_anterior.valor_anunciado,v_anterior.comissao_percentual,v_anterior.comissao_prevista,v_anterior.condicoes_comerciais,v_anterior.observacao_financeira,p_previsao_fechamento,v_user_id,clock_timestamp())
  returning id,created_at,updated_at into v_novo_id,v_created,v_updated;
  insert into public.negocios_partes(negocio_id,pessoa_id,papel,principal,participacao_percentual,observacoes,ativo)
    select v_novo_id,pessoa_id,papel,principal,participacao_percentual,observacoes,true from public.negocios_partes where negocio_id=p_negocio_id_anterior and ativo=true;
  select count(*) into v_partes from public.negocios_partes where negocio_id=v_novo_id and ativo=true;
  begin insert into public.timeline(tipo,titulo,descricao,lead_id,origem) values('negocio_reaberto','Negocio reaberto',format('Novo ciclo do Negocio criado. Motivo: %s',v_motivo),v_anterior.lead_id,'rpc_reabrir_negocio'); exception when others then raise exception using errcode='P0001',message='Falha ao registrar Timeline do Negocio.'; end;
  if v_novo_id is null or v_novo_id=p_negocio_id_anterior or v_created is null or v_updated is null then raise exception using errcode='P0001',message='Retorno inesperado do Negocio.'; end if;
  return query select v_novo_id,p_negocio_id_anterior,v_anterior.lead_id,v_anterior.tipo,'estruturacao'::text,'ativo'::text,true,v_partes,v_created,v_updated;
exception when unique_violation then raise exception using errcode='P0001',message='Este Negocio ja possui uma reabertura.'; when sqlstate 'P0001' then raise; when foreign_key_violation then raise exception using errcode='P0001',message='Relacionamento invalido.'; when others then raise exception using errcode='P0001',message='Nao foi possivel reabrir o Negocio.'; end;
$$;

create function public.arquivar_negocio(p_negocio_id uuid,p_updated_at_esperado timestamptz,p_motivo text)
returns table(negocio_id uuid,lead_id uuid,status_operacional text,ativo boolean,updated_at timestamptz)
language plpgsql security definer set search_path = pg_catalog
as $$
declare v_user_id uuid; v_lead_id uuid; v_status text; v_ativo boolean; v_updated_at timestamptz; v_motivo text; v_updated_retorno timestamptz;
begin
  v_user_id:=auth.uid(); if v_user_id is null or not public.usuario_tem_papel(array['administrador','gestor']::text[]) then raise exception using errcode='P0001',message='Operacao nao autorizada.'; end if;
  if p_negocio_id is null then raise exception using errcode='P0001',message='Negocio nao encontrado.'; end if;
  if p_updated_at_esperado is null then raise exception using errcode='P0001',message='Negocio atualizado por outra operacao.'; end if;
  v_motivo:=nullif(btrim(p_motivo),''); if v_motivo is null or char_length(v_motivo)<3 or char_length(v_motivo)>500 then raise exception using errcode='P0001',message='Motivo invalido.'; end if;
  select lead_id,status_operacional,ativo,updated_at into v_lead_id,v_status,v_ativo,v_updated_at from public.negocios where id=p_negocio_id for update;
  if not found then raise exception using errcode='P0001',message='Negocio nao encontrado.'; end if;
  if v_updated_at is distinct from p_updated_at_esperado then raise exception using errcode='P0001',message='Negocio atualizado por outra operacao.'; end if;
  if not v_ativo then raise exception using errcode='P0001',message='Negocio arquivado.'; end if;
  if v_status not in('concluido','perdido','cancelado') then raise exception using errcode='P0001',message='Arquivamento bloqueado.'; end if;
  update public.negocios set ativo=false where id=p_negocio_id returning updated_at into v_updated_retorno;
  if v_updated_retorno is null then raise exception using errcode='P0001',message='Retorno inesperado do Negocio.'; end if;
  begin insert into public.timeline(tipo,titulo,descricao,lead_id,origem) values('negocio_arquivado','Negocio arquivado',format('Negocio arquivado. Motivo: %s',v_motivo),v_lead_id,'rpc_arquivar_negocio'); exception when others then raise exception using errcode='P0001',message='Falha ao registrar Timeline do Negocio.'; end;
  return query select p_negocio_id,v_lead_id,v_status,false,v_updated_retorno;
exception when sqlstate 'P0001' then raise; when others then raise exception using errcode='P0001',message='Nao foi possivel arquivar o Negocio.'; end;
$$;

revoke all privileges on function public.concluir_negocio(uuid,timestamptz,text,numeric,numeric,text) from public;
revoke all privileges on function public.concluir_negocio(uuid,timestamptz,text,numeric,numeric,text) from anon;
grant execute on function public.concluir_negocio(uuid,timestamptz,text,numeric,numeric,text) to authenticated;
revoke all privileges on function public.perder_negocio(uuid,timestamptz,text,text,text) from public;
revoke all privileges on function public.perder_negocio(uuid,timestamptz,text,text,text) from anon;
grant execute on function public.perder_negocio(uuid,timestamptz,text,text,text) to authenticated;
revoke all privileges on function public.cancelar_negocio(uuid,timestamptz,text,text,text) from public;
revoke all privileges on function public.cancelar_negocio(uuid,timestamptz,text,text,text) from anon;
grant execute on function public.cancelar_negocio(uuid,timestamptz,text,text,text) to authenticated;
revoke all privileges on function public.reabrir_negocio(uuid,timestamptz,text,text,date) from public;
revoke all privileges on function public.reabrir_negocio(uuid,timestamptz,text,text,date) from anon;
grant execute on function public.reabrir_negocio(uuid,timestamptz,text,text,date) to authenticated;
revoke all privileges on function public.arquivar_negocio(uuid,timestamptz,text) from public;
revoke all privileges on function public.arquivar_negocio(uuid,timestamptz,text) from anon;
grant execute on function public.arquivar_negocio(uuid,timestamptz,text) to authenticated;

commit;

-- CONSULTAS MANUAIS DE VERIFICACAO (comentadas; fora da transacao).
-- select indexname,indexdef from pg_catalog.pg_indexes where schemaname='public' and tablename='negocios' and indexname='idx_negocios_negocio_anterior_unico';
-- select to_regprocedure('public.criar_negocio(jsonb,jsonb)'),pg_get_functiondef('public.criar_negocio(jsonb,jsonb)'::regprocedure); -- criacao original sem negocio_anterior_id.
-- select to_regprocedure('public.concluir_negocio(uuid,timestamp with time zone,text,numeric,numeric,text)'),to_regprocedure('public.perder_negocio(uuid,timestamp with time zone,text,text,text)'),to_regprocedure('public.cancelar_negocio(uuid,timestamp with time zone,text,text,text)'),to_regprocedure('public.reabrir_negocio(uuid,timestamp with time zone,text,text,date)'),to_regprocedure('public.arquivar_negocio(uuid,timestamp with time zone,text)');
-- select to_regprocedure('public.criar_negocio(jsonb,jsonb)'),to_regprocedure('public.atualizar_negocio(uuid,timestamp with time zone,jsonb,jsonb)'),to_regprocedure('public.movimentar_negocio(uuid,text,timestamp with time zone,text)');
-- select p.oid::regprocedure,p.prosecdef,p.proconfig,pg_get_functiondef(p.oid) from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in('concluir_negocio','perder_negocio','cancelar_negocio','reabrir_negocio','arquivar_negocio') order by p.proname;
-- select routine_name,grantee,privilege_type from information_schema.routine_privileges where routine_schema='public' and routine_name in('concluir_negocio','perder_negocio','cancelar_negocio','reabrir_negocio','arquivar_negocio') order by routine_name,grantee;
-- select (select count(*) from public.negocios) negocios,(select count(*) from public.negocios_partes) partes,(select count(*) from public.leads) leads,(select count(*) from public.atendimentos) atendimentos,(select count(*) from public.imoveis) imoveis,(select count(*) from public.pessoas) pessoas,(select count(*) from public.timeline) timeline; -- comparar antes/depois.
-- select relname,relrowsecurity,relforcerowsecurity from pg_catalog.pg_class where oid in('public.negocios'::regclass,'public.negocios_partes'::regclass,'public.timeline'::regclass) order by relname;
-- select tablename,policyname,cmd,roles from pg_catalog.pg_policies where schemaname='public' and tablename in('negocios','negocios_partes','timeline') order by tablename,policyname;
-- select table_name,grantee,privilege_type from information_schema.role_table_grants where table_schema='public' and table_name in('negocios','negocios_partes','timeline') order by table_name,grantee,privilege_type;
-- select count(*) from information_schema.routine_privileges where routine_schema='public' and routine_name in('concluir_negocio','perder_negocio','cancelar_negocio','reabrir_negocio','arquivar_negocio') and grantee='anon'; -- zero

-- TESTES PLANEJADOS, NAO EXECUTADOS:
-- 1. Todas: sem sessao, perfil ausente/inativo, corretor e atendimento negados; administrador/gestor autorizados.
-- 2. Todas: UUID inexistente, fotografia ausente/desatualizada, arquivado e falha de Timeline com rollback.
-- 3. Conclusao: cada resultado, incompatibilidade por tipo, etapa desconhecida e Negocio ja encerrado.
-- 4. Conclusao: partes minimas de venda, locacao, administracao e outro; combinacoes insuficientes bloqueadas.
-- 5. Conclusao: valor persistido/informado, zero/negativo/nao finito, comissao preservada/informada/invalida.
-- 6. Perda: cada resultado, motivo vazio/curto/longo, observacao ausente/presente/longa e dados comerciais preservados.
-- 7. Cancelamento: cada resultado, motivo vazio/curto/longo, observacao e partes/valores preservados.
-- 8. Reabertura: anterior ainda ativo operacionalmente, arquivado, final valido e fotografia concorrente.
-- 9. Reabertura: sucessor existente, duas sessoes simultaneas e conversao de 23505 em mensagem sanitizada.
-- 10. Reabertura: novo UUID, anterior preservado, copia seletiva, campos excluidos nulos e previsao explicita.
-- 11. Reabertura: somente partes ativas copiadas, novos UUIDs/timestamps e partes anteriores inalteradas.
-- 12. Reabertura: Pessoa inativa ou ausente em qualquer parte ativa bloqueia tudo, sem copia parcial ou Timeline.
-- 13. Criacao comum: negocio_anterior_id omitido/null cria original; qualquer outro valor falha como reabertura bloqueada.
-- 14. Arquivamento: Negocio operacional bloqueado, cada status final permitido e segunda tentativa bloqueada.
-- 15. Arquivamento: preservar etapa, status, resultado, motivo, valores, datas, autoria e todas as partes.
-- 16. Atomicidade: induzir falha de Timeline isoladamente e confirmar ausencia de qualquer mutacao parcial.
