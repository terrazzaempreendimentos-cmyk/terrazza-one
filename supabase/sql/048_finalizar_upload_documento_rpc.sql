-- Modulo Documentos - Fase 1: finalizacao confiavel de upload.
--
-- A RPC valida a identidade e o papel do chamador, bloqueia a linha de
-- metadata durante a conferencia e compara tamanho/MIME com o objeto real no
-- bucket privado. Nenhum nome, path ou metadata de arquivo e escrito em log.

begin;

do $$
begin
  if to_regclass('public.documentos') is null then
    raise exception 'Precondition failed: public.documentos ausente';
  end if;

  if to_regclass('public.imoveis') is null
     or to_regclass('storage.objects') is null then
    raise exception 'Precondition failed: dependencias de Documentos ausentes';
  end if;

  if to_regprocedure('public.usuario_tem_papel(text[])') is null
     or to_regprocedure('public.usuario_pessoa_corretor()') is null then
    raise exception 'Precondition failed: funcoes de autorizacao ausentes';
  end if;
end;
$$;

create or replace function public.finalizar_upload_documento(
  p_documento_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_actor uuid := auth.uid();
  v_documento public.documentos%rowtype;
  v_storage_metadata jsonb;
  v_storage_size_text text;
  v_storage_mime text;
  v_corretor_pessoa_id uuid;
  v_autorizado boolean := false;
  v_codigo text;
begin
  if v_actor is null or p_documento_id is null then
    raise exception using
      errcode = '42501',
      message = 'Operacao nao autorizada.';
  end if;

  select documento.*
    into v_documento
  from public.documentos as documento
  where documento.id = p_documento_id
  for update;

  if not found then
    raise exception using
      errcode = 'P0002',
      message = 'Documento nao encontrado.';
  end if;

  if v_documento.estado_arquivo <> 'pendente_upload'
     or v_documento.ativo is not true then
    raise exception using
      errcode = '55000',
      message = 'Documento nao esta pendente de upload.';
  end if;

  if public.usuario_tem_papel(array['administrador','gestor']::text[]) then
    v_autorizado := true;
  elsif v_documento.enviado_por_user_id = v_actor
        and v_documento.negocio_id is null
        and public.usuario_tem_papel(array['corretor']::text[]) then
    v_corretor_pessoa_id := public.usuario_pessoa_corretor();

    v_autorizado := v_corretor_pessoa_id is not null
      and exists (
        select 1
        from public.imoveis as imovel
        where imovel.id = v_documento.imovel_id
          and imovel.responsavel_pessoa_id = v_corretor_pessoa_id
      );
  end if;

  if not v_autorizado then
    raise log 'modulo=documentos etapa=finalizar_upload codigo=nao_autorizado';
    raise exception using
      errcode = '42501',
      message = 'Operacao nao autorizada.';
  end if;

  select objeto.metadata
    into v_storage_metadata
  from storage.objects as objeto
  where objeto.bucket_id = v_documento.bucket_id
    and objeto.name = v_documento.storage_path
  order by objeto.created_at desc
  limit 1;

  if not found then
    v_codigo := 'objeto_ausente';
  else
    v_storage_size_text := v_storage_metadata ->> 'size';
    v_storage_mime := lower(nullif(btrim(v_storage_metadata ->> 'mimetype'), ''));

    if v_storage_size_text is null
       or v_storage_size_text !~ '^[0-9]+$' then
      v_codigo := 'tamanho_storage_invalido';
    elsif v_storage_size_text::bigint <> v_documento.tamanho_bytes then
      v_codigo := 'tamanho_divergente';
    elsif v_storage_mime is null
       or v_storage_mime <> lower(v_documento.mime_type) then
      v_codigo := 'mime_divergente';
    end if;
  end if;

  if v_codigo is not null then
    update public.documentos as documento
    set estado_arquivo = 'falhou',
        disponibilizado_em = null
    where documento.id = v_documento.id;

    raise log 'modulo=documentos etapa=finalizar_upload codigo=%', v_codigo;

    return jsonb_build_object(
      'documento_id', v_documento.id,
      'estado_arquivo', 'falhou'
    );
  end if;

  update public.documentos as documento
  set estado_arquivo = 'disponivel',
      disponibilizado_em = pg_catalog.now()
  where documento.id = v_documento.id;

  return jsonb_build_object(
    'documento_id', v_documento.id,
    'estado_arquivo', 'disponivel'
  );
end;
$$;

revoke all privileges on function public.finalizar_upload_documento(uuid) from public;
revoke all privileges on function public.finalizar_upload_documento(uuid) from anon;
grant execute on function public.finalizar_upload_documento(uuid) to authenticated;

comment on function public.finalizar_upload_documento(uuid) is
  'Confere objeto, tamanho e MIME no Storage antes de disponibilizar um documento.';

commit;

-- VERIFICACAO MANUAL (nao executada pela migration):
-- select p.proname, p.prosecdef, p.proconfig
-- from pg_catalog.pg_proc as p
-- where p.oid = 'public.finalizar_upload_documento(uuid)'::regprocedure;
