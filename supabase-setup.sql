-- =====================================================================
-- Servicios Ghost — Configuración de Supabase (ejecutar UNA vez)
-- ---------------------------------------------------------------------
-- Cómo usar:
--   1. Entra a tu proyecto en https://supabase.com
--   2. Menú lateral: "SQL Editor" → "New query"
--   3. Pega TODO este archivo y pulsa "Run".
--
-- Esto crea:
--   - La tabla "restaurantes".
--   - Reglas de seguridad (RLS): cualquiera puede LEER (los clientes),
--     pero solo usuarios con sesión iniciada (tú, admin) pueden
--     crear/editar/borrar.
--   - El bucket de Storage "fotos" (público para leer, escritura solo
--     para admin con sesión).
-- =====================================================================

-- 1) Tabla de restaurantes --------------------------------------------
create table if not exists public.restaurantes (
  id          text primary key,
  nombre      text not null,
  cat         text not null,
  tiempo      text,
  abierto     boolean not null default true,
  color       text default '#3b82f6',
  descripcion text default '',
  logo        text default '',
  carta       jsonb not null default '[]'::jsonb,
  almuerzo    jsonb default null,
  orden       int default 0,
  creado_en   timestamptz default now()
);

-- Si la tabla ya existía desde antes (creada sin la columna "almuerzo"),
-- esta línea la añade sin borrar nada. Es seguro ejecutarla varias veces.
alter table public.restaurantes
  add column if not exists almuerzo jsonb default null;

-- 2) Activar Row Level Security ---------------------------------------
alter table public.restaurantes enable row level security;

-- 3) Políticas de la tabla --------------------------------------------
-- Lectura pública (los clientes ven los restaurantes sin iniciar sesión)
drop policy if exists "lectura publica restaurantes" on public.restaurantes;
create policy "lectura publica restaurantes"
  on public.restaurantes for select
  to anon, authenticated
  using (true);

-- Escritura solo para usuarios autenticados (el admin)
drop policy if exists "escritura admin restaurantes" on public.restaurantes;
create policy "escritura admin restaurantes"
  on public.restaurantes for all
  to authenticated
  using (true)
  with check (true);

-- 4) Bucket de Storage para las fotos ---------------------------------
-- "public = true" permite que las fotos se vean con una URL pública.
insert into storage.buckets (id, name, public)
values ('fotos', 'fotos', true)
on conflict (id) do update set public = true;

-- 5) Políticas del Storage --------------------------------------------
-- Ver fotos: público
drop policy if exists "ver fotos" on storage.objects;
create policy "ver fotos"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'fotos');

-- Subir fotos: solo admin autenticado
drop policy if exists "subir fotos admin" on storage.objects;
create policy "subir fotos admin"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'fotos');

-- Actualizar/borrar fotos: solo admin autenticado
drop policy if exists "editar fotos admin" on storage.objects;
create policy "editar fotos admin"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'fotos');

drop policy if exists "borrar fotos admin" on storage.objects;
create policy "borrar fotos admin"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'fotos');

-- =====================================================================
-- LISTO. Ahora crea tu usuario admin en:
--   Authentication → Users → "Add user" (pon tu correo y contraseña).
-- Con ese correo y contraseña entrarás en /admin.html
-- =====================================================================

-- Después de este archivo, ejecuta también supabase-pedidos.sql y
-- supabase-mejoras.sql (horarios, ajustes, seguimiento y cuentas de aliados).
