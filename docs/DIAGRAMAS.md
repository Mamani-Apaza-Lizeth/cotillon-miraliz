# Diagramas del sistema Cotillón MiraLiz

Todos los diagramas están en **Mermaid** (texto reproducible). GitHub los dibuja automáticamente; también pueden verse en <https://mermaid.live> o en VS Code con la extensión "Markdown Preview Mermaid Support".

## 1. Arquitectura general

```mermaid
flowchart LR
  subgraph Navegador["Navegador (PC / celular)"]
    SPA["App React + Vite<br/>Tailwind · React Router<br/>clave PÚBLICA de Supabase"]
    StripeJS["Stripe Elements<br/>(datos de tarjeta)"]
    Leaflet["Leaflet + teselas OSM"]
  end

  subgraph Supabase["Supabase (nube)"]
    Auth["Supabase Auth<br/>registro · sesión · recuperación"]
    API["API REST/RPC (PostgREST)"]
    subgraph PG["PostgreSQL"]
      RLS["Políticas RLS"]
      RPC["Funciones RPC<br/>SECURITY DEFINER"]
      TRG["Triggers<br/>inventario · estados · auditoría"]
      TBL[("Tablas")]
    end
    Storage["Storage<br/>product-images (público)<br/>customizations (privado)"]
    EF["Edge Functions (Deno)<br/>create-card-payment<br/>stripe-webhook"]
  end

  Stripe["Stripe (modo prueba)"]
  Nominatim["Nominatim (OSM)<br/>búsqueda de direcciones"]

  SPA -- "JWT de usuario" --> Auth
  SPA -- "select / rpc + JWT" --> API --> RLS --> TBL
  API --> RPC --> TBL
  TBL --> TRG
  SPA -- "subir / leer imágenes" --> Storage
  SPA -- "functions.invoke" --> EF
  EF -- "clave secreta Stripe" --> Stripe
  StripeJS -- "confirmCardPayment" --> Stripe
  Stripe -- "webhook firmado" --> EF
  EF -- "service_role" --> RPC
  Leaflet --> Nominatim
```

## 2. Estructura lógica de módulos (frontend)

```mermaid
flowchart TB
  main["main.tsx"] --> providers["context/*<br/>Auth · Settings · Cart · Toast"]
  main --> App["App.tsx (rutas)"]
  App --> layouts["components/layout/*"]
  App --> pages_public["pages/public/*"]
  App --> pages_customer["pages/customer/*"]
  App --> pages_employee["pages/employee/*"]
  App --> pages_admin["pages/admin/*"]
  pages_public & pages_customer & pages_employee & pages_admin --> components["components/ui · catalog · orders · map · payments"]
  pages_public & pages_customer & pages_employee & pages_admin --> services["services/*"]
  components --> services
  services --> lib_supabase["lib/supabase.ts (cliente único)"]
  services & components --> lib["lib/format · rules · validation · errors · geo · storage"]
  lib_supabase --> env["lib/env.ts (valida VITE_*)"]
```

## 3. Modelo de datos (relaciones principales)

