begin;

do $$
begin
  if to_regprocedure('public.atualizar_negocio(uuid,timestamp with time zone,jsonb,jsonb)') is null
    or to_regprocedure('public.movimentar_negocio(uuid,text,timestamp with time zone,text)') is null then
    raise exception 'Precondition failed: active Negocio RPCs do not exist';
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
    raise exception 'Precondition failed: authorization helper does not exist';
  end if;
end
$$;

-- Pre-aplicacao manual:
-- select (select count(*) from public.negocios) as negocios_antes,(select count(*) from public.negocios_partes) as partes_antes,(select count(*) from public.timeline) as timeline_antes;

create or replace function public.atualizar_negocio(p_negocio_id uuid,p_updated_at_esperado timestamptz,p_payload jsonb,p_partes jsonb)
returns table (negocio_id uuid,lead_id uuid,tipo text,etapa text,status_operacional text,ativo boolean,partes_ativas bigint,updated_at timestamptz)
language plpgsql security definer set search_path = pg_catalog
as $$
declare
  v_allowed constant text[] := array['negocio_anterior_id','lead_id','atendimento_id','imovel_id','responsavel_id','tipo','titulo','descricao','observacoes_internas','moeda','valor_anunciado','valor_proposto','valor_negociado','valor_fechado','comissao_percentual','comissao_prevista','comissao_efetiva','sinal','valor_financiado','condicoes_comerciais','observacao_financeira','proposta_em','previsao_fechamento','contrato_enviado_em','contrato_assinado_em','inicio_vigencia','fim_vigencia'];
  v_key text; v_item jsonb; v_atual public.negocios%rowtype; v_anterior_id uuid; v_lead_id uuid; v_lead_payload_id uuid; v_atendimento_id uuid; v_imovel_id uuid; v_responsavel_id uuid;
  v_tipo text; v_titulo text; v_updated_at timestamptz; v_partes bigint; v_pessoa_id uuid; v_papel text; v_principal boolean; v_participacao numeric; v_observacoes text; v_vinculo_id uuid;
