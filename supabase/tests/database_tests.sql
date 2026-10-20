-- =============================================================================
-- Cotillón MiraLiz · Pruebas de base de datos (integridad, RLS y flujos)
-- -----------------------------------------------------------------------------
-- Cómo ejecutar:
--   • Local (sin Supabase):  ./scripts/test-db.sh   (ver manual, cap. 11)
--   • En Supabase:           SQL Editor → pegar este archivo → Run.
--     Todo ocurre dentro de BEGIN … ROLLBACK: no deja datos ni usuarios.
-- Resultado esperado: una lista de "OK …" y al final "TODAS LAS PRUEBAS
-- PASARON". Ante el primer fallo la ejecución se detiene con el mensaje.
-- Requiere: migraciones 001–007 aplicadas. No requiere los datos demo.
-- =============================================================================
begin;

-- Utilidad: ejecutar SQL esperando un error cuyo texto coincida con un patrón.
create function pg_temp.expect_error(p_sql text, p_label text, p_pattern text default '%')
returns void language plpgsql as $$
begin
  execute p_sql;
  raise exception 'FALLO [%]: se esperaba un error y la operación se ejecutó', p_label;
exception when others then
  if sqlerrm like 'FALLO [%' then raise; end if;
  if sqlerrm not ilike p_pattern then
    raise exception 'FALLO [%]: error inesperado: %', p_label, sqlerrm;
  end if;
  raise notice 'OK  %  →  %', p_label, sqlerrm;
end;
$$;

create function pg_temp.ok(p_cond boolean, p_label text)
returns void language plpgsql as $$
begin
  if p_cond is distinct from true then
    raise exception 'FALLO [%]', p_label;
  end if;
  raise notice 'OK  %', p_label;
end;
$$;

create function pg_temp.login(p_uid uuid)
returns void language sql as $$
  select set_config('request.jwt.claim.sub', '', true),
         set_config('request.jwt.claims', json_build_object('sub', p_uid, 'role', 'authenticated')::text, true);
$$;

create function pg_temp.logout()
returns void language sql as $$
  select set_config('request.jwt.claim.sub', '', true),
         set_config('request.jwt.claims', '{"role":"anon"}', true);
$$;

-- ---------------------------------------------------------------------------
-- Preparación (como postgres)
-- ---------------------------------------------------------------------------
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-4000-a000-000000000001', 'admin.test@miraliz.test',    '{"full_name":"Admin Prueba"}'),
  ('00000000-0000-4000-a000-000000000002', 'empleado.test@miraliz.test', '{"full_name":"Empleado Prueba"}'),
  ('00000000-0000-4000-a000-000000000003', 'cliente.a@miraliz.test',     '{"full_name":"Cliente A","role":"admin"}'),
  ('00000000-0000-4000-a000-000000000004', 'cliente.b@miraliz.test',     '{"full_name":"Cliente B","phone":"70000000"}');

select pg_temp.ok((select role from public.profiles where id = '00000000-0000-4000-a000-000000000003') = 'cliente',
                  'T01 el registro ignora un rol "admin" enviado en metadata');

-- El primer administrador solo se crea si no existe ninguno (en una base
-- con un administrador real, esta parte se omite automáticamente).
do $$
begin
  if not exists (select 1 from public.profiles where role = 'admin') then
    perform public.bootstrap_first_admin('admin.test@miraliz.test');
    perform pg_temp.expect_error($q$select public.bootstrap_first_admin('cliente.b@miraliz.test')$q$,
                                 'T02 no se puede crear un segundo administrador por bootstrap', '%Ya existe un administrador%');
  else
    update public.profiles set role = 'admin' where id = '00000000-0000-4000-a000-000000000001';
    raise notice 'OK  T02 (omitida: ya existe un administrador; se usa uno de prueba)';
  end if;
end $$;

