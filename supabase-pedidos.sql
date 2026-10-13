-- =====================================================================
-- Servicios Ghost — Tabla de PEDIDOS (ejecutar UNA vez)
-- ---------------------------------------------------------------------
-- Cómo usar:
--   1. Supabase → SQL Editor → New query
--   2. Pega TODO este archivo y pulsa "Run".
--
-- Crea la tabla "pedidos" para guardar cada compra con:
--   - un identificador único,
--   - los productos y precios registrados al momento de la compra,
--   - los datos de entrega del cliente,
--   - un estado (recibido, preparando, listo, en camino, entregado…).
--
-- Seguridad (RLS):
--   - Cualquiera (cliente sin cuenta) puede CREAR un pedido.
--   - Solo el admin con sesión puede VER y ACTUALIZAR los pedidos.
-- =====================================================================

create table if not exists public.pedidos (
  id          uuid primary key default gen_random_uuid(),
  codigo      text,                        -- código corto legible (ej. GH-0001)
  estado      text not null default 'recibido',
  cliente     jsonb not null default '{}'::jsonb,  -- nombre, telefono, direccion, barrio, pago, notas
  items       jsonb not null default '[]'::jsonb,  -- productos con precio del momento
  total       int   not null default 0,            -- total de productos (sin domicilio)
  incidencia  text,                        -- motivo de cancelación / nota de incidencia
  creado_en   timestamptz default now(),
  actualizado timestamptz default now()
);

-- Índice para ordenar por fecha rápido
create index if not exists pedidos_creado_idx on public.pedidos (creado_en desc);

alter table public.pedidos enable row level security;

-- Crear pedido: permitido a cualquiera (cliente sin cuenta)
drop policy if exists "crear pedido publico" on public.pedidos;
create policy "crear pedido publico"
  on public.pedidos for insert
  to anon, authenticated
  with check (true);

-- Ver pedidos: solo admin autenticado
drop policy if exists "ver pedidos admin" on public.pedidos;
create policy "ver pedidos admin"
  on public.pedidos for select
  to authenticated
  using (true);

-- Actualizar pedidos (cambiar estado, etc.): solo admin autenticado
drop policy if exists "actualizar pedidos admin" on public.pedidos;
create policy "actualizar pedidos admin"
  on public.pedidos for update
  to authenticated
  using (true)
  with check (true);

-- =====================================================================
-- Opcional: columnas nuevas en "restaurantes" para horarios y agotados.
-- (La disponibilidad de platos "agotados" se guarda dentro de "carta",
--  así que no requiere columnas nuevas. Los horarios van en "horario".)
-- =====================================================================
alter table public.restaurantes
  add column if not exists horario jsonb default '{}'::jsonb;

-- LISTO. La web ya puede guardar pedidos y el panel podrá verlos.
