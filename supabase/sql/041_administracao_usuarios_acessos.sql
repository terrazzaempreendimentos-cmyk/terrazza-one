begin;

do $$
declare
  v_admins integer;
begin
  if to_regclass('auth.users') is null
     or to_regclass('public.usuarios_perfis') is null
     or to_regclass('public.pessoas') is null
     or to_regclass('public.timeline') is null
     or to_regprocedure('public.usuario_tem_papel(text[])') is null then
    raise exception 'Precondition failed: estrutura de acesso ausente';
  end if;
  if not exists (select 1 from pg_attribute where attrelid='public.usuarios_perfis'::regclass and attname='user_id' and atttypid='uuid'::regtype and attnotnull)
     or not exists (select 1 from pg_attribute where attrelid='public.usuarios_perfis'::regclass and attname='papel' and atttypid='text'::regtype)
     or not exists (select 1 from pg_attribute where attrelid='public.usuarios_perfis'::regclass and attname='ativo' and atttypid='bool'::regtype and attnotnull)
     or not exists (select 1 from pg_attribute where attrelid='public.usuarios_perfis'::regclass and attname='updated_at' and atttypid='timestamptz'::regtype) then
    raise exception 'Precondition failed: schema de usuarios_perfis incompatível';
  end if;
  if not exists (select 1 from pg_class where oid='public.usuarios_perfis'::regclass and relrowsecurity)
     or not exists (select 1 from pg_class where oid='public.timeline'::regclass and relrowsecurity) then
    raise exception 'Precondition failed: RLS desativado';
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='timeline' and policyname='admin_ativo_select_timeline') then
    raise exception 'Precondition failed: policy da Timeline não identificada';
  end if;
  select count(*) into v_admins from public.usuarios_perfis as profile_guard where profile_guard.ativo=true and profile_guard.papel='administrador';
  if v_admins < 1 then raise exception 'Precondition failed: administrador ativo ausente'; end if;
  if to_regprocedure('public.listar_usuarios_acessos()') is not null
     or to_regprocedure('public.salvar_usuario_acesso(uuid,text,boolean,uuid,timestamptz)') is not null then
    raise exception 'Precondition failed: RPC reservada já existe';
  end if;
end;
$$;

do $$
begin
  if exists (select 1 from pg_attribute where attrelid='public.usuarios_perfis'::regclass and attname in ('pessoa_id','atualizado_por_user_id') and not attisdropped)
     or to_regclass('public.usuarios_acessos_auditoria') is not null
     or to_regclass('public.idx_usuarios_perfis_pessoa_id_unico') is not null
     or to_regprocedure('public.set_usuarios_perfis_updated_at()') is not null
     or exists (select 1 from pg_trigger where tgrelid='public.usuarios_perfis'::regclass and tgname='set_usuarios_perfis_updated_at_before_update')
     or to_regprocedure('public.listar_usuarios_acessos()') is not null
     or to_regprocedure('public.salvar_usuario_acesso(uuid,text,boolean,uuid,timestamptz)') is not null
     or exists (select 1 from pg_policies where schemaname='public' and tablename='usuarios_acessos_auditoria' and policyname='admin_ativo_select_usuarios_acessos_auditoria') then
    raise exception 'Precondition failed: aplicação parcial da migration 041';
  end if;
end;
$$;

alter table public.usuarios_perfis add column pessoa_id uuid;
alter table public.usuarios_perfis add column atualizado_por_user_id uuid;

do $$
begin
  alter table public.usuarios_perfis add constraint usuarios_perfis_pessoa_id_fkey foreign key (pessoa_id) references public.pessoas(id) on delete set null;
  alter table public.usuarios_perfis add constraint usuarios_perfis_atualizado_por_user_id_fkey foreign key (atualizado_por_user_id) references auth.users(id) on delete set null;
end;
$$;

create unique index idx_usuarios_perfis_pessoa_id_unico on public.usuarios_perfis(pessoa_id) where pessoa_id is not null;

