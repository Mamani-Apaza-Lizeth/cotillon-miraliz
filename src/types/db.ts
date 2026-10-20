// Tipos de las tablas y funciones de Supabase usados por la aplicación.
// Deben coincidir EXACTAMENTE con supabase/migrations/*.sql.

export type AppRole = 'admin' | 'empleado' | 'cliente';
export type ProductType = 'reventa' | 'personalizado';
export type SaleUnit = 'unidad' | 'paquete' | 'caja' | 'docena' | 'juego' | 'metro';
export type StockKind = 'producto' | 'material';
export type MeasureUnit =
  | 'unidad' | 'paquete' | 'caja' | 'metro' | 'centimetro' | 'kilogramo' | 'gramo'
  | 'litro' | 'mililitro' | 'plancha' | 'barra' | 'rollo' | 'pliego';
export type MovementType =
  | 'entrada' | 'salida_venta' | 'consumo_produccion' | 'ajuste_positivo'
  | 'ajuste_negativo' | 'reserva' | 'liberacion_reserva';
export type OrderStatus =
  | 'cotizacion_pendiente' | 'cotizacion_enviada' | 'cotizacion_rechazada' | 'cotizacion_vencida'
  | 'pendiente_pago' | 'confirmado' | 'en_produccion' | 'listo' | 'en_camino' | 'entregado' | 'cancelado';
export type OrderChannel = 'web' | 'mostrador';
export type FulfillmentType = 'recojo' | 'entrega';
export type QuoteStatus = 'enviada' | 'aceptada' | 'rechazada' | 'vencida' | 'reemplazada';
export type PaymentMethod = 'efectivo' | 'transferencia' | 'tarjeta' | 'qr';
export type PaymentKind = 'cobro' | 'reembolso';
export type PaymentStatus = 'pendiente' | 'aprobado' | 'rechazado' | 'fallido' | 'cancelado' | 'expirado';
export type TaskStatus = 'pendiente' | 'en_progreso' | 'completada' | 'bloqueada';

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  phone: string | null;
  role: AppRole;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  sort_order: number;
  is_active: boolean;
  is_demo: boolean;
}

export interface ProductImage {
  id: string;
  product_id: string;
  storage_path: string;
  alt_text: string;
  sort_order: number;
}

export interface CustomizationTemplate {
  id: string;
  product_id: string;
  name: string;
  description: string;
  image_path: string | null;
  extra_price: number;
  is_active: boolean;
}

