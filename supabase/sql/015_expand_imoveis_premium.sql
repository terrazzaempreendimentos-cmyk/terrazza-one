alter table imoveis add column if not exists codigo text;
alter table imoveis add column if not exists titulo text;
alter table imoveis add column if not exists subtipo text;
alter table imoveis add column if not exists finalidade text;
alter table imoveis add column if not exists status text default 'rascunho';
alter table imoveis add column if not exists responsavel_id uuid references corretores(id) on delete set null;
alter table imoveis add column if not exists origem text default 'manual';
alter table imoveis add column if not exists data_captacao date;
alter table imoveis add column if not exists exclusividade boolean default false;
alter table imoveis add column if not exists observacoes text;

alter table imoveis add column if not exists cep text;
alter table imoveis add column if not exists endereco text;
alter table imoveis add column if not exists numero text;
alter table imoveis add column if not exists complemento text;
alter table imoveis add column if not exists estado text;
alter table imoveis add column if not exists latitude numeric;
alter table imoveis add column if not exists longitude numeric;
alter table imoveis add column if not exists google_maps text;

alter table imoveis add column if not exists valor_venda numeric;
alter table imoveis add column if not exists valor_locacao numeric;
alter table imoveis add column if not exists taxa_administracao numeric;
alter table imoveis add column if not exists comissao_venda numeric;
alter table imoveis add column if not exists comissao_locacao numeric;
alter table imoveis add column if not exists valor_minimo_aceito numeric;
alter table imoveis add column if not exists valor_ideal numeric;
alter table imoveis add column if not exists valor_anunciado numeric;

alter table imoveis add column if not exists area_total numeric;
alter table imoveis add column if not exists area_util numeric;
alter table imoveis add column if not exists area_construida numeric;
alter table imoveis add column if not exists dormitorios integer;
alter table imoveis add column if not exists suites integer;
alter table imoveis add column if not exists lavabos integer;
alter table imoveis add column if not exists garagens integer;
alter table imoveis add column if not exists andar integer;
alter table imoveis add column if not exists elevadores integer;
alter table imoveis add column if not exists ano_construcao integer;
alter table imoveis add column if not exists piscina boolean default false;
alter table imoveis add column if not exists academia boolean default false;
alter table imoveis add column if not exists varanda boolean default false;
alter table imoveis add column if not exists varanda_gourmet boolean default false;
alter table imoveis add column if not exists sacada boolean default false;
alter table imoveis add column if not exists churrasqueira boolean default false;
alter table imoveis add column if not exists energia_solar boolean default false;
alter table imoveis add column if not exists mobiliado boolean default false;
alter table imoveis add column if not exists aceita_pet boolean default false;
alter table imoveis add column if not exists ar_condicionado boolean default false;
alter table imoveis add column if not exists portaria boolean default false;
alter table imoveis add column if not exists condominio_fechado boolean default false;
alter table imoveis add column if not exists vista_mar boolean default false;
alter table imoveis add column if not exists frente_mar boolean default false;
alter table imoveis add column if not exists beira_lago boolean default false;
alter table imoveis add column if not exists acessibilidade boolean default false;

alter table imoveis add column if not exists matricula text;
alter table imoveis add column if not exists cartorio text;
alter table imoveis add column if not exists iptu_documento text;
alter table imoveis add column if not exists habite_se text;
alter table imoveis add column if not exists escritura text;
alter table imoveis add column if not exists registro text;
alter table imoveis add column if not exists documentacao_completa boolean default false;
alter table imoveis add column if not exists pendencias_documentacao text;
alter table imoveis add column if not exists upload_pdf text;

alter table imoveis add column if not exists fotos text;
alter table imoveis add column if not exists videos text;
alter table imoveis add column if not exists tour_360 text;
alter table imoveis add column if not exists drone text;
alter table imoveis add column if not exists planta text;
alter table imoveis add column if not exists thumbnail text;
alter table imoveis add column if not exists foto_principal text;
alter table imoveis add column if not exists ordenacao_midias text;

alter table imoveis add column if not exists portal_proprio boolean default false;
alter table imoveis add column if not exists site boolean default false;
alter table imoveis add column if not exists chaves_na_mao boolean default false;
alter table imoveis add column if not exists olx boolean default false;
alter table imoveis add column if not exists viva_real boolean default false;
alter table imoveis add column if not exists zap boolean default false;
alter table imoveis add column if not exists status_publicacao text default 'nao_publicado';
alter table imoveis add column if not exists data_publicacao date;
alter table imoveis add column if not exists ultima_atualizacao_publicacao timestamptz;

alter table imoveis add column if not exists resumo_comercial text;
alter table imoveis add column if not exists resumo_tecnico text;
alter table imoveis add column if not exists perfil_ideal text;
alter table imoveis add column if not exists observacoes_ia text;
alter table imoveis add column if not exists score_comercial integer default 0;
alter table imoveis add column if not exists score_locacao integer default 0;
alter table imoveis add column if not exists liquidez text;

create table if not exists imovel_proprietarios (
  id uuid primary key default gen_random_uuid(),
  imovel_id uuid references imoveis(id) on delete cascade,
  pessoa_id uuid references pessoas(id) on delete cascade,
  percentual_participacao numeric,
  contato_principal boolean default false,
  observacoes text,
  ativo boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_imovel_proprietarios_imovel_id
  on imovel_proprietarios (imovel_id);

create index if not exists idx_imovel_proprietarios_pessoa_id
  on imovel_proprietarios (pessoa_id);

create index if not exists idx_imovel_proprietarios_ativo
  on imovel_proprietarios (ativo);

create index if not exists idx_imoveis_codigo
  on imoveis (codigo);

create index if not exists idx_imoveis_status
  on imoveis (status);

create index if not exists idx_imoveis_finalidade
  on imoveis (finalidade);

create index if not exists idx_imoveis_tipo
  on imoveis (tipo);

create index if not exists idx_imoveis_cidade_bairro
  on imoveis (cidade, bairro);
