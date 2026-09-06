-- Alinha o RLS de public.leads com a matriz TypeScript para o
-- papel Atendimento.
--
-- Escopo desta migration:
--   SELECT: Atendimento possui leitura ampla de Leads.
--   INSERT: Atendimento pode cadastrar Leads.
--   UPDATE: Atendimento possui edicao ampla de Leads, sem ownership, pois o
--           schema atual nao identifica um usuario de Atendimento responsavel.
--
-- As policies de Administrador/Gestor da migration 042 e as policies de
-- ownership do Corretor da migration 044 permanecem intactas.

begin;

do $$
begin
  if to_regprocedure('public.usuario_tem_papel(text[])') is null then
    raise exception 'Precondition failed: public.usuario_tem_papel(text[]) ausente';
  end if;

  if to_regclass('public.leads') is null then
    raise exception 'Precondition failed: public.leads ausente';
  end if;
end;
$$;

alter table public.leads enable row level security;

drop policy if exists atendimento_ativo_select_leads on public.leads;
drop policy if exists atendimento_ativo_insert_leads on public.leads;
drop policy if exists atendimento_ativo_update_leads on public.leads;

create policy atendimento_ativo_select_leads
  on public.leads
  for select
  to authenticated
  using (public.usuario_tem_papel(array['atendimento']::text[]));

create policy atendimento_ativo_insert_leads
  on public.leads
  for insert
  to authenticated
  with check (public.usuario_tem_papel(array['atendimento']::text[]));

create policy atendimento_ativo_update_leads
  on public.leads
  for update
  to authenticated
  using (public.usuario_tem_papel(array['atendimento']::text[]))
  with check (public.usuario_tem_papel(array['atendimento']::text[]));

commit;
