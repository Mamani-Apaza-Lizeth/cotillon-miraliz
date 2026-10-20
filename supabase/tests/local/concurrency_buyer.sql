-- Uso: psql -v uid=<uuid> -v key=<clave> -f concurrency_buyer.sql
begin;
select set_config('request.jwt.claims', json_build_object('sub', :'uid', 'role', 'authenticated')::text, true);
set local role authenticated;
select public.place_order('recojo', null, null, null, null, null, '', :'key') as pedido;
select pg_sleep(2);  -- mantiene el bloqueo de la fila de inventario mientras el otro comprador intenta
commit;
