begin;

do $$
begin
  if to_regprocedure('public.concluir_negocio(uuid,timestamp with time zone,text,numeric,numeric,text)') is null
    or to_regprocedure('public.perder_negocio(uuid,timestamp with time zone,text,text,text)') is null
    or to_regprocedure('public.cancelar_negocio(uuid,timestamp with time zone,text,text,text)') is null
    or to_regprocedure('public.reabrir_negocio(uuid,timestamp with time zone,text,text,date)') is null
    or to_regprocedure('public.arquivar_negocio(uuid,timestamp with time zone,text)') is null then
    raise exception 'Precondition failed: final Negocio RPCs do not exist';
  end if;
  if to_regclass('public.negocios') is null or to_regclass('public.negocios_partes') is null
    or to_regclass('public.leads') is null or to_regclass('public.pessoas') is null
    or to_regclass('public.timeline') is null then
    raise exception 'Precondition failed: required tables do not exist';
  end if;
  if to_regclass('public.idx_negocios_negocio_anterior_unico') is null then
    raise exception 'Precondition failed: reopening unique index does not exist';
  end if;
  if to_regprocedure('public.usuario_tem_papel(text[])') is null then
    raise exception 'Precondition failed: authorization helper does not exist';
  end if;
end
$$;

-- Pre-aplicacao manual:
-- select (select count(*) from public.negocios) as negocios_antes,(select count(*) from public.negocios_partes) as partes_antes,(select count(*) from public.timeline) as timeline_antes;

