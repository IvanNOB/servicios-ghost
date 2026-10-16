-- =====================================================================
-- Servicios Ghost — MEJORAS (ejecutar UNA vez, después de los otros SQL)
-- ---------------------------------------------------------------------
-- Cómo usar:
--   1. Supabase → SQL Editor → New query
--   2. Pega TODO este archivo y pulsa "Run".
--   Es seguro ejecutarlo varias veces: no borra restaurantes ni pedidos, y
--   solo la PRIMERA vez convierte a los usuarios existentes en administradores.
--
-- Activa:
--   1. Horarios automáticos por restaurante (columna "horario").
--   2. Ajustes del negocio (domicilio por barrio, promociones, comisión,
--      lo más pedido) editables desde el panel.
--   3. Seguimiento del pedido para el cliente (solo ve el estado).
--   4. Cuentas para restaurantes aliados (cada uno edita SOLO su carta).
--
-- IMPORTANTE: la PRIMERA vez que lo ejecutes, TODOS los usuarios que ya
-- existen en Authentication → Users quedan como ADMINISTRADORES. Por eso
-- crea las cuentas de los aliados DESPUÉS de ejecutarlo.
--
-- RECOMENDADO: en Supabase → Authentication → Sign In / Providers → Email,
-- desactiva "Allow new users to sign up". Así solo tú creas cuentas.
-- =====================================================================

-- 1) Columnas de restaurantes -----------------------------------------
alter table public.restaurantes add column if not exists horario  jsonb default null;
alter table public.restaurantes add column if not exists almuerzo jsonb default null;
alter table public.restaurantes add column if not exists desayuno jsonb default null;
-- visible = false: el negocio está organizando su carta y aún no sale en la tienda.
alter table public.restaurantes add column if not exists visible boolean not null default true;
-- Cómo se muestra la foto de perfil: 'foto' (llena el espacio) o 'logo' (completa, sin recortes).
alter table public.restaurantes add column if not exists logo_ajuste text default 'foto';

-- 2) Perfiles y permisos ----------------------------------------------
create table if not exists public.perfiles (
  user_id        uuid primary key references auth.users (id) on delete cascade,
  rol            text not null check (rol in ('admin', 'aliado')),
  restaurante_id text,
  creado_en      timestamptz default now()
);
alter table public.perfiles enable row level security;

drop policy if exists "ver mi perfil" on public.perfiles;
create policy "ver mi perfil"
  on public.perfiles for select
  to authenticated
  using (user_id = auth.uid());

-- Los usuarios que existen HOY quedan como administradores, pero SOLO si aún
-- no hay ningún administrador (así, volver a ejecutar el archivo nunca le da
-- permisos de admin a un aliado ni a una cuenta nueva).
insert into public.perfiles (user_id, rol)
select id, 'admin' from auth.users
where not exists (select 1 from public.perfiles where rol = 'admin')
on conflict (user_id) do nothing;

-- ¿El usuario con sesión es administrador?
create or replace function public.es_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.perfiles
    where user_id = auth.uid() and rol = 'admin'
  );
$$;

-- Restaurante que puede editar el aliado con sesión (o null).
create or replace function public.mi_restaurante()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select restaurante_id from public.perfiles
  where user_id = auth.uid() and rol = 'aliado'
  limit 1;
$$;

-- Rol del usuario con sesión (lo usa el panel para saber qué mostrar).
create or replace function public.mi_perfil()
returns table (rol text, restaurante_id text)
language sql
stable
security definer
set search_path = public
as $$
  select p.rol, p.restaurante_id from public.perfiles p
  where p.user_id = auth.uid();
$$;

-- 3) Reglas de restaurantes: admin todo; aliado solo edita el suyo ------
drop policy if exists "escritura admin restaurantes" on public.restaurantes;
drop policy if exists "crear restaurantes admin"     on public.restaurantes;
drop policy if exists "editar restaurantes"          on public.restaurantes;
drop policy if exists "borrar restaurantes admin"    on public.restaurantes;

