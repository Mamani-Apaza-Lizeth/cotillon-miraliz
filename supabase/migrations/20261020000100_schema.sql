-- =============================================================================
-- Cotillón MiraLiz · Migración 001 · Esquema base
-- -----------------------------------------------------------------------------
-- Propósito : crea tipos enumerados, secuencias, tablas, relaciones,
--             restricciones CHECK/UNIQUE e índices.
-- Depende de: nada (primera migración). Requiere el esquema `auth` de Supabase.
-- Ejecución : Supabase CLI (`supabase db push`) o SQL Editor, en orden numérico.
-- No es destructiva: no elimina tablas ni datos.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Tipos enumerados
-- ---------------------------------------------------------------------------
create type public.app_role as enum ('admin', 'empleado', 'cliente');

create type public.product_type as enum ('reventa', 'personalizado');

create type public.sale_unit as enum ('unidad', 'paquete', 'caja', 'docena', 'juego', 'metro');

create type public.stock_kind as enum ('producto', 'material');

create type public.measure_unit as enum (
  'unidad', 'paquete', 'caja', 'metro', 'centimetro', 'kilogramo', 'gramo',
  'litro', 'mililitro', 'plancha', 'barra', 'rollo', 'pliego'
);

create type public.movement_type as enum (
  'entrada',             -- compra / recepción de mercadería
  'salida_venta',        -- descuento definitivo de un producto vendido
  'consumo_produccion',  -- descuento definitivo de material al iniciar producción
  'ajuste_positivo',     -- corrección manual autorizada (+)
  'ajuste_negativo',     -- corrección manual autorizada (-)
  'reserva',             -- unidades apartadas para un pedido
  'liberacion_reserva'   -- unidades devueltas a disponibles (cancelación/vencimiento)
);

create type public.reservation_state as enum ('activa', 'consumida', 'liberada');

create type public.order_status as enum (
  'cotizacion_pendiente',
  'cotizacion_enviada',
  'cotizacion_rechazada',
  'cotizacion_vencida',
  'pendiente_pago',
  'confirmado',
  'en_produccion',
  'listo',
  'en_camino',
  'entregado',
  'cancelado'
);

create type public.order_channel as enum ('web', 'mostrador');

create type public.fulfillment_type as enum ('recojo', 'entrega');

create type public.quote_status as enum ('enviada', 'aceptada', 'rechazada', 'vencida', 'reemplazada');

create type public.payment_method as enum ('efectivo', 'transferencia', 'tarjeta', 'qr');

create type public.payment_kind as enum ('cobro', 'reembolso');

create type public.payment_status as enum (
  'pendiente', 'aprobado', 'rechazado', 'fallido', 'cancelado', 'expirado'
);

create type public.task_status as enum ('pendiente', 'en_progreso', 'completada', 'bloqueada');

-- ---------------------------------------------------------------------------
-- 2. Perfiles y configuración
-- ---------------------------------------------------------------------------
create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text not null,
  full_name   text not null default '' check (char_length(full_name) <= 120),
  phone       text check (phone is null or phone ~ '^[0-9+ ()-]{6,20}$'),
  role        public.app_role not null default 'cliente',
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
comment on table public.profiles is 'Datos públicos del usuario y su rol. La fuente de verdad del rol es esta tabla, nunca el navegador.';

create table public.app_settings (
  key          text primary key check (key ~ '^[a-z_]+$'),
  value        jsonb not null,
  is_public    boolean not null default false,
  description  text not null default '',
  updated_at   timestamptz not null default now(),
  updated_by   uuid references public.profiles (id) on delete set null
);
comment on table public.app_settings is 'Parámetros operativos configurables por el administrador (entregas, capacidad, pagos, cancelaciones).';