create or replace function public.concluir_negocio(
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

  select negocio.lead_id,negocio.tipo,negocio.etapa,negocio.status_operacional,negocio.ativo,negocio.updated_at,negocio.valor_fechado,negocio.comissao_efetiva
    into v_lead_id,v_tipo,v_etapa,v_status,v_ativo,v_updated_at,v_valor_atual,v_comissao_atual
  from public.negocios as negocio where negocio.id=p_negocio_id for update;
  if not found then raise exception using errcode='P0001',message='Negocio nao encontrado.'; end if;
  if v_updated_at is distinct from p_updated_at_esperado then raise exception using errcode='P0001',message='Negocio atualizado por outra operacao.'; end if;
  if not v_ativo then raise exception using errcode='P0001',message='Negocio arquivado.'; end if;
  if v_status<>'ativo' then raise exception using errcode='P0001',message='Negocio encerrado.'; end if;
  if v_etapa not in('estruturacao','proposta','negociacao','documentacao','contrato','assinatura') then raise exception using errcode='P0001',message='Estado do Negocio invalido.'; end if;
  if (p_resultado='venda_fechada' and v_tipo<>'venda') or (p_resultado='locacao_fechada' and v_tipo<>'locacao') or (p_resultado='administracao_contratada' and v_tipo<>'administracao') then raise exception using errcode='P0001',message='Resultado incompativel com o tipo.'; end if;

  if v_tipo='venda' and (not exists(select 1 from public.negocios_partes as parte where parte.negocio_id=p_negocio_id and parte.ativo=true and parte.papel in('proprietario','vendedor')) or not exists(select 1 from public.negocios_partes as parte where parte.negocio_id=p_negocio_id and parte.ativo=true and parte.papel='comprador')) then raise exception using errcode='P0001',message='Partes insuficientes para conclusao.'; end if;
  if v_tipo='locacao' and (not exists(select 1 from public.negocios_partes as parte where parte.negocio_id=p_negocio_id and parte.ativo=true and parte.papel in('proprietario','locador')) or not exists(select 1 from public.negocios_partes as parte where parte.negocio_id=p_negocio_id and parte.ativo=true and parte.papel='locatario')) then raise exception using errcode='P0001',message='Partes insuficientes para conclusao.'; end if;
  if v_tipo='administracao' and not exists(select 1 from public.negocios_partes as parte where parte.negocio_id=p_negocio_id and parte.ativo=true and parte.papel in('proprietario','contratante')) then raise exception using errcode='P0001',message='Partes insuficientes para conclusao.'; end if;
  if v_tipo='outro' and not exists(select 1 from public.negocios_partes as parte where parte.negocio_id=p_negocio_id and parte.ativo=true) then raise exception using errcode='P0001',message='Partes insuficientes para conclusao.'; end if;

  v_valor_final:=coalesce(p_valor_fechado,v_valor_atual); v_comissao_final:=coalesce(p_comissao_efetiva,v_comissao_atual);
  if v_tipo in('venda','locacao') and (v_valor_final is null or v_valor_final<=0) then raise exception using errcode='P0001',message='Valor final obrigatorio.'; end if;
  if v_valor_final is not null and (v_valor_final<0 or v_valor_final::text in('NaN','Infinity','-Infinity')) then raise exception using errcode='P0001',message='Valor final invalido.'; end if;
  if v_comissao_final is not null and (v_comissao_final<0 or v_comissao_final::text in('NaN','Infinity','-Infinity')) then raise exception using errcode='P0001',message='Comissao invalida.'; end if;

  v_operacao_em:=clock_timestamp();
  update public.negocios as negocio set status_operacional='concluido',resultado=p_resultado,valor_fechado=v_valor_final,
    comissao_efetiva=v_comissao_final,fechado_em=v_operacao_em,perdido_em=null,cancelado_em=null,
    motivo_encerramento=null,encerrado_por_user_id=v_user_id
  where negocio.id=p_negocio_id returning negocio.updated_at into v_updated_retorno;
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

create or replace function public.perder_negocio(p_negocio_id uuid,p_updated_at_esperado timestamptz,p_resultado text,p_motivo text,p_observacao text default null)
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
  select negocio.lead_id,negocio.status_operacional,negocio.ativo,negocio.updated_at into v_lead_id,v_status,v_ativo,v_updated_at from public.negocios as negocio where negocio.id=p_negocio_id for update;
  if not found then raise exception using errcode='P0001',message='Negocio nao encontrado.'; end if;
  if v_updated_at is distinct from p_updated_at_esperado then raise exception using errcode='P0001',message='Negocio atualizado por outra operacao.'; end if;
  if not v_ativo then raise exception using errcode='P0001',message='Negocio arquivado.'; end if;
  if v_status<>'ativo' then raise exception using errcode='P0001',message='Negocio encerrado.'; end if;
  v_operacao_em:=clock_timestamp();
  update public.negocios as negocio set status_operacional='perdido',resultado=p_resultado,motivo_encerramento=v_motivo,
    perdido_em=v_operacao_em,fechado_em=null,cancelado_em=null,encerrado_por_user_id=v_user_id
  where negocio.id=p_negocio_id returning negocio.updated_at into v_updated_retorno;
  if v_updated_retorno is null then raise exception using errcode='P0001',message='Retorno inesperado do Negocio.'; end if;
  begin insert into public.timeline(tipo,titulo,descricao,lead_id,origem) values('negocio_perdido','Negocio perdido',case when v_observacao is null then format('Negocio perdido com resultado %s.',p_resultado) else format('Negocio perdido com resultado %s. Observacao: %s',p_resultado,v_observacao) end,v_lead_id,'rpc_perder_negocio'); exception when others then raise exception using errcode='P0001',message='Falha ao registrar Timeline do Negocio.'; end;
  return query select p_negocio_id,v_lead_id,v_status,'perdido'::text,p_resultado,v_operacao_em,true,v_updated_retorno;
exception when sqlstate 'P0001' then raise; when others then raise exception using errcode='P0001',message='Nao foi possivel registrar a perda do Negocio.'; end;
$$;

create or replace function public.cancelar_negocio(p_negocio_id uuid,p_updated_at_esperado timestamptz,p_resultado text,p_motivo text,p_observacao text default null)
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
  select negocio.lead_id,negocio.status_operacional,negocio.ativo,negocio.updated_at into v_lead_id,v_status,v_ativo,v_updated_at from public.negocios as negocio where negocio.id=p_negocio_id for update;
  if not found then raise exception using errcode='P0001',message='Negocio nao encontrado.'; end if;
  if v_updated_at is distinct from p_updated_at_esperado then raise exception using errcode='P0001',message='Negocio atualizado por outra operacao.'; end if;
  if not v_ativo then raise exception using errcode='P0001',message='Negocio arquivado.'; end if;
  if v_status<>'ativo' then raise exception using errcode='P0001',message='Negocio encerrado.'; end if;
  v_operacao_em:=clock_timestamp();
  update public.negocios as negocio set status_operacional='cancelado',resultado=p_resultado,motivo_encerramento=v_motivo,
    cancelado_em=v_operacao_em,fechado_em=null,perdido_em=null,encerrado_por_user_id=v_user_id
  where negocio.id=p_negocio_id returning negocio.updated_at into v_updated_retorno;
  if v_updated_retorno is null then raise exception using errcode='P0001',message='Retorno inesperado do Negocio.'; end if;
  begin insert into public.timeline(tipo,titulo,descricao,lead_id,origem) values('negocio_cancelado','Negocio cancelado',case when v_observacao is null then format('Negocio cancelado com resultado %s.',p_resultado) else format('Negocio cancelado com resultado %s. Observacao: %s',p_resultado,v_observacao) end,v_lead_id,'rpc_cancelar_negocio'); exception when others then raise exception using errcode='P0001',message='Falha ao registrar Timeline do Negocio.'; end;
  return query select p_negocio_id,v_lead_id,v_status,'cancelado'::text,p_resultado,v_operacao_em,true,v_updated_retorno;
exception when sqlstate 'P0001' then raise; when others then raise exception using errcode='P0001',message='Nao foi possivel cancelar o Negocio.'; end;
$$;

create or replace function public.reabrir_negocio(p_negocio_id_anterior uuid,p_updated_at_esperado timestamptz,p_motivo text,p_titulo text default null,p_previsao_fechamento date default null)
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
  select negocio.* into v_anterior from public.negocios as negocio where negocio.id=p_negocio_id_anterior for update;
  if not found then raise exception using errcode='P0001',message='Negocio nao encontrado.'; end if;
  if v_anterior.updated_at is distinct from p_updated_at_esperado then raise exception using errcode='P0001',message='Negocio atualizado por outra operacao.'; end if;
  if not v_anterior.ativo then raise exception using errcode='P0001',message='Negocio arquivado.'; end if;
  if v_anterior.status_operacional not in('concluido','perdido','cancelado') then raise exception using errcode='P0001',message='Reabertura bloqueada.'; end if;
  perform 1 from public.leads as lead where lead.id=v_anterior.lead_id for update;
  if not found then raise exception using errcode='P0001',message='Lead nao encontrado.'; end if;
  if v_anterior.responsavel_id is not null and not exists(select 1 from public.pessoas as responsavel where responsavel.id=v_anterior.responsavel_id and responsavel.ativo=true and 'corretor'=any(coalesce(responsavel.papeis,array[]::text[]))) then raise exception using errcode='P0001',message='Responsavel invalido.'; end if;
  if exists(
    select 1
    from public.negocios_partes as parte
    left join public.pessoas as pessoa on pessoa.id=parte.pessoa_id
    where parte.negocio_id=p_negocio_id_anterior
      and parte.ativo=true
      and (pessoa.id is null or pessoa.ativo is distinct from true)
  ) then raise exception using errcode='P0001',message='Pessoa participante invalida.'; end if;
  if exists(select 1 from public.negocios as sucessor where sucessor.negocio_anterior_id=p_negocio_id_anterior) then raise exception using errcode='P0001',message='Este Negocio ja possui uma reabertura.'; end if;
  insert into public.negocios as novo(negocio_anterior_id,lead_id,atendimento_id,imovel_id,responsavel_id,tipo,etapa,status_operacional,ativo,titulo,descricao,observacoes_internas,moeda,valor_anunciado,comissao_percentual,comissao_prevista,condicoes_comerciais,observacao_financeira,previsao_fechamento,criado_por_user_id,aberto_em)
  values(p_negocio_id_anterior,v_anterior.lead_id,null,v_anterior.imovel_id,v_anterior.responsavel_id,v_anterior.tipo,'estruturacao','ativo',true,coalesce(v_titulo,v_anterior.titulo),v_anterior.descricao,v_anterior.observacoes_internas,v_anterior.moeda,v_anterior.valor_anunciado,v_anterior.comissao_percentual,v_anterior.comissao_prevista,v_anterior.condicoes_comerciais,v_anterior.observacao_financeira,p_previsao_fechamento,v_user_id,clock_timestamp())
  returning novo.id,novo.created_at,novo.updated_at into v_novo_id,v_created,v_updated;
  insert into public.negocios_partes(negocio_id,pessoa_id,papel,principal,participacao_percentual,observacoes,ativo)
    select v_novo_id,parte.pessoa_id,parte.papel,parte.principal,parte.participacao_percentual,parte.observacoes,true from public.negocios_partes as parte where parte.negocio_id=p_negocio_id_anterior and parte.ativo=true;
  select count(*) into v_partes from public.negocios_partes as parte where parte.negocio_id=v_novo_id and parte.ativo=true;
  begin insert into public.timeline(tipo,titulo,descricao,lead_id,origem) values('negocio_reaberto','Negocio reaberto',format('Novo ciclo do Negocio criado. Motivo: %s',v_motivo),v_anterior.lead_id,'rpc_reabrir_negocio'); exception when others then raise exception using errcode='P0001',message='Falha ao registrar Timeline do Negocio.'; end;
  if v_novo_id is null or v_novo_id=p_negocio_id_anterior or v_created is null or v_updated is null then raise exception using errcode='P0001',message='Retorno inesperado do Negocio.'; end if;
  return query select v_novo_id,p_negocio_id_anterior,v_anterior.lead_id,v_anterior.tipo,'estruturacao'::text,'ativo'::text,true,v_partes,v_created,v_updated;
exception when unique_violation then raise exception using errcode='P0001',message='Este Negocio ja possui uma reabertura.'; when sqlstate 'P0001' then raise; when foreign_key_violation then raise exception using errcode='P0001',message='Relacionamento invalido.'; when others then raise exception using errcode='P0001',message='Nao foi possivel reabrir o Negocio.'; end;
$$;

create or replace function public.arquivar_negocio(p_negocio_id uuid,p_updated_at_esperado timestamptz,p_motivo text)
returns table(negocio_id uuid,lead_id uuid,status_operacional text,ativo boolean,updated_at timestamptz)
language plpgsql security definer set search_path = pg_catalog
as $$
declare v_user_id uuid; v_lead_id uuid; v_status text; v_ativo boolean; v_updated_at timestamptz; v_motivo text; v_updated_retorno timestamptz;
begin
  v_user_id:=auth.uid(); if v_user_id is null or not public.usuario_tem_papel(array['administrador','gestor']::text[]) then raise exception using errcode='P0001',message='Operacao nao autorizada.'; end if;
  if p_negocio_id is null then raise exception using errcode='P0001',message='Negocio nao encontrado.'; end if;
  if p_updated_at_esperado is null then raise exception using errcode='P0001',message='Negocio atualizado por outra operacao.'; end if;
  v_motivo:=nullif(btrim(p_motivo),''); if v_motivo is null or char_length(v_motivo)<3 or char_length(v_motivo)>500 then raise exception using errcode='P0001',message='Motivo invalido.'; end if;
  select negocio.lead_id,negocio.status_operacional,negocio.ativo,negocio.updated_at into v_lead_id,v_status,v_ativo,v_updated_at from public.negocios as negocio where negocio.id=p_negocio_id for update;
  if not found then raise exception using errcode='P0001',message='Negocio nao encontrado.'; end if;
  if v_updated_at is distinct from p_updated_at_esperado then raise exception using errcode='P0001',message='Negocio atualizado por outra operacao.'; end if;
  if not v_ativo then raise exception using errcode='P0001',message='Negocio arquivado.'; end if;
  if v_status not in('concluido','perdido','cancelado') then raise exception using errcode='P0001',message='Arquivamento bloqueado.'; end if;
  update public.negocios as negocio set ativo=false where negocio.id=p_negocio_id returning negocio.updated_at into v_updated_retorno;
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

-- Pos-aplicacao manual (as contagens devem ser iguais as da pre-aplicacao):
-- select (select count(*) from public.negocios) as negocios_depois,(select count(*) from public.negocios_partes) as partes_depois,(select count(*) from public.timeline) as timeline_depois;
-- select to_regprocedure('public.concluir_negocio(uuid,timestamp with time zone,text,numeric,numeric,text)'),to_regprocedure('public.perder_negocio(uuid,timestamp with time zone,text,text,text)'),to_regprocedure('public.cancelar_negocio(uuid,timestamp with time zone,text,text,text)'),to_regprocedure('public.reabrir_negocio(uuid,timestamp with time zone,text,text,date)'),to_regprocedure('public.arquivar_negocio(uuid,timestamp with time zone,text)');
-- select p.oid::regprocedure,p.prosecdef,p.proconfig,pg_get_functiondef(p.oid) from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in('concluir_negocio','perder_negocio','cancelar_negocio','reabrir_negocio','arquivar_negocio') order by p.proname;
-- select routine_name,grantee,privilege_type from information_schema.routine_privileges where routine_schema='public' and routine_name in('concluir_negocio','perder_negocio','cancelar_negocio','reabrir_negocio','arquivar_negocio') order by routine_name,grantee;
-- select to_regprocedure('public.criar_negocio(jsonb,jsonb)'),to_regprocedure('public.atualizar_negocio(uuid,timestamp with time zone,jsonb,jsonb)'),to_regprocedure('public.movimentar_negocio(uuid,text,timestamp with time zone,text)');
