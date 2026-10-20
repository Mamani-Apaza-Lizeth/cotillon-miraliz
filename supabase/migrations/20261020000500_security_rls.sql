-- =============================================================================
-- Cotillón MiraLiz · Migración 005 · Permisos y Row Level Security
-- -----------------------------------------------------------------------------
-- Propósito : 1) quitar los privilegios amplios que Supabase concede por
--                defecto a anon/authenticated;
--             2) conceder solo lo necesario (incluso por columna);
--             3) activar RLS en TODAS las tablas y definir políticas por rol;
--             4) restringir EXECUTE de funciones.
-- Depende de: 001–004
-- Principio : el navegador nunca escribe directamente precios, existencias,
--             pagos, estados de pedidos ni roles: lo hace mediante funciones
--             RPC que validan identidad y permisos.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Punto de partida: sin privilegios para anon/authenticated
-- ---------------------------------------------------------------------------
revoke all on all tables    in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
revoke execute on all functions in schema public from public, anon, authenticated;

-- Las tablas futuras tampoco reciben privilegios automáticos para anon/authenticated.
alter default privileges in schema public revoke all on tables from anon, authenticated;
alter default privileges in schema public revoke execute on functions from public, anon, authenticated;

grant usage on schema public to anon, authenticated, service_role;
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;

-- ---------------------------------------------------------------------------
-- 2. Privilegios de tabla (RLS filtra después qué filas)
-- ---------------------------------------------------------------------------
-- Catálogo público
grant select on public.categories, public.products, public.product_images,
                public.customization_templates, public.app_settings
  to anon, authenticated;

-- Escritura administrativa del catálogo y de la configuración productiva
grant insert, update, delete on public.categories, public.products, public.product_images,
                                public.customization_templates, public.suppliers,
                                public.recipes, public.recipe_materials, public.recipe_stages,
                                public.production_stages
  to authenticated;
grant update (value, description) on public.app_settings to authenticated;

-- Lectura para usuarios autenticados (RLS decide)
grant select on public.profiles, public.customer_addresses, public.cart_items, public.orders,
                public.order_items, public.order_status_history, public.quotes, public.payments,
                public.suppliers, public.stock_items, public.inventory_movements, public.recipes,
                public.recipe_materials, public.recipe_stages, public.production_stages,
                public.production_tasks, public.task_logs, public.audit_log,
                public.stock_reservations, public.payment_events
  to authenticated;

-- Perfil: el usuario solo puede editar su nombre y teléfono
grant update (full_name, phone) on public.profiles to authenticated;

-- Direcciones y carrito propios
grant insert, update, delete on public.customer_addresses to authenticated;
grant insert, delete on public.cart_items to authenticated;
grant update (quantity, notes) on public.cart_items to authenticated;

-- Inventario: el administrador gestiona datos descriptivos; las cantidades
-- solo cambian mediante admin_receive_stock / admin_adjust_stock / pedidos.
grant insert (kind, name, unit, min_stock, ref_cost, supplier_id, is_active) on public.stock_items to authenticated;
grant update (name, unit, min_stock, ref_cost, supplier_id, is_active) on public.stock_items to authenticated;

-- ---------------------------------------------------------------------------
-- 3. Activar RLS en todas las tablas del esquema public
-- ---------------------------------------------------------------------------
do $$
declare t record;
begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format('alter table public.%I enable row level security', t.tablename);
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- 4. Políticas
-- ---------------------------------------------------------------------------
-- profiles
create policy profiles_select on public.profiles for select to authenticated
  using (id = (select auth.uid()) or public.is_admin());
create policy profiles_update_own on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- app_settings
create policy settings_select on public.app_settings for select to anon, authenticated
  using (is_public or public.is_admin());
create policy settings_update_admin on public.app_settings for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- categories
create policy categories_select on public.categories for select to anon, authenticated
  using (is_active or public.is_staff());
create policy categories_admin_insert on public.categories for insert to authenticated with check (public.is_admin());
create policy categories_admin_update on public.categories for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy categories_admin_delete on public.categories for delete to authenticated using (public.is_admin());

-- products
create policy products_select on public.products for select to anon, authenticated
  using ((is_published and exists (select 1 from public.categories c where c.id = category_id and c.is_active))
         or public.is_staff());