-- ---------------------------------------------------------------------------
-- 3. Catálogo
-- ---------------------------------------------------------------------------
create table public.categories (
  id           uuid primary key default gen_random_uuid(),
  name         text not null check (char_length(name) between 2 and 60),
  slug         text not null unique check (slug ~ '^[a-z0-9-]+$'),
  description  text not null default '',
  sort_order   integer not null default 0,
  is_active    boolean not null default true,
  is_demo      boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table public.products (
  id                uuid primary key default gen_random_uuid(),
  category_id       uuid not null references public.categories (id) on delete restrict,
  name              text not null check (char_length(name) between 2 and 120),
  slug              text not null unique check (slug ~ '^[a-z0-9-]+$'),
  description       text not null default '',
  product_type      public.product_type not null,
  sale_unit         public.sale_unit not null default 'unidad',
  units_per_sale    integer not null default 1 check (units_per_sale > 0),
  price             numeric(12,2) check (price is null or price >= 0),
  allows_custom_design boolean not null default false,
  min_order_qty     integer not null default 1 check (min_order_qty > 0),
  is_published      boolean not null default false,
  is_featured       boolean not null default false,
  is_demo           boolean not null default false,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  -- Un producto publicado debe tener precio (los diseños propios se cotizan aparte).
  constraint products_published_has_price check (not is_published or price is not null),
  -- Solo los productos personalizados aceptan diseño propio del cliente.
  constraint products_custom_design_type check (not allows_custom_design or product_type = 'personalizado')
);
comment on column public.products.price is 'Precio de venta vigente por unidad de venta. Los pedidos guardan su propia copia histórica.';

create table public.product_images (
  id            uuid primary key default gen_random_uuid(),
  product_id    uuid not null references public.products (id) on delete cascade,
  storage_path  text not null check (storage_path !~ '\.\.'),
  alt_text      text not null default '',
  sort_order    integer not null default 0,
  created_at    timestamptz not null default now()
);

create table public.customization_templates (
  id            uuid primary key default gen_random_uuid(),
  product_id    uuid not null references public.products (id) on delete cascade,
  name          text not null check (char_length(name) between 2 and 80),
  description   text not null default '',
  image_path    text,
  extra_price   numeric(12,2) not null default 0 check (extra_price >= 0),
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 4. Proveedores e inventario
-- ---------------------------------------------------------------------------
create table public.suppliers (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(name) between 2 and 120),
  phone       text,
  notes       text not null default '',
  is_active   boolean not null default true,
  is_demo     boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table public.stock_items (
  id           uuid primary key default gen_random_uuid(),
  kind         public.stock_kind not null,
  product_id   uuid unique references public.products (id) on delete restrict,
  name         text not null check (char_length(name) between 2 and 120),
  unit         public.measure_unit not null default 'unidad',
  quantity     numeric(14,3) not null default 0,
  reserved     numeric(14,3) not null default 0,
  min_stock    numeric(14,3) not null default 0 check (min_stock >= 0),
  ref_cost     numeric(12,2) check (ref_cost is null or ref_cost >= 0),
  supplier_id  uuid references public.suppliers (id) on delete set null,
  is_active    boolean not null default true,
  is_demo      boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint stock_quantity_non_negative check (quantity >= 0),
  constraint stock_reserved_non_negative check (reserved >= 0),
  -- Garantía final contra sobreventa: nunca se reserva más de lo que existe.
  constraint stock_reserved_le_quantity check (reserved <= quantity),
  constraint stock_kind_product check ((kind = 'producto') = (product_id is not null))
);
comment on column public.stock_items.reserved is 'Unidades apartadas para pedidos aún no entregados / producción no iniciada. Disponible = quantity - reserved.';

create table public.inventory_movements (
  id              bigint generated always as identity primary key,
  stock_item_id   uuid not null references public.stock_items (id) on delete restrict,
  movement_type   public.movement_type not null,
  quantity        numeric(14,3) not null check (quantity > 0),
  quantity_after  numeric(14,3) not null,
  reserved_after  numeric(14,3) not null,
  unit_cost       numeric(12,2) check (unit_cost is null or unit_cost >= 0),
  order_id        uuid,
  reason          text not null default '',
  created_by      uuid references public.profiles (id) on delete set null,
  created_at      timestamptz not null default now()
);
comment on table public.inventory_movements is 'Bitácora inmutable de toda variación de existencias o reservas.';

-- ---------------------------------------------------------------------------
-- 5. Recetas (lista de materiales) y etapas de producción
-- ---------------------------------------------------------------------------
create table public.production_stages (
  id          uuid primary key default gen_random_uuid(),
  code        text not null unique check (code ~ '^[a-z_]+$'),
  name        text not null,
  sort_order  integer not null default 0
);

create table public.recipes (
  id          uuid primary key default gen_random_uuid(),
  product_id  uuid not null references public.products (id) on delete cascade,
  version     integer not null default 1 check (version > 0),
  yield_qty   integer not null default 1 check (yield_qty > 0),
  is_active   boolean not null default false,
  notes       text not null default '',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (product_id, version)
);
comment on column public.recipes.yield_qty is 'Cantidad de unidades de venta que se obtienen con las cantidades de materiales indicadas.';

create table public.recipe_materials (
  recipe_id      uuid not null references public.recipes (id) on delete cascade,
  stock_item_id  uuid not null references public.stock_items (id) on delete restrict,
  quantity       numeric(14,3) not null check (quantity > 0),
  primary key (recipe_id, stock_item_id)
);

create table public.recipe_stages (
  recipe_id         uuid not null references public.recipes (id) on delete cascade,
  stage_id          uuid not null references public.production_stages (id) on delete restrict,
  minutes_per_unit  integer not null check (minutes_per_unit > 0),
  primary key (recipe_id, stage_id)
);

-- ---------------------------------------------------------------------------
-- 6. Clientes: carrito y direcciones
-- ---------------------------------------------------------------------------
create table public.customer_addresses (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles (id) on delete cascade,
  label         text not null default 'Mi dirección' check (char_length(label) <= 40),
  address_text  text not null check (char_length(address_text) between 3 and 300),
  reference     text not null default '' check (char_length(reference) <= 300),
  lat           double precision not null check (lat between -90 and 90),
  lng           double precision not null check (lng between -180 and 180),
  created_at    timestamptz not null default now()
);

create table public.cart_items (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles (id) on delete cascade,
  product_id    uuid not null references public.products (id) on delete cascade,
  template_id   uuid references public.customization_templates (id) on delete cascade,
  quantity      integer not null check (quantity between 1 and 1000),
  notes         text not null default '' check (char_length(notes) <= 500),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 7. Pedidos, ítems, reservas, historial y cotizaciones
-- ---------------------------------------------------------------------------
create sequence public.order_code_seq start 1001;

create table public.orders (
  id                     uuid primary key default gen_random_uuid(),
  code                   text not null unique default ('MZ-' || lpad(nextval('public.order_code_seq')::text, 6, '0')),
  customer_id            uuid references public.profiles (id) on delete restrict,
  customer_name          text not null default '',
  customer_phone         text not null default '',
  channel                public.order_channel not null default 'web',
  status                 public.order_status not null,
  fulfillment            public.fulfillment_type not null default 'recojo',
  address_text           text,
  address_reference      text,
  delivery_lat           double precision check (delivery_lat is null or delivery_lat between -90 and 90),
  delivery_lng           double precision check (delivery_lng is null or delivery_lng between -180 and 180),
  delivery_distance_km   numeric(8,2) check (delivery_distance_km is null or delivery_distance_km >= 0),
  delivery_fee           numeric(12,2) not null default 0 check (delivery_fee >= 0),
  subtotal               numeric(12,2) not null default 0 check (subtotal >= 0),
  total                  numeric(12,2) not null default 0 check (total >= 0),
  amount_paid            numeric(12,2) not null default 0 check (amount_paid >= 0),
  balance                numeric(12,2) generated always as (total - amount_paid) stored,
  required_advance       numeric(12,2) not null default 0 check (required_advance >= 0),
  production_minutes     integer not null default 0 check (production_minutes >= 0),
  requested_date         date,
  promised_date          date,
  notes                  text not null default '' check (char_length(notes) <= 1000),
  cancel_reason          text,
  reservation_expires_at timestamptz,
  idempotency_key        text,
  created_by             uuid references public.profiles (id) on delete set null,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  confirmed_at           timestamptz,
  delivered_at           timestamptz,
  constraint orders_web_has_customer check (channel = 'mostrador' or customer_id is not null),
  constraint orders_delivery_has_location check (
    fulfillment = 'recojo'
    or (delivery_lat is not null and delivery_lng is not null and address_text is not null)
  ),
  constraint orders_not_overpaid check (amount_paid <= total or status = 'cancelado'),
  unique (customer_id, idempotency_key)
);
comment on column public.orders.balance is 'Saldo pendiente calculado: total - pagado (aprobados menos reembolsos).';

create table public.order_items (
  id                    uuid primary key default gen_random_uuid(),
  order_id              uuid not null references public.orders (id) on delete cascade,
  product_id            uuid not null references public.products (id) on delete restrict,
  template_id           uuid references public.customization_templates (id) on delete set null,
  product_name          text not null,
  template_name         text,
  sale_unit             public.sale_unit not null,
  quantity              integer not null check (quantity > 0),
  unit_price            numeric(12,2) check (unit_price is null or unit_price >= 0),
  line_total            numeric(12,2) generated always as (unit_price * quantity) stored,
  requires_production   boolean not null default false,
  production_minutes    integer not null default 0 check (production_minutes >= 0),
  custom_description    text check (custom_description is null or char_length(custom_description) <= 2000),
  custom_theme          text check (custom_theme is null or char_length(custom_theme) <= 120),
  custom_colors         text check (custom_colors is null or char_length(custom_colors) <= 120),
  reference_image_path  text check (reference_image_path is null or reference_image_path !~ '\.\.'),
  created_at            timestamptz not null default now()
);
comment on column public.order_items.unit_price is 'Precio histórico aplicado. NULL solo mientras la cotización está pendiente.';

create table public.stock_reservations (
  id             uuid primary key default gen_random_uuid(),
  order_id       uuid not null references public.orders (id) on delete cascade,
  stock_item_id  uuid not null references public.stock_items (id) on delete restrict,
  quantity       numeric(14,3) not null check (quantity > 0),
  state          public.reservation_state not null default 'activa',
  created_at     timestamptz not null default now(),
  closed_at      timestamptz
);

create table public.order_status_history (
  id           bigint generated always as identity primary key,
  order_id     uuid not null references public.orders (id) on delete cascade,
  from_status  public.order_status,
  to_status    public.order_status not null,
  changed_by   uuid references public.profiles (id) on delete set null,
  note         text not null default '',
  created_at   timestamptz not null default now()
);

create table public.quotes (
  id                  uuid primary key default gen_random_uuid(),
  order_id            uuid not null references public.orders (id) on delete cascade,
  version             integer not null check (version > 0),
  unit_price          numeric(12,2) not null check (unit_price > 0),
  items_total         numeric(12,2) not null check (items_total > 0),
  production_minutes  integer not null check (production_minutes >= 0),
  proposed_date       date not null,
  valid_until         date not null,
  conditions          text not null default '' check (char_length(conditions) <= 1000),
  status              public.quote_status not null default 'enviada',
  created_by          uuid references public.profiles (id) on delete set null,
  created_at          timestamptz not null default now(),
  decided_at          timestamptz,
  decision_note       text,
  unique (order_id, version),
  constraint quotes_validity check (valid_until <= proposed_date + 365)
);

-- ---------------------------------------------------------------------------
-- 8. Pagos
-- ---------------------------------------------------------------------------
create table public.payments (
  id               uuid primary key default gen_random_uuid(),
  order_id         uuid not null references public.orders (id) on delete restrict,
  kind             public.payment_kind not null default 'cobro',
  method           public.payment_method not null,
  provider         text not null check (provider in ('manual', 'stripe', 'sandbox_qr')),
  environment      text not null check (environment in ('test', 'live')),
  amount           numeric(12,2) not null check (amount > 0),
  currency         text not null default 'BOB' check (currency ~ '^[A-Z]{3}$'),
  status           public.payment_status not null default 'pendiente',
  provider_ref     text,
  qr_payload       text,
  expires_at       timestamptz,
  idempotency_key  text not null,
  receipt_number   text unique,
  note             text not null default '' check (char_length(note) <= 500),
  error_message    text,
  related_payment_id uuid references public.payments (id) on delete restrict,
  created_by       uuid references public.profiles (id) on delete set null,
  confirmed_by     uuid references public.profiles (id) on delete set null,
  confirmed_at     timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (order_id, idempotency_key),
  constraint payments_refund_manual check (kind = 'cobro' or provider = 'manual')
);
comment on table public.payments is 'Intentos y resultados de pago. Nunca se guardan números de tarjeta ni CVV.';

create table public.payment_events (
  id            bigint generated always as identity primary key,
  provider      text not null,
  event_id      text not null,
  event_type    text not null,
  payment_id    uuid references public.payments (id) on delete set null,
  received_at   timestamptz not null default now(),
  summary       jsonb not null default '{}'::jsonb,
  unique (provider, event_id)
);
comment on table public.payment_events is 'Eventos de proveedores (webhooks) ya procesados. Garantiza idempotencia frente a reenvíos.';

-- ---------------------------------------------------------------------------
-- 9. Producción: tareas y bitácora de avance
-- ---------------------------------------------------------------------------
create table public.production_tasks (
  id              uuid primary key default gen_random_uuid(),
  order_id        uuid not null references public.orders (id) on delete cascade,
  order_item_id   uuid not null references public.order_items (id) on delete cascade,
  stage_id        uuid references public.production_stages (id) on delete restrict,
  title           text not null,
  assigned_to     uuid references public.profiles (id) on delete set null,
  est_minutes     integer not null check (est_minutes >= 0),
  spent_minutes   integer not null default 0 check (spent_minutes >= 0),
  status          public.task_status not null default 'pendiente',
  scheduled_date  date,
  sort_order      integer not null default 0,
  started_at      timestamptz,
  completed_at    timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create table public.task_logs (
  id            bigint generated always as identity primary key,
  task_id       uuid not null references public.production_tasks (id) on delete cascade,
  employee_id   uuid references public.profiles (id) on delete set null,
  minutes_spent integer not null default 0 check (minutes_spent between 0 and 960),
  new_status    public.task_status,
  note          text not null default '' check (char_length(note) <= 1000),
  created_at    timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 10. Auditoría
-- ---------------------------------------------------------------------------
create table public.audit_log (
  id          bigint generated always as identity primary key,
  actor_id    uuid,
  actor_role  text,
  action      text not null,
  entity      text not null,
  entity_id   text,
  details     jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);
comment on table public.audit_log is 'Registro de auditoría. Solo lectura para administradores; nadie puede modificarlo desde la API.';
