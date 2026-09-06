-- Persistencia transacional e idempotente de Leads recebidos pelo n8n a
-- partir do WhatsApp. A autenticacao HMAC acontece na Route Handler; somente
-- service_role pode executar as funcoes desta migration.
--
-- O rate limit usa tres janelas atomicas:
--   - burst: 20 requisicoes por 10 segundos por key_id;
--   - minuto: 60 requisicoes por minuto por key_id;
--   - hora: 1.000 requisicoes por hora por conta externa.
--
-- Nenhuma mensagem bruta e recebida; o payload JSON bruto nao e armazenado.

begin;

do $$
begin
  if to_regclass('public.leads') is null then
    raise exception 'Precondition failed: public.leads ausente';
  end if;

  if to_regclass('public.timeline') is null then
    raise exception 'Precondition failed: public.timeline ausente';
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'leads'
      and column_name = 'telefone_normalizado'
      and data_type = 'text'
  ) then
    raise exception 'Precondition failed: public.leads.telefone_normalizado text ausente';
  end if;
end;
$$;

create table if not exists public.lead_integracao_eventos (
  id uuid primary key default gen_random_uuid(),
  integracao text not null,
  canal text not null,
  conta_externa_id text not null,
  evento_externo_id text not null,
  conversa_externa_id text,
  tipo_evento text not null,
  lead_id uuid,
  ocorrido_em timestamptz not null,
  recebido_em timestamptz not null default pg_catalog.now(),
  processado_em timestamptz,
  status text not null default 'processando',
  resultado text,
  payload_sha256 text not null,
  erro_codigo text,
  constraint lead_integracao_eventos_lead_id_fkey
    foreign key (lead_id) references public.leads(id) on delete restrict,
  constraint lead_integracao_eventos_integracao_check
    check (integracao = 'n8n'),
  constraint lead_integracao_eventos_canal_check
    check (canal = 'whatsapp'),
  constraint lead_integracao_eventos_conta_externa_id_check
    check (
      nullif(btrim(conta_externa_id), '') is not null
      and char_length(conta_externa_id) <= 200
    ),
  constraint lead_integracao_eventos_evento_externo_id_check
    check (
      nullif(btrim(evento_externo_id), '') is not null
      and char_length(evento_externo_id) <= 200
    ),
  constraint lead_integracao_eventos_conversa_externa_id_check
    check (
      conversa_externa_id is null
      or (
        nullif(btrim(conversa_externa_id), '') is not null
        and char_length(conversa_externa_id) <= 200
      )
    ),
  constraint lead_integracao_eventos_tipo_evento_check
    check (tipo_evento = 'message.received'),
  constraint lead_integracao_eventos_status_check
    check (status in ('processando', 'processado', 'conflito', 'falhou')),
  constraint lead_integracao_eventos_resultado_check
    check (
      resultado is null
      or resultado in ('created', 'matched_updated', 'matched_no_change')
    ),
  constraint lead_integracao_eventos_payload_sha256_check
    check (payload_sha256 ~ '^[0-9a-f]{64}$'),
  constraint lead_integracao_eventos_erro_codigo_check
    check (
      erro_codigo is null
      or (
        nullif(btrim(erro_codigo), '') is not null
        and char_length(erro_codigo) <= 80
      )
    ),
  constraint lead_integracao_eventos_processamento_check
    check (
      (status = 'processando' and processado_em is null and resultado is null and erro_codigo is null)
      or
      (status = 'processado' and processado_em is not null and lead_id is not null and resultado is not null and erro_codigo is null)
      or
      (status in ('conflito', 'falhou') and processado_em is not null and resultado is null and erro_codigo is not null)
    )
);

create unique index if not exists idx_lead_integracao_eventos_idempotencia
  on public.lead_integracao_eventos (
    integracao,
    canal,
    conta_externa_id,
    evento_externo_id
  );