insert into public.categories (id, name, slug) values ('10000000-0000-4000-a000-000000000001', 'Categoría prueba', 'zz-test-cat');
insert into public.products (id, category_id, name, slug, product_type, sale_unit, price, is_published) values
  ('20000000-0000-4000-a000-000000000001', '10000000-0000-4000-a000-000000000001', 'Vasos prueba', 'zz-test-vasos', 'reventa', 'paquete', 10.00, true),
  ('20000000-0000-4000-a000-000000000003', '10000000-0000-4000-a000-000000000001', 'Oculto prueba', 'zz-test-oculto', 'reventa', 'unidad', 5.00, false);
insert into public.products (id, category_id, name, slug, product_type, sale_unit, price, is_published, allows_custom_design) values
  ('20000000-0000-4000-a000-000000000002', '10000000-0000-4000-a000-000000000001', 'Piñata prueba', 'zz-test-pinata', 'personalizado', 'unidad', 80.00, true, true);
insert into public.stock_items (id, kind, name, unit) values
  ('30000000-0000-4000-a000-000000000001', 'material', 'Plastoformo prueba', 'plancha');
select public._stock_apply((select id from public.stock_items where product_id = '20000000-0000-4000-a000-000000000001'), 'entrada', 3, null, 'prueba');
select public._stock_apply('30000000-0000-4000-a000-000000000001', 'entrada', 5, null, 'prueba');
insert into public.recipes (id, product_id, version, yield_qty, is_active) values
  ('40000000-0000-4000-a000-000000000001', '20000000-0000-4000-a000-000000000002', 1, 1, true);
insert into public.recipe_materials values ('40000000-0000-4000-a000-000000000001', '30000000-0000-4000-a000-000000000001', 1);
insert into public.recipe_stages select '40000000-0000-4000-a000-000000000001', id, 30 from public.production_stages where code in ('corte', 'decoracion');

-- Material de producto no se puede usar como material de receta
select pg_temp.expect_error($q$insert into public.recipe_materials values ('40000000-0000-4000-a000-000000000001',
  (select id from public.stock_items where product_id = '20000000-0000-4000-a000-000000000001'), 1)$q$,
  'T03 una receta solo admite ítems de tipo material', '%tipo material%');

-- Restricciones
select pg_temp.expect_error($q$update public.stock_items set quantity = -1 where id = '30000000-0000-4000-a000-000000000001'$q$,
  'T04 CHECK impide existencias negativas', '%stock_quantity_non_negative%');
select pg_temp.expect_error($q$update public.stock_items set reserved = 99 where id = '30000000-0000-4000-a000-000000000001'$q$,
  'T05 CHECK impide reservar más de lo existente', '%stock_reserved_le_quantity%');
select pg_temp.expect_error($q$insert into public.products (category_id, name, slug, product_type, is_published)
  values ('10000000-0000-4000-a000-000000000001', 'Sin precio', 'zz-sin-precio', 'reventa', true)$q$,
  'T06 un producto publicado debe tener precio', '%products_published_has_price%');

-- ---------------------------------------------------------------------------
-- Visitante anónimo
-- ---------------------------------------------------------------------------
select pg_temp.logout();
set local role anon;
select pg_temp.ok((select count(*) from public.products where slug like 'zz-test-%') = 2,
                  'T07 anon ve solo productos publicados (2 de 3)');
select pg_temp.expect_error('select * from public.stock_items', 'T08 anon no puede leer el inventario', '%permission denied%');
select pg_temp.expect_error('select * from public.orders', 'T09 anon no puede leer pedidos', '%permission denied%');
select pg_temp.ok((select available from public.catalog_availability() where product_id = '20000000-0000-4000-a000-000000000001') = 3,
                  'T10 anon consulta disponibilidad mediante catalog_availability()');
select pg_temp.ok((select within_coverage from public.delivery_quote(-16.5000, -68.1200)),
                  'T11 cotización de entrega dentro de cobertura');
reset role;

-- ---------------------------------------------------------------------------
-- Cliente A
-- ---------------------------------------------------------------------------
select pg_temp.login('00000000-0000-4000-a000-000000000003');
set local role authenticated;
select pg_temp.expect_error($q$update public.profiles set role = 'admin' where id = auth.uid()$q$,
  'T12 el cliente no puede cambiar su rol', '%permission denied%');
