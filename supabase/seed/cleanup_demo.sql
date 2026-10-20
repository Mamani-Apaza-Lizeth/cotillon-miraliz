-- =============================================================================
-- Cotillón MiraLiz · Eliminación de datos de DEMOSTRACIÓN
-- -----------------------------------------------------------------------------
-- Borra únicamente filas marcadas con is_demo = true. Si algún producto de
-- demostración ya figura en pedidos, el script se detiene sin borrar nada
-- (para no romper el historial de ventas): en ese caso, despublique esos
-- productos en lugar de eliminarlos.
-- Ejecutar en el SQL Editor de Supabase. Es transaccional.
-- =============================================================================
begin;

do $$
begin
  if exists (select 1 from public.order_items oi join public.products p on p.id = oi.product_id where p.is_demo) then
    raise exception 'Hay pedidos que usan productos de demostración. Despublíquelos en lugar de borrarlos.';
  end if;
  if exists (select 1 from public.stock_reservations r join public.stock_items s on s.id = r.stock_item_id where s.is_demo) then
    raise exception 'Hay reservas sobre materiales de demostración. Cancele esos pedidos primero.';
  end if;
end;
$$;

delete from public.inventory_movements m using public.stock_items s where s.id = m.stock_item_id and s.is_demo;
delete from public.products where is_demo;           -- en cascada: imágenes, plantillas, recetas, carrito
delete from public.stock_items where is_demo;        -- materiales y existencias de demostración
delete from public.categories c where c.is_demo and not exists (select 1 from public.products p where p.category_id = c.id);
delete from public.suppliers where is_demo;

commit;
