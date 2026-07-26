begin;

do $$
begin
  if to_regclass('public.imoveis') is null then
    raise exception 'Precondition failed: public.imoveis does not exist';
  end if;

  if to_regclass('public.pessoas') is null then
    raise exception 'Precondition failed: public.pessoas does not exist';
  end if;

  if to_regclass('public.imovel_proprietarios') is null then
    raise exception 'Precondition failed: public.imovel_proprietarios does not exist';
  end if;

  if to_regclass('public.usuarios_perfis') is null then
    raise exception 'Precondition failed: public.usuarios_perfis does not exist';
  end if;

  if to_regprocedure('public.usuario_tem_papel(text[])') is null then
    raise exception 'Precondition failed: public.usuario_tem_papel(text[]) does not exist';
  end if;
end
$$;

create or replace function public.salvar_imovel_com_proprietarios(
  p_imovel_id uuid,
  p_payload jsonb,
  p_proprietarios jsonb
)
returns table (
  imovel_id uuid,
  operacao text,
  proprietarios_ativos integer
)
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_usuario_id uuid := auth.uid();
  v_imovel_id uuid;
  v_operacao text;
  v_key text;
  v_item jsonb;
  v_item_key text;
  v_total integer;
  v_distintos integer;
  v_contatos_principais integer;
  v_pessoas_ativas integer;
  v_proprietarios_ativos integer;
  v_proprietario_legado_id uuid;
  v_relacoes_ativas_existentes integer := 0;
  v_permitir_sem_relacoes boolean := false;
  v_allowed_payload_keys constant text[] := array[
    'proprietario_id', 'codigo', 'titulo', 'tipo', 'subtipo', 'finalidade',
    'status', 'situacao', 'responsavel_id', 'origem', 'data_captacao',
    'exclusividade', 'observacoes', 'cep', 'endereco', 'numero', 'complemento',
    'bairro', 'cidade', 'estado', 'latitude', 'longitude', 'google_maps',
    'valor_venda', 'valor_locacao', 'aluguel_pretendido', 'valor_condominio',
    'valor_iptu', 'taxa_bombeiro', 'taxa_administracao', 'comissao_venda',
    'comissao_locacao', 'valor_minimo_aceito', 'valor_ideal', 'valor_anunciado',
    'area_total', 'area_util', 'area_construida', 'metragem', 'dormitorios',
    'quartos', 'suites', 'banheiros', 'lavabos', 'garagens', 'garagem', 'andar',
    'elevadores', 'ano_construcao', 'piscina', 'academia', 'varanda',
    'varanda_gourmet', 'sacada', 'churrasqueira', 'energia_solar', 'mobiliado',
    'aceita_pet', 'ar_condicionado', 'portaria', 'condominio_fechado',
    'vista_mar', 'frente_mar', 'beira_lago', 'acessibilidade', 'matricula',
    'cartorio', 'iptu_documento', 'habite_se', 'escritura', 'registro',
    'documentacao_completa', 'pendencias_documentacao', 'upload_pdf', 'fotos',
    'videos', 'tour_360', 'drone', 'planta', 'thumbnail', 'foto_principal',
    'ordenacao_midias', 'portal_proprio', 'site', 'chaves_na_mao', 'olx',
    'viva_real', 'zap', 'status_publicacao', 'data_publicacao',
    'ultima_atualizacao_publicacao', 'resumo_comercial', 'resumo_tecnico',
    'perfil_ideal', 'observacoes_ia', 'score_comercial', 'score_locacao',
    'liquidez'
  ]::text[];
  v_text_keys constant text[] := array[
    'codigo', 'titulo', 'tipo', 'subtipo', 'finalidade', 'status', 'situacao',
    'origem', 'observacoes', 'cep', 'endereco', 'numero', 'complemento',
    'bairro', 'cidade', 'estado', 'google_maps', 'matricula', 'cartorio',
    'iptu_documento', 'habite_se', 'escritura', 'registro',
    'pendencias_documentacao', 'upload_pdf', 'fotos', 'videos', 'tour_360',
    'drone', 'planta', 'thumbnail', 'foto_principal', 'ordenacao_midias',
    'status_publicacao', 'resumo_comercial', 'resumo_tecnico', 'perfil_ideal',
    'observacoes_ia', 'liquidez'
  ]::text[];
  v_uuid_keys constant text[] := array['proprietario_id', 'responsavel_id']::text[];
  v_date_keys constant text[] := array['data_captacao', 'data_publicacao']::text[];
  v_timestamptz_keys constant text[] := array['ultima_atualizacao_publicacao']::text[];
  v_numeric_keys constant text[] := array[
    'latitude', 'longitude', 'valor_venda', 'valor_locacao',
    'aluguel_pretendido', 'valor_condominio', 'valor_iptu', 'taxa_bombeiro',
    'taxa_administracao', 'comissao_venda', 'comissao_locacao',
    'valor_minimo_aceito', 'valor_ideal', 'valor_anunciado', 'area_total',
    'area_util', 'area_construida', 'metragem'
  ]::text[];
  v_integer_keys constant text[] := array[
    'dormitorios', 'quartos', 'suites', 'banheiros', 'lavabos', 'garagens',
    'andar', 'elevadores', 'ano_construcao', 'score_comercial', 'score_locacao'
  ]::text[];
  v_boolean_keys constant text[] := array[
    'exclusividade', 'garagem', 'piscina', 'academia', 'varanda',
    'varanda_gourmet', 'sacada', 'churrasqueira', 'energia_solar', 'mobiliado',
    'aceita_pet', 'ar_condicionado', 'portaria', 'condominio_fechado',
    'vista_mar', 'frente_mar', 'beira_lago', 'acessibilidade',
    'documentacao_completa', 'portal_proprio', 'site', 'chaves_na_mao', 'olx',
    'viva_real', 'zap'
  ]::text[];