update public.profiles set full_name = 'Cliente A editado' where id = auth.uid();
select pg_temp.ok((select full_name from public.profiles where id = auth.uid()) = 'Cliente A editado',
                  'T13 el cliente edita su nombre');
select pg_temp.expect_error($q$select public.admin_send_quote(gen_random_uuid(), 10, 10, current_date + 10, current_date + 5)$q$,
  'T14 el cliente no puede ejecutar funciones de administrador', '%solo para el administrador%');
select pg_temp.expect_error($q$select public.payment_apply_provider_result('stripe','evt','x','ref','aprobado',1,'BOB')$q$,
  'T15 el cliente no puede confirmar pagos del proveedor', '%permission denied%');
select pg_temp.expect_error($q$insert into public.stock_items (kind, name) values ('material', 'hack')$q$,
  'T16 el cliente no puede crear inventario', '%row-level security%');

insert into public.customer_addresses (user_id, address_text, lat, lng) values (auth.uid(), 'Calle de prueba 123', -16.50, -68.12);
insert into public.cart_items (user_id, product_id, quantity) values (auth.uid(), '20000000-0000-4000-a000-000000000001', 2);
select pg_temp.expect_error($q$insert into public.cart_items (user_id, product_id, quantity)
  values ('00000000-0000-4000-a000-000000000004', '20000000-0000-4000-a000-000000000001', 1)$q$,
  'T17 no se puede agregar al carrito de otro usuario', '%row-level security%');

select pg_temp.expect_error($q$select public.place_order('entrega', 'Lejos', '', -17.97, -67.11, null, '', 'key-out-of-zone-1')$q$,
  'T18 entrega fuera de cobertura rechazada', '%fuera del área de cobertura%');

create temp table t_ids (k text primary key, v uuid);
grant all on t_ids to anon, authenticated, service_role;
insert into t_ids values ('orderA', public.place_order('entrega', 'Calle de prueba 123', 'Puerta verde', -16.50, -68.12, null, 'nota', 'key-order-a-0001'));
select pg_temp.ok((select total = 20 + delivery_fee and delivery_fee > 0 and status = 'pendiente_pago'
                     from public.orders where id = (select v from t_ids where k = 'orderA')),
                  'T19 pedido creado con precio y tarifa recalculados en el servidor');
select pg_temp.ok(public.place_order('recojo', null, null, null, null, null, '', 'key-order-a-0001') = (select v from t_ids where k = 'orderA'),
                  'T20 reintento con la misma clave no duplica el pedido (idempotencia)');
select pg_temp.ok((select count(*) from public.cart_items) = 0, 'T21 el carrito se vacía al confirmar');
reset role;

select pg_temp.ok((select reserved from public.stock_items where product_id = '20000000-0000-4000-a000-000000000001') = 2,
                  'T22 se reservan 2 unidades (disponible 1)');

-- ---------------------------------------------------------------------------
-- Cliente B: sobreventa y aislamiento
-- ---------------------------------------------------------------------------
select pg_temp.login('00000000-0000-4000-a000-000000000004');
set local role authenticated;
select pg_temp.ok((select count(*) from public.orders) = 0, 'T23 cliente B no ve pedidos de A');
select pg_temp.ok((select count(*) from public.customer_addresses) = 0, 'T24 cliente B no ve direcciones de A');
select pg_temp.ok((select count(*) from public.profiles) = 1, 'T25 cliente B solo ve su propio perfil');
insert into public.cart_items (user_id, product_id, quantity) values (auth.uid(), '20000000-0000-4000-a000-000000000001', 2);
select pg_temp.expect_error($q$select public.place_order('recojo', null, null, null, null, null, '', 'key-order-b-0001')$q$,
  'T26 sobreventa impedida: se piden 2 con 1 disponible', '%Existencias insuficientes%');