begin
  if auth.uid() is null or not public.usuario_tem_papel(array['administrador','gestor']::text[]) then raise exception using errcode='P0001', message='Operacao nao autorizada.'; end if;
  if p_negocio_id is null or p_updated_at_esperado is null then raise exception using errcode='P0001', message='Negocio atualizado por outra operacao.'; end if;
  if p_payload is null or jsonb_typeof(p_payload)<>'object' or p_partes is null or jsonb_typeof(p_partes)<>'array' then raise exception using errcode='P0001', message='Payload invalido.'; end if;
  for v_key in select payload_key.key from jsonb_object_keys(p_payload) as payload_key(key) loop if not(v_key=any(v_allowed)) then raise exception using errcode='P0001', message='Campo desconhecido no payload.'; end if; end loop;
  if exists (
    select 1 from jsonb_each(p_payload) as payload_entry
    where (payload_entry.key in ('negocio_anterior_id','lead_id','atendimento_id','imovel_id','responsavel_id','tipo','titulo','descricao','observacoes_internas','moeda','condicoes_comerciais','observacao_financeira','proposta_em','previsao_fechamento','contrato_enviado_em','contrato_assinado_em','inicio_vigencia','fim_vigencia') and jsonb_typeof(payload_entry.value) not in ('string','null'))
      or (payload_entry.key in ('valor_anunciado','valor_proposto','valor_negociado','valor_fechado','comissao_percentual','comissao_prevista','comissao_efetiva','sinal','valor_financiado') and jsonb_typeof(payload_entry.value) not in ('number','null'))
  ) then raise exception using errcode='P0001', message='Payload invalido.'; end if;
  select negocio.* into v_atual from public.negocios as negocio where negocio.id=p_negocio_id for update;
  if not found then raise exception using errcode='P0001', message='Negocio nao encontrado.'; end if;
  if v_atual.updated_at is distinct from p_updated_at_esperado then raise exception using errcode='P0001', message='Negocio atualizado por outra operacao.'; end if;
  if not v_atual.ativo then raise exception using errcode='P0001', message='Negocio arquivado.'; end if;
  if v_atual.status_operacional<>'ativo' then raise exception using errcode='P0001', message='Negocio encerrado.'; end if;
  begin
    v_anterior_id:=case when p_payload?'negocio_anterior_id' then nullif(p_payload->>'negocio_anterior_id','')::uuid else v_atual.negocio_anterior_id end;
    v_lead_payload_id:=case when p_payload?'lead_id' then nullif(p_payload->>'lead_id','')::uuid else v_atual.lead_id end;
    v_atendimento_id:=case when p_payload?'atendimento_id' then nullif(p_payload->>'atendimento_id','')::uuid else v_atual.atendimento_id end;
    v_imovel_id:=case when p_payload?'imovel_id' then nullif(p_payload->>'imovel_id','')::uuid else v_atual.imovel_id end;
    v_responsavel_id:=case when p_payload?'responsavel_id' then nullif(p_payload->>'responsavel_id','')::uuid else v_atual.responsavel_id end;
  exception when invalid_text_representation then raise exception using errcode='P0001', message='Relacionamento invalido.'; end;
  v_lead_id:=v_atual.lead_id;
  v_tipo:=case when p_payload?'tipo' then p_payload->>'tipo' else v_atual.tipo end;
  v_titulo:=case when p_payload?'titulo' then nullif(btrim(p_payload->>'titulo'),'') else v_atual.titulo end;
  if v_lead_id is null or v_tipo not in('venda','locacao','administracao','outro') or v_titulo is null or char_length(v_titulo)>160 then raise exception using errcode='P0001', message='Payload invalido.'; end if;
  if v_lead_payload_id is null or v_lead_payload_id is distinct from v_lead_id then raise exception using errcode='P0001', message='Relacionamento invalido.'; end if;
  if v_anterior_id is distinct from v_atual.negocio_anterior_id then raise exception using errcode='P0001', message='Relacionamento invalido.'; end if;
  if v_tipo<>'outro' and v_imovel_id is null then raise exception using errcode='P0001', message='Imovel invalido.'; end if;
  if not exists(select 1 from public.leads as lead where lead.id=v_lead_id) then raise exception using errcode='P0001', message='Lead nao encontrado.'; end if;
  if v_atendimento_id is not null and not exists(select 1 from public.atendimentos as atendimento where atendimento.id=v_atendimento_id and atendimento.lead_id=v_lead_id) then raise exception using errcode='P0001', message='Atendimento incompativel.'; end if;
  if v_imovel_id is not null and not exists(select 1 from public.imoveis as imovel where imovel.id=v_imovel_id and imovel.ativo=true) then raise exception using errcode='P0001', message='Imovel invalido.'; end if;
  if v_responsavel_id is not null and not exists(select 1 from public.pessoas as pessoa where pessoa.id=v_responsavel_id and pessoa.ativo=true and 'corretor'=any(coalesce(pessoa.papeis,array[]::text[]))) then raise exception using errcode='P0001', message='Responsavel invalido.'; end if;

  for v_item in select part_payload.value from jsonb_array_elements(p_partes) as part_payload(value) loop
    if jsonb_typeof(v_item)<>'object' or exists(select 1 from jsonb_object_keys(v_item) as part_key(key) where part_key.key<>all(array['pessoa_id','papel','principal','participacao_percentual','observacoes'])) then raise exception using errcode='P0001', message='Payload de partes invalido.'; end if;
    if jsonb_typeof(v_item->'pessoa_id')<>'string' or jsonb_typeof(v_item->'papel')<>'string'
      or (v_item?'principal' and jsonb_typeof(v_item->'principal')<>'boolean')
      or (v_item?'participacao_percentual' and jsonb_typeof(v_item->'participacao_percentual') not in ('number','null'))
      or (v_item?'observacoes' and jsonb_typeof(v_item->'observacoes') not in ('string','null')) then raise exception using errcode='P0001', message='Parte invalida.'; end if;
    begin v_pessoa_id:=nullif(v_item->>'pessoa_id','')::uuid; v_participacao:=nullif(v_item->>'participacao_percentual','')::numeric; v_principal:=coalesce((v_item->>'principal')::boolean,false); exception when others then raise exception using errcode='P0001', message='Parte invalida.'; end;
    v_papel:=v_item->>'papel'; v_observacoes:=nullif(btrim(v_item->>'observacoes'),'');
    if v_pessoa_id is null or v_papel not in('proprietario','vendedor','comprador','locador','locatario','contratante','parceiro','outro') or (v_participacao is not null and(v_participacao<0 or v_participacao>100)) or (v_observacoes is not null and char_length(v_observacoes)>2000) then raise exception using errcode='P0001', message='Parte invalida.'; end if;
    if not exists(select 1 from public.pessoas as pessoa where pessoa.id=v_pessoa_id and pessoa.ativo=true) then raise exception using errcode='P0001', message='Pessoa invalida.'; end if;
    if(select count(*) from jsonb_array_elements(p_partes) as duplicate_part(value) where duplicate_part.value->>'pessoa_id'=v_item->>'pessoa_id' and duplicate_part.value->>'papel'=v_papel)>1 then raise exception using errcode='P0001', message='Parte duplicada.'; end if;
    if v_principal and(select count(*) from jsonb_array_elements(p_partes) as principal_part(value) where principal_part.value->>'papel'=v_papel and coalesce((principal_part.value->>'principal')::boolean,false))>1 then raise exception using errcode='P0001', message='Parte principal duplicada.'; end if;
  end loop;

  update public.negocios as negocio set
    lead_id=v_atual.lead_id,atendimento_id=v_atendimento_id,imovel_id=v_imovel_id,responsavel_id=v_responsavel_id,tipo=v_tipo,titulo=v_titulo,
    descricao=case when p_payload?'descricao' then nullif(btrim(p_payload->>'descricao'),'') else v_atual.descricao end,
    observacoes_internas=case when p_payload?'observacoes_internas' then nullif(btrim(p_payload->>'observacoes_internas'),'') else v_atual.observacoes_internas end,
    moeda=case when p_payload?'moeda' then p_payload->>'moeda' else v_atual.moeda end,
    valor_anunciado=case when p_payload?'valor_anunciado' then nullif(p_payload->>'valor_anunciado','')::numeric else v_atual.valor_anunciado end,
    valor_proposto=case when p_payload?'valor_proposto' then nullif(p_payload->>'valor_proposto','')::numeric else v_atual.valor_proposto end,
    valor_negociado=case when p_payload?'valor_negociado' then nullif(p_payload->>'valor_negociado','')::numeric else v_atual.valor_negociado end,
    valor_fechado=case when p_payload?'valor_fechado' then nullif(p_payload->>'valor_fechado','')::numeric else v_atual.valor_fechado end,
    comissao_percentual=case when p_payload?'comissao_percentual' then nullif(p_payload->>'comissao_percentual','')::numeric else v_atual.comissao_percentual end,
    comissao_prevista=case when p_payload?'comissao_prevista' then nullif(p_payload->>'comissao_prevista','')::numeric else v_atual.comissao_prevista end,
    comissao_efetiva=case when p_payload?'comissao_efetiva' then nullif(p_payload->>'comissao_efetiva','')::numeric else v_atual.comissao_efetiva end,
    sinal=case when p_payload?'sinal' then nullif(p_payload->>'sinal','')::numeric else v_atual.sinal end,
    valor_financiado=case when p_payload?'valor_financiado' then nullif(p_payload->>'valor_financiado','')::numeric else v_atual.valor_financiado end,
    condicoes_comerciais=case when p_payload?'condicoes_comerciais' then nullif(btrim(p_payload->>'condicoes_comerciais'),'') else v_atual.condicoes_comerciais end,
    observacao_financeira=case when p_payload?'observacao_financeira' then nullif(btrim(p_payload->>'observacao_financeira'),'') else v_atual.observacao_financeira end,
    proposta_em=case when p_payload?'proposta_em' then nullif(p_payload->>'proposta_em','')::timestamptz else v_atual.proposta_em end,
    previsao_fechamento=case when p_payload?'previsao_fechamento' then nullif(p_payload->>'previsao_fechamento','')::date else v_atual.previsao_fechamento end,
    contrato_enviado_em=case when p_payload?'contrato_enviado_em' then nullif(p_payload->>'contrato_enviado_em','')::timestamptz else v_atual.contrato_enviado_em end,
    contrato_assinado_em=case when p_payload?'contrato_assinado_em' then nullif(p_payload->>'contrato_assinado_em','')::timestamptz else v_atual.contrato_assinado_em end,
    inicio_vigencia=case when p_payload?'inicio_vigencia' then nullif(p_payload->>'inicio_vigencia','')::date else v_atual.inicio_vigencia end,
    fim_vigencia=case when p_payload?'fim_vigencia' then nullif(p_payload->>'fim_vigencia','')::date else v_atual.fim_vigencia end
  where negocio.id=p_negocio_id returning negocio.updated_at into v_updated_at;

  perform 1 from public.negocios_partes as parte where parte.negocio_id=p_negocio_id and parte.ativo=true for update;
  update public.negocios_partes as parte set principal=false where parte.negocio_id=p_negocio_id and parte.ativo=true and parte.principal=true;
  update public.negocios_partes as parte set ativo=false,principal=false
    where parte.negocio_id=p_negocio_id and parte.ativo=true and not exists(select 1 from jsonb_array_elements(p_partes) as submitted_part(value) where (submitted_part.value->>'pessoa_id')::uuid=parte.pessoa_id and submitted_part.value->>'papel'=parte.papel);
  for v_item in select part_payload.value from jsonb_array_elements(p_partes) as part_payload(value) loop
    v_pessoa_id:=(v_item->>'pessoa_id')::uuid; v_papel:=v_item->>'papel'; v_principal:=coalesce((v_item->>'principal')::boolean,false); v_participacao:=nullif(v_item->>'participacao_percentual','')::numeric; v_observacoes:=nullif(btrim(v_item->>'observacoes'),'');
    select parte.id into v_vinculo_id from public.negocios_partes as parte where parte.negocio_id=p_negocio_id and parte.pessoa_id=v_pessoa_id and parte.papel=v_papel order by parte.ativo desc,parte.updated_at desc limit 1 for update;
    if found then update public.negocios_partes as parte set ativo=true,principal=v_principal,participacao_percentual=v_participacao,observacoes=v_observacoes where parte.id=v_vinculo_id;
    else insert into public.negocios_partes(negocio_id,pessoa_id,papel,principal,participacao_percentual,observacoes) values(p_negocio_id,v_pessoa_id,v_papel,v_principal,v_participacao,v_observacoes); end if;
  end loop;
  select count(*) into v_partes from public.negocios_partes as parte where parte.negocio_id=p_negocio_id and parte.ativo=true;
  begin insert into public.timeline(tipo,titulo,descricao,lead_id,origem) values('negocio_atualizado','Negocio atualizado','Dados do Negocio atualizados.',v_lead_id,'rpc_atualizar_negocio'); exception when others then raise exception using errcode='P0001', message='Falha ao registrar Timeline do Negocio.'; end;
  return query select p_negocio_id,v_lead_id,v_tipo,v_atual.etapa,'ativo'::text,true,v_partes,v_updated_at;