create policy products_admin_insert on public.products for insert to authenticated with check (public.is_admin());
create policy products_admin_update on public.products for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy products_admin_delete on public.products for delete to authenticated using (public.is_admin());

-- product_images (visibles si el producto es visible para quien consulta)
create policy product_images_select on public.product_images for select to anon, authenticated
  using (exists (select 1 from public.products p where p.id = product_id));
create policy product_images_admin_insert on public.product_images for insert to authenticated with check (public.is_admin());
create policy product_images_admin_update on public.product_images for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy product_images_admin_delete on public.product_images for delete to authenticated using (public.is_admin());

-- customization_templates
create policy templates_select on public.customization_templates for select to anon, authenticated
  using ((is_active and exists (select 1 from public.products p where p.id = product_id)) or public.is_staff());
create policy templates_admin_insert on public.customization_templates for insert to authenticated with check (public.is_admin());
create policy templates_admin_update on public.customization_templates for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy templates_admin_delete on public.customization_templates for delete to authenticated using (public.is_admin());

-- suppliers (solo administrador)
create policy suppliers_admin_select on public.suppliers for select to authenticated using (public.is_admin());
create policy suppliers_admin_insert on public.suppliers for insert to authenticated with check (public.is_admin());
create policy suppliers_admin_update on public.suppliers for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy suppliers_admin_delete on public.suppliers for delete to authenticated using (public.is_admin());

-- stock_items / inventory_movements (personal lee; administrador gestiona datos descriptivos)
create policy stock_items_staff_select on public.stock_items for select to authenticated using (public.is_staff());
create policy stock_items_admin_insert on public.stock_items for insert to authenticated
  with check (public.is_admin() and kind = 'material');
create policy stock_items_admin_update on public.stock_items for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy inventory_movements_staff_select on public.inventory_movements for select to authenticated
  using (public.is_staff());

-- Producción: etapas y recetas
create policy stages_staff_select on public.production_stages for select to authenticated using (public.is_staff());
create policy stages_admin_insert on public.production_stages for insert to authenticated with check (public.is_admin());
create policy stages_admin_update on public.production_stages for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy stages_admin_delete on public.production_stages for delete to authenticated using (public.is_admin());

create policy recipes_staff_select on public.recipes for select to authenticated using (public.is_staff());
create policy recipes_admin_insert on public.recipes for insert to authenticated with check (public.is_admin());
create policy recipes_admin_update on public.recipes for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy recipes_admin_delete on public.recipes for delete to authenticated using (public.is_admin());

create policy recipe_materials_staff_select on public.recipe_materials for select to authenticated using (public.is_staff());
create policy recipe_materials_admin_insert on public.recipe_materials for insert to authenticated with check (public.is_admin());
create policy recipe_materials_admin_update on public.recipe_materials for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy recipe_materials_admin_delete on public.recipe_materials for delete to authenticated using (public.is_admin());

create policy recipe_stages_staff_select on public.recipe_stages for select to authenticated using (public.is_staff());
create policy recipe_stages_admin_insert on public.recipe_stages for insert to authenticated with check (public.is_admin());
create policy recipe_stages_admin_update on public.recipe_stages for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy recipe_stages_admin_delete on public.recipe_stages for delete to authenticated using (public.is_admin());

-- Direcciones y carrito: solo del propio usuario
create policy addresses_own on public.customer_addresses for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy addresses_admin_select on public.customer_addresses for select to authenticated using (public.is_admin());

create policy cart_select_own on public.cart_items for select to authenticated using (user_id = (select auth.uid()));
create policy cart_insert_own on public.cart_items for insert to authenticated
  with check (user_id = (select auth.uid())
              and exists (select 1 from public.products p where p.id = product_id and p.is_published));
create policy cart_update_own on public.cart_items for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy cart_delete_own on public.cart_items for delete to authenticated using (user_id = (select auth.uid()));

-- Pedidos y datos asociados: el cliente ve los suyos; el administrador, todos.
-- Los empleados acceden a la información operativa mediante my_tasks().
create policy orders_select on public.orders for select to authenticated
  using (customer_id = (select auth.uid()) or public.is_admin());