select pg_temp.expect_error($q$select public.cancel_order((select v from t_ids where k = 'orderA'), 'no es mío')$q$,
  'T27 cliente B no puede cancelar el pedido de A', '%no encontrado%');
delete from public.cart_items;
insert into public.cart_items (user_id, product_id, quantity) values (auth.uid(), '20000000-0000-4000-a000-000000000002', 1);
select pg_temp.expect_error(format($q$select public.place_order('recojo', null, null, null, null, %L, '', 'key-order-b-0002')$q$, public.business_today()),
  'T28 fecha de entrega inviable para un personalizado', '%no es viable%');
insert into t_ids values ('orderB', public.place_order('recojo', null, null, null, null, null, '', 'key-order-b-0003'));
select pg_temp.ok((select promised_date >= public.business_today() + 1 and production_minutes = 60
                     from public.orders where id = (select v from t_ids where k = 'orderB')),
                  'T29 fecha prometida calculada con la capacidad y la receta');
reset role;
select pg_temp.ok((select reserved from public.stock_items where id = '30000000-0000-4000-a000-000000000001') = 1,
                  'T30 se reserva el material de la receta (1 plancha)');

-- ---------------------------------------------------------------------------
-- Cotización con diseño propio
-- ---------------------------------------------------------------------------
select pg_temp.login('00000000-0000-4000-a000-000000000003');
set local role authenticated;
select pg_temp.expect_error($q$insert into storage.objects (bucket_id, name) values ('customizations', '00000000-0000-4000-a000-000000000004/x.png')$q$,
  'T31 no se puede subir a la carpeta de otro cliente', '%row-level security%');
insert into storage.objects (bucket_id, name) values ('customizations', '00000000-0000-4000-a000-000000000003/diseno.png');
select pg_temp.expect_error(format($q$select public.request_quote('20000000-0000-4000-a000-000000000002', 2, 'Piñata de dinosaurio verde', %L,
  'recojo', '00000000-0000-4000-a000-000000000004/x.png', null, null, null, null, null, null, null, '', 'key-quote-a-bad1')$q$, public.business_today() + 20),
  'T32 la imagen de referencia debe pertenecer al cliente', '%no pertenece%');
insert into t_ids values ('quoteOrder', public.request_quote('20000000-0000-4000-a000-000000000002', 2, 'Piñata de dinosaurio verde con nombre',
  public.business_today() + 20, 'recojo', '00000000-0000-4000-a000-000000000003/diseno.png', null, 'Dinosaurios', 'verde',
  null, null, null, null, '', 'key-quote-a-0001'));
select pg_temp.ok((select o.status = 'cotizacion_pendiente' and o.total = 0 and oi.unit_price is null
                     from public.orders o join public.order_items oi on oi.order_id = o.id
                    where o.id = (select v from t_ids where k = 'quoteOrder')),
                  'T33 la solicitud queda en "cotización pendiente" sin precio');
select pg_temp.expect_error($q$select public.create_payment_attempt((select v from t_ids where k = 'quoteOrder'), 'qr', 10, 'key-pay-quote-001')$q$,
  'T34 no se puede pagar una cotización pendiente', '%no admite pagos%');
reset role;

select pg_temp.login('00000000-0000-4000-a000-000000000004');
set local role authenticated;
select pg_temp.ok((select count(*) from storage.objects where bucket_id = 'customizations') = 0,
                  'T35 cliente B no puede ver el diseño de A');
reset role;

select pg_temp.login('00000000-0000-4000-a000-000000000001');
set local role authenticated;
select pg_temp.expect_error(format($q$select public.admin_send_quote((select v from t_ids where k = 'quoteOrder'), 90, 120, %L, %L, '')$q$,
  public.business_today(), public.business_today()),
  'T36 el administrador no puede proponer una fecha inviable', '%fecha más próxima viable%');
insert into t_ids values ('quote1', public.admin_send_quote((select v from t_ids where k = 'quoteOrder'), 90, 120,
  public.business_today() + 15, public.business_today() + 7, 'Incluye decoración'));
