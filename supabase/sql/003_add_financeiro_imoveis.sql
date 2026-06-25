alter table imoveis
add column if not exists valor_condominio numeric,
add column if not exists valor_iptu numeric,
add column if not exists taxa_bombeiro numeric;
