-- =====================================================================
-- Servicios Ghost — Contador de visitas ANÓNIMO (ejecutar UNA vez)
-- ---------------------------------------------------------------------
-- Cómo usar: Supabase → SQL Editor → New query → pega TODO → Run.
--
-- Qué hace:
--   - Guarda una fila por visita a la tienda (index.html), sin IP ni datos
--     personales: solo un identificador aleatorio del navegador, la fecha,
--     el dispositivo (móvil/escritorio) y el sitio de donde llegó.
--   - El cliente NO ve nada: no hay contador ni aviso en la página.
--   - Solo el administrador con sesión puede leer el resumen (función
--     resumen_visitas); la tabla no es legible ni escribible por la API.
-- =====================================================================

create table if not exists public.visitas (
  id          bigserial primary key,
  visita_id   text not null,
  creado      timestamptz not null default now(),
  pagina      text not null default 'tienda',
  referente   text,
  dispositivo text
);
create index if not exists visitas_creado_idx on public.visitas (creado desc);
create index if not exists visitas_visita_idx on public.visitas (visita_id);

alter table public.visitas enable row level security;
revoke all on public.visitas from anon, authenticated;

-- Registra una visita (lo llama la tienda). Ignora duplicados seguidos.
create or replace function public.registrar_visita(
  p_visita      text,
  p_pagina      text default 'tienda',
  p_ref         text default null,
  p_dispositivo text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_visita is null or length(trim(p_visita)) < 6 then return; end if;
  -- Una misma persona no se cuenta dos veces en menos de 20 segundos.
  if exists (
    select 1 from public.visitas
    where visita_id = left(trim(p_visita), 40) and creado > now() - interval '20 seconds'
  ) then return; end if;
  insert into public.visitas (visita_id, pagina, referente, dispositivo)
  values (
    left(trim(p_visita), 40),
    left(coalesce(nullif(trim(p_pagina), ''), 'tienda'), 30),
    nullif(left(coalesce(p_ref, ''), 120), ''),
    nullif(left(coalesce(p_dispositivo, ''), 20), '')
  );
end;
$$;
revoke execute on function public.registrar_visita(text, text, text, text) from public;
grant execute on function public.registrar_visita(text, text, text, text) to anon, authenticated;

-- Resumen para el panel (solo administrador). Si no es admin, devuelve ceros.
create or replace function public.resumen_visitas(p_desde timestamptz default null)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with base as (
    select v.*,
           (v.creado at time zone 'America/Bogota')::date as dia_local,
           extract(hour from (v.creado at time zone 'America/Bogota'))::int as hora
    from public.visitas v
    where public.es_admin()
      and (p_desde is null or v.creado >= p_desde)
  ),
  hoy as (select (now() at time zone 'America/Bogota')::date as d),
  pers as (select visita_id, count(*) as n from base group by visita_id)
  select jsonb_build_object(
    'total',        (select count(*) from base),
    'personas',     (select count(*) from pers),
    'hoy',          (select count(*) from base where dia_local = (select d from hoy)),
    'personas_hoy', (select count(distinct visita_id) from base where dia_local = (select d from hoy)),
    'ayer',         (select count(*) from base where dia_local = (select d from hoy) - 1),
    'semana',       (select count(*) from base where dia_local > (select d from hoy) - 7),
    'nuevas',       (select count(*) from pers where n = 1),
    'recurrentes',  (select count(*) from pers where n > 1),
    'por_dia',      (select coalesce(jsonb_object_agg(dia_local, n), '{}'::jsonb)
                       from (select dia_local, count(*) n from base group by dia_local) x),
    'por_hora',     (select coalesce(jsonb_object_agg(hora, n), '{}'::jsonb)
                       from (select hora, count(*) n from base group by hora) x),
    'dispositivos', (select coalesce(jsonb_object_agg(dispositivo, n), '{}'::jsonb)
                       from (select coalesce(nullif(dispositivo, ''), 'otro') as dispositivo, count(*) n
                             from base group by 1) x),
    'ultima',       (select max(creado) from base)
  );
$$;
revoke execute on function public.resumen_visitas(timestamptz) from public, anon;
grant execute on function public.resumen_visitas(timestamptz) to authenticated;

notify pgrst, 'reload schema';

-- =====================================================================
-- LISTO. Abre admin.html → pestaña "Visitas". No hay nada visible
-- para los clientes en la tienda.
-- =====================================================================