begin
  if v_usuario_id is null then
    raise exception 'Autenticacao obrigatoria.';
  end if;

  if not public.usuario_tem_papel(array['administrador', 'gestor']::text[]) then
    raise exception 'Permissao insuficiente para salvar imovel.';
  end if;

  if p_payload is null or jsonb_typeof(p_payload) <> 'object' then
    raise exception 'Payload do imovel deve ser um objeto JSON.';
  end if;

  if p_payload ? 'id' or p_payload ? 'created_at'
    or p_payload ? 'updated_at' or p_payload ? 'ativo' then
    raise exception 'Payload do imovel contem campo protegido.';
  end if;

  for v_key in select jsonb_object_keys(p_payload)
  loop
    if not (v_key = any(v_allowed_payload_keys)) then
      raise exception 'Payload do imovel contem campo desconhecido.';
    end if;
  end loop;

  foreach v_key in array v_text_keys
  loop
    if p_payload ? v_key
      and jsonb_typeof(p_payload -> v_key) not in ('string', 'null') then
      raise exception 'Payload do imovel contem tipo invalido.';
    end if;
  end loop;

  foreach v_key in array v_uuid_keys
  loop
    if p_payload ? v_key
      and jsonb_typeof(p_payload -> v_key) not in ('string', 'null') then
      raise exception 'Payload do imovel contem tipo invalido.';
    end if;
    if p_payload ? v_key
      and jsonb_typeof(p_payload -> v_key) = 'string'
      and (p_payload ->> v_key) !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then
      raise exception 'Payload do imovel contem UUID invalido.';
    end if;
  end loop;

  foreach v_key in array v_date_keys
  loop
    if p_payload ? v_key
      and jsonb_typeof(p_payload -> v_key) not in ('string', 'null') then
      raise exception 'Payload do imovel contem tipo invalido.';
    end if;
    if p_payload ? v_key and jsonb_typeof(p_payload -> v_key) = 'string' then
      perform (p_payload ->> v_key)::date;
    end if;
  end loop;

  foreach v_key in array v_timestamptz_keys
  loop
    if p_payload ? v_key
      and jsonb_typeof(p_payload -> v_key) not in ('string', 'null') then
      raise exception 'Payload do imovel contem tipo invalido.';
    end if;
    if p_payload ? v_key and jsonb_typeof(p_payload -> v_key) = 'string' then
      perform (p_payload ->> v_key)::timestamptz;
    end if;
  end loop;

  foreach v_key in array v_numeric_keys
  loop
    if p_payload ? v_key
      and jsonb_typeof(p_payload -> v_key) not in ('number', 'null') then
      raise exception 'Payload do imovel contem tipo invalido.';
    end if;
  end loop;

  foreach v_key in array v_integer_keys
  loop
    if p_payload ? v_key
      and jsonb_typeof(p_payload -> v_key) not in ('number', 'null') then
      raise exception 'Payload do imovel contem tipo invalido.';
    end if;
    if p_payload ? v_key
      and jsonb_typeof(p_payload -> v_key) = 'number'
      and (p_payload ->> v_key)::numeric <> trunc((p_payload ->> v_key)::numeric) then
      raise exception 'Payload do imovel contem inteiro invalido.';
    end if;
  end loop;

  foreach v_key in array v_boolean_keys
  loop
    if p_payload ? v_key
      and jsonb_typeof(p_payload -> v_key) not in ('boolean', 'null') then
      raise exception 'Payload do imovel contem tipo invalido.';
    end if;
  end loop;

  if p_proprietarios is null or jsonb_typeof(p_proprietarios) <> 'array' then
    raise exception 'Proprietarios devem ser informados como array JSON.';
  end if;

  for v_item in select value from jsonb_array_elements(p_proprietarios)
  loop
    if jsonb_typeof(v_item) <> 'object' then
      raise exception 'Proprietario informado possui formato invalido.';
    end if;

    for v_item_key in select jsonb_object_keys(v_item)
    loop
      if not (v_item_key = any(array[
        'pessoa_id', 'percentual_participacao', 'contato_principal', 'observacoes'
      ]::text[])) then
        raise exception 'Proprietario informado contem campo desconhecido.';
      end if;
    end loop;

    if jsonb_typeof(v_item -> 'pessoa_id') <> 'string'
      or (v_item ->> 'pessoa_id') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then
      raise exception 'Proprietario informado possui pessoa invalida.';
    end if;

    if v_item ? 'percentual_participacao'
      and jsonb_typeof(v_item -> 'percentual_participacao') not in ('number', 'null') then
      raise exception 'Proprietario informado possui percentual invalido.';
    end if;

    if jsonb_typeof(v_item -> 'percentual_participacao') = 'number'
      and ((v_item ->> 'percentual_participacao')::numeric < 0
        or (v_item ->> 'percentual_participacao')::numeric > 100) then
      raise exception 'Proprietario informado possui percentual invalido.';
    end if;

    if jsonb_typeof(v_item -> 'contato_principal') <> 'boolean' then
      raise exception 'Proprietario informado possui contato principal invalido.';
    end if;

    if v_item ? 'observacoes'
      and jsonb_typeof(v_item -> 'observacoes') not in ('string', 'null') then
      raise exception 'Proprietario informado possui observacoes invalidas.';
    end if;
  end loop;

  select count(*), count(distinct (item ->> 'pessoa_id')::uuid)
    into v_total, v_distintos
  from jsonb_array_elements(p_proprietarios) as itens(item);

  if p_imovel_id is null and v_total = 0 then
    raise exception 'Novo imovel exige ao menos um proprietario.';
  end if;

  if v_total <> v_distintos then
    raise exception 'Uma pessoa nao pode ser repetida nos proprietarios.';
  end if;

  select count(*)
    into v_contatos_principais
  from jsonb_array_elements(p_proprietarios) as itens(item)
  where (item ->> 'contato_principal')::boolean = true;

  if v_total > 0 and v_contatos_principais <> 1 then
    raise exception 'Deve existir exatamente um contato principal.';
  end if;

  perform 1
  from public.pessoas as pessoa
  where pessoa.id in (
    select (item ->> 'pessoa_id')::uuid
    from jsonb_array_elements(p_proprietarios) as itens(item)
  )
    and pessoa.ativo = true
  for share;

  get diagnostics v_pessoas_ativas = row_count;
  if v_pessoas_ativas <> v_total then
    raise exception 'Proprietario informado nao existe ou esta inativo.';
  end if;

  if p_imovel_id is null then
    if nullif(btrim(p_payload ->> 'codigo'), '') is null
      or nullif(btrim(p_payload ->> 'complemento'), '') is null
      or nullif(btrim(p_payload ->> 'tipo'), '') is null
      or nullif(btrim(p_payload ->> 'finalidade'), '') is null
      or nullif(btrim(p_payload ->> 'status'), '') is null
      or nullif(btrim(p_payload ->> 'cidade'), '') is null then
      raise exception 'Novo imovel possui campos obrigatorios ausentes.';
    end if;

    if nullif(btrim(p_payload ->> 'proprietario_id'), '') is not null then
      raise exception 'Novo imovel nao aceita proprietario legado.';
    end if;

    v_operacao := 'criado';
  else
    select imovel.proprietario_id
      into v_proprietario_legado_id
    from public.imoveis as imovel
    where imovel.id = p_imovel_id
      and imovel.ativo = true
    for update;

    if not found then
      raise exception 'Imovel nao existe ou nao esta ativo.';
    end if;

    select count(*)
      into v_relacoes_ativas_existentes
    from public.imovel_proprietarios as relacao
    where relacao.imovel_id = p_imovel_id
      and relacao.ativo = true;

    if v_total = 0 then
      if v_proprietario_legado_id is not null
        and v_relacoes_ativas_existentes = 0 then
        v_permitir_sem_relacoes := true;
      else
        raise exception 'Edicao de imovel relacional exige proprietarios.';
      end if;
    end if;

    v_operacao := 'editado';
  end if;

  if nullif(btrim(p_payload ->> 'codigo'), '') is not null
    and exists (
      select 1
      from public.imoveis as imovel
      where imovel.ativo = true
        and imovel.id is distinct from p_imovel_id
        and upper(regexp_replace(btrim(coalesce(imovel.codigo, '')), '\s+', '', 'g')) =
          upper(regexp_replace(btrim(p_payload ->> 'codigo'), '\s+', '', 'g'))
    ) then
    raise exception using errcode = '23505', message = 'Codigo de imovel ja utilizado.';
  end if;

  if nullif(btrim(p_payload ->> 'matricula'), '') is not null
    and exists (
      select 1
      from public.imoveis as imovel
      where imovel.ativo = true
        and imovel.id is distinct from p_imovel_id
        and upper(regexp_replace(btrim(coalesce(imovel.matricula, '')), '\s+', '', 'g')) =
          upper(regexp_replace(btrim(p_payload ->> 'matricula'), '\s+', '', 'g'))
    ) then
    raise exception using errcode = '23505', message = 'Matricula de imovel ja utilizada.';
  end if;

  if p_imovel_id is null then
    with payload as (
      select *
      from jsonb_to_record(p_payload) as p(
        proprietario_id uuid, codigo text, titulo text, tipo text, subtipo text,
        finalidade text, status text, situacao text, responsavel_id uuid, origem text,
        data_captacao date, exclusividade boolean, observacoes text, cep text,
        endereco text, numero text, complemento text, bairro text, cidade text,
        estado text, latitude numeric, longitude numeric, google_maps text,
        valor_venda numeric, valor_locacao numeric, aluguel_pretendido numeric,
        valor_condominio numeric, valor_iptu numeric, taxa_bombeiro numeric,
        taxa_administracao numeric, comissao_venda numeric, comissao_locacao numeric,
        valor_minimo_aceito numeric, valor_ideal numeric, valor_anunciado numeric,
        area_total numeric, area_util numeric, area_construida numeric, metragem numeric,
        dormitorios integer, quartos integer, suites integer, banheiros integer,
        lavabos integer, garagens integer, garagem boolean, andar integer,
        elevadores integer, ano_construcao integer, piscina boolean, academia boolean,
        varanda boolean, varanda_gourmet boolean, sacada boolean, churrasqueira boolean,
        energia_solar boolean, mobiliado boolean, aceita_pet boolean,
        ar_condicionado boolean, portaria boolean, condominio_fechado boolean,
        vista_mar boolean, frente_mar boolean, beira_lago boolean, acessibilidade boolean,
        matricula text, cartorio text, iptu_documento text, habite_se text, escritura text,
        registro text, documentacao_completa boolean, pendencias_documentacao text,
        upload_pdf text, fotos text, videos text, tour_360 text, drone text, planta text,
        thumbnail text, foto_principal text, ordenacao_midias text,
        portal_proprio boolean, site boolean, chaves_na_mao boolean, olx boolean,
        viva_real boolean, zap boolean, status_publicacao text, data_publicacao date,
        ultima_atualizacao_publicacao timestamptz, resumo_comercial text,
        resumo_tecnico text, perfil_ideal text, observacoes_ia text,
        score_comercial integer, score_locacao integer, liquidez text
      )
    )
    insert into public.imoveis (
      proprietario_id, codigo, titulo, tipo, subtipo, finalidade, status, situacao,
      responsavel_id, origem, data_captacao, exclusividade, observacoes, cep, endereco,
      numero, complemento, bairro, cidade, estado, latitude, longitude, google_maps,
      valor_venda, valor_locacao, aluguel_pretendido, valor_condominio, valor_iptu,
      taxa_bombeiro, taxa_administracao, comissao_venda, comissao_locacao,
      valor_minimo_aceito, valor_ideal, valor_anunciado, area_total, area_util,
      area_construida, metragem, dormitorios, quartos, suites, banheiros, lavabos,
      garagens, garagem, andar, elevadores, ano_construcao, piscina, academia, varanda,
      varanda_gourmet, sacada, churrasqueira, energia_solar, mobiliado, aceita_pet,
      ar_condicionado, portaria, condominio_fechado, vista_mar, frente_mar, beira_lago,
      acessibilidade, matricula, cartorio, iptu_documento, habite_se, escritura, registro,
      documentacao_completa, pendencias_documentacao, upload_pdf, fotos, videos, tour_360,
      drone, planta, thumbnail, foto_principal, ordenacao_midias, portal_proprio, site,
      chaves_na_mao, olx, viva_real, zap, status_publicacao, data_publicacao,
      ultima_atualizacao_publicacao, resumo_comercial, resumo_tecnico, perfil_ideal,
      observacoes_ia, score_comercial, score_locacao, liquidez, ativo
    )
    select payload.*, true
    from payload
    returning id into v_imovel_id;
  else
    with payload as (
      select *
      from jsonb_to_record(p_payload) as p(
        proprietario_id uuid, codigo text, titulo text, tipo text, subtipo text,
        finalidade text, status text, situacao text, responsavel_id uuid, origem text,
        data_captacao date, exclusividade boolean, observacoes text, cep text,
        endereco text, numero text, complemento text, bairro text, cidade text,
        estado text, latitude numeric, longitude numeric, google_maps text,
        valor_venda numeric, valor_locacao numeric, aluguel_pretendido numeric,
        valor_condominio numeric, valor_iptu numeric, taxa_bombeiro numeric,
        taxa_administracao numeric, comissao_venda numeric, comissao_locacao numeric,
        valor_minimo_aceito numeric, valor_ideal numeric, valor_anunciado numeric,
        area_total numeric, area_util numeric, area_construida numeric, metragem numeric,
        dormitorios integer, quartos integer, suites integer, banheiros integer,
        lavabos integer, garagens integer, garagem boolean, andar integer,
        elevadores integer, ano_construcao integer, piscina boolean, academia boolean,
        varanda boolean, varanda_gourmet boolean, sacada boolean, churrasqueira boolean,
        energia_solar boolean, mobiliado boolean, aceita_pet boolean,
        ar_condicionado boolean, portaria boolean, condominio_fechado boolean,
        vista_mar boolean, frente_mar boolean, beira_lago boolean, acessibilidade boolean,
        matricula text, cartorio text, iptu_documento text, habite_se text, escritura text,
        registro text, documentacao_completa boolean, pendencias_documentacao text,
        upload_pdf text, fotos text, videos text, tour_360 text, drone text, planta text,
        thumbnail text, foto_principal text, ordenacao_midias text,
        portal_proprio boolean, site boolean, chaves_na_mao boolean, olx boolean,
        viva_real boolean, zap boolean, status_publicacao text, data_publicacao date,
        ultima_atualizacao_publicacao timestamptz, resumo_comercial text,
        resumo_tecnico text, perfil_ideal text, observacoes_ia text,
        score_comercial integer, score_locacao integer, liquidez text
      )
    )
    update public.imoveis as imovel
    set proprietario_id = case
          when v_permitir_sem_relacoes then v_proprietario_legado_id
          else payload.proprietario_id
        end,
        codigo = payload.codigo,
        titulo = payload.titulo,
        tipo = payload.tipo,
        subtipo = payload.subtipo,
        finalidade = payload.finalidade,
        status = payload.status,
        situacao = payload.situacao,
        responsavel_id = payload.responsavel_id,
        origem = payload.origem,
        data_captacao = payload.data_captacao,
        exclusividade = payload.exclusividade,
        observacoes = payload.observacoes,
        cep = payload.cep,
        endereco = payload.endereco,
        numero = payload.numero,
        complemento = payload.complemento,
        bairro = payload.bairro,
        cidade = payload.cidade,
        estado = payload.estado,
        latitude = payload.latitude,
        longitude = payload.longitude,
        google_maps = payload.google_maps,
        valor_venda = payload.valor_venda,
        valor_locacao = payload.valor_locacao,
        aluguel_pretendido = payload.aluguel_pretendido,
        valor_condominio = payload.valor_condominio,
        valor_iptu = payload.valor_iptu,
        taxa_bombeiro = payload.taxa_bombeiro,
        taxa_administracao = payload.taxa_administracao,
        comissao_venda = payload.comissao_venda,
        comissao_locacao = payload.comissao_locacao,
        valor_minimo_aceito = payload.valor_minimo_aceito,
        valor_ideal = payload.valor_ideal,
        valor_anunciado = payload.valor_anunciado,
        area_total = payload.area_total,
        area_util = payload.area_util,
        area_construida = payload.area_construida,
        metragem = payload.metragem,
        dormitorios = payload.dormitorios,
        quartos = payload.quartos,
        suites = payload.suites,
        banheiros = payload.banheiros,
        lavabos = payload.lavabos,
        garagens = payload.garagens,
        garagem = payload.garagem,
        andar = payload.andar,
        elevadores = payload.elevadores,
        ano_construcao = payload.ano_construcao,
        piscina = payload.piscina,
        academia = payload.academia,
        varanda = payload.varanda,
        varanda_gourmet = payload.varanda_gourmet,
        sacada = payload.sacada,
        churrasqueira = payload.churrasqueira,
        energia_solar = payload.energia_solar,
        mobiliado = payload.mobiliado,
        aceita_pet = payload.aceita_pet,
        ar_condicionado = payload.ar_condicionado,
        portaria = payload.portaria,
        condominio_fechado = payload.condominio_fechado,
        vista_mar = payload.vista_mar,
        frente_mar = payload.frente_mar,
        beira_lago = payload.beira_lago,
        acessibilidade = payload.acessibilidade,
        matricula = payload.matricula,
        cartorio = payload.cartorio,
        iptu_documento = payload.iptu_documento,
        habite_se = payload.habite_se,
        escritura = payload.escritura,
        registro = payload.registro,
        documentacao_completa = payload.documentacao_completa,
        pendencias_documentacao = payload.pendencias_documentacao,
        upload_pdf = payload.upload_pdf,
        fotos = payload.fotos,
        videos = payload.videos,
        tour_360 = payload.tour_360,
        drone = payload.drone,
        planta = payload.planta,
        thumbnail = payload.thumbnail,
        foto_principal = payload.foto_principal,
        ordenacao_midias = payload.ordenacao_midias,
        portal_proprio = payload.portal_proprio,
        site = payload.site,
        chaves_na_mao = payload.chaves_na_mao,
        olx = payload.olx,
        viva_real = payload.viva_real,
        zap = payload.zap,
        status_publicacao = payload.status_publicacao,
        data_publicacao = payload.data_publicacao,
        ultima_atualizacao_publicacao = payload.ultima_atualizacao_publicacao,
        resumo_comercial = payload.resumo_comercial,
        resumo_tecnico = payload.resumo_tecnico,
        perfil_ideal = payload.perfil_ideal,
        observacoes_ia = payload.observacoes_ia,
        score_comercial = payload.score_comercial,
        score_locacao = payload.score_locacao,
        liquidez = payload.liquidez,
        updated_at = now()
    from payload
    where imovel.id = p_imovel_id
      and imovel.ativo = true
    returning imovel.id into v_imovel_id;
  end if;

  if not v_permitir_sem_relacoes then
    perform 1
    from public.imovel_proprietarios as relacao
    where relacao.imovel_id = v_imovel_id
      and relacao.ativo = true
    for update;

    update public.imovel_proprietarios as relacao
    set contato_principal = false,
        updated_at = now()
    where relacao.imovel_id = v_imovel_id
      and relacao.ativo = true
      and relacao.contato_principal = true;

    update public.imovel_proprietarios as relacao
    set ativo = false,
        contato_principal = false,
        updated_at = now()
    where relacao.imovel_id = v_imovel_id
      and relacao.ativo = true
      and not exists (
        select 1
        from jsonb_array_elements(p_proprietarios) as itens(item)
        where (item ->> 'pessoa_id')::uuid = relacao.pessoa_id
      );

    update public.imovel_proprietarios as relacao
    set percentual_participacao = entrada.percentual_participacao,
        contato_principal = entrada.contato_principal,
        observacoes = entrada.observacoes,
        updated_at = now()
    from jsonb_to_recordset(p_proprietarios) as entrada(
      pessoa_id uuid,
      percentual_participacao numeric,
      contato_principal boolean,
      observacoes text
    )
    where relacao.imovel_id = v_imovel_id
      and relacao.pessoa_id = entrada.pessoa_id
      and relacao.ativo = true;

    insert into public.imovel_proprietarios (
      imovel_id,
      pessoa_id,
      percentual_participacao,
      contato_principal,
      observacoes,
      ativo
    )
    select
      v_imovel_id,
      entrada.pessoa_id,
      entrada.percentual_participacao,
      entrada.contato_principal,
      entrada.observacoes,
      true
    from jsonb_to_recordset(p_proprietarios) as entrada(
      pessoa_id uuid,
      percentual_participacao numeric,
      contato_principal boolean,
      observacoes text
    )
    where not exists (
      select 1
      from public.imovel_proprietarios as relacao
      where relacao.imovel_id = v_imovel_id
        and relacao.pessoa_id = entrada.pessoa_id
        and relacao.ativo = true
    );
  end if;

  select count(*)
    into v_proprietarios_ativos
  from public.imovel_proprietarios as relacao
  where relacao.imovel_id = v_imovel_id
    and relacao.ativo = true;

  return query
  select v_imovel_id, v_operacao, v_proprietarios_ativos;