```mermaid
erDiagram
  AUTH_USERS ||--|| PROFILES : "crea (trigger)"
  PROFILES ||--o{ CUSTOMER_ADDRESSES : tiene
  PROFILES ||--o{ CART_ITEMS : tiene
  PROFILES ||--o{ ORDERS : "realiza (cliente)"
  PROFILES ||--o{ PRODUCTION_TASKS : "asignado a"
  CATEGORIES ||--o{ PRODUCTS : agrupa
  PRODUCTS ||--o{ PRODUCT_IMAGES : tiene
  PRODUCTS ||--o{ CUSTOMIZATION_TEMPLATES : ofrece
  PRODUCTS ||--o| STOCK_ITEMS : "existencias (reventa)"
  SUPPLIERS ||--o{ STOCK_ITEMS : provee
  STOCK_ITEMS ||--o{ INVENTORY_MOVEMENTS : registra
  PRODUCTS ||--o{ RECIPES : "versiones"
  RECIPES ||--o{ RECIPE_MATERIALS : usa
  STOCK_ITEMS ||--o{ RECIPE_MATERIALS : "es material de"
  RECIPES ||--o{ RECIPE_STAGES : "pasa por"
  PRODUCTION_STAGES ||--o{ RECIPE_STAGES : define
  ORDERS ||--o{ ORDER_ITEMS : contiene
  PRODUCTS ||--o{ ORDER_ITEMS : "se vende en"
  ORDERS ||--o{ STOCK_RESERVATIONS : reserva
  STOCK_ITEMS ||--o{ STOCK_RESERVATIONS : "reservado en"
  ORDERS ||--o{ ORDER_STATUS_HISTORY : historial
  ORDERS ||--o{ QUOTES : cotizaciones
  ORDERS ||--o{ PAYMENTS : pagos
  PAYMENTS ||--o{ PAYMENT_EVENTS : "eventos proveedor"
  ORDERS ||--o{ PRODUCTION_TASKS : genera
  ORDER_ITEMS ||--o{ PRODUCTION_TASKS : "se fabrica en"
  PRODUCTION_STAGES ||--o{ PRODUCTION_TASKS : etapa
  PRODUCTION_TASKS ||--o{ TASK_LOGS : avances

  PROFILES {
    uuid id PK "= auth.users.id"
    text email
    text full_name
    app_role role
    boolean is_active
  }
  PRODUCTS {
    uuid id PK
    product_type product_type
    sale_unit sale_unit
    numeric price
    boolean is_published
  }
  STOCK_ITEMS {
    uuid id PK
    stock_kind kind
    numeric quantity
    numeric reserved
    numeric min_stock
  }
  ORDERS {
    uuid id PK
    text code UK
    order_status status
    numeric total
    numeric amount_paid
    numeric balance "generada"
    date promised_date
  }
  ORDER_ITEMS {
    uuid id PK
    numeric unit_price "precio histórico"
    int quantity
    text reference_image_path
  }
  PAYMENTS {
    uuid id PK
    payment_kind kind
    payment_method method
    text provider
    payment_status status
    text idempotency_key
  }
  QUOTES {
    uuid id PK
    int version
    numeric unit_price
    date proposed_date
    date valid_until
    quote_status status
  }
  PRODUCTION_TASKS {
    uuid id PK
    int est_minutes
    int spent_minutes
    task_status status
    date scheduled_date
  }
```

Tablas de soporte no dibujadas: `app_settings` (parámetros), `audit_log` (auditoría).

## 4. Autenticación y autorización

```mermaid
sequenceDiagram
  actor U as Usuario
  participant App as App React
  participant Auth as Supabase Auth
  participant DB as PostgreSQL
  U->>App: Registro (nombre, correo, contraseña)
  App->>Auth: signUp(metadata: nombre, teléfono)
  Auth->>DB: INSERT auth.users
  DB->>DB: trigger _handle_new_user → profiles(role='cliente')<br/>(se IGNORA cualquier "role" enviado)
  Auth-->>U: correo de confirmación
  U->>App: Inicio de sesión
  App->>Auth: signInWithPassword
  Auth-->>App: JWT (sub = id del usuario)
  App->>DB: select profiles (RLS: id = auth.uid())
  DB-->>App: rol desde la tabla (fuente confiable)
  App->>App: muestra menús según rol (solo comodidad)
  App->>DB: cualquier consulta / RPC con JWT
  DB->>DB: RLS + is_admin()/is_staff() leen profiles
  Note over DB: El navegador nunca decide permisos
```

## 5. Flujo de compra (catálogo → pedido)

```mermaid
sequenceDiagram
  actor C as Cliente
  participant App
  participant DB as PostgreSQL (place_order)
  C->>App: Agrega productos al carrito (cart_items)
  C->>App: Confirma: recojo/entrega, fecha, notas
  App->>DB: rpc place_order(..., idempotency_key)
  DB->>DB: ¿clave ya usada? → devuelve el mismo pedido
  DB->>DB: recalcula precios desde products/templates
  DB->>DB: minutos de producción (recetas) → earliest_delivery_date
  alt fecha solicitada no viable
    DB-->>App: error + fecha sugerida (hint/detail)
  end
  DB->>DB: delivery_quote (Haversine) y cobertura
  DB->>DB: INSERT orders(pendiente_pago) + order_items (precio histórico)
  DB->>DB: _reserve_needs: bloquea filas FOR UPDATE, verifica, reserva
  alt existencias insuficientes
    DB-->>App: error → ROLLBACK total
  end
  DB->>DB: vacía el carrito
  DB-->>App: id del pedido
  App-->>C: Detalle del pedido + panel de pago
```

## 6. Cotización con diseño propio

