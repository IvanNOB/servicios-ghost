-- =====================================================================
-- Servicios Ghost → map: cada pedido nuevo se crea solo en map
-- ---------------------------------------------------------------------
-- Cómo usar (una vez):
--   1. Supabase → SQL Editor → New query → pega TODO este archivo → Run.
--   2. Ejecuta el bloque "CONFIGURACIÓN" del final con la dirección de map.
--   3. Copia el secreto que te muestra y pégalo en Render (map) como
--      variable GHOST_WEBHOOK_SECRET.
--
-- Seguridad:
--   - El secreto vive SOLO aquí (tabla privada) y en Render. Nunca en la tienda.
--   - Si map está caído o dormido, el pedido se guarda igual en Supabase y el
--     WhatsApp sale igual: nunca se bloquea un pedido. Desde el panel se puede
--     "Reenviar a map".
-- =====================================================================

create extension if not exists pg_net;

-- Configuración privada (nadie la lee por la API: RLS sin políticas).
create table if not exists public.integracion_map (
  id      int primary key default 1 check (id = 1),
  url     text not null,
  secreto text not null,
  activo  boolean not null default true
);
alter table public.integracion_map enable row level security;
revoke all on public.integracion_map from anon, authenticated;

-- Registro de envíos (para que el panel muestre si llegó a map).
create table if not exists public.envios_map (
  id         bigserial primary key,
  pedido_id  uuid not null,
  request_id bigint,
  creado     timestamptz not null default now()
);
create index if not exists envios_map_pedido_idx on public.envios_map (pedido_id, creado desc);
alter table public.envios_map enable row level security;
revoke all on public.envios_map from anon, authenticated;

-- Envía un pedido a map (uso interno).
create or replace function public.enviar_pedido_a_map(p_id uuid)
returns bigint
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  c   public.integracion_map%rowtype;
  p   jsonb;
  rid bigint;
begin
  select * into c from public.integracion_map where id = 1 and activo;
  if not found then return null; end if;
  select to_jsonb(x) into p from (
    select id, codigo, estado, cliente, items, total, creado_en from public.pedidos where id = p_id
  ) x;
  if p is null then return null; end if;
  select net.http_post(
    url := c.url,
    body := jsonb_build_object('record', p),
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-ghost-secret', c.secreto),
    timeout_milliseconds := 10000
  ) into rid;
  insert into public.envios_map (pedido_id, request_id) values (p_id, rid);
  return rid;
end;
$$;
revoke execute on function public.enviar_pedido_a_map(uuid) from public, anon, authenticated;

-- Al crear un pedido, se envía solo. Si algo falla, el pedido NO se bloquea.
create or replace function public.pedido_nuevo_a_map()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  begin
    perform public.enviar_pedido_a_map(new.id);
  exception when others then
    raise warning 'No se pudo enviar el pedido % a map: %', new.codigo, sqlerrm;
  end;
  return new;
end;
$$;
revoke execute on function public.pedido_nuevo_a_map() from public, anon, authenticated;

drop trigger if exists pedido_nuevo_a_map on public.pedidos;
create trigger pedido_nuevo_a_map
  after insert on public.pedidos
  for each row execute function public.pedido_nuevo_a_map();

-- Panel (solo admin): reenviar un pedido a map. map no lo duplica.
create or replace function public.reenviar_pedido_map(p_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.es_admin() then raise exception 'Solo un administrador puede reenviar pedidos.'; end if;
  return public.enviar_pedido_a_map(p_id) is not null;
end;
$$;
revoke execute on function public.reenviar_pedido_map(uuid) from public, anon;
grant execute on function public.reenviar_pedido_map(uuid) to authenticated;

-- Panel (solo admin): ¿llegó a map? 'ok', 'error', 'enviando' o null (nunca se envió).
create or replace function public.estado_envios_map(p_ids uuid[])
returns table (pedido_id uuid, estado text, codigo_http int, enviado timestamptz)
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if not public.es_admin() then raise exception 'Solo un administrador.'; end if;
  return query
    select distinct on (e.pedido_id) e.pedido_id,
      case
        when r.id is null and e.creado > now() - interval '2 minutes' then 'enviando'
        when r.status_code between 200 and 299 then 'ok'
        else 'error'
      end,
      r.status_code, e.creado
    from public.envios_map e
    left join net._http_response r on r.id = e.request_id
    where e.pedido_id = any(p_ids)
    order by e.pedido_id, e.creado desc;
end;
$$;
revoke execute on function public.estado_envios_map(uuid[]) from public, anon;
grant execute on function public.estado_envios_map(uuid[]) to authenticated;

notify pgrst, 'reload schema';

-- =====================================================================
-- CONFIGURACIÓN (ejecútalo después, una vez). Cambia la dirección si tu
-- map no es map-rgi5.onrender.com. Crea un secreto nuevo al azar y lo muestra:
--
--   insert into public.integracion_map (id, url, secreto)
--   values (1, 'https://map-rgi5.onrender.com/api/integraciones/ghost',
--           encode(extensions.gen_random_bytes(24), 'hex'))
--   on conflict (id) do update set url = excluded.url, activo = true;
--
--   select secreto from public.integracion_map;   -- cópialo a Render
--
-- Apagar la integración:   update public.integracion_map set activo = false;
-- =====================================================================
