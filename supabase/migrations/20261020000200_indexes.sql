-- =============================================================================
-- Cotillón MiraLiz · Migración 002 · Índices y restricciones adicionales
-- -----------------------------------------------------------------------------
-- Propósito : índices para consultas frecuentes (catálogo, pedidos por cliente,
--             tareas por empleado, auditoría) y unicidades parciales.
-- Depende de: 20261020000100_schema.sql
-- =============================================================================

-- Catálogo
create index products_category_idx      on public.products (category_id);
create index products_published_idx     on public.products (is_published, is_featured);
create index products_name_search_idx   on public.products using gin (to_tsvector('spanish', name || ' ' || description));
create index product_images_product_idx on public.product_images (product_id, sort_order);
create index templates_product_idx      on public.customization_templates (product_id);

-- Inventario
create index stock_items_kind_idx            on public.stock_items (kind, is_active);
create index inventory_movements_item_idx    on public.inventory_movements (stock_item_id, created_at desc);
create index inventory_movements_order_idx   on public.inventory_movements (order_id);
create index inventory_movements_created_idx on public.inventory_movements (created_at desc);

-- Recetas: solo una versión activa por producto
create unique index recipes_one_active_per_product on public.recipes (product_id) where is_active;
create index recipe_materials_item_idx on public.recipe_materials (stock_item_id);

-- Carrito: una sola línea por producto + plantilla
create unique index cart_items_unique_line on public.cart_items
  (user_id, product_id, coalesce(template_id, '00000000-0000-0000-0000-000000000000'::uuid));
create index customer_addresses_user_idx on public.customer_addresses (user_id);

-- Pedidos
create index orders_customer_idx      on public.orders (customer_id, created_at desc);
create index orders_status_idx        on public.orders (status, created_at desc);
create index orders_created_idx       on public.orders (created_at desc);
create index orders_reservation_idx   on public.orders (reservation_expires_at) where status = 'pendiente_pago';
-- Idempotencia de ventas de mostrador (customer_id es NULL en ese canal)
create unique index orders_counter_idempotency on public.orders (created_by, idempotency_key)
  where channel = 'mostrador' and idempotency_key is not null;
create index order_items_order_idx   on public.order_items (order_id);
create index order_items_product_idx  on public.order_items (product_id);
create index stock_reservations_order_idx on public.stock_reservations (order_id, state);
create index stock_reservations_item_idx  on public.stock_reservations (stock_item_id) where state = 'activa';
create index order_status_history_order_idx on public.order_status_history (order_id, created_at);

-- Cotizaciones: a lo sumo una cotización vigente (enviada) por pedido
create unique index quotes_one_open_per_order on public.quotes (order_id) where status = 'enviada';

-- Pagos
create index payments_order_idx   on public.payments (order_id, created_at);
create index payments_status_idx  on public.payments (status, created_at desc);
create unique index payments_provider_ref_unique on public.payments (provider, provider_ref) where provider_ref is not null;

-- Producción
create index production_tasks_order_idx    on public.production_tasks (order_id);
create index production_tasks_assignee_idx on public.production_tasks (assigned_to, status, scheduled_date);
create index production_tasks_open_idx     on public.production_tasks (status) where status <> 'completada';
create index task_logs_task_idx            on public.task_logs (task_id, created_at);

-- Auditoría
create index audit_log_created_idx on public.audit_log (created_at desc);
create index audit_log_entity_idx  on public.audit_log (entity, entity_id);
