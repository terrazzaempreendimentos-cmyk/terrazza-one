begin;

do $$
begin
  if to_regclass('public.imoveis') is null then
    raise exception 'Precondition failed: public.imoveis does not exist';
  end if;
end
$$;

alter table public.imoveis add column if not exists endereco text;

commit;