create function public.set_usuarios_perfis_updated_at()
returns trigger language plpgsql security invoker set search_path = pg_catalog
as $$ begin new.updated_at = now(); return new; end; $$;
revoke all on function public.set_usuarios_perfis_updated_at() from public, anon, authenticated;
create trigger set_usuarios_perfis_updated_at_before_update before update on public.usuarios_perfis for each row execute function public.set_usuarios_perfis_updated_at();

create table public.usuarios_acessos_auditoria (
  id uuid primary key default gen_random_uuid(),
  perfil_id uuid,
  usuario_alvo_id uuid,
  ator_user_id uuid,
  operacao text not null,
  papel_anterior text,
  papel_atual text,
  ativo_anterior boolean,
  ativo_atual boolean,
  pessoa_anterior_id uuid,
  pessoa_atual_id uuid,
  created_at timestamptz not null default now(),
  constraint usuarios_acessos_auditoria_operacao_check check (operacao in ('perfil_criado','perfil_atualizado','perfil_ativado','perfil_inativado','papel_alterado','pessoa_vinculada','pessoa_desvinculada')),
  constraint usuarios_acessos_auditoria_papel_anterior_check check (papel_anterior is null or papel_anterior in ('administrador','gestor','corretor','atendimento')),
  constraint usuarios_acessos_auditoria_papel_atual_check check (papel_atual is null or papel_atual in ('administrador','gestor','corretor','atendimento')),
  constraint usuarios_acessos_auditoria_perfil_fkey foreign key (perfil_id) references public.usuarios_perfis(id) on delete set null,
  constraint usuarios_acessos_auditoria_usuario_fkey foreign key (usuario_alvo_id) references auth.users(id) on delete set null,
  constraint usuarios_acessos_auditoria_ator_fkey foreign key (ator_user_id) references auth.users(id) on delete set null,
  constraint usuarios_acessos_auditoria_pessoa_anterior_fkey foreign key (pessoa_anterior_id) references public.pessoas(id) on delete set null,
  constraint usuarios_acessos_auditoria_pessoa_atual_fkey foreign key (pessoa_atual_id) references public.pessoas(id) on delete set null
);
create index idx_usuarios_acessos_auditoria_usuario_data on public.usuarios_acessos_auditoria(usuario_alvo_id, created_at desc);
create index idx_usuarios_acessos_auditoria_ator_data on public.usuarios_acessos_auditoria(ator_user_id, created_at desc);
create index idx_usuarios_acessos_auditoria_perfil_data on public.usuarios_acessos_auditoria(perfil_id, created_at desc);
create index idx_usuarios_acessos_auditoria_created_at on public.usuarios_acessos_auditoria(created_at desc);
create index idx_usuarios_acessos_auditoria_operacao on public.usuarios_acessos_auditoria(operacao);

alter table public.usuarios_acessos_auditoria enable row level security;
revoke all on table public.usuarios_acessos_auditoria from public, anon, authenticated;
grant select on table public.usuarios_acessos_auditoria to authenticated;
create policy admin_ativo_select_usuarios_acessos_auditoria on public.usuarios_acessos_auditoria for select to authenticated using (public.usuario_tem_papel(array['administrador']::text[]));

create or replace function public.listar_usuarios_acessos()
returns table(user_id uuid, email text, auth_created_at timestamptz, last_sign_in_at timestamptz, perfil_id uuid, papel text, ativo boolean, pessoa_id uuid, pessoa_nome text, perfil_created_at timestamptz, perfil_updated_at timestamptz)
language plpgsql security definer set search_path = pg_catalog
as $$
begin
  if auth.uid() is null or not public.usuario_tem_papel(array['administrador']::text[]) then raise exception using errcode='P0001', message='Operacao nao autorizada.'; end if;
  return query select target_user.id, target_user.email::text, target_user.created_at, target_user.last_sign_in_at, target_profile.id, target_profile.papel, target_profile.ativo, target_profile.pessoa_id, target_person.nome::text, target_profile.created_at, target_profile.updated_at
    from auth.users as target_user left join public.usuarios_perfis as target_profile on target_profile.user_id=target_user.id left join public.pessoas as target_person on target_person.id=target_profile.pessoa_id order by target_user.created_at, target_user.id;