```mermaid
stateDiagram-v2
  [*] --> cotizacion_pendiente: request_quote (imagen en Storage privado)
  cotizacion_pendiente --> cotizacion_enviada: admin_send_quote (precio, minutos, fecha viable, vigencia)
  cotizacion_enviada --> cotizacion_enviada: admin reemplaza (nueva versión)
  cotizacion_enviada --> pendiente_pago: cliente acepta (reserva materiales)
  cotizacion_enviada --> cotizacion_rechazada: cliente rechaza
  cotizacion_enviada --> cotizacion_vencida: vence o cambian capacidad/materiales
  cotizacion_vencida --> cotizacion_enviada: nueva cotización
  cotizacion_pendiente --> cancelado
  cotizacion_enviada --> cancelado
  cotizacion_vencida --> cancelado
  pendiente_pago --> confirmado: pago ≥ anticipo
  pendiente_pago --> cancelado: cancelación o reserva vencida
  confirmado --> en_produccion: primera tarea iniciada (consume materiales)
  confirmado --> listo
  en_produccion --> listo: todas las tareas completadas
  listo --> en_camino: solo entrega a domicilio
  listo --> entregado: saldo = 0 (descuenta productos)
  en_camino --> entregado
  en_camino --> listo
  confirmado --> cancelado
  en_produccion --> cancelado
  listo --> cancelado
  entregado --> [*]
  cancelado --> [*]
  cotizacion_rechazada --> [*]
```

Las transiciones las impone el trigger `orders_before_status` con `order_transition_allowed`, sin importar desde dónde se intente el cambio.

## 7. Inventario y producción

```mermaid
flowchart LR
  E["Ingreso de mercadería<br/>admin_receive_stock"] -->|entrada| Q[(quantity)]
  A["Ajuste con motivo<br/>admin_adjust_stock"] -->|ajuste ±| Q
  P["place_order / aceptar cotización"] -->|reserva| R[(reserved)]
  X["Cancelación / vencimiento"] -->|liberacion_reserva| R
  T["Pedido pasa a en_produccion"] -->|consumo_produccion<br/>quantity−, reserved−| Q
  D["Pedido entregado"] -->|salida_venta<br/>quantity−, reserved−| Q
  M["Venta de mostrador"] -->|salida_venta directa| Q
  Q & R --> Disp["Disponible = quantity − reserved<br/>CHECK reserved ≤ quantity"]
  subgraph Trazabilidad
    MOV[(inventory_movements)]
    RES[(stock_reservations<br/>activa → consumida/liberada)]
  end
  E & A & P & X & T & D & M --> MOV
  P & X & T & D --> RES
```

Capacidad: `earliest_delivery_date(minutos)` suma la carga abierta (tareas no completadas + pedidos en espera de pago) y recorre los días acumulando `minutes_by_weekday` hasta cubrirla.

## 8. Pago y confirmación

```mermaid
sequenceDiagram
  actor C as Cliente
  participant App
  participant DB as PostgreSQL
  participant EF as Edge Function
  participant ST as Stripe
  participant A as Administrador
  rect rgb(255,245,230)
  note over C,DB: Pago QR (proveedor de PRUEBA)
  C->>App: Pagar con QR
  App->>DB: rpc create_payment_attempt(qr, monto, clave)
  DB-->>App: intento pendiente + qr_payload + expires_at
  loop cada 10 s (el contador NO aprueba)
    App->>DB: rpc get_payment_status
  end
  A->>DB: rpc admin_sandbox_resolve_qr (solo modo test)
  DB->>DB: payments=aprobado → trigger recalcula saldo → confirma pedido
  App-->>C: "Pago concretado con éxito" (solo si BD = aprobado)
  end
  rect rgb(235,245,255)
  note over C,ST: Tarjeta (Stripe modo prueba)
  C->>App: Datos de tarjeta en Stripe Elements
  App->>EF: create-card-payment(orderId, monto, clave)
  EF->>DB: create_payment_attempt COMO EL USUARIO (valida)
  EF->>ST: PaymentIntent(monto de la BD, idempotencyKey)
  EF->>DB: payment_set_provider_ref (service_role)
  EF-->>App: client_secret
  App->>ST: confirmCardPayment
  ST-->>EF: webhook firmado (succeeded / payment_failed)
  EF->>EF: verifica firma
  EF->>DB: payment_apply_provider_result (idempotente por event.id, compara monto)
  App->>DB: consulta estado hasta aprobado/rechazado
  end
```
