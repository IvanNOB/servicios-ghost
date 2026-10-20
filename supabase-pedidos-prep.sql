-- =====================================================================
-- Servicios Ghost — Tiempos de preparación del restaurante aliado
-- ---------------------------------------------------------------------
-- Ejecuta este archivo UNA vez en Supabase → SQL Editor → Run.
-- Requiere haber ejecutado supabase-mejoras.sql y supabase-pedidos-aliados.sql.
--
-- Guarda cuántos minutos prometió el restaurante para un pedido y cuándo
-- lo marcó como listo. El pedido sigue viviendo en public.pedidos.
-- =====================================================================

create table if not exists public.pedidos_prep (
  pedido_id   uuid primary key references public.pedidos(id) on delete cascade,
  minutos     int not null default 15 check (minutos between 1 and 240),
  aceptado_en timestamptz not null default now(),
  listo_en    timestamptz
);

alter table public.pedidos_prep enable row level security;
revoke all on public.pedidos_prep from anon;
grant select, insert, update on public.pedidos_prep to authenticated;

-- ¿El pedido tiene productos de mi restaurante?
-- (se usa en las tres políticas)
drop policy if exists "ver prep aliado" on public.pedidos_prep;
create policy "ver prep aliado"
  on public.pedidos_prep for select
  to authenticated
  using (
    public.es_admin() or exists (
      select 1 from public.pedidos p, jsonb_array_elements(p.items) it
      where p.id = pedido_id
        and it->>'restaurante_id' = public.mi_restaurante()
    )
  );

drop policy if exists "crear prep aliado" on public.pedidos_prep;
create policy "crear prep aliado"
  on public.pedidos_prep for insert
  to authenticated
  with check (
    public.es_admin() or exists (
      select 1 from public.pedidos p, jsonb_array_elements(p.items) it
      where p.id = pedido_id
        and it->>'restaurante_id' = public.mi_restaurante()
    )
  );

drop policy if exists "actualizar prep aliado" on public.pedidos_prep;
create policy "actualizar prep aliado"
  on public.pedidos_prep for update
  to authenticated
  using (
    public.es_admin() or exists (
      select 1 from public.pedidos p, jsonb_array_elements(p.items) it
      where p.id = pedido_id
        and it->>'restaurante_id' = public.mi_restaurante()
    )
  )
  with check (
    public.es_admin() or exists (
      select 1 from public.pedidos p, jsonb_array_elements(p.items) it
      where p.id = pedido_id
        and it->>'restaurante_id' = public.mi_restaurante()
    )
  );

notify pgrst, 'reload schema';