exception when sqlstate 'P0001' then raise; when check_violation or invalid_text_representation or invalid_datetime_format or numeric_value_out_of_range or datetime_field_overflow then raise exception using errcode='P0001', message='Payload invalido.'; when unique_violation then raise exception using errcode='P0001', message='Relacionamento duplicado.'; when foreign_key_violation then raise exception using errcode='P0001', message='Relacionamento invalido.'; when others then raise exception using errcode='P0001', message='Nao foi possivel salvar o Negocio.'; end;
$$;

create or replace function public.movimentar_negocio(p_negocio_id uuid,p_etapa_destino text,p_updated_at_esperado timestamptz,p_observacao text default null)
returns table(negocio_id uuid,etapa_anterior text,etapa_atual text,status_operacional text,ativo boolean,updated_at timestamptz)
language plpgsql security definer set search_path = pg_catalog
as $$
declare v_etapas constant text[]:=array['estruturacao','proposta','negociacao','documentacao','contrato','assinatura']; v_etapa text; v_status text; v_ativo boolean; v_lead_id uuid; v_updated timestamptz; v_obs text; v_origem integer; v_destino integer;
begin
  if auth.uid() is null or not public.usuario_tem_papel(array['administrador','gestor']::text[]) then raise exception using errcode='P0001', message='Operacao nao autorizada.'; end if;
  if p_negocio_id is null or p_updated_at_esperado is null then raise exception using errcode='P0001', message='Negocio atualizado por outra operacao.'; end if;
  if p_etapa_destino is null or p_etapa_destino<>btrim(p_etapa_destino) or not(p_etapa_destino=any(v_etapas)) then raise exception using errcode='P0001', message='Transicao de etapa nao permitida.'; end if;
  v_obs:=nullif(btrim(p_observacao),''); if v_obs is not null and char_length(v_obs)>500 then raise exception using errcode='P0001', message='Observacao excede o limite permitido.'; end if;
  select negocio.etapa,negocio.status_operacional,negocio.ativo,negocio.lead_id,negocio.updated_at into v_etapa,v_status,v_ativo,v_lead_id,v_updated from public.negocios as negocio where negocio.id=p_negocio_id for update;
  if not found then raise exception using errcode='P0001', message='Negocio nao encontrado.'; end if;
  if v_updated is distinct from p_updated_at_esperado then raise exception using errcode='P0001', message='Negocio atualizado por outra operacao.'; end if;
  if not v_ativo then raise exception using errcode='P0001', message='Negocio arquivado.'; end if;
  if v_status<>'ativo' then raise exception using errcode='P0001', message='Negocio encerrado.'; end if;
  v_origem:=array_position(v_etapas,v_etapa); v_destino:=array_position(v_etapas,p_etapa_destino);
  if v_origem is null or v_destino is null or v_origem=v_destino or abs(v_destino-v_origem)<>1 then raise exception using errcode='P0001', message='Transicao de etapa nao permitida.'; end if;
  update public.negocios as negocio set etapa=p_etapa_destino where negocio.id=p_negocio_id returning negocio.updated_at into v_updated;
  begin insert into public.timeline(tipo,titulo,descricao,lead_id,origem) values(
    'negocio_etapa_alterada',
    'Etapa do Negocio alterada',
    case
      when v_obs is null then format('Etapa alterada de %s para %s.',v_etapa,p_etapa_destino)
      else format('Etapa alterada de %s para %s. Observacao: %s',v_etapa,p_etapa_destino,v_obs)
    end,
    v_lead_id,
    'rpc_movimentar_negocio'
  ); exception when others then raise exception using errcode='P0001', message='Falha ao registrar Timeline do Negocio.'; end;
  return query select p_negocio_id,v_etapa,p_etapa_destino,'ativo'::text,true,v_updated;