exception
  when unique_violation then
    raise exception using
      errcode = '23505',
      message = 'Conflito de unicidade no imovel ou nos proprietarios.';
  when foreign_key_violation then
    raise exception using
      errcode = '23503',
      message = 'Referencia invalida no imovel ou nos proprietarios.';
  when check_violation then
    raise exception using
      errcode = '23514',
      message = 'Dados do imovel ou dos proprietarios violam uma regra de validacao.';
  when invalid_text_representation
    or invalid_datetime_format
    or numeric_value_out_of_range
    or datetime_field_overflow then
    raise exception using
      errcode = '22023',
      message = 'Payload possui valor invalido.';
end;
$$;

revoke all privileges on function public.salvar_imovel_com_proprietarios(uuid, jsonb, jsonb)
  from public;
revoke all privileges on function public.salvar_imovel_com_proprietarios(uuid, jsonb, jsonb)
  from anon;
grant execute on function public.salvar_imovel_com_proprietarios(uuid, jsonb, jsonb)
  to authenticated;

commit;

-- Rollback manual (nao executar junto com esta migration):
-- begin;
-- revoke all privileges on function
--   public.salvar_imovel_com_proprietarios(uuid, jsonb, jsonb)
--   from public;
-- revoke all privileges on function
--   public.salvar_imovel_com_proprietarios(uuid, jsonb, jsonb)
--   from anon;
-- revoke all privileges on function
--   public.salvar_imovel_com_proprietarios(uuid, jsonb, jsonb)
--   from authenticated;
-- drop function if exists
--   public.salvar_imovel_com_proprietarios(uuid, jsonb, jsonb);
-- commit;