select pg_temp.ok((select count(*) from storage.objects where bucket_id = 'customizations') = 1,
                  'T37 el administrador puede ver el diseño de referencia');
reset role;

select pg_temp.login('00000000-0000-4000-a000-000000000004');
set local role authenticated;
select pg_temp.expect_error($q$select public.customer_respond_quote((select v from t_ids where k = 'quote1'), true)$q$,
  'T38 cliente B no puede responder la cotización de A', '%no encontrada%');
reset role;

select pg_temp.login('00000000-0000-4000-a000-000000000003');
set local role authenticated;
select pg_temp.ok(public.customer_respond_quote((select v from t_ids where k = 'quote1'), true, 'De acuerdo') = 'aceptada',
                  'T39 el cliente acepta la cotización');
select pg_temp.ok((select status = 'pendiente_pago' and total = 180 and required_advance = 90 and promised_date = public.business_today() + 15
                     from public.orders where id = (select v from t_ids where k = 'quoteOrder')),
                  'T40 la aceptación fija precio, anticipo (50 %) y fecha');
select pg_temp.expect_error($q$update public.payments set status = 'aprobado'$q$,
  'T41 el cliente no puede modificar pagos directamente', '%permission denied%');
select pg_temp.expect_error($q$select public.create_payment_attempt((select v from t_ids where k = 'quoteOrder'), 'qr', 10, 'key-pay-a-low-001')$q$,
  'T42 monto menor al anticipo rechazado', '%Monto inválido%');
insert into t_ids select 'qr1', (public.create_payment_attempt((select v from t_ids where k = 'quoteOrder'), 'qr', 90, 'key-pay-a-qr-0001')).id;
select pg_temp.ok((select (public.create_payment_attempt((select v from t_ids where k = 'quoteOrder'), 'qr', 90, 'key-pay-a-qr-0001')).id)
                  = (select v from t_ids where k = 'qr1'), 'T43 reintento del intento de pago no lo duplica');
select pg_temp.ok((select status from public.get_payment_status((select v from t_ids where k = 'qr1'))) = 'pendiente',
                  'T44 QR generado queda pendiente (un contador no lo aprueba)');
select pg_temp.expect_error($q$select public.admin_sandbox_resolve_qr((select v from t_ids where k = 'qr1'), true)$q$,
  'T45 el cliente no puede aprobar su propio QR de prueba', '%solo para el administrador%');
select pg_temp.expect_error($q$select public.create_payment_attempt((select v from t_ids where k = 'quoteOrder'), 'tarjeta', 90, 'key-pay-a-card-01')$q$,
  'T46 tarjeta deshabilitada hasta configurar el proveedor', '%no está habilitado%');
reset role;

select pg_temp.login('00000000-0000-4000-a000-000000000001');
set local role authenticated;
select pg_temp.ok(public.admin_sandbox_resolve_qr((select v from t_ids where k = 'qr1'), true) = 'aprobado',
                  'T47 el administrador confirma el QR de prueba');
select pg_temp.ok((select status = 'confirmado' and amount_paid = 90 and balance = 90
                     from public.orders where id = (select v from t_ids where k = 'quoteOrder')),
                  'T48 el anticipo confirma el pedido y actualiza el saldo');
select pg_temp.ok((select count(*) from public.production_tasks where order_id = (select v from t_ids where k = 'quoteOrder')) = 2,
                  'T49 se crean las tareas de producción por etapa (corte y decoración)');
update public.app_settings set value = value || '{"card_enabled": true}'::jsonb where key = 'payments';
reset role;

-- Pago con tarjeta: confirmación del proveedor solo desde el backend
select pg_temp.login('00000000-0000-4000-a000-000000000003');
set local role authenticated;
insert into t_ids select 'card1', (public.create_payment_attempt((select v from t_ids where k = 'quoteOrder'), 'tarjeta', 40, 'key-pay-a-card-02')).id;
reset role;
set local role service_role;
select public.payment_set_provider_ref((select v from t_ids where k = 'card1'), 'pi_test_123');
select pg_temp.ok(public.payment_apply_provider_result('stripe', 'evt_1', 'payment_intent.succeeded', 'pi_test_123', 'aprobado', 999, 'BOB') = 'monto_no_coincide',
                  'T50 un monto confirmado distinto al intento se rechaza');