exception
  when others then
    if sqlstate = 'P0001' then
      raise;
    else
      raise exception using errcode='P0001', message='Falha ao listar acessos.';
    end if;
end;
$$;

create or replace function public.salvar_usuario_acesso(p_user_id uuid, p_papel text, p_ativo boolean, p_pessoa_id uuid default null, p_updated_at_esperado timestamptz default null)
returns table(perfil_id uuid, user_id uuid, papel text, ativo boolean, pessoa_id uuid, created_at timestamptz, updated_at timestamptz, operacao text)
language plpgsql security definer set search_path = pg_catalog
as $$
declare v_actor uuid:=auth.uid(); v_old public.usuarios_perfis%rowtype; v_new public.usuarios_perfis%rowtype; v_op text; v_admins integer; v_rows integer;
begin
  if v_actor is null or not public.usuario_tem_papel(array['administrador']::text[]) then raise exception using errcode='P0001',message='Operacao nao autorizada.'; end if;
  if p_user_id is null then raise exception using errcode='P0001',message='Usuario inexistente.'; end if;
  if p_ativo is null then raise exception using errcode='P0001',message='Estado de perfil invalido.'; end if;
  if not exists(select 1 from auth.users as target_user where target_user.id=p_user_id) then raise exception using errcode='P0001',message='Usuario inexistente.'; end if;
  if p_papel is null or p_papel not in ('administrador','gestor','corretor','atendimento') then raise exception using errcode='P0001',message='Papel invalido.'; end if;
  if p_pessoa_id is not null and not exists(select 1 from public.pessoas as target_person where target_person.id=p_pessoa_id) then raise exception using errcode='P0001',message='Pessoa inexistente.'; end if;
  perform pg_advisory_xact_lock(741041);
  if not public.usuario_tem_papel(array['administrador']::text[]) then raise exception using errcode='P0001',message='Operacao nao autorizada.'; end if;
  select target_profile.* into v_old from public.usuarios_perfis as target_profile where target_profile.user_id=p_user_id for update;
  if not found then
    if p_updated_at_esperado is not null then raise exception using errcode='P0001',message='Perfil inexistente.'; end if;
    insert into public.usuarios_perfis(user_id,papel,ativo,pessoa_id,atualizado_por_user_id) values(p_user_id,p_papel,p_ativo,p_pessoa_id,v_actor) returning * into v_new;
    get diagnostics v_rows = row_count;
    if v_rows<>1 or v_new.id is null or v_new.user_id<>p_user_id or v_new.papel is null or v_new.ativo is null or v_new.created_at is null or v_new.updated_at is null then raise exception using errcode='P0001',message='Retorno inesperado.'; end if;
    v_op:='perfil_criado';
  else
    if p_updated_at_esperado is null or v_old.updated_at<>p_updated_at_esperado then raise exception using errcode='P0001',message='Perfil atualizado por outra operacao.'; end if;
    if p_user_id=v_actor and (not p_ativo) then raise exception using errcode='P0001',message='Voce nao pode inativar o proprio acesso.'; end if;
    if p_user_id=v_actor and p_papel<>'administrador' then raise exception using errcode='P0001',message='Voce nao pode alterar o proprio papel administrativo.'; end if;
    select count(*) into v_admins from public.usuarios_perfis as target_profile where target_profile.ativo=true and target_profile.papel='administrador';
    if v_old.ativo and v_old.papel='administrador' and (not p_ativo or p_papel<>'administrador') and v_admins<=1 then raise exception using errcode='P0001',message='O sistema deve manter pelo menos um administrador ativo.'; end if;
    update public.usuarios_perfis as target_profile set papel=p_papel,ativo=p_ativo,pessoa_id=p_pessoa_id,atualizado_por_user_id=v_actor where target_profile.id=v_old.id returning target_profile.* into v_new;
    get diagnostics v_rows = row_count;
    if v_rows<>1 or v_new.id is null or v_new.user_id<>p_user_id or v_new.papel is null or v_new.ativo is null or v_new.created_at is null or v_new.updated_at is null then raise exception using errcode='P0001',message='Retorno inesperado.'; end if;
    v_op:=case when v_old.papel<>v_new.papel and v_old.ativo=v_new.ativo and v_old.pessoa_id is not distinct from v_new.pessoa_id then 'papel_alterado' when v_old.ativo<>v_new.ativo and v_old.papel=v_new.papel and v_old.pessoa_id is not distinct from v_new.pessoa_id then case when v_new.ativo then 'perfil_ativado' else 'perfil_inativado' end when v_old.pessoa_id is distinct from v_new.pessoa_id and v_old.papel=v_new.papel and v_old.ativo=v_new.ativo then case when v_new.pessoa_id is null then 'pessoa_desvinculada' else 'pessoa_vinculada' end else 'perfil_atualizado' end;
  end if;
  begin
    insert into public.usuarios_acessos_auditoria as access_audit(perfil_id,usuario_alvo_id,ator_user_id,operacao,papel_anterior,papel_atual,ativo_anterior,ativo_atual,pessoa_anterior_id,pessoa_atual_id) values(v_new.id,v_new.user_id,v_actor,v_op,v_old.papel,v_new.papel,v_old.ativo,v_new.ativo,v_old.pessoa_id,v_new.pessoa_id);
    get diagnostics v_rows = row_count;
    if v_rows<>1 then raise exception 'audit row count'; end if;
  exception when others then raise exception using errcode='P0001',message='Falha ao registrar auditoria de acesso.'; end;
  begin
    insert into public.timeline as timeline_event(tipo,titulo,descricao,origem) values('usuario_acesso_atualizado','Acesso de usuario atualizado','Configuracao de acesso administrativo atualizada.','rpc_salvar_usuario_acesso');
    get diagnostics v_rows = row_count;
    if v_rows<>1 then raise exception 'timeline row count'; end if;
  exception when others then raise exception using errcode='P0001',message='Falha ao registrar Timeline administrativa.'; end;
  return query select v_new.id,v_new.user_id,v_new.papel,v_new.ativo,v_new.pessoa_id,v_new.created_at,v_new.updated_at,v_op;