export interface Product {
  id: string;
  category_id: string;
  name: string;
  slug: string;
  description: string;
  product_type: ProductType;
  sale_unit: SaleUnit;
  units_per_sale: number;
  price: number | null;
  allows_custom_design: boolean;
  min_order_qty: number;
  is_published: boolean;
  is_featured: boolean;
  is_demo: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProductWithRelations extends Product {
  categories: Pick<Category, 'id' | 'name' | 'slug'> | null;
  product_images: ProductImage[];
  customization_templates?: CustomizationTemplate[];
}

export interface Supplier {
  id: string;
  name: string;
  phone: string | null;
  notes: string;
  is_active: boolean;
  is_demo: boolean;
}

export interface StockItem {
  id: string;
  kind: StockKind;
  product_id: string | null;
  name: string;
  unit: MeasureUnit;
  quantity: number;
  reserved: number;
  min_stock: number;
  ref_cost: number | null;
  supplier_id: string | null;
  is_active: boolean;
  is_demo: boolean;
  updated_at: string;
}

export interface InventoryMovement {
  id: number;
  stock_item_id: string;
  movement_type: MovementType;
  quantity: number;
  quantity_after: number;
  reserved_after: number;
  unit_cost: number | null;
  order_id: string | null;
  reason: string;
  created_by: string | null;
  created_at: string;
}

export interface ProductionStage {
  id: string;
  code: string;
  name: string;
  sort_order: number;
}

export interface Recipe {
  id: string;
  product_id: string;
  version: number;
  yield_qty: number;
  is_active: boolean;
  notes: string;
  created_at: string;
}

export interface RecipeMaterial {
  recipe_id: string;
  stock_item_id: string;
  quantity: number;
}

export interface RecipeStage {
  recipe_id: string;
  stage_id: string;
  minutes_per_unit: number;
}

export interface CustomerAddress {
  id: string;
  user_id: string;
  label: string;
  address_text: string;
  reference: string;
  lat: number;
  lng: number;
}

export interface CartItem {
  id: string;
  user_id: string;
  product_id: string;
  template_id: string | null;
  quantity: number;
  notes: string;
}

export interface Order {
  id: string;
  code: string;
  customer_id: string | null;
  customer_name: string;
  customer_phone: string;
  channel: OrderChannel;
  status: OrderStatus;
  fulfillment: FulfillmentType;
  address_text: string | null;
  address_reference: string | null;
  delivery_lat: number | null;
  delivery_lng: number | null;
  delivery_distance_km: number | null;
  delivery_fee: number;
  subtotal: number;
  total: number;
  amount_paid: number;
  balance: number;
  required_advance: number;
  production_minutes: number;
  requested_date: string | null;
  promised_date: string | null;
  notes: string;
  cancel_reason: string | null;
  reservation_expires_at: string | null;
  created_at: string;
  updated_at: string;
  confirmed_at: string | null;
  delivered_at: string | null;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  template_id: string | null;
  product_name: string;
  template_name: string | null;
  sale_unit: SaleUnit;
  quantity: number;
  unit_price: number | null;
  line_total: number | null;
  requires_production: boolean;
  production_minutes: number;
  custom_description: string | null;
  custom_theme: string | null;
  custom_colors: string | null;
  reference_image_path: string | null;
}

export interface OrderStatusHistory {
  id: number;
  order_id: string;
  from_status: OrderStatus | null;
  to_status: OrderStatus;
  changed_by: string | null;
  note: string;
  created_at: string;
}

export interface Quote {
  id: string;
  order_id: string;
  version: number;
  unit_price: number;
  items_total: number;
  production_minutes: number;
  proposed_date: string;
  valid_until: string;
  conditions: string;
  status: QuoteStatus;
  created_at: string;
  decided_at: string | null;
  decision_note: string | null;
}

export interface Payment {
  id: string;
  order_id: string;
  kind: PaymentKind;
  method: PaymentMethod;
  provider: 'manual' | 'stripe' | 'sandbox_qr';
  environment: 'test' | 'live';
  amount: number;
  currency: string;
  status: PaymentStatus;
  provider_ref: string | null;
  qr_payload: string | null;
  expires_at: string | null;
  receipt_number: string | null;
  note: string;
  error_message: string | null;
  confirmed_at: string | null;
  created_at: string;
}

export interface ProductionTask {
  id: string;
  order_id: string;
  order_item_id: string;
  stage_id: string | null;
  title: string;
  assigned_to: string | null;
  est_minutes: number;
  spent_minutes: number;
  status: TaskStatus;
  scheduled_date: string | null;
  sort_order: number;
  started_at: string | null;
  completed_at: string | null;
}

export interface MyTask {
  id: string;
  title: string;
  status: TaskStatus;
  est_minutes: number;
  spent_minutes: number;
  scheduled_date: string | null;
  stage_name: string | null;
  order_id: string;
  order_code: string;
  order_status: OrderStatus;
  promised_date: string | null;
  fulfillment: FulfillmentType;
  product_name: string;
  template_name: string | null;
  quantity: number;
  custom_description: string | null;
  custom_theme: string | null;
  custom_colors: string | null;
  reference_image_path: string | null;
}

export interface TaskLogEntry {
  created_at: string;
  minutes_spent: number;
  new_status: TaskStatus | null;
  note: string;
  employee_name: string | null;
}

export interface AuditEntry {
  id: number;
  actor_id: string | null;
  actor_role: string | null;
  action: string;
  entity: string;
  entity_id: string | null;
  details: Record<string, unknown>;
  created_at: string;
}

export interface DeliveryQuote {
  distance_km: number;
  fee: number;
  within_coverage: boolean;
  enabled: boolean;
}

export interface MaterialCheckRow {
  stock_item_id: string;
  name: string;
  unit: MeasureUnit;
  needed: number;
  available: number;
  sufficient: boolean;
}

export interface PaymentStatusRow {
  id: string;
  status: PaymentStatus;
  amount: number;
  method: PaymentMethod;
  expires_at: string | null;
  receipt_number: string | null;
  error_message: string | null;
  environment: 'test' | 'live';
}

// --- Configuración (app_settings) ---------------------------------------------
export interface BusinessSettings {
  name: string;
  city: string;
  phones: string[];
  address_note: string;
  timezone: string;
}

export interface DeliverySettings {
  enabled: boolean;
  origin_lat: number;
  origin_lng: number;
  origin_is_placeholder?: boolean;
  base_fee: number;
  per_km_fee: number;
  min_fee?: number;
  max_km: number;
}

export interface PaymentSettings {
  mode: 'test' | 'live';
  currency: string;
  min_advance_percent: number;
  reservation_hours: number;
  qr_ttl_minutes: number;
  qr_provider: 'sandbox_qr' | 'none' | string;
  card_enabled: boolean;
  bank_transfer_note?: string;
}

export interface CancellationSettings {
  customer_statuses: OrderStatus[];
  policy_text: string;
}

export interface ProductionCapacitySettings {
  minutes_by_weekday: Record<string, number>;
  start_offset_days: number;
  buffer_days: number;
  resale_lead_days: number;
  is_estimate?: boolean;
}

export interface PublicSettings {
  business: BusinessSettings;
  delivery: DeliverySettings;
  payments: PaymentSettings;
  cancellation: CancellationSettings;
}

export interface AppSettingRow {
  key: string;
  value: unknown;
  is_public: boolean;
  description: string;
  updated_at: string;
}

export interface DashboardData {
  ventas_registradas: number;
  pedidos_en_periodo: number;
  ingresos_cobrados: number;
  ingresos_por_metodo: Partial<Record<PaymentMethod, number>>;
  saldos_por_cobrar: number;
  pedidos_por_estado: Partial<Record<OrderStatus, number>>;
  cotizaciones_pendientes: number;
  pagos_pendientes: number;
  stock_bajo: Array<{ id: string; name: string; kind: StockKind; quantity: number; reserved: number; min_stock: number; unit: MeasureUnit }>;
  consumo_materiales: Array<{ name: string; unit: MeasureUnit; total: number }>;
  ventas_por_dia: Array<{ dia: string; total: number }>;
  carga_trabajo_minutos: number;
  tareas_pendientes: number;
  tareas_sin_asignar: number;
  tareas_atrasadas: number;
  fecha_factible_hoy: string;
}