create index if not exists idx_lead_integracao_eventos_lead_recebido
  on public.lead_integracao_eventos (lead_id, recebido_em desc)
  where lead_id is not null;

create table if not exists public.integracao_rate_limit_janelas (
  escopo text not null,
  identificador text not null,
  janela_inicio timestamptz not null,
  janela_fim timestamptz not null,
  contador integer not null default 1,
  updated_at timestamptz not null default pg_catalog.now(),
  primary key (escopo, identificador, janela_inicio),
  constraint integracao_rate_limit_janelas_escopo_check
    check (escopo in ('key_burst', 'key_minute', 'account_hour')),
  constraint integracao_rate_limit_janelas_identificador_check
    check (
      nullif(btrim(identificador), '') is not null
      and char_length(identificador) <= 200
    ),
  constraint integracao_rate_limit_janelas_intervalo_check
    check (janela_fim > janela_inicio),
  constraint integracao_rate_limit_janelas_contador_check
    check (contador > 0)
);

create index if not exists idx_integracao_rate_limit_janelas_fim
  on public.integracao_rate_limit_janelas (janela_fim);

alter table public.lead_integracao_eventos enable row level security;
alter table public.integracao_rate_limit_janelas enable row level security;

revoke all privileges on table
  public.lead_integracao_eventos,
  public.integracao_rate_limit_janelas
from public;

revoke all privileges on table
  public.lead_integracao_eventos,
  public.integracao_rate_limit_janelas
from anon;

revoke all privileges on table
  public.lead_integracao_eventos,
  public.integracao_rate_limit_janelas
from authenticated;

grant select, insert, update, delete on table
  public.lead_integracao_eventos,
  public.integracao_rate_limit_janelas
to service_role;