select pg_temp.ok(public.payment_apply_provider_result('stripe', 'evt_1', 'payment_intent.succeeded', 'pi_test_123', 'aprobado', 40, 'BOB') = 'duplicado',
                  'T51 un webhook repetido (mismo evento) se ignora');
reset role;
select pg_temp.login('00000000-0000-4000-a000-000000000003');
set local role authenticated;
insert into t_ids select 'card2', (public.create_payment_attempt((select v from t_ids where k = 'quoteOrder'), 'tarjeta', 40, 'key-pay-a-card-03')).id;
reset role;
set local role service_role;
select public.payment_set_provider_ref((select v from t_ids where k = 'card2'), 'pi_test_456');
select pg_temp.ok(public.payment_apply_provider_result('stripe', 'evt_2', 'payment_intent.succeeded', 'pi_test_456', 'aprobado', 40, 'BOB') = 'aplicado',
                  'T52 webhook válido aprueba el pago con tarjeta');
reset role;
select pg_temp.ok((select amount_paid = 130 and balance = 50 from public.orders where id = (select v from t_ids where k = 'quoteOrder')),
                  'T53 saldo pendiente tras anticipo y pago parcial');

-- ---------------------------------------------------------------------------
-- Empleado y producción
-- ---------------------------------------------------------------------------
select pg_temp.login('00000000-0000-4000-a000-000000000001');
set local role authenticated;
select public.admin_set_user_role('00000000-0000-4000-a000-000000000002', 'empleado', true);
select pg_temp.expect_error($q$select public.admin_set_user_role('00000000-0000-4000-a000-000000000001', 'cliente', true)$q$,
  'T54 el administrador no puede quitarse su propio rol', '%propio rol%');
select public.admin_assign_task(t.id, '00000000-0000-4000-a000-000000000002', public.business_today() + 1)
  from public.production_tasks t where t.order_id = (select v from t_ids where k = 'quoteOrder');
reset role;

select pg_temp.login('00000000-0000-4000-a000-000000000002');
set local role authenticated;
select pg_temp.ok((select count(*) from public.orders) = 0, 'T55 el empleado no lee la tabla de pedidos (datos financieros)');
select pg_temp.ok((select count(*) from public.payments) = 0, 'T56 el empleado no ve pagos');
select pg_temp.ok((select count(*) from public.my_tasks()) = 2, 'T57 el empleado ve sus 2 tareas asignadas');
select pg_temp.ok((select count(*) from storage.objects where bucket_id = 'customizations') = 1,
                  'T58 el empleado asignado puede ver el diseño de referencia');
select pg_temp.expect_error($q$select public.admin_update_order_status((select v from t_ids where k = 'quoteOrder'), 'listo')$q$,
  'T59 el empleado no puede cambiar el estado del pedido directamente', '%solo para el administrador%');
select public.employee_update_task(id, 'en_progreso', 20, 'Inicio de corte') from public.my_tasks() where stage_name = 'Corte';
reset role;
select pg_temp.ok((select status = 'en_produccion' from public.orders where id = (select v from t_ids where k = 'quoteOrder')),
                  'T60 al iniciar una tarea el pedido pasa a "en producción"');
select pg_temp.ok((select quantity = 3 and reserved = 1 from public.stock_items where id = '30000000-0000-4000-a000-000000000001'),
                  'T61 se consumen los 2 materiales reservados (5 → 3; queda la reserva del pedido B)');
select pg_temp.login('00000000-0000-4000-a000-000000000002');
set local role authenticated;
select public.employee_update_task(id, 'completada', 10, 'Listo') from public.my_tasks() where stage_name = 'Corte';
select pg_temp.expect_error($q$select public.employee_update_task(id, 'en_progreso', 0, '') from public.my_tasks() where stage_name = 'Corte'$q$,
  'T62 una tarea completada no se reabre', '%ya fue completada%');
