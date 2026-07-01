create unique index if not exists idx_pessoas_cpf_cnpj_unico_ativo
on pessoas ((regexp_replace(coalesce(cpf_cnpj, ''), '\D', '', 'g')))
where ativo = true
  and nullif(regexp_replace(coalesce(cpf_cnpj, ''), '\D', '', 'g'), '') is not null;

create unique index if not exists idx_imoveis_codigo_unico_ativo
on imoveis ((upper(regexp_replace(btrim(coalesce(codigo, '')), '\s+', '', 'g'))))
where ativo = true
  and nullif(btrim(coalesce(codigo, '')), '') is not null;

create unique index if not exists idx_imoveis_matricula_unica_ativa
on imoveis ((upper(regexp_replace(btrim(coalesce(matricula, '')), '\s+', '', 'g'))))
where ativo = true
  and nullif(btrim(coalesce(matricula, '')), '') is not null;
