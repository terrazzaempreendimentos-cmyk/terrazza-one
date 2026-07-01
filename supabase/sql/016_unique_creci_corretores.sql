create unique index if not exists idx_corretores_creci_unico_ativo
on corretores(creci)
where ativo = true and creci is not null;