exception
  when sqlstate 'P0001' then
    raise;
  when unique_violation then
    raise exception using errcode='P0001', message='Pessoa ja vinculada.';
  when foreign_key_violation or check_violation then
    raise exception using errcode='P0001', message='Estado de perfil invalido.';
  when others then
    raise exception using errcode='P0001', message='Falha ao salvar acesso.';
end;
$$;

revoke all on function public.listar_usuarios_acessos() from public, anon;
grant execute on function public.listar_usuarios_acessos() to authenticated;
revoke all on function public.salvar_usuario_acesso(uuid,text,boolean,uuid,timestamptz) from public, anon;
grant execute on function public.salvar_usuario_acesso(uuid,text,boolean,uuid,timestamptz) to authenticated;

drop policy if exists admin_ativo_select_timeline on public.timeline;
create policy admin_ativo_select_timeline on public.timeline for select to authenticated using (public.usuario_tem_papel(array['administrador','gestor']::text[]));

commit;

-- Verificacoes somente leitura (executar manualmente, fora desta transacao):
-- select count(*) from auth.users;
-- select count(*) from public.usuarios_perfis;
-- select count(*) from public.usuarios_perfis as profile_check where profile_check.ativo=true and profile_check.papel='administrador';
-- select column_name,data_type from information_schema.columns where table_schema='public' and table_name in('usuarios_perfis','usuarios_acessos_auditoria');
-- select relrowsecurity from pg_class where oid='public.usuarios_acessos_auditoria'::regclass;
-- select policyname,cmd,roles from pg_policies where schemaname='public' and tablename in('timeline','usuarios_acessos_auditoria');
-- select routine_name,security_type from information_schema.routines where routine_schema='public' and routine_name in('listar_usuarios_acessos','salvar_usuario_acesso');