create policy "crear restaurantes admin"
  on public.restaurantes for insert
  to authenticated
  with check (public.es_admin());

create policy "editar restaurantes"
  on public.restaurantes for update
  to authenticated
  using (public.es_admin() or id = public.mi_restaurante())
  with check (public.es_admin() or id = public.mi_restaurante());

create policy "borrar restaurantes admin"
  on public.restaurantes for delete
  to authenticated
  using (public.es_admin());

-- Un aliado no puede cambiar su posición en la lista (eso lo decide el admin).
create or replace function public.proteger_campos_admin()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null and not public.es_admin() then
    new.id    := old.id;
    new.orden := old.orden;
  end if;
  return new;
end;
$$;

drop trigger if exists proteger_campos_admin on public.restaurantes;
create trigger proteger_campos_admin
  before update on public.restaurantes
  for each row execute function public.proteger_campos_admin();

-- 4) Reglas de pedidos -------------------------------------------------
-- Crear pedido (cliente sin cuenta): solo pedidos NUEVOS y bien formados.
-- Impide que alguien invente pedidos "cancelados" o con totales falsos.
drop policy if exists "crear pedido publico" on public.pedidos;
create policy "crear pedido publico"
  on public.pedidos for insert
  to anon, authenticated
  with check (
    estado = 'recibido'
    and incidencia is null
    and total >= 0
    and codigo ~ '^GH-[A-Z0-9]{5,10}$'
    and jsonb_typeof(items) = 'array'
    and jsonb_typeof(cliente) = 'object'
    and creado_en between now() - interval '10 minutes' and now() + interval '10 minutes'
  );

-- Ver y cambiar pedidos: solo administradores.
drop policy if exists "ver pedidos admin"        on public.pedidos;
drop policy if exists "actualizar pedidos admin" on public.pedidos;

create policy "ver pedidos admin"
  on public.pedidos for select
  to authenticated
  using (public.es_admin());

create policy "actualizar pedidos admin"
  on public.pedidos for update
  to authenticated
  using (public.es_admin())
  with check (public.es_admin());

create index if not exists pedidos_codigo_idx on public.pedidos (codigo);

-- Código único (si ya hubiera códigos repetidos de antes, se omite sin error).
do $$
begin
  create unique index if not exists pedidos_codigo_unico on public.pedidos (codigo);
exception when unique_violation then
  raise notice 'Hay códigos de pedido repetidos de antes; no se creó el índice único.';
end;
$$;

-- 5) Ajustes del negocio ----------------------------------------------
create table if not exists public.ajustes (
  clave       text primary key,
  valor       jsonb,
  actualizado timestamptz default now()
);
alter table public.ajustes enable row level security;

drop policy if exists "leer ajustes"         on public.ajustes;
drop policy if exists "editar ajustes admin" on public.ajustes;

-- El público solo ve lo que usa la tienda (la comisión, por ejemplo, NO).
create policy "leer ajustes"
  on public.ajustes for select
  to anon, authenticated
  using (clave in ('domicilios', 'promos', 'populares') or public.es_admin());

create policy "editar ajustes admin"
  on public.ajustes for all
  to authenticated
  using (public.es_admin())
  with check (public.es_admin());

-- 6) Seguimiento del pedido (público, SIN datos personales) -------------
create or replace function public.estado_pedido(p_codigo text)
returns table (
  codigo      text,
  estado      text,
  creado_en   timestamptz,
  actualizado timestamptz,
  total       int,
  incidencia  text,
  items       jsonb
)
language sql
stable
security definer
set search_path = public
as $$
  select
    p.codigo,
    p.estado,
    p.creado_en,
    p.actualizado,
    p.total,
    p.incidencia,
    case when jsonb_typeof(p.items) = 'array' then coalesce((
      select jsonb_agg(jsonb_build_object(
        'plato', e->>'plato',
        'cantidad', e->'cantidad',
        'restaurante', e->>'restaurante'))
      from jsonb_array_elements(p.items) e
    ), '[]'::jsonb) else '[]'::jsonb end
  from public.pedidos p
  where p.codigo = upper(trim(p_codigo))
    and length(trim(p_codigo)) >= 6
  order by p.creado_en desc
  limit 1;