select public.employee_update_task(id, 'en_progreso', 30, '') from public.my_tasks() where stage_name = 'Decoración';
select public.employee_update_task(id, 'completada', 30, '') from public.my_tasks() where stage_name = 'Decoración';
reset role;
select pg_temp.ok((select status = 'listo' from public.orders where id = (select v from t_ids where k = 'quoteOrder')),
                  'T63 al completar todas las tareas el pedido queda "listo"');

select pg_temp.login('00000000-0000-4000-a000-000000000001');
set local role authenticated;
select pg_temp.expect_error($q$select public.admin_update_order_status((select v from t_ids where k = 'quoteOrder'), 'entregado')$q$,
  'T64 no se entrega un pedido con saldo pendiente', '%saldo pendiente%');
select pg_temp.expect_error($q$select public.admin_record_payment((select v from t_ids where k = 'quoteOrder'), 999, 'efectivo', '', 'key-cash-a-00001')$q$,
  'T65 no se puede cobrar más que el saldo', '%Monto inválido%');
select public.admin_record_payment((select v from t_ids where k = 'quoteOrder'), 50, 'efectivo', 'Saldo en tienda', 'key-cash-a-00002');
select public.admin_update_order_status((select v from t_ids where k = 'quoteOrder'), 'entregado', 'Entregado en tienda');
select pg_temp.ok((select status = 'entregado' and balance = 0 from public.orders where id = (select v from t_ids where k = 'quoteOrder')),
                  'T66 pedido entregado con saldo cero');
select pg_temp.expect_error($q$select public.admin_update_order_status((select v from t_ids where k = 'quoteOrder'), 'listo')$q$,
  'T67 transición inválida desde "entregado"', '%no permitida%');

-- Cancelación libera reservas
select public.cancel_order((select v from t_ids where k = 'orderA'), 'Cliente desistió');
reset role;
select pg_temp.ok((select reserved from public.stock_items where product_id = '20000000-0000-4000-a000-000000000001') = 0,
                  'T68 cancelar libera la reserva de productos');
select pg_temp.ok((select count(*) from public.stock_reservations where order_id = (select v from t_ids where k = 'orderA') and state = 'liberada') = 1,
                  'T69 la reserva queda marcada como liberada (no se libera dos veces)');

-- Venta de mostrador, ajustes y auditoría
select pg_temp.login('00000000-0000-4000-a000-000000000001');
set local role authenticated;
select pg_temp.expect_error($q$select public.admin_counter_sale('[{"product_id":"20000000-0000-4000-a000-000000000001","quantity":4}]', 'efectivo', '', '', '', 'key-counter-00001')$q$,
  'T70 mostrador: no se vende más de lo disponible', '%insuficiente%');
insert into t_ids values ('counter', public.admin_counter_sale('[{"product_id":"20000000-0000-4000-a000-000000000001","quantity":2}]',
  'efectivo', 'Doña Rosa', '', '', 'key-counter-00002'));
select pg_temp.ok(public.admin_counter_sale('[{"product_id":"20000000-0000-4000-a000-000000000001","quantity":2}]',
  'efectivo', 'Doña Rosa', '', '', 'key-counter-00002') = (select v from t_ids where k = 'counter'),
  'T71 venta de mostrador idempotente');
select pg_temp.ok((select status = 'entregado' and total = 20 and amount_paid = 20 from public.orders where id = (select v from t_ids where k = 'counter')),
                  'T72 venta de mostrador registrada y pagada');
select pg_temp.expect_error($q$select public.admin_adjust_stock('30000000-0000-4000-a000-000000000001', -1, 'x')$q$,
  'T73 un ajuste requiere motivo', '%motivo%');
select pg_temp.expect_error($q$select public.admin_adjust_stock('30000000-0000-4000-a000-000000000001', -3, 'Merma por humedad')$q$,
  'T74 un ajuste no puede tocar unidades reservadas', '%No se puede descontar%');