create policy order_items_select on public.order_items for select to authenticated
  using (exists (select 1 from public.orders o where o.id = order_id));
create policy order_history_select on public.order_status_history for select to authenticated
  using (exists (select 1 from public.orders o where o.id = order_id));
create policy quotes_select on public.quotes for select to authenticated
  using (exists (select 1 from public.orders o where o.id = order_id));
create policy payments_select on public.payments for select to authenticated
  using (exists (select 1 from public.orders o where o.id = order_id));
create policy reservations_admin_select on public.stock_reservations for select to authenticated using (public.is_admin());
create policy payment_events_admin_select on public.payment_events for select to authenticated using (public.is_admin());

-- Tareas
create policy tasks_select on public.production_tasks for select to authenticated
  using (assigned_to = (select auth.uid()) or public.is_admin());
create policy task_logs_select on public.task_logs for select to authenticated
  using (public.is_admin()
         or exists (select 1 from public.production_tasks t where t.id = task_id and t.assigned_to = (select auth.uid())));

-- Auditoría: solo lectura del administrador. Nadie escribe por la API.
create policy audit_admin_select on public.audit_log for select to authenticated using (public.is_admin());

-- ---------------------------------------------------------------------------
-- 5. EXECUTE de funciones
-- ---------------------------------------------------------------------------
-- Auxiliares usadas por políticas y por la interfaz
grant execute on function public.current_app_role(), public.is_admin(), public.is_staff(),
                          public.business_today(), public.order_transition_allowed(public.order_status, public.order_status)
  to anon, authenticated;

-- Consultas públicas
grant execute on function public.catalog_availability(),
                          public.delivery_quote(double precision, double precision),
                          public.earliest_delivery_date(integer)
  to anon, authenticated;

-- Operaciones de usuario autenticado (cada función valida identidad y propiedad)
grant execute on function
  public.place_order(public.fulfillment_type, text, text, double precision, double precision, date, text, text),
  public.request_quote(uuid, integer, text, date, public.fulfillment_type, text, uuid, text, text, text, text,
                       double precision, double precision, text, text),
  public.customer_respond_quote(uuid, boolean, text),
  public.cancel_order(uuid, text),
  public.create_payment_attempt(uuid, public.payment_method, numeric, text),
  public.get_payment_status(uuid),
  public.cancel_payment_attempt(uuid)
  to authenticated;

-- Operaciones del personal (validan rol internamente)
grant execute on function
  public.my_tasks(), public.task_history(uuid),
  public.employee_update_task(uuid, public.task_status, integer, text),
  public.material_check(uuid, integer)
  to authenticated;

-- Operaciones del administrador (validan rol internamente con _require_admin)
grant execute on function
  public.admin_send_quote(uuid, numeric, integer, date, date, text),
  public.admin_update_order_status(uuid, public.order_status, text),
  public.admin_record_payment(uuid, numeric, public.payment_method, text, text),
  public.admin_record_refund(uuid, numeric, public.payment_method, text, text),
  public.admin_counter_sale(jsonb, public.payment_method, text, text, text, text),
  public.admin_receive_stock(uuid, numeric, numeric, text),
  public.admin_adjust_stock(uuid, numeric, text),
  public.admin_assign_task(uuid, uuid, date),
  public.admin_sandbox_resolve_qr(uuid, boolean),
  public.admin_set_user_role(uuid, public.app_role, boolean),
  public.admin_dashboard(date, date),
  public.run_maintenance()
  to authenticated;

-- Solo backend confiable (Edge Functions con clave secreta)
revoke execute on function public.payment_set_provider_ref(uuid, text) from public, anon, authenticated;
revoke execute on function public.payment_apply_provider_result(text, text, text, text, public.payment_status, numeric, text, text)
  from public, anon, authenticated;
grant execute on function public.payment_set_provider_ref(uuid, text),
                          public.payment_apply_provider_result(text, text, text, text, public.payment_status, numeric, text, text),
                          public.run_maintenance()
  to service_role;

-- bootstrap_first_admin: solo desde el SQL Editor (rol postgres). Sin grants.
revoke execute on function public.bootstrap_first_admin(text) from public, anon, authenticated, service_role;