exception when sqlstate 'P0001' then raise; when others then raise exception using errcode='P0001', message='Nao foi possivel movimentar o Negocio.'; end;
$$;

revoke all privileges on function public.atualizar_negocio(uuid,timestamptz,jsonb,jsonb) from public;
revoke all privileges on function public.atualizar_negocio(uuid,timestamptz,jsonb,jsonb) from anon;
grant execute on function public.atualizar_negocio(uuid,timestamptz,jsonb,jsonb) to authenticated;
revoke all privileges on function public.movimentar_negocio(uuid,text,timestamptz,text) from public;
revoke all privileges on function public.movimentar_negocio(uuid,text,timestamptz,text) from anon;
grant execute on function public.movimentar_negocio(uuid,text,timestamptz,text) to authenticated;

commit;

-- Pos-aplicacao manual (as contagens devem ser iguais as da pre-aplicacao):
-- select (select count(*) from public.negocios) as negocios_depois,(select count(*) from public.negocios_partes) as partes_depois,(select count(*) from public.timeline) as timeline_depois;
-- select to_regprocedure('public.atualizar_negocio(uuid,timestamp with time zone,jsonb,jsonb)'),to_regprocedure('public.movimentar_negocio(uuid,text,timestamp with time zone,text)');
-- select p.oid::regprocedure,p.prosecdef,p.proconfig,pg_get_functiondef(p.oid) from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in('atualizar_negocio','movimentar_negocio') order by p.proname;
-- select routine_name,grantee,privilege_type from information_schema.routine_privileges where routine_schema='public' and routine_name in('atualizar_negocio','movimentar_negocio') order by routine_name,grantee;
-- select to_regprocedure('public.criar_negocio(jsonb,jsonb)'),to_regprocedure('public.concluir_negocio(uuid,timestamp with time zone,text,numeric,numeric,text)'),to_regprocedure('public.perder_negocio(uuid,timestamp with time zone,text,text,text)'),to_regprocedure('public.cancelar_negocio(uuid,timestamp with time zone,text,text,text)'),to_regprocedure('public.reabrir_negocio(uuid,timestamp with time zone,text,text,date)'),to_regprocedure('public.arquivar_negocio(uuid,timestamp with time zone,text)');
