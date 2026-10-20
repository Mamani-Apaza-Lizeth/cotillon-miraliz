# Matriz de trazabilidad

Relaciona cada requisito con su implementación y su verificación. Pruebas: **T##** = `supabase/tests/database_tests.sql`; **C01** = concurrencia (`scripts/test-db.sh`); **U** = Vitest (`src/**/*.test.*`); **D** = Deno (`supabase/functions/tests`); **E2E-##** = captura `docs/evidencias/capturas/e2e_##_*.png`; **M** = prueba manual en [`PRUEBAS.md`](PRUEBAS.md). Manual = [`MANUAL_TECNICO.md`](MANUAL_TECNICO.md).

| # | Requisito (origen) | Página / componente | Servicio / módulo | Objeto en Supabase | Prueba | Manual |
|---|---|---|---|---|---|---|
| R01 | Catálogo público persistente (PROMPT §7, PDF obj. 4) | `HomePage`, `CatalogPage`, `ProductPage`, `ProductCard` | `services/catalog` | `products`, `categories`, `product_images`, `catalog_availability()`, políticas `products_select` | T07, T10, U (ProductCard), E2E | 10.1 |
| R02 | Búsqueda, filtros y orden | `CatalogPage` | `catalog.listProducts`, `sanitizeSearch` | índice `products_name_search_idx` | U (sanitizeSearch), M-01 | 10.1 |
| R03 | Unidades de venta (unidad, paquete, caja…) | `ProductPage`, `AdminProductEditPage` | `catalogAdmin` | `products.sale_unit`, `units_per_sale` | M-02 | 1.5 |
| R04 | Registro, inicio, cierre y recuperación de sesión | `AuthPages` | `services/account`, `AuthContext` | Supabase Auth, `_handle_new_user` | T01, U (validaciones), M-03 | 8.1 |
| R05 | Rol nunca elegido por el usuario; primer admin seguro | `AdminUsersPage` | `admin.setUserRole` | `bootstrap_first_admin`, `admin_set_user_role`, `_guard_profile_privileged_columns`, grants por columna | T01, T02, T12, T54 | 6.6, 8 |
| R06 | Cliente solo ve/modifica lo suyo | todas las de cliente | — | RLS `orders_select`, `addresses_own`, `cart_*`, `payments_select` | T17, T23–T27, T38 | 8.2 |
| R07 | Empleado: tareas propias, sin datos financieros | `EmployeeTasksPage` | `production.listMyTasks/updateMyTask` | `my_tasks`, `employee_update_task`, `tasks_select` | T55–T63, E2E-09 | 10.3 |
| R08 | Carrito persistente; precios recalculados en servidor | `CartPage`, `CheckoutPage` | `services/cart`, `orders.placeOrder` | `cart_items`, `place_order` | T19–T21, U (lineProblem, cartSubtotal), E2E-01 | 10.1 |
| R09 | Precio histórico en el pedido | `OrderDetailPage` | — | `order_items.unit_price`, `line_total` | T19, M-04 | 7.2 |
| R10 | Validar disponibilidad y evitar sobreventa concurrente | `ProductPage`, `CartPage` | — | `_reserve_needs` (FOR UPDATE), CHECK `stock_reserved_le_quantity` | T05, T26, T70, **C01** | 1.5 |
| R11 | Reservar, liberar y descontar sin duplicar | — | — | `stock_reservations`, `_close_reservations`, `_orders_after_status` | T22, T30, T61, T68, T69, T82 | 1.5, 10 |
| R12 | Inventario de productos y materias primas con movimientos | `AdminInventoryPage` | `services/inventory` | `stock_items`, `inventory_movements`, `_stock_apply` | T04, T76, E2E-11 | 10.4 |
| R13 | Ajustes con responsable y motivo; alertas de stock bajo | `AdminInventoryPage`, `AdminDashboardPage` | `inventory.adjustStock` | `admin_adjust_stock`, `admin_dashboard.stock_bajo`, auditoría | T73–T75, E2E-10 | 10.4 |
| R14 | Recetas con materiales, etapas, versiones y costo estimado | `AdminRecipesPage` | `services/production` | `recipes`, `recipe_materials`, `recipe_stages`, `recipes_one_active_per_product` | T03, U (recipeEstimatedCost), M-05 | 13.1 |
| R15 | Verificar materiales antes de aceptar producción (PDF obj. 2) | `AdminOrderDetailPage`, `AdminRecipesPage` | `inventory.materialCheck` | `material_check`, `_material_needs`, `customer_respond_quote` | T30, T39–T40, M-06 | 10.2 |
| R16 | Capacidad semanal y fecha factible (PDF obj. 3) | `CheckoutPage`, `AdminSettingsPage` | `orders.getEarliestDate` | `earliest_delivery_date`, `current_production_load`, `production_capacity` | T28, T29, T36 | 10.1, 3.5 |
| R17 | Etapas configurables por producto (corte, costura, armado, decoración, serigrafía) | `AdminRecipesPage` | — | `production_stages`, `recipe_stages` | T49 | 10.3 |
| R18 | Tareas, asignación, avance, historial, atrasos | `AdminProductionPage`, `EmployeeTasksPage` | `production.*` | `production_tasks`, `task_logs`, `admin_assign_task`, `task_history` | T57–T63, E2E-08, E2E-09 | 10.3 |
| R19 | Cotización con imagen propia → "Cotización pendiente" sin pago | `QuoteRequestPage`, `OrderDetailPage` | `orders.requestQuote`, `storage.uploadCustomization` | `request_quote`, bucket `customizations` | T31–T34 | 10.2 |
| R20 | Admin propone precio, tiempo, fecha viable, vigencia | `AdminOrderDetailPage` | `adminOrders.sendQuote` | `admin_send_quote`, `quotes` | T36, T37 | 10.2 |
| R21 | Cliente acepta/rechaza; vencimiento y cambio de condiciones | `OrderDetailPage` | `orders.respondQuote` | `customer_respond_quote`, `run_maintenance` | T38–T40, M-07 | 10.2 |
| R22 | Imágenes privadas y validadas | `QuoteRequestPage`, `AdminProductEditPage` | `lib/storage`, `validateImageFile` | políticas de `storage.objects`, `can_read_customization`, límites del bucket | T31, T35, T37, T58, U (validateImageFile) | 6.7 |
| R23 | Estados de pedido coherentes y transiciones validadas | `OrderTimeline`, `AdminOrderDetailPage` | `lib/orderStatus` | `order_transition_allowed`, `_orders_before_status`, `order_status_history` | T64, T67, T79, U (canTransition) | DIAGRAMAS §6 |
| R24 | Cancelación según etapa y política configurable | `OrderDetailPage`, `AdminOrderDetailPage` | `orders.cancelOrder` | `cancel_order`, `cancellation` | T27, T68 | 10.7 |
| R25 | Fechas: no pasadas, viables, alternativas, zona horaria | `CheckoutPage` | `lib/format.todayInLaPaz`, `toAppError` | `business_today`, hint `fecha_no_viable` | T28, U (todayInLaPaz, hint) | 10.1 |
| R26 | Recojo o entrega con mapa, búsqueda, marcador, cobertura | `FulfillmentPicker`, `DeliveryMap` | `lib/geo` | `delivery_quote`, `delivery` | T11, T18, U (haversine), E2E-02 | 9.1 |
| R27 | Tarifa configurable recalculada al confirmar | `FulfillmentPicker`, `AdminSettingsPage` | `orders.getDeliveryQuote` | `_validated_delivery`, `place_order`, `customer_respond_quote` | T19, T86 | 9.1 |
| R28 | Anticipos, pagos parciales, saldos, comprobantes | `PaymentPanel`, `PaymentsTable`, `OrderTotals` | `services/payments` | `payments`, `_recalc_order_payments`, `orders.balance` | T40–T53, U (OrderTotals), E2E-07 | 9, 10 |
| R29 | Entorno de pruebas separado (modo test/live) | `PaymentPanel` (aviso), `AdminSettingsPage` | — | `payments.environment`, `payments.mode`, `_validate_setting` | T46, T85 | 9.2–9.3 |
| R30 | Tarjeta: aprobado, rechazado, fondos insuficientes, inválida, pendiente, error | `CardPayment` | `payments.createCardIntent`, `cardErrorMessage` | Edge `create-card-payment`, `stripe-webhook` | D (7 webhook), U (cardErrorMessage), M-08 | 9.2 |
| R31 | No confirmar pagos desde el navegador ni falsificarlos | `QrPayment`, `CardPayment` | — | `payment_apply_provider_result` solo service_role; firma de webhook | T15, T41, T45, D (firma inválida) | 9 |
| R32 | Idempotencia (doble clic, reintentos, webhook duplicado) | `CheckoutPage`, `QrPayment`, `AdminCounterSalePage` | `lib/idempotency` | claves únicas + `pg_advisory_xact_lock`, `payment_events` | T20, T43, T51, T71, U | 3.5 |
| R33 | QR: estados, expiración; contador no aprueba | `QrPayment` | `qrPhaseFromStatus` | `get_payment_status`, `admin_sandbox_resolve_qr` | T44, T47, T80, U, E2E-04, E2E-07 | 9.3 |
| R34 | Monto manipulado no aceptado | — | — | `create_payment_attempt` (rango), webhook compara monto | T42, T50, T65 | 9.2 |
| R35 | Venta presencial con precio, responsable, pago | `AdminCounterSalePage` | `adminOrders.counterSale` | `admin_counter_sale` | T70–T72 | 10.6 |
| R36 | Reembolsos | `AdminOrderDetailPage` | `adminOrders.recordRefund` | `admin_record_refund` | M-09 | 10.7 |
| R37 | Panel con indicadores reales; ventas ≠ ingresos | `AdminDashboardPage` | `admin.getDashboard` | `admin_dashboard` | T83, E2E-10 | 10 |
| R38 | Auditoría inmutable para el usuario | `AdminAuditPage` | `admin.listAudit` | `audit_log`, `_audit_trigger`, `_audit` | T75, T77, T78 | 3.5 |
| R39 | Configuración segura de parámetros | `AdminSettingsPage` | `admin.updateSetting` | `app_settings`, `_validate_setting`, RLS | T84–T87 | 13.1 |
| R40 | Secretos fuera del frontend | `main.tsx` (pantalla de error) | `lib/env` | secretos de Edge Functions | U (readPublicEnv) | 5.4, 6.2 |
| R41 | Interfaz responsive, accesible, con estados de carga/error/vacío y sin conexión | `components/ui/*`, layouts | `useOnline` | — | U (InputField, ErrorState), capturas móviles | 3 |
| R42 | Proveedores | `AdminSuppliersPage` | `inventory.*Supplier` | `suppliers` | M-10 | 13.1 |
| R43 | Datos demo identificables y removibles | — | — | `is_demo`, `seed_demo.sql`, `cleanup_demo.sql` | M-11 | 6.3, 15.3 |
