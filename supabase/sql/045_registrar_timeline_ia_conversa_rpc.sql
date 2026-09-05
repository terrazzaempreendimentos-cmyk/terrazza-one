-- P0.5: centraliza a escrita da Timeline da IA Comercial em uma RPC.
-- A descricao e fixa e nunca inclui a pergunta, resposta ou resumo de texto livre.
-- A permissao ia.usar corresponde atualmente aos quatro papeis abaixo na matriz
-- TypeScript. Atualizar esta lista se a matriz de permissoes mudar no futuro.

begin;

do $$
begin
  if to_regclass('public.ia_conversas') is null
     or to_regclass('public.timeline') is null then
    raise exception 'Precondition failed: tabelas da IA ou Timeline ausentes';
  end if;

  if to_regprocedure('public.usuario_tem_papel(text[])') is null then
    raise exception 'Precondition failed: public.usuario_tem_papel(text[]) ausente';
  end if;
end;
$$;

create or replace function public.registrar_timeline_ia_conversa(
  p_conversa_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_timeline_id uuid;
begin
  if auth.uid() is null
     or not public.usuario_tem_papel(
       array['administrador','gestor','corretor','atendimento']::text[]
     ) then
    raise exception using
      errcode = 'P0001',
      message = 'Operacao nao autorizada.';
  end if;

  if p_conversa_id is null
     or not exists (
       select 1
       from public.ia_conversas as conversa
       where conversa.id = p_conversa_id
     ) then
    raise exception using
      errcode = 'P0001',
      message = 'Conversa da IA nao encontrada.';
  end if;

  insert into public.timeline (
    tipo,
    titulo,
    descricao,
    origem
  )
  values (
    'ia',
    'Interacao com IA Comercial',
    'Nova interacao registrada com a IA Comercial',
    'rpc_registrar_timeline_ia_conversa'
  )
  returning id into v_timeline_id;

  if v_timeline_id is null then
    raise exception using
      errcode = 'P0001',
      message = 'Falha ao registrar Timeline da IA Comercial.';
  end if;

  return v_timeline_id;
exception
  when sqlstate 'P0001' then
    raise;
  when others then
    raise exception using
      errcode = 'P0001',
      message = 'Falha ao registrar Timeline da IA Comercial.';
end;
$$;

revoke all privileges on function public.registrar_timeline_ia_conversa(uuid) from public;
revoke all privileges on function public.registrar_timeline_ia_conversa(uuid) from anon;
grant execute on function public.registrar_timeline_ia_conversa(uuid) to authenticated;

commit;

