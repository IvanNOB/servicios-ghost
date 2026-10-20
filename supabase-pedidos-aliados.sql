-- =====================================================================
-- Servicios Ghost — Pedidos para restaurantes aliados (ejecutar UNA vez)
-- Requisito: haber ejecutado antes supabase-mejoras.sql
-- Supabase → SQL Editor → pega TODO esto → Run.
--
-- Cada aliado ve y avanza SOLO los pedidos que incluyen productos de su
-- restaurante. Además puede borrar pedidos CANCELADOS que sean exclusivamente
-- de su restaurante (por ejemplo, pedidos de prueba). No puede borrar pedidos
-- activos, ni pedidos compartidos con otros negocios, ni cambiar productos,
-- cliente o total.
-- =====================================================================

drop policy if exists "ver pedidos aliado" on public.pedidos;
create policy "ver pedidos aliado"
  on public.pedidos for select
  to authenticated
  using (
    public.mi_restaurante() is not null
    and exists (
      select 1 from jsonb_array_elements(items) it
      where it->>'restaurante_id' = public.mi_restaurante()
    )
  );

drop policy if exists "actualizar pedidos aliado" on public.pedidos;
create policy "actualizar pedidos aliado"
  on public.pedidos for update
  to authenticated
  using (
    public.mi_restaurante() is not null
    and exists (
      select 1 from jsonb_array_elements(items) it
      where it->>'restaurante_id' = public.mi_restaurante()
    )
  )
  with check (
    public.mi_restaurante() is not null
    and exists (
      select 1 from jsonb_array_elements(items) it
      where it->>'restaurante_id' = public.mi_restaurante()
    )
  );

-- Un aliado solo puede cambiar estado / incidencia, nada más.
create or replace function public.proteger_pedido_aliado()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null and not public.es_admin() then
    if new.items is distinct from old.items
       or new.cliente is distinct from old.cliente
       or new.total is distinct from old.total
       or new.codigo is distinct from old.codigo then
      raise exception 'Solo puedes cambiar el estado del pedido.';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists proteger_pedido_aliado on public.pedidos;
create trigger proteger_pedido_aliado
  before update on public.pedidos
  for each row execute function public.proteger_pedido_aliado();

-- Borrar: un aliado solo puede borrar pedidos CANCELADOS que sean
-- exclusivamente de su restaurante (por ejemplo, pedidos de prueba).
-- Los pedidos activos o compartidos con otros negocios no se pueden borrar.
drop policy if exists "borrar pedidos aliado cancelados" on public.pedidos;
create policy "borrar pedidos aliado cancelados"
  on public.pedidos for delete
  to authenticated
  using (
    estado = 'cancelado'
    and public.mi_restaurante() is not null
    and jsonb_array_length(items) > 0
    and not exists (
      select 1 from jsonb_array_elements(items) it
      where coalesce(it->>'restaurante_id', '') <> public.mi_restaurante()
    )
  );

notify pgrst, 'reload schema';
