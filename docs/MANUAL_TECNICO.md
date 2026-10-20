# Manual técnico · Sistema Cotillón MiraLiz

Versión 1.0 · Octubre de 2026 · Proyecto Integrador, Ingeniería de Sistemas, Universidad Salesiana de Bolivia.

Este manual permite instalar el sistema desde una carpeta vacía, configurar Supabase sin experiencia previa, entender cómo está construido, probarlo, mantenerlo y prepararlo para su publicación.

**Contenido**

1. [Presentación del sistema](#capítulo-1-presentación-del-sistema)
2. [Requisitos previos](#capítulo-2-requisitos-previos)
3. [Arquitectura](#capítulo-3-arquitectura)
4. [Estructura del proyecto](#capítulo-4-estructura-del-proyecto)
5. [Instalación local en Windows](#capítulo-5-instalación-local-en-windows)
6. [Configuración de Supabase desde cero](#capítulo-6-configuración-de-supabase-desde-cero)
7. [Scripts SQL](#capítulo-7-scripts-sql)
8. [Autenticación y permisos](#capítulo-8-autenticación-y-permisos)
9. [Integraciones externas](#capítulo-9-integraciones-externas)
10. [Flujos de negocio](#capítulo-10-flujos-de-negocio)
11. [Pruebas](#capítulo-11-pruebas)
12. [Errores frecuentes](#capítulo-12-errores-frecuentes)
13. [Mantenimiento y ampliación](#capítulo-13-mantenimiento-y-ampliación)
14. [Copias de seguridad y recuperación](#capítulo-14-copias-de-seguridad-y-recuperación)
15. [Preparación para despliegue](#capítulo-15-preparación-para-despliegue)
16. [Glosario](#capítulo-16-glosario)

---

## Capítulo 1. Presentación del sistema

### 1.1 Propósito

Ordenar el control de inventarios, la producción y las ventas de Cotillón MiraLiz, un negocio que vende artículos de cotillón por caja o paquete y elabora a pedido mochilas, piñatas 2D y globos con serigrafía.

### 1.2 Problema que resuelve

Según el documento del proyecto (capítulo 2), todo se maneja a mano y de memoria: el stock se estima a ojo, se aceptan pedidos sin saber si hay material, no se controlan las horas de trabajo ni la capacidad semanal y los anticipos y acuerdos con los clientes no quedan registrados. El análisis completo está en [`ANALISIS_DEL_PDF.md`](ANALISIS_DEL_PDF.md).

### 1.3 Alcance funcional

| Módulo | Qué hace |
|---|---|
| Catálogo y tienda | Productos publicados con fotos, categorías, búsqueda, filtros, orden, disponibilidad en tiempo real. |
| Carrito y pedidos | Carrito persistente, compra con recojo o entrega, fecha factible, precios recalculados en el servidor, historial y seguimiento. |
| Personalización y cotización | Plantillas con recargo; diseño propio con imagen → cotización formal con precio, fecha viable y vigencia; aceptación o rechazo del cliente. |
| Entregas | Mapa de La Paz, búsqueda de direcciones, marcador ajustable, cobertura y tarifa configurable calculada en la base de datos. |
| Pagos | Anticipo mínimo configurable, pagos parciales, saldos, comprobantes, reembolsos; QR de prueba; tarjeta con Stripe (modo prueba); efectivo/transferencia en tienda. |
| Inventario | Productos terminados y materias primas, stock mínimo, alertas, ingresos, ajustes con motivo, reservas, consumos y bitácora completa. |
| Recetas y producción | Lista de materiales versionada, etapas con minutos por unidad, costo estimado, tareas automáticas por pedido, asignación a empleados, avance y atrasos. |
| Administración | Indicadores, venta de mostrador, usuarios y roles, configuración operativa, auditoría. |

### 1.4 Usuarios y roles

| Rol | Quién | Resumen |
|---|---|---|
| **Administrador** | Propietario o encargado | Gestiona todo el negocio. Solo existe por asignación (nunca por registro). |
| **Empleado** | Trabajadores de corte, costura, armado, decoración y serigrafía | Ve y actualiza **sus** tareas; ve los diseños de referencia de esas tareas. |
| **Cliente** | Público registrado | Compra, cotiza, paga y consulta **solo sus** pedidos y datos. |
| Visitante | Público sin cuenta | Navega el catálogo. |

### 1.5 Supuestos y decisiones

- Precios de productos, tarifas de entrega (Bs 10 + Bs 3/km, máximo 12 km), anticipo (50 %), reserva sin pago (48 h), capacidad del taller (480 min L–V, 240 min sábado) y política de cancelación son **propuestas** del equipo: el PDF no los define. Están en la tabla `app_settings`, se editan en *Administración → Configuración* y la interfaz los marca como provisionales.
- Las coordenadas del local son provisionales (centro de La Paz) hasta que el propietario registre las reales.
- La distancia de entrega es **en línea recta** (fórmula de Haversine); la distancia real por calles suele ser mayor. Por eso la tarifa incluye un monto base y es configurable.
- El stock de un producto de reventa se cuenta en su **unidad de venta** (cajas, paquetes, unidades).
- Los productos personalizados se elaboran a pedido: no tienen stock de producto terminado; reservan **materiales** según su receta.
- Los materiales reservados se descuentan cuando la producción **inicia**; los productos de reventa, cuando el pedido se **entrega**. Cada reserva se cierra una sola vez (`stock_reservations`), lo que impide descontar dos veces.

---

## Capítulo 2. Requisitos previos

| Herramienta | Versión | Para qué | Cómo comprobar |
|---|---|---|---|
| Windows 10/11 (o macOS/Linux) | — | Sistema operativo | — |
| **Node.js** | 22 LTS (mínimo 20.19) | Ejecutar y compilar la app | `node -v` |
| npm | 10+ (incluido con Node) | Instalar dependencias | `npm -v` |
| **Git** | 2.40+ | Control de versiones / GitHub | `git --version` |
| Visual Studio Code | reciente | Editor (recomendado) | — |
| Navegador | Chrome, Edge o Firefox actuales | Usar la app | — |
| **Cuenta de Supabase** | Plan gratuito suficiente para pruebas | Base de datos, Auth, Storage, funciones | <https://supabase.com/dashboard> |
| Supabase CLI (opcional) | vía `npx supabase` | Migraciones y Edge Functions | `npx supabase --version` |
| Cuenta de Stripe (opcional) | modo prueba | Pago con tarjeta de prueba | <https://dashboard.stripe.com/test> |
| PostgreSQL local (opcional) | 15+ | `npm run test:db` | `psql --version` |
| Deno (opcional) | 2.x | `npm run test:functions` | `deno --version` |

**Si falta Node.js:** descárguelo de <https://nodejs.org> (versión LTS), instálelo con las opciones por defecto, **cierre y vuelva a abrir** PowerShell y compruebe con `node -v`.
**Si falta Git:** <https://git-scm.com/download/win>; acepte las opciones por defecto (incluye *Git Bash*, útil para `npm run test:db`).

---

## Capítulo 3. Arquitectura

### 3.1 Diagrama general

Ver [`DIAGRAMAS.md` §1](DIAGRAMAS.md#1-arquitectura-general). Resumen:

```
Navegador ──(JWT del usuario)──► Supabase Auth
   │                              │
   ├── select / rpc ────────────► API REST (PostgREST) ─► RLS ─► PostgreSQL (tablas, funciones, triggers)
   ├── imágenes ────────────────► Storage (público / privado)
   ├── create-card-payment ─────► Edge Function ─► Stripe        Stripe ─► stripe-webhook ─► PostgreSQL
   └── mapa ────────────────────► Teselas OSM + Nominatim
```

### 3.2 Tecnologías y justificación

| Tecnología | Por qué |
|---|---|
| **Supabase** | Exigido por el enunciado. Reúne Auth, PostgreSQL, Storage y funciones; plan gratuito para el proyecto académico. |
| **PostgreSQL + RLS + funciones RPC** | Las reglas críticas (precios, stock, pagos, roles) se ejecutan en la base de datos de forma **transaccional**, sin depender del navegador. Un backend propio adicional no aportaba seguridad extra y sí complejidad. |
| **Edge Functions (Deno)** | Únicas piezas que necesitan **secretos** (clave de Stripe) o recibir webhooks. |
| **React + TypeScript + Vite** | Interfaz rápida y tipada; Vite compila en segundos; TypeScript detecta errores de tipos antes de ejecutar. |
| **Tailwind CSS 4** | Estilos consistentes y responsive sin hojas CSS extensas. |
| **React Router 7** | Rutas públicas, de cliente, empleado y administrador; carga diferida de las pantallas pesadas. |
| **zod** | Validación declarativa de formularios. |
| **Leaflet + OpenStreetMap** | Mapas sin clave ni costo para el volumen del negocio; Nominatim para búsquedas (respetando su política). |
| **Stripe (modo prueba)** | Tarjetas de prueba **oficiales** para aprobar, rechazar, fondos insuficientes, etc. |
| **qrcode.react** | Dibuja el QR del intento de pago. |
| **lucide-react** | Íconos livianos. |
| **Vitest + Testing Library, Deno test, SQL de prueba, Playwright** | Pruebas en cada capa. |

No se añadieron librerías de estado global, UI pesadas ni ORM: no aportaban valor proporcional.

### 3.3 Organización de módulos y flujo de datos

- `src/pages/*`: pantallas por tipo de usuario.
- `src/components/*`: piezas reutilizables (UI, catálogo, pedidos, mapa, pagos, layouts).
- `src/services/*`: **única** capa que habla con Supabase (tablas y RPC). Las páginas no llaman a Supabase directamente.
- `src/lib/*`: utilidades puras (formatos, reglas, validaciones, errores, geografía, almacenamiento, entorno).
- `src/context/*`: estado global mínimo (sesión/rol, configuración pública, contador del carrito, avisos).
- `supabase/migrations/*`: el backend completo (esquema, reglas, seguridad).
- `supabase/functions/*`: código con secretos (pagos).

### 3.4 Responsabilidades

| Capa | Responsable de | No es responsable de |
|---|---|---|
| Navegador | Mostrar, validar formularios (primera barrera), elegir monto/método, mapa | Precios, totales, stock, estados de pago, permisos |
| PostgreSQL | Integridad, reglas de negocio, transacciones, permisos (RLS), auditoría | Secretos de terceros |
| Edge Functions | Hablar con Stripe con la clave secreta, verificar webhooks | Decidir montos (los toma de la BD) |
| Stripe / proveedor QR | Procesar el dinero | — |

### 3.5 Estrategia de seguridad (resumen)

1. Rol leído de `profiles` (nunca del navegador); al registrarse siempre es *cliente*.
2. RLS activo en **todas** las tablas; privilegios por columna (p. ej. el cliente solo puede editar nombre y teléfono).
3. Escrituras sensibles solo por funciones `SECURITY DEFINER` con `search_path` vacío que validan identidad, propiedad y rol.
4. Precios, tarifas, fechas y montos se **recalculan** en el servidor.
5. Idempotencia (claves únicas + bloqueo consultivo) contra doble clic, reintentos y webhooks repetidos.
6. Pagos confirmados solo por el proveedor (webhook firmado) o, en pruebas, por el administrador; nunca por un contador o un clic del cliente.
7. Storage: diseños en carpetas privadas por usuario; límites de tipo y tamaño.
8. Auditoría de solo lectura; secretos fuera del repositorio.

---

## Capítulo 4. Estructura del proyecto

```
cotillon-miraliz/
├── README.md · .env.example · .gitignore · package.json · package-lock.json
├── index.html · vite.config.ts · tsconfig*.json · eslint.config.js
├── .vscode/extensions.json
├── public/favicon.svg
├── src/
│   ├── main.tsx · App.tsx · index.css · vite-env.d.ts
│   ├── types/db.ts
│   ├── lib/        env · supabase · errors · format · fulfillment · geo · idempotency · orderStatus · rules · storage · validation (+ lib.test.ts)
│   ├── hooks/      useAsync
│   ├── context/    AuthContext · CartContext · SettingsContext · ToastContext
│   ├── services/   account · admin · adminOrders · cart · catalog · catalogAdmin · inventory · orders · payments · production
│   ├── components/ ui/ · layout/ · catalog/ · orders/ · map/ · payments/ (+ components.test.tsx)
│   ├── pages/      public/ · customer/ · employee/ · admin/
│   └── test/setup.ts
├── supabase/
│   ├── config.toml
│   ├── migrations/ 001 schema … 008 settings_validation
│   ├── seed/       seed_demo.sql · cleanup_demo.sql
│   ├── tests/      database_tests.sql · local/ (emulación y concurrencia)
│   └── functions/  _shared/common.ts · create-card-payment/ · stripe-webhook/ · tests/ · .env.example
├── scripts/        test-db.sh · e2e-local/
└── docs/           este manual · análisis · diagramas · inventario · matriz · pruebas · informe · evidencias/
```

La documentación **archivo por archivo** (responsabilidad, motivo, dependencias, exportaciones, quién lo usa, servicios de Supabase, variables de entorno, relación con el negocio, seguridad, verificación y ampliación) está en [`INVENTARIO_DE_ARCHIVOS.md`](INVENTARIO_DE_ARCHIVOS.md).

---

## Capítulo 5. Instalación local en Windows

Todos los comandos se ejecutan en **PowerShell** dentro de la carpeta del proyecto, salvo que se indique otra cosa.

### 5.1 Obtener el proyecto

- **Desde el ZIP:** clic derecho en `cotillon-miraliz.zip` → *Extraer todo…* → elija por ejemplo `C:\Proyectos\`.
- **Desde GitHub:** `git clone https://github.com/<usuario>/cotillon-miraliz.git C:\Proyectos\cotillon-miraliz`

### 5.2 Abrir en Visual Studio Code

```powershell
cd C:\Proyectos\cotillon-miraliz
code .
```
En VS Code: *Terminal → Nuevo terminal* abre PowerShell en la carpeta. Acepte instalar las extensiones recomendadas.

### 5.3 Instalar dependencias

```powershell
npm install
```
Resultado esperado: `added NNN packages` sin errores. Crea la carpeta `node_modules/` (no se sube a GitHub).

### 5.4 Configurar variables de entorno

```powershell
Copy-Item .env.example .env
notepad .env
```
Complete (vea el capítulo 6 para obtener los valores):
```
VITE_SUPABASE_URL=https://abcdefghijklmnop.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxxxxxxxxxxx
VITE_STRIPE_PUBLISHABLE_KEY=            (opcional, pk_test_...)
VITE_SITE_URL=http://localhost:5173
```
Guarde y cierre. **Nunca** coloque claves `sb_secret_`, `service_role`, `sk_` o `whsec_` en este archivo: la app se niega a iniciar si las detecta.

### 5.5 Ejecutar

```powershell
npm run dev
```
Resultado: `Local: http://localhost:5173/`. Abra esa dirección en el navegador.

- **Detener:** en la terminal, `Ctrl + C` (y `S` si pregunta).
- **Reiniciar:** `npm run dev` otra vez. Reinicie siempre que cambie `.env`.

### 5.6 Versión de producción local

```powershell
npm run build
npm run preview
```
`build` verifica tipos y genera `dist/`; `preview` la sirve en <http://localhost:4173>.

### 5.7 Errores frecuentes de instalación

| Síntoma | Solución |
|---|---|
| `npm` no se reconoce | Reinstale Node.js y abra una nueva terminal. |
| `running scripts is disabled on this system` | Ejecute una vez: `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` |
| `EACCES`/`EPERM` al instalar | Cierre VS Code/antivirus que bloquee `node_modules`, borre la carpeta y repita `npm install`. |
| Puerto 5173 ocupado | Vite usa el siguiente libre (5174…). Para liberar: `netstat -ano | findstr :5173` y `taskkill /PID <número> /F`. |
| Pantalla "Falta configurar la conexión con Supabase" | `.env` ausente o con valores de ejemplo; corrija y reinicie `npm run dev`. |

---

## Capítulo 6. Configuración de Supabase desde cero

### 6.1 Crear la cuenta y el proyecto

1. Entre a <https://supabase.com> → **Start your project** → regístrese (GitHub o correo).
2. **New project**: elija la organización, escriba el nombre `cotillon-miraliz`, defina una **Database Password** fuerte y guárdela en un lugar seguro (no en el repositorio).
3. **Region:** elija la más cercana a Bolivia disponible en su cuenta, normalmente *South America (São Paulo)*, para menor latencia. La disponibilidad de regiones puede variar.
4. **Create new project** y espere a que termine de aprovisionarse (1–2 minutos).

### 6.2 URL del proyecto y claves

En el panel del proyecto: **Project Settings → API Keys** (o el botón **Connect**).

| Dato | Dónde se usa | ¿Puede ir al navegador? |
|---|---|---|
| **Project URL** (`https://<ref>.supabase.co`) | `VITE_SUPABASE_URL` | Sí |
| **Publishable key** (`sb_publishable_…`) — o, en proyectos antiguos, **anon** (JWT legacy) | `VITE_SUPABASE_PUBLISHABLE_KEY` | Sí. Solo otorga lo que permitan RLS y los `grant`. |
| **Secret key** (`sb_secret_…`) — o **service_role** legacy | Solo Edge Functions (Supabase la inyecta sola) | **Nunca.** Salta RLS. |
| Database Password | CLI / respaldos | **Nunca.** |

Supabase indica que las claves legacy siguen funcionando, pero planea retirarlas; la app acepta ambas.

### 6.3 Ejecutar el SQL (opción A: SQL Editor, recomendada para empezar)

1. Panel → **SQL Editor** → **New query**.
2. Abra en VS Code `supabase/migrations/20261020000100_schema.sql`, copie todo, péguelo y pulse **Run**. Debe responder *Success. No rows returned*.
3. Repita, **en este orden**, con: `…0200_indexes.sql`, `…0300_core_functions_triggers.sql`, `…0400_business_rpc.sql`, `…0500_security_rls.sql`, `…0600_storage.sql`, `…0700_default_settings.sql`, `…0800_settings_validation.sql`.
4. (Opcional, solo para pruebas/presentación) ejecute `supabase/seed/seed_demo.sql`.

> Si una migración falla, **no continúe**: lea el mensaje (capítulo 12), corríjalo y vuelva a ejecutar ese archivo. Los archivos 001–002 no son re-ejecutables sobre una base que ya los tiene (crean tipos y tablas); el resto usa `create or replace` / `on conflict` en lo posible.

### 6.4 Ejecutar el SQL (opción B: Supabase CLI)

```powershell
npx supabase login
npx supabase link --project-ref <ref-de-su-proyecto>
npx supabase db push
```
`db push` aplica, en orden, los archivos de `supabase/migrations/` que aún no estén aplicados y registra cuáles ya se aplicaron. **No mezcle** ambas opciones en el mismo proyecto: si ya ejecutó los archivos a mano en el SQL Editor, la CLI no lo sabe e intentará ejecutarlos de nuevo (fallarán por "already exists"). Elija una y manténgala.

### 6.5 Autenticación

1. **Authentication → Sign In / Providers → Email**: deje habilitado el proveedor *Email*. Con **Confirm email** activo, el usuario debe confirmar su correo antes de entrar (recomendado).
2. **Authentication → URL Configuration**:
   - *Site URL:* `http://localhost:5173` (en producción, su dominio).
   - *Redirect URLs:* agregue `http://localhost:5173/**` y, más adelante, `https://su-dominio/**`. Son necesarias para los enlaces de confirmación y de recuperación de contraseña (`/restablecer-contrasena`).
3. El servicio de correo incluido en Supabase tiene límites bajos de envío y es para pruebas; para producción configure un SMTP propio en **Authentication → Emails → SMTP Settings**.

### 6.6 Crear el primer administrador (procedimiento seguro)

1. Ejecute la app y **regístrese** con el correo del propietario (y confírmelo).
2. En el **SQL Editor** ejecute:
   ```sql
   select public.bootstrap_first_admin('correo-del-propietario@ejemplo.com');
   ```
   Respuesta: `Administrador configurado: …`. La función solo puede ejecutarse desde el SQL Editor (no tiene permisos para la API) y **solo si aún no existe ningún administrador**. No hay contraseñas predeterminadas en el código.
3. Cierre sesión y vuelva a entrar: aparece **Administración**.

### 6.7 Storage

La migración 006 crea los buckets. Compruebe en **Storage**:
- `product-images` — *Public*, límite 5 MB, JPG/PNG/WEBP. Fotos del catálogo; solo el administrador sube o borra.
- `customizations` — *Private*, mismos límites. Diseños de los clientes en carpetas `<id-del-usuario>/…`. Leen el dueño, el administrador y el empleado con una tarea de ese pedido.

### 6.8 Comprobar que todo funciona

En el **SQL Editor**:
```sql
-- 25 tablas con RLS activo
select count(*) filter (where rowsecurity) as con_rls, count(*) as total
from pg_tables where schemaname = 'public';
-- Configuración inicial
select key, value from public.app_settings order by key;
-- Políticas definidas
select tablename, count(*) from pg_policies where schemaname = 'public' group by 1 order by 1;
```
Resultado esperado: `con_rls = total = 25`; 5 filas de configuración; políticas en todas las tablas.

Luego ejecute **todas las pruebas** (no dejan rastro): pegue `supabase/tests/database_tests.sql` y pulse **Run**. Si termina sin error, las 87 pruebas pasaron (el editor puede no mostrar los avisos `OK`; ante un fallo verá `FALLO [Txx …]`). Para ver cada línea, ejecútelo con `psql` usando la cadena de conexión de **Connect → Session pooler**.

### 6.9 Verificar que los cambios se guardan en PostgreSQL

1. En la app, como administrador, cree una categoría en *Administración → Categorías*.
2. Panel de Supabase → **Table Editor → categories**: la fila aparece.
3. *Administración → Auditoría*: aparece el registro `insert · categories`.

### 6.10 Cómo se conecta la aplicación

- `src/lib/env.ts` lee `VITE_SUPABASE_URL` y `VITE_SUPABASE_PUBLISHABLE_KEY` (Vite solo expone variables que empiezan con `VITE_`) y rechaza claves secretas.
- `src/lib/supabase.ts` crea **un único** cliente con sesión persistente (PKCE). Lo importan todos los archivos de `src/services/`, además de `lib/storage.ts` y `context/AuthContext.tsx`.
- Las páginas nunca usan el cliente directamente: llaman a funciones de `src/services/`.

### 6.11 Problemas de conexión y permisos

Vea el capítulo 12. Regla de oro: **nunca** desactive RLS ni use la clave secreta en el navegador para "arreglar" un error de permisos; el error indica que falta una política o que el usuario no tiene el rol adecuado.

---

## Capítulo 7. Scripts SQL

### 7.1 Inventario y orden de ejecución

| Orden | Archivo | Propósito | Depende de |
|---|---|---|---|
| 1 | `migrations/20261020000100_schema.sql` | 15 tipos enumerados, 25 tablas, claves, CHECK, UNIQUE, columnas generadas. | Esquema `auth` de Supabase |
| 2 | `migrations/20261020000200_indexes.sql` | Índices y unicidades parciales (receta activa única, cotización vigente única, carrito sin duplicados, idempotencia de mostrador). | 1 |
| 3 | `migrations/20261020000300_core_functions_triggers.sql` | Roles (`is_admin`, `is_staff`), creación de perfiles, marcas de tiempo, auditoría, motor de inventario, capacidad, tarifa de entrega, transiciones y efectos de estado, recálculo de pagos. | 1, 2 |
| 4 | `migrations/20261020000400_business_rpc.sql` | 27 funciones RPC de negocio y 5 auxiliares internas (compra, cotización, pagos, mostrador, inventario, tareas, panel, roles, mantenimiento). | 3 |
| 5 | `migrations/20261020000500_security_rls.sql` | Revoca privilegios por defecto, concede por columna, activa RLS en todo, políticas y EXECUTE. | 1–4 |
| 6 | `migrations/20261020000600_storage.sql` | Buckets y políticas de Storage. | 3, 5 |
| 7 | `migrations/20261020000700_default_settings.sql` | Parámetros operativos y etapas de producción. | 1, 3 |
| 8 | `migrations/20261020000800_settings_validation.sql` | Validación en servidor de `app_settings` (ejemplo de migración posterior). | 1, 3, 7 |
| — | `seed/seed_demo.sql` | Datos de demostración (`is_demo = true`). Opcional. | 1–8 |
| — | `seed/cleanup_demo.sql` | Borra solo datos demo; se detiene si ya están en pedidos. | seed |
| — | `tests/database_tests.sql` | 87 pruebas dentro de `BEGIN … ROLLBACK`. | 1–8 |
| — | `tests/local/*.sql` | Emulación de Supabase y prueba de concurrencia **solo** para PostgreSQL local. | — |

El **contenido completo** de cada archivo está en la carpeta `supabase/` del proyecto; cada uno comienza con un encabezado que explica su propósito, dependencias y forma de ejecución.

### 7.2 Tablas

`profiles`, `app_settings`, `categories`, `products`, `product_images`, `customization_templates`, `suppliers`, `stock_items`, `inventory_movements`, `production_stages`, `recipes`, `recipe_materials`, `recipe_stages`, `customer_addresses`, `cart_items`, `orders`, `order_items`, `stock_reservations`, `order_status_history`, `quotes`, `payments`, `payment_events`, `production_tasks`, `task_logs`, `audit_log`.

**Por qué estas entidades:** se unificó el inventario de productos terminados y materiales en `stock_items` (misma lógica de existencias y movimientos); la personalización de cada ítem vive en `order_items` (relación 1 a 1, evita una tabla extra); `stock_reservations` permite liberar o consumir exactamente lo reservado una sola vez; `payments` guarda intentos y resultados (los fallidos también son trazabilidad) y `payment_events` garantiza la idempotencia de webhooks. Clientes y empleados no necesitan tablas propias: sus datos caben en `profiles` y su rol decide qué ven.

### 7.3 Funciones principales

| Función | Quién la usa | Qué garantiza |
|---|---|---|
| `place_order` | Cliente | Precios desde la BD, fecha factible, tarifa, reserva atómica, idempotencia. |
| `request_quote`, `customer_respond_quote` | Cliente | Cotización sin precio ni pago hasta ser aceptada; revalida capacidad, materiales y tarifa al aceptar. |
| `admin_send_quote` | Administrador | Fecha propuesta ≥ fecha factible; versiones; vigencia. |
| `cancel_order` | Cliente / Admin | Política configurable; libera reservas; cancela intentos pendientes. |
| `admin_update_order_status` | Admin | Solo estados manuales; transiciones validadas por trigger. |
| `create_payment_attempt`, `get_payment_status`, `cancel_payment_attempt` | Cliente | Monto entre el anticipo pendiente y el saldo; un QR vigente; expiración. |
| `admin_sandbox_resolve_qr` | Admin | Solo QR de prueba en modo test. |
| `payment_set_provider_ref`, `payment_apply_provider_result` | Solo `service_role` | Webhooks idempotentes; compara monto y moneda. |
| `admin_record_payment`, `admin_record_refund`, `admin_counter_sale` | Admin | Pagos/reembolsos manuales y ventas presenciales idempotentes. |
| `admin_receive_stock`, `admin_adjust_stock` | Admin | Entradas y ajustes con motivo, sin tocar reservas. |
| `admin_assign_task`, `employee_update_task`, `my_tasks`, `task_history` | Admin / Empleado | Solo tareas propias; transiciones válidas; pedido a "en producción" y "listo" automáticamente. |
| `delivery_quote`, `earliest_delivery_date`, `catalog_availability` | Público | Cálculos oficiales sin exponer tablas internas. |
| `admin_dashboard`, `run_maintenance`, `admin_set_user_role`, `bootstrap_first_admin` | Admin / SQL Editor | Indicadores, vencimientos, roles. |

### 7.4 Comprobar objetos creados

```sql
select routine_name from information_schema.routines where routine_schema = 'public' order by 1;  -- funciones
select tgname, tgrelid::regclass from pg_trigger where not tgisinternal order by 2;                  -- triggers
select indexname, tablename from pg_indexes where schemaname = 'public' order by 2;                    -- índices
select tablename, policyname, cmd from pg_policies where schemaname in ('public','storage') order by 1; -- políticas
```

---

## Capítulo 8. Autenticación y permisos

### 8.1 Procesos

| Proceso | Cómo funciona |
|---|---|
| Registro | `/registro` → `supabase.auth.signUp` con nombre y teléfono en *metadata*. El trigger `on_auth_user_created` crea el perfil con rol **cliente** (ignora cualquier rol enviado; prueba T01). |
| Inicio de sesión | `/ingresar` → `signInWithPassword`. El JWT se guarda en el navegador y se renueva solo. |
| Cierre de sesión | Botón de salida → `signOut`. |
| Recuperación | `/recuperar-contrasena` envía un enlace; `/restablecer-contrasena` fija la nueva contraseña (requiere la *Redirect URL* del capítulo 6.5). |
| Perfil | `/perfil` edita nombre y teléfono (únicas columnas con permiso `update`). |
| Primer administrador | `bootstrap_first_admin` (capítulo 6.6). |
| Alta de empleados | El empleado se registra como cliente → el administrador lo busca en *Usuarios y roles* → **Hacer empleado**. |
| Revocar permisos | *Usuarios y roles* → **Hacer cliente** o **Desactivar**. Sus tareas abiertas quedan sin asignar. Un administrador no puede quitarse su propio rol y siempre debe quedar uno activo. |

### 8.2 Matriz de permisos

| Recurso / operación | Visitante | Cliente | Empleado | Administrador |
|---|---|---|---|---|
| Ver catálogo publicado, plantillas, disponibilidad | ✔ | ✔ | ✔ | ✔ (también no publicados) |
| Carrito, direcciones | — | Solo propios | Solo propios | Solo propios (+ ver direcciones) |
| Crear pedido / cotización | — | ✔ (RPC) | ✔ (RPC) | ✔ (RPC) |
| Ver pedidos, ítems, historial, cotizaciones, pagos | — | Solo propios | — (usa `my_tasks`) | Todos |
| Aceptar/rechazar cotización | — | Solo propias | — | — |
| Enviar cotización, cambiar estados, pagos manuales, reembolsos, mostrador | — | — | — | ✔ |
| Pagar en línea | — | Solo pedidos propios | — | — |
| Confirmar QR de prueba | — | — | — | ✔ (solo modo test) |
| Confirmar pago de proveedor | — | — | — | — (solo `service_role`) |
| Ver inventario, movimientos, recetas, etapas | — | — | ✔ (lectura) | ✔ |
| Gestionar productos, categorías, inventario, recetas, proveedores | — | — | — | ✔ |
| Ver/actualizar tareas | — | — | Solo asignadas | Todas |
| Ver diseños de clientes | — | Solo propios | De sus tareas | Todos |
| Usuarios y roles, configuración, auditoría | — | — | — | ✔ (auditoría solo lectura) |

### 8.3 Mecanismos que impiden el acceso a información ajena

- **RLS** con `auth.uid()` (identidad del JWT) y `is_admin()`/`is_staff()` (rol leído de `profiles` por funciones `SECURITY DEFINER`).
- **Privilegios por columna:** nadie puede modificar `role`, `is_active` ni `email` de `profiles` por la API; un trigger lo impide incluso si alguien concediera el permiso por error.
- **Sin privilegios de escritura** sobre `orders`, `payments`, `stock_items.quantity`, `inventory_movements`, `audit_log`: solo las funciones pueden escribir.
- **Funciones internas** (prefijo `_`) sin permiso de ejecución desde la API.
- Pruebas que lo demuestran: T07–T17, T23–T27, T31–T38, T41, T45, T54–T59, T77–T78, T87.

---

## Capítulo 9. Integraciones externas

| Integración | Estado | Credenciales |
|---|---|---|
| Supabase (Auth, BD, Storage) | **Operativa** | URL y clave pública en `.env` |
| Mapas OpenStreetMap + Nominatim | **Operativa** (uso moderado) | No requiere |
| Stripe – tarjeta | **Modo de prueba**, preparada para producción con un proveedor habilitado | `pk_test_` (frontend), `sk_test_` y `whsec_` (secretos) |
| QR bancario | **Proveedor de prueba**; integración real **pendiente de contrato** | — |
| Correo | Correo incluido en Supabase Auth (límites bajos) | SMTP propio para producción |

### 9.1 Mapas

- Teselas de `tile.openstreetmap.org` con la atribución obligatoria visible en el mapa.
- Búsqueda con **Nominatim**: su política fija un máximo de 1 solicitud por segundo para toda la aplicación, exige identificar la aplicación (el navegador envía *Referer*), prohíbe el autocompletado y pide caché. Por eso la búsqueda se ejecuta **solo al pulsar "Buscar"**, con caché en memoria, espera de 1,1 s entre consultas y resultados limitados a La Paz. Si el negocio crece, use un proveedor con contrato (Mapbox, Google Maps, LocationIQ) cambiando `src/lib/geo.ts`.
- El usuario también puede tocar el mapa, arrastrar el marcador o usar "Mi ubicación".
- **Tarifa:** `tarifa = base_fee + per_km_fee × km` en línea recta, con `min_fee` y cobertura `max_km`. Se calcula en `delivery_quote` (PostgreSQL) y se **vuelve a calcular** al confirmar o aceptar una cotización.

### 9.2 Pagos con tarjeta (Stripe, modo prueba)

**Disponibilidad:** no se pudo confirmar que Stripe acepte empresas con sede en Bolivia; guías de terceros describen como vía habitual constituir una empresa en otro país. Por eso Stripe se usa aquí **solo en modo de prueba**. Para cobros reales debe elegirse un proveedor que opere con empresas bolivianas, verificando requisitos, comisiones y su API; el diseño (intento de pago → proveedor → webhook firmado → `payment_apply_provider_result`) se mantiene y solo cambia la Edge Function.

**Configuración:**

1. Cree una cuenta en <https://dashboard.stripe.com> y active **Test mode**.
2. *Developers → API keys:* copie la **Publishable key** (`pk_test_…`) a `VITE_STRIPE_PUBLISHABLE_KEY` en `.env`, y la **Secret key** (`sk_test_…`) para el paso 4.
3. Despliegue las funciones:
   ```powershell
   npx supabase functions deploy create-card-payment
   npx supabase functions deploy stripe-webhook --no-verify-jwt
   ```
4. Cree `supabase/functions/.env` a partir de `supabase/functions/.env.example` y cargue los secretos:
   ```powershell
   npx supabase secrets set --env-file supabase/functions/.env
   ```
5. *Stripe → Developers → Webhooks → Add endpoint:* URL `https://<ref>.supabase.co/functions/v1/stripe-webhook`; eventos `payment_intent.succeeded`, `payment_intent.payment_failed`, `payment_intent.canceled`. Copie el **Signing secret** (`whsec_…`) a `STRIPE_WEBHOOK_SECRET` y repita el paso 4.
6. *Administración → Configuración → Pagos:* marque **Tarjeta habilitada**.
7. Confirme en Stripe que su cuenta puede cobrar en la moneda de `STRIPE_CURRENCY` (por defecto `bob`); si no, use la que le indique Stripe.

**Tarjetas de prueba oficiales** (cualquier fecha futura y cualquier CVC de 3 dígitos):

| Escenario | Número | Resultado esperado en la app |
|---|---|---|
| Aprobado | 4242 4242 4242 4242 | "Pago concretado con éxito" tras el webhook |
| Rechazo genérico | 4000 0000 0000 0002 | "La tarjeta fue rechazada." |
| Fondos insuficientes | 4000 0000 0000 9995 | "Fondos insuficientes en la tarjeta." |
| Tarjeta vencida | 4000 0000 0000 0069 | "La tarjeta está vencida." |
| CVC incorrecto | 4000 0000 0000 0127 | "El código de seguridad (CVC) es incorrecto." |
| Error de procesamiento | 4000 0000 0000 0119 | "Ocurrió un error al procesar la tarjeta…" |
| Requiere autenticación 3DS (pendiente) | 4000 0025 0000 3155 | Ventana de verificación; si se cancela: "No se completó la verificación" |
| Número inválido | 4242 4242 4242 4241 | Stripe Elements lo marca antes de enviar |
| Error de conexión | (desconecte la red al pagar) | "No se pudo conectar con el proveedor de pagos." |

**Garantías:** el monto lo toma la función de la base de datos; el PaymentIntent usa una clave de idempotencia por intento; el webhook verifica la firma, se registra por `event.id` (un reenvío no se aplica dos veces) y compara monto y moneda; la base de datos no guarda números de tarjeta ni CVC.

### 9.3 Pago QR

El QR interoperable boliviano requiere un contrato con un banco o pasarela, con su propia API y credenciales. No existe aún, por eso:

- Modo **prueba** (`qr_provider = sandbox_qr`): la app genera un intento con vigencia (10 min por defecto) y un QR con el texto `MIRALIZ-PRUEBA|…` (no es un QR bancario). La pantalla consulta el estado **cada 10 s**; el contador solo muestra el tiempo. El administrador confirma o rechaza en *Pedidos → detalle → Pagos QR de prueba pendientes*. Estados mostrados: QR generado, esperando pago, verificado, rechazado, expirado, error de verificación.
- Modo **producción:** la validación del servidor impide usar el proveedor de prueba (`payments.mode = live` + `sandbox_qr` → error). Para el QR real hay que implementar una Edge Function con la API del banco que genere el QR y confirme por webhook o consulta autenticada, usando `payment_apply_provider_result` (añadiendo el nuevo proveedor al CHECK de `payments.provider` mediante una migración).

### 9.4 Pagos en tienda

Efectivo y transferencia los registra el administrador en el detalle del pedido (`admin_record_payment`) o en la venta de mostrador. Generan comprobante `RC-AAAAMMDD-XXXXXXXX`.

---

## Capítulo 10. Flujos de negocio

### 10.1 Compra en línea (cliente)
1. *Catálogo* → producto → cantidad (y plantilla si es personalizado) → **Agregar al carrito**.
2. *Carrito* revisa cantidad mínima, publicación y existencias → **Continuar**.
3. *Confirmar pedido*: recojo o entrega (mapa, dirección, referencia, tarifa calculada), fecha "lo antes posible" o una fecha elegida, notas → **Confirmar pedido**.
4. Si la fecha no es viable, el sistema muestra la fecha más próxima y el botón **Usar esa fecha**.
5. El pedido queda *Pendiente de pago*, con unidades reservadas durante 48 h (configurable).
6. *Pagar*: anticipo o saldo, QR o tarjeta. Al alcanzar el anticipo, el pedido pasa a **Confirmado** automáticamente y se crean las tareas de producción.

### 10.2 Personalización y cotización
1. Producto personalizado → **Cotizar con mi diseño** → subir imagen (JPG/PNG/WEBP ≤ 5 MB), descripción, temática, colores, cantidad, fecha deseada, recojo/entrega.
2. El pedido queda en **Cotización pendiente**, sin precio y sin opción de pago.
3. Administrador → *Pedidos* → detalle: ve el diseño, **Verificar materiales**, define precio por unidad, minutos totales, fecha propuesta (se valida contra la capacidad) y vigencia → **Enviar cotización**.
4. Cliente → **Aceptar** (se reservan materiales y se recalcula la tarifa) o **Rechazar**. Si venció o cambiaron la capacidad o los materiales, queda *Cotización vencida* y el administrador envía otra.

### 10.3 Producción
1. Al confirmarse el pedido se crean tareas por etapa de la receta (o una tarea general si se cotizó sin receta).
2. *Administración → Producción*: asignar empleado y fecha programada; se marcan atrasos.
3. Empleado → *Mis tareas*: **Iniciar** (el pedido pasa a *En producción* y se descuentan los materiales reservados), **Registrar avance** (minutos y observaciones), **Bloquear** (con motivo), **Completar**. Al completar todas, el pedido queda **Listo**.

### 10.4 Inventario
- **Ingreso:** *Inventario → Ingreso* (cantidad, costo unitario, nota). Actualiza el costo de referencia.
- **Ajuste:** *Ajuste* con cantidad ± y motivo obligatorio; no puede afectar unidades reservadas.
- **Alertas:** *Stock bajo* cuando disponible ≤ mínimo (panel y filtro).
- **Movimientos:** historial completo por ítem.

### 10.5 Entrega y recojo
- Pedido *Listo* → **En camino** (solo domicilio) → **Entregado**. No se puede entregar con saldo pendiente: primero **Registrar pago en tienda**.
- Al entregar se descuentan definitivamente los productos de reventa reservados.

### 10.6 Venta presencial
*Administración → Venta en mostrador*: buscar productos, cantidades, método (efectivo/transferencia), cliente opcional → **Registrar venta**. Descuenta existencias al instante, crea el pedido *Entregado* y el pago aprobado.

### 10.7 Cancelaciones y reembolsos
- Cliente: puede cancelar en los estados configurados y **sin pagos**.
- Administrador: puede cancelar cualquier pedido no cerrado; se liberan reservas; si hay pagos, registra el **reembolso**. Los materiales ya consumidos no vuelven automáticamente al inventario (usar un ajuste si se recuperan).
- **Liberar reservas vencidas** (panel): cancela pedidos sin pago con reserva vencida y marca cotizaciones vencidas. Puede programarse con `pg_cron` (capítulo 13).

---

## Capítulo 11. Pruebas

Resumen (detalle, casos manuales y evidencias en [`PRUEBAS.md`](PRUEBAS.md)):

| Capa | Comando | Resultado verificado |
|---|---|---|
| Base de datos (integridad, RLS, flujos, configuración) | `npm run test:db` | 87/87 OK + concurrencia OK |
| Utilidades y componentes | `npm test` | 33/33 OK |
| Edge Functions | `npm run test:functions` | 9/9 OK |
| Tipos y análisis estático | `npm run typecheck` · `npm run lint` | 0 errores |
| Compilación | `npm run build` | OK |
| E2E interfaz + BD real (sin Supabase) | `scripts/e2e-local/run.sh` | Flujo completo sin errores de consola |

**Pendientes de verificación por el usuario** (requieren credenciales externas): conexión con un proyecto Supabase real, envío de correos, Storage real, Edge Functions desplegadas y cobros de prueba con Stripe.

Para `npm run test:db` en Windows: instale PostgreSQL (incluye `psql`), abra **Git Bash** y ejecute:
```bash
export PGHOST=localhost PGPORT=5432 PGUSER=postgres PGPASSWORD=<su-clave-local>
npm run test:db
```

---

## Capítulo 12. Errores frecuentes

| Problema | Causas posibles | Diagnóstico | Solución (sin desactivar la seguridad) |
|---|---|---|---|
| Dependencias no se instalan | Sin internet, proxy, Node antiguo | `node -v`, mensaje de npm | Node 20.19+; `npm cache verify`; borrar `node_modules` y `package-lock.json` solo como último recurso. |
| Puerto ocupado | Otro `npm run dev` abierto | `netstat -ano | findstr :5173` | Cerrar la otra terminal o `taskkill /PID <n> /F`. |
| "Falta configurar la conexión con Supabase" | `.env` ausente, con marcadores o con clave secreta | Mensaje en pantalla | Completar `.env` con URL y clave pública; reiniciar. |
| "No se pudo conectar con el servidor" | URL errónea, proyecto pausado, sin red | Pestaña *Red* del navegador (F12) | Verificar URL; reactivar el proyecto en el panel (los proyectos gratuitos se pausan por inactividad). |
| "No tiene permiso para realizar esta operación" / `permission denied` / `row-level security` | Rol insuficiente, sesión vencida, migración 005 incompleta | `select role, is_active from profiles where email = '…'` | Asignar el rol correcto; volver a iniciar sesión; re-ejecutar la migración faltante. Nunca desactivar RLS. |
| `relation "public.x" does not exist` | Migraciones fuera de orden o incompletas | `select tablename from pg_tables where schemaname='public'` | Ejecutar las migraciones faltantes en orden. |
| `function … does not exist` | Firma distinta o migración 004 sin aplicar | `\df public.*` | Aplicar 004 y 005; recargar la app. |
| `type "…" already exists` | Re-ejecución de 001 | — | La 001 ya está aplicada: continuar con la siguiente. |
| Imágenes no cargan | Bucket ausente, archivo borrado, política | Storage → product-images | Aplicar la 006; volver a subir la foto. |
| No se puede subir imagen | Tipo/tamaño no permitido; no es administrador (catálogo) | Mensaje de la app | JPG/PNG/WEBP ≤ 5 MB; rol correcto. |
| No llega el correo de confirmación/recuperación | Límite del correo incluido, spam, Redirect URL faltante | Authentication → Logs | Configurar SMTP propio y las URL del capítulo 6.5. |
| "Invalid login credentials" / "Email not confirmed" | Datos erróneos o correo sin confirmar | — | Recuperar contraseña o confirmar el correo. |
| La búsqueda de direcciones falla | Límite de Nominatim, sin red | Aviso bajo el buscador | Marcar el punto tocando el mapa; esperar unos segundos. |
| Tarifa "fuera del área de cobertura" | Punto lejano o coordenadas del local no configuradas | *Configuración → Entregas* | Fijar las coordenadas reales y la cobertura. |
| "El pago con tarjeta no está habilitado" | `card_enabled` falso o falta `pk_test_` | *Configuración → Pagos*, `.env` | Completar el capítulo 9.2. |
| La tarjeta queda "Procesando…" | Webhook no configurado o secreto incorrecto | Stripe → Webhooks → intentos | Revisar URL, eventos y `STRIPE_WEBHOOK_SECRET`. |
| "La clave del proveedor no corresponde al modo" | `sk_live_` con modo test o viceversa | — | Usar la clave del modo configurado. |
| QR "expirado" | Pasó la vigencia | — | **Generar un nuevo QR**. |
| "La fecha solicitada no es viable" | Capacidad configurada insuficiente | *Configuración → Capacidad* | Elegir la fecha sugerida o ajustar la capacidad real. |
| "Existencias insuficientes" | Otro cliente reservó las últimas unidades; material faltante | *Inventario* | Registrar el ingreso de mercadería o reducir la cantidad. |
| Inventario "no cuadra" | Ajustes sin registrar, consumo esperado | *Inventario → Movimientos* | Cada cambio tiene su movimiento; corregir con un ajuste justificado. |
| Error de compilación | Tipos rotos tras un cambio | `npm run typecheck` | Corregir el archivo indicado. |
| El ZIP no funciona en otro equipo | Falta `npm install` o `.env` | — | `npm install`, crear `.env`, `npm run dev`. |

---

## Capítulo 13. Mantenimiento y ampliación

### 13.1 Tareas habituales (desde la interfaz)
- **Productos / categorías / fotos / plantillas:** *Administración → Productos* y *Categorías*. Despublique en lugar de borrar productos con ventas.
- **Recetas:** *Recetas → Nueva versión* (copia la actual como borrador) → editar → **Activar**.
- **Empleados:** *Usuarios y roles*.
- **Parámetros:** *Configuración*.

### 13.2 Crear una migración (cambios de base de datos)
Nunca edite migraciones ya aplicadas. Cree un archivo nuevo con número mayor:
```powershell
npx supabase migration new agregar_campo_x     # crea supabase/migrations/<fecha>_agregar_campo_x.sql
```
Plantilla para una **tabla nueva**:
```sql
create table public.ejemplo (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  created_at timestamptz not null default now()
);
alter table public.ejemplo enable row level security;
revoke all on public.ejemplo from anon, authenticated;
grant select on public.ejemplo to authenticated;
create policy ejemplo_admin_select on public.ejemplo for select to authenticated using (public.is_admin());
```
Aplicación: `npx supabase db push` (CLI) o pegar el archivo en el SQL Editor. Luego: actualizar `src/types/db.ts`, el servicio correspondiente, la interfaz, agregar pruebas en `supabase/tests/database_tests.sql` y ejecutar `npm run test:db`.

### 13.3 Agregar una pantalla
1. Crear `src/pages/<área>/NuevaPagina.tsx`.
2. Registrar la ruta en `src/App.tsx` (con `named(() => import(...))` y `ProtectedRoute` si es privada).
3. Agregar el enlace en `PublicLayout` o `AdminLayout`.
4. Acceso a datos solo mediante `src/services/`.

### 13.4 Agregar un rol permitido
Agregar el valor con `alter type public.app_role add value 'nuevo';` en una migración, actualizar `is_staff()`/políticas según lo que deba ver, el tipo `AppRole` y la matriz de permisos.

### 13.5 Tareas programadas (opcional)
Para liberar reservas automáticamente cada hora, habilite la extensión **pg_cron** (*Database → Extensions*) y ejecute:
```sql
select cron.schedule('miraliz-mantenimiento', '0 * * * *', $$select public.run_maintenance()$$);
```

### 13.6 Calidad
Antes de cada entrega: `npm run lint`, `npm run typecheck`, `npm test`, `npm run build` y, si cambió SQL, `npm run test:db`.

---

## Capítulo 14. Copias de seguridad y recuperación

**Qué respaldar:** la base de datos (todas las tablas de `public`, que incluyen pedidos, pagos e inventario), los archivos de Storage (fotos y diseños) y la configuración fuera del repositorio (secretos de Edge Functions).

**Respaldos de Supabase:** revise *Database → Backups* de su proyecto. Las copias automáticas y su retención dependen del plan contratado; no asuma que existen sin verificarlo en ese panel.

**Respaldo manual (recomendado semanalmente, como indica el plan de riesgos del proyecto):**
```powershell
npx supabase db dump --linked -f respaldo_esquema.sql
npx supabase db dump --linked --data-only -f respaldo_datos.sql
```
(o `pg_dump` con la cadena de conexión de *Connect*). Guarde los archivos fuera del repositorio (p. ej. Google Drive), porque contienen datos personales.

**Fotos:** descárguelas desde *Storage* o con la API; las de catálogo pueden volver a subirse.

**Restauración en un proyecto nuevo:** aplicar las migraciones (capítulo 6) y luego `psql "<cadena-de-conexión>" -f respaldo_datos.sql`. Probar la restauración en un proyecto de prueba antes de necesitarla.

---

## Capítulo 15. Preparación para despliegue

### 15.1 Repositorio en GitHub (desde PowerShell)
```powershell
git init
git add .
git status                      # verifique que NO aparezcan .env ni node_modules
git commit -m "Sistema Cotillón MiraLiz v1.0"
git branch -M main
git remote add origin https://github.com/<usuario>/cotillon-miraliz.git
git push -u origin main
```
(Cree antes el repositorio vacío en GitHub: *New repository*, sin README.) Se recomienda un repositorio **privado** mientras contenga datos de demostración del negocio.

### 15.2 Publicar el frontend
Cualquier hosting de sitios estáticos sirve (Vercel, Netlify, Cloudflare Pages):
- Comando de compilación `npm run build`, carpeta de salida `dist`.
- Variables `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_STRIPE_PUBLISHABLE_KEY`, `VITE_SITE_URL` en el panel del hosting.
- Regla de reescritura de todas las rutas a `/index.html` (aplicación de una sola página).
- Agregar el dominio a *Authentication → URL Configuration* y a `ALLOWED_ORIGINS` de las funciones.

### 15.3 Lista de comprobación final
- [ ] Migraciones 001–008 aplicadas; pruebas SQL sin errores en un proyecto de prueba.
- [ ] Datos demo eliminados (`cleanup_demo.sql`) o despublicados en producción.
- [ ] Coordenadas reales del local, tarifas, anticipo, capacidad y política validadas por el propietario.
- [ ] SMTP propio configurado.
- [ ] `payments.mode = test` hasta contratar un proveedor real.
- [ ] Ningún secreto en el repositorio (`git grep -n "sk_live\|sk_test\|sb_secret\|whsec_"` sin resultados en el código).
- [ ] Respaldo inicial realizado.

---

## Capítulo 16. Glosario

| Término | Significado sencillo |
|---|---|
| **Frontend** | La parte que se ve y se usa en el navegador (React). |
| **Backend** | La parte que guarda datos y aplica reglas (aquí: Supabase/PostgreSQL y Edge Functions). |
| **API** | Puerta por la que el frontend pide o envía datos al backend. |
| **PostgreSQL** | El motor de base de datos relacional donde se guardan las tablas. |
| **Supabase Auth** | Servicio que registra usuarios, verifica contraseñas y entrega sesiones (JWT). |
| **JWT** | "Credencial" firmada que identifica al usuario en cada petición. |
| **RLS (Row Level Security)** | Reglas en la base de datos que deciden qué filas puede ver o cambiar cada usuario. |
| **Política** | Una regla RLS concreta (p. ej. "el cliente solo ve sus pedidos"). |
| **RPC** | Llamar a una función de la base de datos desde la app. |
| **SECURITY DEFINER** | Función que se ejecuta con los permisos de su dueño, para hacer operaciones controladas que el usuario no puede hacer directamente. |
| **Storage** | Almacenamiento de archivos (imágenes) de Supabase. |
| **Bucket** | Carpeta principal de Storage con sus reglas de acceso. |
| **Trigger** | Acción automática de la base de datos cuando se inserta o modifica una fila. |
| **Transacción** | Conjunto de operaciones que se aplican todas o ninguna. |
| **Migración** | Archivo SQL numerado que lleva la base de datos de una versión a la siguiente. |
| **Webhook** | Aviso que un servicio externo (Stripe) envía al sistema cuando ocurre algo (pago aprobado). |
| **Idempotencia** | Repetir la misma operación no produce duplicados (doble clic, reintentos). |
| **Variables de entorno** | Valores de configuración fuera del código (`.env`). |
| **Repositorio** | Carpeta del proyecto con historial de cambios (Git/GitHub). |
| **Despliegue** | Publicar el sistema en internet para que otros lo usen. |
| **Edge Function** | Pequeño programa del lado del servidor de Supabase (Deno) que puede usar secretos. |
| **Haversine** | Fórmula para la distancia en línea recta entre dos coordenadas. |
| **Reserva de stock** | Unidades apartadas para un pedido que aún no se entregó o produjo. |