create or replace function public.verificar_rate_limit_integracao_leads(
  p_key_id text,
  p_conta_externa_id text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_now timestamptz := pg_catalog.clock_timestamp();
  v_burst_inicio timestamptz;
  v_minuto_inicio timestamptz;
  v_hora_inicio timestamptz;
  v_burst_contador integer;
  v_minuto_contador integer;
  v_hora_contador integer;
  v_retry_after integer := 0;
begin
  p_key_id := nullif(btrim(p_key_id), '');
  p_conta_externa_id := nullif(btrim(p_conta_externa_id), '');

  if p_key_id is null
    or char_length(p_key_id) > 200
    or p_conta_externa_id is null
    or char_length(p_conta_externa_id) > 200 then
    raise exception using errcode = 'P0001', message = 'Identificador de rate limit invalido.';
  end if;

  v_burst_inicio := pg_catalog.to_timestamp(
    floor(extract(epoch from v_now) / 10) * 10
  );
  v_minuto_inicio := date_trunc('minute', v_now);
  v_hora_inicio := date_trunc('hour', v_now);

  insert into public.integracao_rate_limit_janelas as janela (
    escopo,
    identificador,
    janela_inicio,
    janela_fim,
    contador,
    updated_at
  )
  values (
    'key_burst',
    p_key_id,
    v_burst_inicio,
    v_burst_inicio + interval '10 seconds',
    1,
    v_now
  )
  on conflict (escopo, identificador, janela_inicio)
  do update
    set contador = janela.contador + 1,
        updated_at = excluded.updated_at
  returning contador into v_burst_contador;

  insert into public.integracao_rate_limit_janelas as janela (
    escopo,
    identificador,
    janela_inicio,
    janela_fim,
    contador,
    updated_at
  )
  values (
    'key_minute',
    p_key_id,
    v_minuto_inicio,
    v_minuto_inicio + interval '1 minute',
    1,
    v_now
  )
  on conflict (escopo, identificador, janela_inicio)
  do update
    set contador = janela.contador + 1,
        updated_at = excluded.updated_at
  returning contador into v_minuto_contador;

  insert into public.integracao_rate_limit_janelas as janela (
    escopo,
    identificador,
    janela_inicio,
    janela_fim,
    contador,
    updated_at
  )
  values (
    'account_hour',
    p_conta_externa_id,
    v_hora_inicio,
    v_hora_inicio + interval '1 hour',
    1,
    v_now
  )
  on conflict (escopo, identificador, janela_inicio)
  do update
    set contador = janela.contador + 1,
        updated_at = excluded.updated_at
  returning contador into v_hora_contador;

  if v_burst_contador > 20 then
    v_retry_after := greatest(
      v_retry_after,
      ceil(extract(epoch from (v_burst_inicio + interval '10 seconds' - v_now)))::integer
    );
  end if;

  if v_minuto_contador > 60 then
    v_retry_after := greatest(
      v_retry_after,
      ceil(extract(epoch from (v_minuto_inicio + interval '1 minute' - v_now)))::integer
    );
  end if;

  if v_hora_contador > 1000 then
    v_retry_after := greatest(
      v_retry_after,
      ceil(extract(epoch from (v_hora_inicio + interval '1 hour' - v_now)))::integer
    );
  end if;

  delete from public.integracao_rate_limit_janelas
  where janela_fim < v_now - interval '2 days';

  if v_retry_after > 0 then
    return jsonb_build_object(
      'allowed', false,
      'retry_after', greatest(v_retry_after, 1),
      'code', 'rate_limited'
    );
  end if;

  return jsonb_build_object(
    'allowed', true,
    'retry_after', 0
  );
exception
  when sqlstate 'P0001' then
    raise;
  when others then
    raise exception using errcode = 'P0001', message = 'Nao foi possivel verificar o limite da integracao.';
end;
$$;

create or replace function public.processar_lead_integracao_whatsapp(
  p_integracao text,
  p_canal text,
  p_conta_externa_id text,
  p_evento_externo_id text,
  p_conversa_externa_id text,
  p_tipo_evento text,
  p_ocorrido_em timestamptz,
  p_payload_sha256 text,
  p_nome text,
  p_telefone text,
  p_telefone_normalizado text,
  p_email text,
  p_email_normalizado text,
  p_cidade text,
  p_bairro_interesse text,
  p_tipo_relacionamento text,
  p_objetivo_imobiliario text,
  p_handoff_requested boolean
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_evento_id uuid;
  v_evento_existente public.lead_integracao_eventos%rowtype;
  v_lead_telefone_id uuid;
  v_lead_email_id uuid;
  v_lead_id uuid;
  v_changed_id uuid;
  v_resultado text;
  v_nome text;
  v_origem_detalhe text;
  v_handoff_status text;
begin
  p_integracao := nullif(btrim(p_integracao), '');
  p_canal := nullif(btrim(p_canal), '');
  p_conta_externa_id := nullif(btrim(p_conta_externa_id), '');
  p_evento_externo_id := nullif(btrim(p_evento_externo_id), '');
  p_conversa_externa_id := nullif(btrim(p_conversa_externa_id), '');
  p_tipo_evento := nullif(btrim(p_tipo_evento), '');
  p_payload_sha256 := nullif(btrim(p_payload_sha256), '');
  p_nome := nullif(btrim(p_nome), '');
  p_telefone := nullif(btrim(p_telefone), '');
  p_telefone_normalizado := nullif(btrim(p_telefone_normalizado), '');
  p_email := nullif(btrim(p_email), '');
  p_email_normalizado := nullif(btrim(p_email_normalizado), '');
  p_cidade := nullif(btrim(p_cidade), '');
  p_bairro_interesse := nullif(btrim(p_bairro_interesse), '');
  p_tipo_relacionamento := nullif(btrim(p_tipo_relacionamento), '');
  p_objetivo_imobiliario := nullif(btrim(p_objetivo_imobiliario), '');

  if p_integracao <> 'n8n'
    or p_canal <> 'whatsapp'
    or p_tipo_evento <> 'message.received'
    or p_conta_externa_id is null
    or char_length(p_conta_externa_id) > 200
    or p_evento_externo_id is null
    or char_length(p_evento_externo_id) > 200
    or (p_conversa_externa_id is not null and char_length(p_conversa_externa_id) > 200)
    or p_ocorrido_em is null
    or p_payload_sha256 is null
    or p_payload_sha256 !~ '^[0-9a-f]{64}$'
    or p_telefone is null
    or p_telefone_normalizado is null
    or p_telefone_normalizado !~ '^\+55[0-9]{10,11}$'
    or p_handoff_requested is null then
    raise exception using errcode = 'P0001', message = 'Payload da integracao invalido.';
  end if;

  if (p_nome is not null and char_length(p_nome) > 160)
    or (p_email is not null and char_length(p_email) > 254)
    or (p_email_normalizado is not null and (
      char_length(p_email_normalizado) > 254
      or p_email_normalizado <> lower(p_email_normalizado)
      or p_email_normalizado !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
    ))
    or (p_cidade is not null and char_length(p_cidade) > 120)
    or (p_bairro_interesse is not null and char_length(p_bairro_interesse) > 120)
    or (p_tipo_relacionamento is not null and p_tipo_relacionamento not in (
      'interessado_imovel',
      'proprietario_anunciante',
      'proprietario_administracao',
      'avaliacao_imovel',
      'investidor',
      'parceiro',
      'outro'
    ))
    or (p_objetivo_imobiliario is not null and p_objetivo_imobiliario not in (
      'comprar',
      'alugar',
      'vender',
      'anunciar_locacao',
      'administrar_imovel',
      'avaliar_imovel',
      'investir',
      'outro'
    )) then
    raise exception using errcode = 'P0001', message = 'Payload da integracao invalido.';
  end if;

  if (p_email is null) <> (p_email_normalizado is null) then
    raise exception using errcode = 'P0001', message = 'Payload da integracao invalido.';
  end if;

  insert into public.lead_integracao_eventos (
    integracao,
    canal,
    conta_externa_id,
    evento_externo_id,
    conversa_externa_id,
    tipo_evento,
    ocorrido_em,
    status,
    payload_sha256
  )
  values (
    p_integracao,
    p_canal,
    p_conta_externa_id,
    p_evento_externo_id,
    p_conversa_externa_id,
    p_tipo_evento,
    p_ocorrido_em,
    'processando',
    p_payload_sha256
  )
  on conflict (integracao, canal, conta_externa_id, evento_externo_id)
  do nothing
  returning id into v_evento_id;

  if v_evento_id is null then
    select evento.*
    into v_evento_existente
    from public.lead_integracao_eventos as evento
    where evento.integracao = p_integracao
      and evento.canal = p_canal
      and evento.conta_externa_id = p_conta_externa_id
      and evento.evento_externo_id = p_evento_externo_id;

    if not found then
      raise exception using errcode = 'P0001', message = 'Nao foi possivel confirmar o replay da integracao.';
    end if;

    return jsonb_build_object(
      'ok', v_evento_existente.status = 'processado',
      'event_id', v_evento_existente.id,
      'external_event_id', v_evento_existente.evento_externo_id,
      'lead_id', v_evento_existente.lead_id,
      'outcome', 'duplicate_replay',
      'original_outcome', v_evento_existente.resultado,
      'error_code', v_evento_existente.erro_codigo,
      'idempotent_replay', true
    );
  end if;

  select lead.id
  into v_lead_telefone_id
  from public.leads as lead
  where lead.status_operacional = 'ativo'
    and lead.telefone_normalizado = p_telefone_normalizado
  limit 1
  for update;

  if p_email_normalizado is not null then
    select lead.id
    into v_lead_email_id
    from public.leads as lead
    where lead.status_operacional = 'ativo'
      and lead.email_normalizado = p_email_normalizado
    limit 1
    for update;
  end if;

  if v_lead_telefone_id is not null
    and v_lead_email_id is not null
    and v_lead_telefone_id <> v_lead_email_id then
    update public.lead_integracao_eventos
    set
      status = 'conflito',
      erro_codigo = 'identity_conflict',
      processado_em = pg_catalog.now()
    where id = v_evento_id;

    return jsonb_build_object(
      'ok', false,
      'event_id', v_evento_id,
      'external_event_id', p_evento_externo_id,
      'lead_id', null,
      'outcome', 'identity_conflict',
      'error_code', 'identity_conflict',
      'idempotent_replay', false
    );
  end if;

  v_lead_id := coalesce(v_lead_telefone_id, v_lead_email_id);

  if v_lead_id is null then
    v_nome := coalesce(p_nome, 'Contato via WhatsApp');
    v_origem_detalhe := 'n8n/whatsapp:' || p_conta_externa_id;
    v_handoff_status := case
      when p_handoff_requested then 'aguardando_humano'
      else 'ia'
    end;

    insert into public.leads (
      nome,
      telefone,
      telefone_normalizado,
      email,
      email_normalizado,
      tipo_lead,
      objetivo,
      cidade,
      bairro_interesse,
      origem,
      status,
      responsavel,
      observacao,
      etapa_funil,
      status_operacional,
      temperatura,
      tipo_relacionamento,
      objetivo_imobiliario,
      canal,
      origem_detalhe,
      handoff_status,
      responsavel_id,
      atribuido_em
    )
    values (
      v_nome,
      p_telefone,
      p_telefone_normalizado,
      p_email,
      p_email_normalizado,
      p_tipo_relacionamento,
      p_objetivo_imobiliario,
      p_cidade,
      p_bairro_interesse,
      'whatsapp',
      'novo',
      null,
      null,
      'novo',
      'ativo',
      null,
      p_tipo_relacionamento,
      p_objetivo_imobiliario,
      'whatsapp',
      v_origem_detalhe,
      v_handoff_status,
      null,
      null
    )
    returning id into v_lead_id;

    v_resultado := 'created';
  else
    update public.leads as lead
    set
      nome = case
        when p_nome is not null
          and (nullif(btrim(lead.nome), '') is null or lead.nome = 'Contato via WhatsApp')
        then p_nome
        else lead.nome
      end,
      email = case
        when lead.email_normalizado is null and p_email_normalizado is not null
        then p_email
        else lead.email
      end,
      email_normalizado = case
        when lead.email_normalizado is null and p_email_normalizado is not null
        then p_email_normalizado
        else lead.email_normalizado
      end,
      cidade = case
        when nullif(btrim(lead.cidade), '') is null and p_cidade is not null
        then p_cidade
        else lead.cidade
      end,
      bairro_interesse = case
        when nullif(btrim(lead.bairro_interesse), '') is null and p_bairro_interesse is not null
        then p_bairro_interesse
        else lead.bairro_interesse
      end,
      tipo_relacionamento = case
        when lead.tipo_relacionamento is null and p_tipo_relacionamento is not null
        then p_tipo_relacionamento
        else lead.tipo_relacionamento
      end,
      tipo_lead = case
        when lead.tipo_relacionamento is null
          and p_tipo_relacionamento is not null
          and nullif(btrim(lead.tipo_lead), '') is null
        then p_tipo_relacionamento
        else lead.tipo_lead
      end,
      objetivo_imobiliario = case
        when lead.objetivo_imobiliario is null and p_objetivo_imobiliario is not null
        then p_objetivo_imobiliario
        else lead.objetivo_imobiliario
      end,
      objetivo = case
        when lead.objetivo_imobiliario is null
          and p_objetivo_imobiliario is not null
          and nullif(btrim(lead.objetivo), '') is null
        then p_objetivo_imobiliario
        else lead.objetivo
      end,
      handoff_status = case
        when p_handoff_requested
          and lead.handoff_status in ('ia', 'devolvido_ia')
        then 'aguardando_humano'
        else lead.handoff_status
      end
    where lead.id = v_lead_id
      and (
        (
          p_nome is not null
          and (nullif(btrim(lead.nome), '') is null or lead.nome = 'Contato via WhatsApp')
          and lead.nome is distinct from p_nome
        )
        or (lead.email_normalizado is null and p_email_normalizado is not null)
        or (nullif(btrim(lead.cidade), '') is null and p_cidade is not null)
        or (nullif(btrim(lead.bairro_interesse), '') is null and p_bairro_interesse is not null)
        or (lead.tipo_relacionamento is null and p_tipo_relacionamento is not null)
        or (lead.objetivo_imobiliario is null and p_objetivo_imobiliario is not null)
        or (
          p_handoff_requested
          and lead.handoff_status in ('ia', 'devolvido_ia')
        )
      )
    returning lead.id into v_changed_id;

    v_resultado := case
      when v_changed_id is not null then 'matched_updated'
      else 'matched_no_change'
    end;
  end if;

  insert into public.timeline (
    tipo,
    titulo,
    descricao,
    lead_id,
    origem
  )
  values (
    'lead_interacao_externa',
    'Interação recebida via WhatsApp',
    'Nova interação externa registrada para o Lead.',
    v_lead_id,
    'rpc_processar_lead_integracao'
  );

  update public.lead_integracao_eventos
  set
    lead_id = v_lead_id,
    status = 'processado',
    resultado = v_resultado,
    erro_codigo = null,
    processado_em = pg_catalog.now()
  where id = v_evento_id;

  return jsonb_build_object(
    'ok', true,
    'event_id', v_evento_id,
    'external_event_id', p_evento_externo_id,
    'lead_id', v_lead_id,
    'outcome', v_resultado,
    'idempotent_replay', false
  );
exception
  when sqlstate 'P0001' then
    raise;
  when unique_violation then
    raise exception using errcode = 'P0001', message = 'Conflito concorrente ao processar a integracao.';
  when others then
    raise exception using errcode = 'P0001', message = 'Nao foi possivel processar a integracao.';
end;
$$;

revoke all privileges on function public.verificar_rate_limit_integracao_leads(text,text) from public;
revoke all privileges on function public.verificar_rate_limit_integracao_leads(text,text) from anon;
revoke all privileges on function public.verificar_rate_limit_integracao_leads(text,text) from authenticated;
grant execute on function public.verificar_rate_limit_integracao_leads(text,text) to service_role;

revoke all privileges on function public.processar_lead_integracao_whatsapp(
  text,text,text,text,text,text,timestamptz,text,text,text,text,text,text,text,text,text,text,boolean
) from public;
revoke all privileges on function public.processar_lead_integracao_whatsapp(
  text,text,text,text,text,text,timestamptz,text,text,text,text,text,text,text,text,text,text,boolean
) from anon;
revoke all privileges on function public.processar_lead_integracao_whatsapp(
  text,text,text,text,text,text,timestamptz,text,text,text,text,text,text,text,text,text,text,boolean
) from authenticated;
grant execute on function public.processar_lead_integracao_whatsapp(
  text,text,text,text,text,text,timestamptz,text,text,text,text,text,text,text,text,text,text,boolean
) to service_role;

commit;

-- Verificacoes manuais apos aplicar:
-- select relname, relrowsecurity from pg_catalog.pg_class where oid in ('public.lead_integracao_eventos'::regclass, 'public.integracao_rate_limit_janelas'::regclass);
-- select schemaname, tablename, policyname from pg_catalog.pg_policies where schemaname='public' and tablename in ('lead_integracao_eventos','integracao_rate_limit_janelas');
-- select p.oid::regprocedure, p.prosecdef, p.proconfig from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in ('verificar_rate_limit_integracao_leads','processar_lead_integracao_whatsapp');