$$;

grant execute on function public.estado_pedido(text) to anon, authenticated;

-- 7) Gestión de aliados desde el panel (solo administradores) -----------
create or replace function public.listar_aliados()
returns table (email text, restaurante_id text)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.es_admin() then
    raise exception 'Solo un administrador puede ver los aliados.';
  end if;
  return query
    select u.email::text, p.restaurante_id
    from public.perfiles p
    join auth.users u on u.id = p.user_id
    where p.rol = 'aliado'
    order by u.email;
end;
$$;

create or replace function public.asignar_aliado(p_email text, p_restaurante text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid;
begin
  if not public.es_admin() then
    raise exception 'Solo un administrador puede asignar aliados.';
  end if;
  select id into v_user from auth.users where lower(email) = lower(trim(p_email)) limit 1;
  if v_user is null then
    raise exception 'No existe una cuenta con el correo %. Créala primero en Supabase → Authentication → Users → Add user.', p_email;
  end if;
  if exists (select 1 from public.perfiles where user_id = v_user and rol = 'admin') then
    raise exception 'Ese correo es de un administrador; usa otro correo para el aliado.';
  end if;
  if not exists (select 1 from public.restaurantes where id = p_restaurante) then
    raise exception 'Ese restaurante aún no está guardado en la base de datos. Ábrelo en el panel y pulsa Guardar una vez.';
  end if;
  insert into public.perfiles (user_id, rol, restaurante_id)
  values (v_user, 'aliado', p_restaurante)
  on conflict (user_id) do update set rol = 'aliado', restaurante_id = excluded.restaurante_id;
end;
$$;

create or replace function public.quitar_aliado(p_email text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.es_admin() then
    raise exception 'Solo un administrador puede quitar aliados.';
  end if;
  delete from public.perfiles
  where rol = 'aliado'
    and user_id in (select id from auth.users where lower(email) = lower(trim(p_email)));
end;
$$;

-- 8) Fotos: el admin puede todo; cada aliado solo en su carpeta --------
-- (aliados/<id-del-restaurante>/...), para que nadie borre fotos ajenas.
drop policy if exists "subir fotos admin"  on storage.objects;
drop policy if exists "editar fotos admin" on storage.objects;
drop policy if exists "borrar fotos admin" on storage.objects;

create policy "subir fotos admin"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'fotos' and (
      public.es_admin()
      or ((storage.foldername(name))[1] = 'aliados'
          and (storage.foldername(name))[2] = public.mi_restaurante())
    )
  );

create policy "editar fotos admin"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'fotos' and (
      public.es_admin()
      or ((storage.foldername(name))[1] = 'aliados'
          and (storage.foldername(name))[2] = public.mi_restaurante())
    )
  );

create policy "borrar fotos admin"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'fotos' and (
      public.es_admin()
      or ((storage.foldername(name))[1] = 'aliados'
          and (storage.foldername(name))[2] = public.mi_restaurante())
    )
  );

grant execute on function public.es_admin()                 to anon, authenticated;
grant execute on function public.mi_restaurante()           to anon, authenticated;
grant execute on function public.mi_perfil()                to authenticated;
grant execute on function public.listar_aliados()           to authenticated;
grant execute on function public.asignar_aliado(text, text) to authenticated;
grant execute on function public.quitar_aliado(text)        to authenticated;

-- Que la API vea de inmediato las tablas y funciones nuevas.
notify pgrst, 'reload schema';

-- =====================================================================
-- LISTO. Vuelve a abrir el panel (admin.html) y recarga la página.
-- =====================================================================
