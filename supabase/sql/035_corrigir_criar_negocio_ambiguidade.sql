begin;

-- HOTFIX 3B4A: qualifica referencias internas da RPC sem alterar seu contrato.
do $$
begin
  if to_regprocedure('public.criar_negocio(jsonb,jsonb)') is null then
    raise exception 'Precondition failed: criar_negocio(jsonb,jsonb) does not exist';
  end if;

  if to_regclass('public.negocios') is null
    or to_regclass('public.negocios_partes') is null
    or to_regclass('public.leads') is null
    or to_regclass('public.atendimentos') is null
    or to_regclass('public.imoveis') is null
    or to_regclass('public.pessoas') is null
    or to_regclass('public.timeline') is null then
    raise exception 'Precondition failed: required tables do not exist';
  end if;

  if to_regprocedure('public.usuario_tem_papel(text[])') is null then
    raise exception 'Precondition failed: required authorization helper does not exist';
  end if;
end
$$;

-- Pre-aplicacao manual:
-- select count(*) as negocios_antes from public.negocios;
-- select count(*) as partes_antes from public.negocios_partes;

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
  for v_key in select payload_key.key from jsonb_object_keys(p_payload) as payload_key(key) loop
    if not (v_key = any(v_allowed)) then raise exception using errcode='P0001', message='Campo desconhecido no payload.'; end if;
  end loop;
  if exists (
    select 1 from jsonb_each(p_payload) as payload_entry
    where (payload_entry.key in ('negocio_anterior_id','lead_id','atendimento_id','imovel_id','responsavel_id','tipo','titulo','descricao','observacoes_internas','moeda','condicoes_comerciais','observacao_financeira','proposta_em','previsao_fechamento','contrato_enviado_em','contrato_assinado_em','inicio_vigencia','fim_vigencia') and jsonb_typeof(payload_entry.value) not in ('string','null'))
      or (payload_entry.key in ('valor_anunciado','valor_proposto','valor_negociado','valor_fechado','comissao_percentual','comissao_prevista','comissao_efetiva','sinal','valor_financiado') and jsonb_typeof(payload_entry.value) not in ('number','null'))
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

  perform 1 from public.leads as lead where lead.id=v_lead_id for update;
  if not found then raise exception using errcode='P0001', message='Lead nao encontrado.'; end if;
  if v_atendimento_id is not null and not exists(select 1 from public.atendimentos as atendimento where atendimento.id=v_atendimento_id and atendimento.lead_id=v_lead_id) then raise exception using errcode='P0001', message='Atendimento incompativel.'; end if;
  if v_imovel_id is not null and not exists(select 1 from public.imoveis as imovel where imovel.id=v_imovel_id and imovel.ativo=true) then raise exception using errcode='P0001', message='Imovel invalido.'; end if;
  if v_responsavel_id is not null and not exists(select 1 from public.pessoas as responsavel where responsavel.id=v_responsavel_id and responsavel.ativo=true and 'corretor'=any(coalesce(responsavel.papeis,array[]::text[]))) then raise exception using errcode='P0001', message='Responsavel invalido.'; end if;

  for v_item in select part_payload.value from jsonb_array_elements(p_partes) as part_payload(value) loop
    if jsonb_typeof(v_item)<>'object' or exists(select 1 from jsonb_object_keys(v_item) as part_key(key) where part_key.key<>all(array['pessoa_id','papel','principal','participacao_percentual','observacoes'])) then raise exception using errcode='P0001', message='Payload de partes invalido.'; end if;
    if jsonb_typeof(v_item->'pessoa_id')<>'string' or jsonb_typeof(v_item->'papel')<>'string'
      or (v_item?'principal' and jsonb_typeof(v_item->'principal')<>'boolean')
      or (v_item?'participacao_percentual' and jsonb_typeof(v_item->'participacao_percentual') not in ('number','null'))
      or (v_item?'observacoes' and jsonb_typeof(v_item->'observacoes') not in ('string','null')) then raise exception using errcode='P0001', message='Parte invalida.'; end if;
    begin v_pessoa_id := nullif(v_item->>'pessoa_id','')::uuid; v_participacao := nullif(v_item->>'participacao_percentual','')::numeric; exception when others then raise exception using errcode='P0001', message='Parte invalida.'; end;
    v_papel:=v_item->>'papel'; v_principal:=coalesce((v_item->>'principal')::boolean,false); v_observacoes:=nullif(btrim(v_item->>'observacoes'),'');
    if v_pessoa_id is null or v_papel not in ('proprietario','vendedor','comprador','locador','locatario','contratante','parceiro','outro') then raise exception using errcode='P0001', message='Parte invalida.'; end if;
    if v_participacao is not null and (v_participacao<0 or v_participacao>100) then raise exception using errcode='P0001', message='Participacao invalida.'; end if;
    if v_observacoes is not null and char_length(v_observacoes)>2000 then raise exception using errcode='P0001', message='Parte invalida.'; end if;
    if not exists(select 1 from public.pessoas as pessoa where pessoa.id=v_pessoa_id and pessoa.ativo=true) then raise exception using errcode='P0001', message='Pessoa invalida.'; end if;
    if (select count(*) from jsonb_array_elements(p_partes) as duplicate_part(value) where duplicate_part.value->>'pessoa_id'=v_item->>'pessoa_id' and duplicate_part.value->>'papel'=v_papel)>1 then raise exception using errcode='P0001', message='Parte duplicada.'; end if;
    if v_principal and (select count(*) from jsonb_array_elements(p_partes) as principal_part(value) where principal_part.value->>'papel'=v_papel and coalesce((principal_part.value->>'principal')::boolean,false))>1 then raise exception using errcode='P0001', message='Parte principal duplicada.'; end if;
  end loop;

  begin
    insert into public.negocios as negocio (negocio_anterior_id,lead_id,atendimento_id,imovel_id,responsavel_id,tipo,titulo,descricao,observacoes_internas,moeda,valor_anunciado,valor_proposto,valor_negociado,valor_fechado,comissao_percentual,comissao_prevista,comissao_efetiva,sinal,valor_financiado,condicoes_comerciais,observacao_financeira,proposta_em,previsao_fechamento,contrato_enviado_em,contrato_assinado_em,inicio_vigencia,fim_vigencia,etapa,status_operacional,ativo,criado_por_user_id,aberto_em)
    values (null,v_lead_id,v_atendimento_id,v_imovel_id,v_responsavel_id,v_tipo,v_titulo,nullif(btrim(p_payload->>'descricao'),''),nullif(btrim(p_payload->>'observacoes_internas'),''),v_moeda,nullif(p_payload->>'valor_anunciado','')::numeric,nullif(p_payload->>'valor_proposto','')::numeric,nullif(p_payload->>'valor_negociado','')::numeric,nullif(p_payload->>'valor_fechado','')::numeric,nullif(p_payload->>'comissao_percentual','')::numeric,nullif(p_payload->>'comissao_prevista','')::numeric,nullif(p_payload->>'comissao_efetiva','')::numeric,nullif(p_payload->>'sinal','')::numeric,nullif(p_payload->>'valor_financiado','')::numeric,nullif(btrim(p_payload->>'condicoes_comerciais'),''),nullif(btrim(p_payload->>'observacao_financeira'),''),nullif(p_payload->>'proposta_em','')::timestamptz,nullif(p_payload->>'previsao_fechamento','')::date,nullif(p_payload->>'contrato_enviado_em','')::timestamptz,nullif(p_payload->>'contrato_assinado_em','')::timestamptz,nullif(p_payload->>'inicio_vigencia','')::date,nullif(p_payload->>'fim_vigencia','')::date,'estruturacao','ativo',true,v_user_id,pg_catalog.clock_timestamp())
    returning negocio.id,negocio.created_at,negocio.updated_at into v_id,v_created_at,v_updated_at;
  exception when check_violation or invalid_text_representation or invalid_datetime_format or numeric_value_out_of_range or datetime_field_overflow then raise exception using errcode='P0001', message='Payload invalido.'; end;

  for v_item in select part_payload.value from jsonb_array_elements(p_partes) as part_payload(value) loop
    insert into public.negocios_partes(negocio_id,pessoa_id,papel,principal,participacao_percentual,observacoes)
    values(v_id,(v_item->>'pessoa_id')::uuid,v_item->>'papel',coalesce((v_item->>'principal')::boolean,false),nullif(v_item->>'participacao_percentual','')::numeric,nullif(btrim(v_item->>'observacoes'),''));
  end loop;
  select count(*) into v_partes
  from public.negocios_partes as parte
  where parte.negocio_id=v_id and parte.ativo=true;
  begin insert into public.timeline(tipo,titulo,descricao,lead_id,origem) values('negocio_criado','Negocio criado','Novo Negocio comercial criado.',v_lead_id,'rpc_criar_negocio'); exception when others then raise exception using errcode='P0001', message='Falha ao registrar Timeline do Negocio.'; end;
  if v_id is null or v_created_at is null or v_updated_at is null then raise exception using errcode='P0001', message='Retorno inesperado do Negocio.'; end if;
  return query select v_id,v_lead_id,v_tipo,'estruturacao'::text,'ativo'::text,true,v_partes,v_created_at,v_updated_at;
exception when sqlstate 'P0001' then raise; when unique_violation then raise exception using errcode='P0001', message='Relacionamento duplicado.'; when foreign_key_violation then raise exception using errcode='P0001', message='Relacionamento invalido.'; when others then raise exception using errcode='P0001', message='Nao foi possivel salvar o Negocio.'; end;
$$;

revoke all privileges on function public.criar_negocio(jsonb,jsonb) from public;
revoke all privileges on function public.criar_negocio(jsonb,jsonb) from anon;
grant execute on function public.criar_negocio(jsonb,jsonb) to authenticated;

commit;

-- Pos-aplicacao manual (as contagens devem ser iguais as da pre-aplicacao):
-- select count(*) as negocios_depois from public.negocios;
-- select count(*) as partes_depois from public.negocios_partes;
-- select to_regprocedure('public.criar_negocio(jsonb,jsonb)') as assinatura;
-- select pg_get_functiondef('public.criar_negocio(jsonb,jsonb)'::regprocedure) as definicao;
-- select p.prosecdef as security_definer,p.proconfig as configuracao from pg_catalog.pg_proc p where p.oid='public.criar_negocio(jsonb,jsonb)'::regprocedure;
-- select grantee,privilege_type from information_schema.routine_privileges where specific_schema='public' and routine_name='criar_negocio' order by grantee,privilege_type;
-- select to_regprocedure('public.atualizar_negocio(uuid,timestamp with time zone,jsonb,jsonb)'),to_regprocedure('public.movimentar_negocio(uuid,text,timestamp with time zone,text)'),to_regprocedure('public.concluir_negocio(uuid,timestamp with time zone,text,numeric,numeric,text)'),to_regprocedure('public.perder_negocio(uuid,timestamp with time zone,text,text,text)'),to_regprocedure('public.cancelar_negocio(uuid,timestamp with time zone,text,text,text)'),to_regprocedure('public.reabrir_negocio(uuid,timestamp with time zone,text,text,date)'),to_regprocedure('public.arquivar_negocio(uuid,timestamp with time zone,text)');
