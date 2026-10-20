\set ON_ERROR_STOP 1
do $$
declare v_orders int; v_reserved numeric;
begin
  select count(*) into v_orders from public.orders o join public.order_items i on i.order_id = o.id
   where i.product_id = '20000000-0000-4000-b000-000000000001';
  select reserved into v_reserved from public.stock_items where product_id = '20000000-0000-4000-b000-000000000001';
  if v_orders <> 1 or v_reserved <> 1 then
    raise exception 'FALLO concurrencia: pedidos=% reservado=%', v_orders, v_reserved;
  end if;
  raise notice 'OK  C01 dos compras simultáneas de la última unidad: solo una se confirma (pedidos=%, reservado=%)', v_orders, v_reserved;
end $$;
