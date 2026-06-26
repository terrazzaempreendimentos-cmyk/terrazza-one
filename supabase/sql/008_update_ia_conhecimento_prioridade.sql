alter table ia_conhecimento
add column if not exists prioridade text default 'normal',
add column if not exists fixado boolean default false,
add column if not exists palavras_chave text,
add column if not exists observacoes text;