select public.admin_adjust_stock('30000000-0000-4000-a000-000000000001', -1, 'Merma por humedad');
select pg_temp.ok((select count(*) from public.audit_log where action = 'ajuste_inventario') >= 1, 'T75 el ajuste queda en auditoría');
reset role;

select pg_temp.ok((select count(*) from public.inventory_movements where stock_item_id = '30000000-0000-4000-a000-000000000001') = 5,
                  'T76 trazabilidad: entrada, 2 reservas, consumo y ajuste del material');

select pg_temp.login('00000000-0000-4000-a000-000000000003');
set local role authenticated;
select pg_temp.ok((select count(*) from public.audit_log) = 0, 'T77 el cliente no puede leer la auditoría');
select pg_temp.expect_error($q$insert into public.audit_log (action, entity) values ('x', 'y')$q$,
  'T78 nadie escribe la auditoría desde la API', '%permission denied%');
select pg_temp.ok((select count(*) from public.order_status_history where order_id = (select v from t_ids where k = 'quoteOrder')) >= 7,
                  'T79 historial de estados del pedido completo');
reset role;

-- QR vencido y mantenimiento de reservas
select pg_temp.login('00000000-0000-4000-a000-000000000004');
set local role authenticated;
insert into t_ids select 'qrB', (public.create_payment_attempt((select v from t_ids where k = 'orderB'), 'qr', 40, 'key-pay-b-qr-0001')).id;
reset role;
update public.payments set expires_at = now() - interval '1 minute' where id = (select v from t_ids where k = 'qrB');
select pg_temp.login('00000000-0000-4000-a000-000000000004');
set local role authenticated;
select pg_temp.ok((select status from public.get_payment_status((select v from t_ids where k = 'qrB'))) = 'expirado',
                  'T80 un QR vencido se marca como expirado');
reset role;
update public.orders set reservation_expires_at = now() - interval '1 hour' where id = (select v from t_ids where k = 'orderB');
update public.payments set created_at = now() - interval '2 hours' where order_id = (select v from t_ids where k = 'orderB');
select pg_temp.ok((public.run_maintenance()->>'pedidos_cancelados')::int >= 1, 'T81 mantenimiento cancela reservas vencidas sin pago');
select pg_temp.ok((select reserved from public.stock_items where id = '30000000-0000-4000-a000-000000000001') = 0,
                  'T82 la reserva de material vuelve a estar disponible');

select pg_temp.login('00000000-0000-4000-a000-000000000001');
set local role authenticated;
select pg_temp.ok((public.admin_dashboard(public.business_today() - 1, public.business_today())->>'ingresos_cobrados')::numeric = 200,
                  'T83 panel: ingresos cobrados = 90 + 40 + 50 + 20');
select pg_temp.expect_error($q$update public.app_settings set value = value || '{"min_advance_percent": 150}'::jsonb where key = 'payments'$q$,
  'T84 configuración: anticipo fuera de rango rechazado en el servidor', '%entre 0 y 100%');
select pg_temp.expect_error($q$update public.app_settings set value = value || '{"mode": "live"}'::jsonb where key = 'payments'$q$,
  'T85 configuración: el QR de prueba no puede usarse en producción', '%no puede usarse en modo producción%');
select pg_temp.expect_error($q$update public.app_settings set value = value || '{"max_km": -3}'::jsonb where key = 'delivery'$q$,
  'T86 configuración: cobertura negativa rechazada', '%cobertura%');
reset role;
select pg_temp.login('00000000-0000-4000-a000-000000000003');
set local role authenticated;
update public.app_settings set value = '{}'::jsonb where key = 'payments';
select pg_temp.ok((select value->>'mode' from public.app_settings where key = 'payments') = 'test',
                  'T87 un cliente no puede modificar la configuración (RLS: 0 filas afectadas)');
reset role;

do $$ begin raise notice '======== TODAS LAS PRUEBAS PASARON ========'; end $$;
rollback;
