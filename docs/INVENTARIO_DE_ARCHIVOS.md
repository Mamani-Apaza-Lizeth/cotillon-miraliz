# Inventario de archivos del proyecto

Documento generado a partir del código real (dependencias, exportaciones, uso de Supabase y variables se extraen automáticamente; las descripciones están escritas por el equipo).

Total de archivos documentados: **127** (no incluye `node_modules/`, `dist/` ni las capturas de `docs/evidencias/capturas/`).

> **Código completo:** cada archivo se entrega íntegro en el ZIP y en el repositorio; este inventario no repite el código para mantenerse legible.

## Árbol

```
.env.example
.gitignore
.vscode/extensions.json
README.md
docs/ANALISIS_DEL_PDF.md
docs/DIAGRAMAS.md
docs/INFORME_DE_ESTADO.md
docs/MANUAL_TECNICO.md
docs/MATRIZ_TRAZABILIDAD.md
docs/PRUEBAS.md
docs/evidencias/compilacion_produccion.txt
docs/evidencias/prueba_e2e_local.txt
docs/evidencias/pruebas_base_de_datos.txt
docs/evidencias/pruebas_edge_functions.txt
docs/evidencias/pruebas_frontend.txt
eslint.config.js
index.html
package-lock.json
package.json
public/favicon.svg
scripts/e2e-local/flow.py
scripts/e2e-local/jwt.mjs
scripts/e2e-local/proxy.mjs
scripts/e2e-local/run.sh
scripts/test-db.sh
src/App.tsx
src/components/catalog/ProductCard.tsx
src/components/catalog/ProductImage.tsx
src/components/components.test.tsx
src/components/layout/AdminLayout.tsx
src/components/layout/Logo.tsx
src/components/layout/ProtectedRoute.tsx
src/components/layout/PublicLayout.tsx
src/components/map/DeliveryMap.tsx
src/components/map/FulfillmentPicker.tsx
src/components/orders/OrderBits.tsx
src/components/payments/CardPayment.tsx
src/components/payments/PaymentPanel.tsx
src/components/payments/QrPayment.tsx
src/components/ui/Button.tsx
src/components/ui/Feedback.tsx
src/components/ui/Field.tsx
src/components/ui/Modal.tsx
src/context/AuthContext.tsx
src/context/CartContext.tsx
src/context/SettingsContext.tsx
src/context/ToastContext.tsx
src/hooks/useAsync.ts
src/index.css
src/lib/env.ts
src/lib/errors.ts
src/lib/format.ts
src/lib/fulfillment.ts
src/lib/geo.ts
src/lib/idempotency.ts
src/lib/lib.test.ts
src/lib/orderStatus.ts
src/lib/rules.ts
src/lib/storage.ts
src/lib/supabase.ts
src/lib/validation.ts
src/main.tsx
src/pages/admin/AdminAuditPage.tsx
src/pages/admin/AdminCategoriesPage.tsx
src/pages/admin/AdminCounterSalePage.tsx
src/pages/admin/AdminDashboardPage.tsx
src/pages/admin/AdminInventoryPage.tsx
src/pages/admin/AdminOrderDetailPage.tsx
src/pages/admin/AdminOrdersPage.tsx
src/pages/admin/AdminProductEditPage.tsx
src/pages/admin/AdminProductionPage.tsx
src/pages/admin/AdminProductsPage.tsx
src/pages/admin/AdminRecipesPage.tsx
src/pages/admin/AdminSettingsPage.tsx
src/pages/admin/AdminSuppliersPage.tsx
src/pages/admin/AdminUsersPage.tsx
src/pages/customer/CartPage.tsx
src/pages/customer/CheckoutPage.tsx
src/pages/customer/OrderDetailPage.tsx
src/pages/customer/OrdersPage.tsx
src/pages/customer/ProfilePage.tsx
src/pages/customer/QuoteRequestPage.tsx
src/pages/employee/EmployeeTasksPage.tsx
src/pages/public/AuthPages.tsx
src/pages/public/CatalogPage.tsx
src/pages/public/HomePage.tsx
src/pages/public/ProductPage.tsx
src/services/account.ts
src/services/admin.ts
src/services/adminOrders.ts
src/services/cart.ts
src/services/catalog.ts
src/services/catalogAdmin.ts
src/services/inventory.ts
src/services/orders.ts
src/services/payments.ts
src/services/production.ts
src/test/setup.ts
src/types/db.ts
src/vite-env.d.ts
supabase/config.toml
supabase/functions/.env.example
supabase/functions/_shared/common.ts
supabase/functions/create-card-payment/handler.ts
supabase/functions/create-card-payment/index.ts
supabase/functions/stripe-webhook/handler.ts
supabase/functions/stripe-webhook/index.ts
supabase/functions/tests/functions.test.ts
supabase/migrations/20261020000100_schema.sql
supabase/migrations/20261020000200_indexes.sql
supabase/migrations/20261020000300_core_functions_triggers.sql
supabase/migrations/20261020000400_business_rpc.sql
supabase/migrations/20261020000500_security_rls.sql
supabase/migrations/20261020000600_storage.sql
supabase/migrations/20261020000700_default_settings.sql
supabase/migrations/20261020000800_settings_validation.sql
supabase/seed/cleanup_demo.sql
supabase/seed/seed_demo.sql
supabase/tests/database_tests.sql
supabase/tests/local/concurrency_buyer.sql
supabase/tests/local/concurrency_check.sql
supabase/tests/local/concurrency_setup.sql
supabase/tests/local/supabase_shim.sql
tsconfig.app.json
tsconfig.json
tsconfig.node.json
vite.config.ts
```

## (raíz)

### `.env.example`

- **Nombre / tipo:** `.env.example` · Variables de entorno (ejemplo)
- **Responsabilidad:** Plantilla de variables PÚBLICAS del frontend (VITE_*).
- **Relación con el negocio:** Conecta la tienda con el proyecto Supabase del negocio.
- **Validaciones y seguridad:** Solo valores de ejemplo; advierte qué claves nunca deben ir aquí.
- **Cómo comprobar que funciona:** Copiar a .env, completar y ejecutar `npm run dev`.
- **Para ampliarlo:** Agregar nuevas variables públicas con prefijo VITE_.

### `.gitignore`

- **Nombre / tipo:** `.gitignore` · Reglas de Git
- **Responsabilidad:** Excluye dependencias, compilados, .env reales y estados locales.
- **Validaciones y seguridad:** Evita subir secretos a GitHub.
- **Cómo comprobar que funciona:** `git status` no debe listar .env ni node_modules.
- **Para ampliarlo:** Agregar patrones de nuevas herramientas.

### `README.md`

- **Nombre / tipo:** `README.md` · Markdown
- **Responsabilidad:** Guía rápida: qué es el sistema y cómo ejecutarlo desde cero.
- **Relación con el negocio:** Punto de entrada para quien recibe el proyecto.
- **Validaciones y seguridad:** Recuerda no publicar secretos.
- **Cómo comprobar que funciona:** Seguir los pasos y llegar a la app funcionando.
- **Para ampliarlo:** Actualizar al agregar requisitos o comandos.

### `eslint.config.js`

- **Nombre / tipo:** `eslint.config.js` · JavaScript (ESM)
- **Responsabilidad:** Análisis estático (reglas de React Hooks y TypeScript).
- **Validaciones y seguridad:** Detecta usos incorrectos de hooks.
- **Cómo comprobar que funciona:** `npm run lint` → 0 errores.
- **Para ampliarlo:** Agregar reglas o excepciones por carpeta.

### `index.html`

- **Nombre / tipo:** `index.html` · HTML
- **Responsabilidad:** Documento HTML base: idioma, metadatos, fuentes y punto de montaje.
- **Cómo comprobar que funciona:** Se sirve en http://localhost:5173.
- **Para ampliarlo:** Cambiar título, descripción o fuentes.

### `package-lock.json`

- **Nombre / tipo:** `package-lock.json` · JSON
- **Responsabilidad:** Versiones exactas instaladas (generado por npm).
- **Validaciones y seguridad:** Garantiza que todos instalen lo mismo.
- **Cómo comprobar que funciona:** `npm ci` debe funcionar sin cambios.
- **Para ampliarlo:** No editar a mano.

### `package.json`

- **Nombre / tipo:** `package.json` · JSON
- **Responsabilidad:** Manifiesto npm: dependencias y scripts (dev, build, test, lint, test:db, test:functions).
- **Validaciones y seguridad:** Versiones mayores fijadas para builds reproducibles.
- **Cómo comprobar que funciona:** `npm install` y `npm run build`.
- **Para ampliarlo:** Agregar dependencias con `npm install <paquete>`.

### `tsconfig.app.json`

- **Nombre / tipo:** `tsconfig.app.json` · JSON
- **Responsabilidad:** Opciones estrictas de TypeScript para `src/`.
- **Validaciones y seguridad:** Modo estricto: detecta errores de tipos antes de ejecutar.
- **Cómo comprobar que funciona:** `npx tsc -p tsconfig.app.json --noEmit`.

### `tsconfig.json`

- **Nombre / tipo:** `tsconfig.json` · JSON
- **Responsabilidad:** Proyecto TypeScript raíz con referencias a app y node.
- **Cómo comprobar que funciona:** `npm run typecheck`.

### `tsconfig.node.json`

- **Nombre / tipo:** `tsconfig.node.json` · JSON
- **Responsabilidad:** TypeScript para archivos de configuración (vite.config.ts).
- **Cómo comprobar que funciona:** `npx tsc -p tsconfig.node.json --noEmit`.

### `vite.config.ts`

- **Nombre / tipo:** `vite.config.ts` · TypeScript
- **Responsabilidad:** Configuración de Vite (React + Tailwind) y de Vitest (jsdom, setup).
- **Cómo comprobar que funciona:** `npm run dev`, `npm run build`, `npm test`.
- **Para ampliarlo:** Agregar plugins o alias.

## .vscode

### `.vscode/extensions.json`

- **Nombre / tipo:** `extensions.json` · JSON
- **Responsabilidad:** Extensiones recomendadas para VS Code (ESLint, Tailwind, Deno, Mermaid).
- **Cómo comprobar que funciona:** VS Code sugiere instalarlas al abrir la carpeta.

## docs

### `docs/ANALISIS_DEL_PDF.md`

- **Nombre / tipo:** `ANALISIS_DEL_PDF.md` · Markdown
- **Responsabilidad:** Fase 1: requisitos del PDF, del enunciado, decisiones y datos demo.
- **Relación con el negocio:** Trazabilidad con el documento académico.

### `docs/DIAGRAMAS.md`

- **Nombre / tipo:** `DIAGRAMAS.md` · Markdown
- **Responsabilidad:** Diagramas Mermaid: arquitectura, módulos, datos, autenticación, compra, cotización, inventario, pagos.
- **Cómo comprobar que funciona:** Se validó que los 8 diagramas se interpretan sin errores.

### `docs/INFORME_DE_ESTADO.md`

- **Nombre / tipo:** `INFORME_DE_ESTADO.md` · Markdown
- **Responsabilidad:** Estado de cada funcionalidad (implementada, pendiente de prueba, pendiente de credenciales).

### `docs/MANUAL_TECNICO.md`

- **Nombre / tipo:** `MANUAL_TECNICO.md` · Markdown
- **Responsabilidad:** Manual técnico integral (capítulos 1 a 16).
- **Relación con el negocio:** Permite instalar, operar y mantener el sistema.

### `docs/MATRIZ_TRAZABILIDAD.md`

- **Nombre / tipo:** `MATRIZ_TRAZABILIDAD.md` · Markdown
- **Responsabilidad:** Matriz requisito → pantalla → servicio → objeto de BD → prueba → sección del manual.

### `docs/PRUEBAS.md`

- **Nombre / tipo:** `PRUEBAS.md` · Markdown
- **Responsabilidad:** Estrategia, casos de prueba manuales y automatizados, resultados reales.

### `docs/evidencias/compilacion_produccion.txt`

- **Nombre / tipo:** `compilacion_produccion.txt` · Texto (evidencia)
- **Responsabilidad:** Salida real de una ejecución de verificación (evidencia).
- **Cómo comprobar que funciona:** Comparar con una nueva ejecución.

### `docs/evidencias/prueba_e2e_local.txt`

- **Nombre / tipo:** `prueba_e2e_local.txt` · Texto (evidencia)
- **Responsabilidad:** Salida real de una ejecución de verificación (evidencia).
- **Cómo comprobar que funciona:** Comparar con una nueva ejecución.

### `docs/evidencias/pruebas_base_de_datos.txt`

- **Nombre / tipo:** `pruebas_base_de_datos.txt` · Texto (evidencia)
- **Responsabilidad:** Salida real de una ejecución de verificación (evidencia).
- **Cómo comprobar que funciona:** Comparar con una nueva ejecución.

### `docs/evidencias/pruebas_edge_functions.txt`

- **Nombre / tipo:** `pruebas_edge_functions.txt` · Texto (evidencia)
- **Responsabilidad:** Salida real de una ejecución de verificación (evidencia).
- **Cómo comprobar que funciona:** Comparar con una nueva ejecución.

### `docs/evidencias/pruebas_frontend.txt`

- **Nombre / tipo:** `pruebas_frontend.txt` · Texto (evidencia)
- **Responsabilidad:** Salida real de una ejecución de verificación (evidencia).
- **Cómo comprobar que funciona:** Comparar con una nueva ejecución.

## public

### `public/favicon.svg`

- **Nombre / tipo:** `favicon.svg` · SVG
- **Responsabilidad:** Ícono del sitio (globos de la marca).
- **Relación con el negocio:** Identidad visual de la tienda.
- **Cómo comprobar que funciona:** Visible en la pestaña del navegador.

## scripts

### `scripts/e2e-local/flow.py`

- **Nombre / tipo:** `flow.py` · Python
- **Responsabilidad:** Guion Playwright del flujo E2E (cliente, administrador, empleado, móvil).
- **Validaciones y seguridad:** Verifica que un cliente no accede al panel.
- **Cómo comprobar que funciona:** Ejecutado por run.sh.
- **Para ampliarlo:** Agregar nuevas pantallas.

### `scripts/e2e-local/jwt.mjs`

- **Nombre / tipo:** `jwt.mjs` · JavaScript (Node, ESM)
- **Responsabilidad:** Firma JWT de PRUEBA para sesiones simuladas.
- **Validaciones y seguridad:** Secreto exclusivo del entorno local.
- **Cómo comprobar que funciona:** `node jwt.mjs anon`.

### `scripts/e2e-local/proxy.mjs`

- **Nombre / tipo:** `proxy.mjs` · JavaScript (Node, ESM)
- **Responsabilidad:** Proxy que imita rutas de Supabase (/rest/v1, /auth/v1/user) hacia PostgREST.
- **Validaciones y seguridad:** Solo para pruebas locales.
- **Cómo comprobar que funciona:** Responde en 127.0.0.1:54321.

### `scripts/e2e-local/run.sh`

- **Nombre / tipo:** `run.sh` · Bash
- **Responsabilidad:** Prueba de extremo a extremo de la interfaz contra la base real: PostgREST + proxy + Vite + Playwright.
- **Relación con el negocio:** Recorre compra, pago QR de prueba, producción y panel.
- **Validaciones y seguridad:** Usa JWT de prueba locales; no aplica a producción.
- **Cómo comprobar que funciona:** Genera capturas y muestra `ERRORES []`.
- **Para ampliarlo:** Agregar pasos en flow.py.

### `scripts/test-db.sh`

- **Nombre / tipo:** `test-db.sh` · Bash
- **Responsabilidad:** Crea una base PostgreSQL local, emula lo mínimo de Supabase, aplica migraciones, datos demo, pruebas y prueba de concurrencia.
- **Relación con el negocio:** Verifica inventario, pedidos, pagos y permisos sin cuenta de Supabase.
- **Validaciones y seguridad:** Nunca toca Supabase; usa una base temporal.
- **Cómo comprobar que funciona:** `npm run test:db` → "TODAS LAS PRUEBAS PASARON" y C01 OK.
- **Para ampliarlo:** Agregar archivos de prueba y llamarlos aquí.

## src/App.tsx

### `src/App.tsx`

- **Nombre / tipo:** `App.tsx` · TypeScript + JSX (React)
- **Responsabilidad:** Definición de rutas (públicas, cliente, empleado, administrador) con carga diferida.
- **Relación con el negocio:** Navegación de todo el sistema.
- **Dependencias externas:** `react`, `react-router`
- **Importa:** `src/components/layout/AdminLayout.tsx`, `src/components/layout/ProtectedRoute.tsx`, `src/components/layout/PublicLayout.tsx`, `src/components/ui/Feedback.tsx`, `src/pages/admin/AdminAuditPage.tsx`, `src/pages/admin/AdminCategoriesPage.tsx`, `src/pages/admin/AdminCounterSalePage.tsx`, `src/pages/admin/AdminDashboardPage.tsx`, `src/pages/admin/AdminInventoryPage.tsx`, `src/pages/admin/AdminOrderDetailPage.tsx`, `src/pages/admin/AdminOrdersPage.tsx`, `src/pages/admin/AdminProductEditPage.tsx`, `src/pages/admin/AdminProductionPage.tsx`, `src/pages/admin/AdminProductsPage.tsx`, `src/pages/admin/AdminRecipesPage.tsx`, `src/pages/admin/AdminSettingsPage.tsx`, `src/pages/admin/AdminSuppliersPage.tsx`, `src/pages/admin/AdminUsersPage.tsx`, `src/pages/customer/CartPage.tsx`, `src/pages/customer/CheckoutPage.tsx`, `src/pages/customer/OrderDetailPage.tsx`, `src/pages/customer/OrdersPage.tsx`, `src/pages/customer/ProfilePage.tsx`, `src/pages/customer/QuoteRequestPage.tsx`, `src/pages/employee/EmployeeTasksPage.tsx`, `src/pages/public/AuthPages.tsx`, `src/pages/public/CatalogPage.tsx`, `src/pages/public/HomePage.tsx`, `src/pages/public/ProductPage.tsx`
- **Exporta:** `App`, `router`
- **Usado por:** `src/main.tsx`
- **Validaciones y seguridad:** Rutas privadas envueltas en ProtectedRoute (comodidad; la seguridad real está en la BD).
- **Cómo comprobar que funciona:** Navegar a /admin sin rol administrador muestra "Acceso restringido".
- **Para ampliarlo:** Agregar páginas: import diferido + objeto de ruta.

## src/components

### `src/components/catalog/ProductCard.tsx`

- **Nombre / tipo:** `ProductCard.tsx` · TypeScript + JSX (React)
- **Responsabilidad:** Tarjeta de producto del catálogo.
- **Dependencias externas:** `lucide-react`, `react-router`
- **Importa:** `src/components/catalog/ProductImage.tsx`, `src/components/ui/Feedback.tsx`, `src/lib/format.ts`, `src/lib/rules.ts`, `src/types/db.ts`
- **Exporta:** `ProductCard`
- **Usado por:** `src/components/components.test.tsx`, `src/pages/public/CatalogPage.tsx`, `src/pages/public/HomePage.tsx`
- **Cómo comprobar que funciona:** Prueba ProductCard.

### `src/components/catalog/ProductImage.tsx`

- **Nombre / tipo:** `ProductImage.tsx` · TypeScript + JSX (React)
- **Responsabilidad:** Imagen del producto o ilustración de respaldo.
- **Dependencias externas:** `react`
- **Importa:** `src/lib/storage.ts`
- **Exporta:** `ProductImage`
- **Servicios de Supabase:** Storage
- **Usado por:** `src/components/catalog/ProductCard.tsx`, `src/pages/admin/AdminProductEditPage.tsx`, `src/pages/admin/AdminProductsPage.tsx`, `src/pages/customer/CartPage.tsx`, `src/pages/public/ProductPage.tsx`

### `src/components/components.test.tsx`

- **Nombre / tipo:** `components.test.tsx` · TypeScript + JSX (React)
- **Responsabilidad:** 7 pruebas de componentes (renderizado y accesibilidad).
- **Dependencias externas:** `@testing-library/react`, `@testing-library/user-event`, `react-router`, `vitest`
- **Importa:** `src/components/catalog/ProductCard.tsx`, `src/components/orders/OrderBits.tsx`, `src/components/ui/Feedback.tsx`, `src/components/ui/Field.tsx`, `src/types/db.ts`
- **Cómo comprobar que funciona:** `npm test`.

### `src/components/layout/AdminLayout.tsx`

- **Nombre / tipo:** `AdminLayout.tsx` · TypeScript + JSX (React)
- **Responsabilidad:** Navegación lateral del panel administrativo.
- **Dependencias externas:** `lucide-react`, `react-router`
- **Importa:** `src/components/layout/Logo.tsx`, `src/components/ui/Feedback.tsx`, `src/context/AuthContext.tsx`
- **Exporta:** `AdminLayout`
- **Usado por:** `src/App.tsx`

### `src/components/layout/Logo.tsx`

- **Nombre / tipo:** `Logo.tsx` · TypeScript + JSX (React)
- **Responsabilidad:** Logotipo de la tienda.
- **Dependencias externas:** `react-router`
- **Exporta:** `Logo`
- **Usado por:** `src/components/layout/AdminLayout.tsx`, `src/components/layout/PublicLayout.tsx`, `src/pages/public/AuthPages.tsx`

### `src/components/layout/ProtectedRoute.tsx`

- **Nombre / tipo:** `ProtectedRoute.tsx` · TypeScript + JSX (React)
- **Responsabilidad:** Exige sesión y rol para mostrar una ruta.
- **Dependencias externas:** `lucide-react`, `react`, `react-router`
- **Importa:** `src/components/ui/Button.tsx`, `src/components/ui/Feedback.tsx`, `src/context/AuthContext.tsx`, `src/types/db.ts`
- **Exporta:** `ProtectedRoute`
- **Usado por:** `src/App.tsx`
- **Validaciones y seguridad:** Comodidad de navegación; no sustituye RLS.
- **Cómo comprobar que funciona:** Captura e2e_13.

### `src/components/layout/PublicLayout.tsx`

- **Nombre / tipo:** `PublicLayout.tsx` · TypeScript + JSX (React)
- **Responsabilidad:** Cabecera con navegación por rol, carrito, menú móvil y pie de página con contacto.
- **Dependencias externas:** `lucide-react`, `react`, `react-router`
- **Importa:** `src/components/layout/Logo.tsx`, `src/components/ui/Feedback.tsx`, `src/context/AuthContext.tsx`, `src/context/CartContext.tsx`, `src/context/SettingsContext.tsx`
- **Exporta:** `PublicLayout`
- **Usado por:** `src/App.tsx`
- **Validaciones y seguridad:** Oculta opciones que el rol no puede usar.

### `src/components/map/DeliveryMap.tsx`

- **Nombre / tipo:** `DeliveryMap.tsx` · TypeScript + JSX (React)
- **Responsabilidad:** Mapa Leaflet/OSM con búsqueda, clic, arrastre, ubicación actual y círculo de cobertura.
- **Relación con el negocio:** Entrega a domicilio.
- **Dependencias externas:** `leaflet`, `leaflet/dist/leaflet.css`, `lucide-react`, `react`, `react-leaflet`
- **Importa:** `src/components/ui/Button.tsx`, `src/lib/geo.ts`
- **Exporta:** `DeliveryMap`
- **Usado por:** `src/components/map/FulfillmentPicker.tsx`, `src/pages/customer/ProfilePage.tsx`
- **Validaciones y seguridad:** Búsqueda solo bajo demanda (política de Nominatim).
- **Cómo comprobar que funciona:** Captura e2e_02.
- **Para ampliarlo:** Cambiar proveedor de teselas.

### `src/components/map/FulfillmentPicker.tsx`

- **Nombre / tipo:** `FulfillmentPicker.tsx` · TypeScript + JSX (React)
- **Responsabilidad:** Selector recojo/entrega con direcciones guardadas y tarifa calculada por la BD.
- **Dependencias externas:** `lucide-react`, `react`
- **Importa:** `src/components/map/DeliveryMap.tsx`, `src/components/ui/Feedback.tsx`, `src/components/ui/Field.tsx`, `src/context/SettingsContext.tsx`, `src/lib/errors.ts`, `src/lib/format.ts`, `src/lib/fulfillment.ts`, `src/services/account.ts`, `src/services/orders.ts`, `src/types/db.ts`
- **Exporta:** `FulfillmentPicker`, `FulfillmentValue`
- **Usado por:** `src/pages/customer/CheckoutPage.tsx`, `src/pages/customer/QuoteRequestPage.tsx`
- **Validaciones y seguridad:** La tarifa mostrada viene de delivery_quote.
- **Cómo comprobar que funciona:** Captura e2e_02.

### `src/components/orders/OrderBits.tsx`

- **Nombre / tipo:** `OrderBits.tsx` · TypeScript + JSX (React)
- **Responsabilidad:** Estado, línea de tiempo, totales y tabla de pagos de un pedido.
- **Relación con el negocio:** Seguimiento claro de anticipos y saldos.
- **Dependencias externas:** `lucide-react`
- **Importa:** `src/components/ui/Feedback.tsx`, `src/lib/format.ts`, `src/lib/orderStatus.ts`, `src/types/db.ts`
- **Exporta:** `OrderStatusBadge`, `OrderTimeline`, `OrderTotals`, `PaymentsTable`
- **Usado por:** `src/components/components.test.tsx`, `src/pages/admin/AdminOrderDetailPage.tsx`, `src/pages/admin/AdminOrdersPage.tsx`, `src/pages/customer/OrderDetailPage.tsx`, `src/pages/customer/OrdersPage.tsx`
- **Cómo comprobar que funciona:** Pruebas OrderTotals.

### `src/components/payments/CardPayment.tsx`

- **Nombre / tipo:** `CardPayment.tsx` · TypeScript + JSX (React)
- **Responsabilidad:** Pago con Stripe Elements y espera de confirmación por webhook.
- **Dependencias externas:** `@stripe/react-stripe-js`, `@stripe/stripe-js`, `lucide-react`, `react`
- **Importa:** `src/components/ui/Button.tsx`, `src/components/ui/Feedback.tsx`, `src/context/ToastContext.tsx`, `src/lib/format.ts`, `src/lib/idempotency.ts`, `src/lib/rules.ts`, `src/lib/supabase.ts`, `src/services/payments.ts`, `src/types/db.ts`
- **Exporta:** `CardPayment`
- **Usado por:** `src/components/payments/PaymentPanel.tsx`
- **Validaciones y seguridad:** Datos de tarjeta solo en Stripe.
- **Cómo comprobar que funciona:** Prueba manual con tarjetas de prueba de Stripe.

### `src/components/payments/PaymentPanel.tsx`

- **Nombre / tipo:** `PaymentPanel.tsx` · TypeScript + JSX (React)
- **Responsabilidad:** Elección de monto (anticipo/saldo) y método (QR/tarjeta).
- **Relación con el negocio:** Cobro de anticipos.
- **Dependencias externas:** `lucide-react`, `react`
- **Importa:** `src/components/payments/CardPayment.tsx`, `src/components/payments/QrPayment.tsx`, `src/components/ui/Feedback.tsx`, `src/context/SettingsContext.tsx`, `src/lib/format.ts`, `src/lib/supabase.ts`, `src/types/db.ts`
- **Exporta:** `PaymentPanel`
- **Usado por:** `src/pages/customer/OrderDetailPage.tsx`
- **Validaciones y seguridad:** Muestra aviso de entorno de pruebas.
- **Cómo comprobar que funciona:** Captura e2e_04.
- **Para ampliarlo:** Agregar métodos.

### `src/components/payments/QrPayment.tsx`

- **Nombre / tipo:** `QrPayment.tsx` · TypeScript + JSX (React)
- **Responsabilidad:** Flujo QR: genera intento, cuenta regresiva, consulta cada 10 s, estados.
- **Dependencias externas:** `lucide-react`, `qrcode.react`, `react`
- **Importa:** `src/components/ui/Button.tsx`, `src/components/ui/Feedback.tsx`, `src/context/ToastContext.tsx`, `src/lib/errors.ts`, `src/lib/format.ts`, `src/lib/idempotency.ts`, `src/lib/rules.ts`, `src/services/payments.ts`, `src/types/db.ts`
- **Exporta:** `QrPayment`
- **Usado por:** `src/components/payments/PaymentPanel.tsx`
- **Validaciones y seguridad:** El contador nunca aprueba; solo la BD.
- **Cómo comprobar que funciona:** Capturas e2e_04 y e2e_07.
- **Para ampliarlo:** Conectar un proveedor QR real.

### `src/components/ui/Button.tsx`

- **Nombre / tipo:** `Button.tsx` · TypeScript + JSX (React)
- **Responsabilidad:** Botones y enlaces con variantes, tamaños y estado de carga.
- **Dependencias externas:** `lucide-react`, `react`, `react-router`
- **Exporta:** `Button`, `ButtonLink`, `buttonClass`
- **Usado por:** `src/components/layout/ProtectedRoute.tsx`, `src/components/map/DeliveryMap.tsx`, `src/components/payments/CardPayment.tsx`, `src/components/payments/QrPayment.tsx`, `src/components/ui/Feedback.tsx`, `src/components/ui/Modal.tsx`, `src/pages/admin/AdminCategoriesPage.tsx`, `src/pages/admin/AdminCounterSalePage.tsx`, `src/pages/admin/AdminDashboardPage.tsx`, `src/pages/admin/AdminInventoryPage.tsx`, `src/pages/admin/AdminOrderDetailPage.tsx`, `src/pages/admin/AdminProductEditPage.tsx`, `src/pages/admin/AdminProductsPage.tsx`, `src/pages/admin/AdminRecipesPage.tsx`, `src/pages/admin/AdminSettingsPage.tsx`, `src/pages/admin/AdminSuppliersPage.tsx`, `src/pages/admin/AdminUsersPage.tsx`, `src/pages/customer/CartPage.tsx`, `src/pages/customer/CheckoutPage.tsx`, `src/pages/customer/OrderDetailPage.tsx`, `src/pages/customer/OrdersPage.tsx`, `src/pages/customer/ProfilePage.tsx`, `src/pages/customer/QuoteRequestPage.tsx`, `src/pages/employee/EmployeeTasksPage.tsx`, `src/pages/public/AuthPages.tsx`, `src/pages/public/HomePage.tsx`, `src/pages/public/ProductPage.tsx`

### `src/components/ui/Feedback.tsx`

- **Nombre / tipo:** `Feedback.tsx` · TypeScript + JSX (React)
- **Responsabilidad:** Carga, vacío, error, insignias, avisos, encabezados, sin conexión, indicadores.
- **Dependencias externas:** `lucide-react`, `react`
- **Importa:** `src/components/ui/Button.tsx`, `src/hooks/useAsync.ts`
- **Exporta:** `Badge`, `EmptyState`, `ErrorState`, `Notice`, `OfflineBanner`, `PageHeader`, `Spinner`, `StatCard`
- **Usado por:** `src/App.tsx`, `src/components/catalog/ProductCard.tsx`, `src/components/components.test.tsx`, `src/components/layout/AdminLayout.tsx`, `src/components/layout/ProtectedRoute.tsx`, `src/components/layout/PublicLayout.tsx`, `src/components/map/FulfillmentPicker.tsx`, `src/components/orders/OrderBits.tsx`, `src/components/payments/CardPayment.tsx`, `src/components/payments/PaymentPanel.tsx`, `src/components/payments/QrPayment.tsx`, `src/pages/admin/AdminAuditPage.tsx`, `src/pages/admin/AdminCategoriesPage.tsx`, `src/pages/admin/AdminCounterSalePage.tsx`, `src/pages/admin/AdminDashboardPage.tsx`, `src/pages/admin/AdminInventoryPage.tsx`, `src/pages/admin/AdminOrderDetailPage.tsx`, `src/pages/admin/AdminOrdersPage.tsx`, `src/pages/admin/AdminProductEditPage.tsx`, `src/pages/admin/AdminProductionPage.tsx`, `src/pages/admin/AdminProductsPage.tsx`, `src/pages/admin/AdminRecipesPage.tsx`, `src/pages/admin/AdminSettingsPage.tsx`, `src/pages/admin/AdminSuppliersPage.tsx`, `src/pages/admin/AdminUsersPage.tsx`, `src/pages/customer/CartPage.tsx`, `src/pages/customer/CheckoutPage.tsx`, `src/pages/customer/OrderDetailPage.tsx`, `src/pages/customer/OrdersPage.tsx`, `src/pages/customer/ProfilePage.tsx`, `src/pages/customer/QuoteRequestPage.tsx`, `src/pages/employee/EmployeeTasksPage.tsx`, `src/pages/public/AuthPages.tsx`, `src/pages/public/CatalogPage.tsx`, `src/pages/public/HomePage.tsx`, `src/pages/public/ProductPage.tsx`
- **Cómo comprobar que funciona:** Pruebas de componentes.

### `src/components/ui/Field.tsx`

- **Nombre / tipo:** `Field.tsx` · TypeScript + JSX (React)
- **Responsabilidad:** Campos accesibles (etiqueta, ayuda, error) y casilla.
- **Dependencias externas:** `react`
- **Exporta:** `Checkbox`, `InputField`, `SelectField`, `TextAreaField`
- **Usado por:** `src/components/components.test.tsx`, `src/components/map/FulfillmentPicker.tsx`, `src/pages/admin/AdminAuditPage.tsx`, `src/pages/admin/AdminCategoriesPage.tsx`, `src/pages/admin/AdminCounterSalePage.tsx`, `src/pages/admin/AdminDashboardPage.tsx`, `src/pages/admin/AdminInventoryPage.tsx`, `src/pages/admin/AdminOrderDetailPage.tsx`, `src/pages/admin/AdminOrdersPage.tsx`, `src/pages/admin/AdminProductEditPage.tsx`, `src/pages/admin/AdminProductionPage.tsx`, `src/pages/admin/AdminProductsPage.tsx`, `src/pages/admin/AdminRecipesPage.tsx`, `src/pages/admin/AdminSettingsPage.tsx`, `src/pages/admin/AdminSuppliersPage.tsx`, `src/pages/admin/AdminUsersPage.tsx`, `src/pages/customer/CheckoutPage.tsx`, `src/pages/customer/ProfilePage.tsx`, `src/pages/customer/QuoteRequestPage.tsx`, `src/pages/employee/EmployeeTasksPage.tsx`, `src/pages/public/AuthPages.tsx`, `src/pages/public/CatalogPage.tsx`, `src/pages/public/ProductPage.tsx`
- **Validaciones y seguridad:** aria-invalid y aria-describedby.
- **Cómo comprobar que funciona:** Prueba InputField.

### `src/components/ui/Modal.tsx`

- **Nombre / tipo:** `Modal.tsx` · TypeScript + JSX (React)
- **Responsabilidad:** Diálogo modal nativo y diálogo de confirmación con motivo obligatorio.
- **Relación con el negocio:** Confirmaciones de cancelación, pagos, roles.
- **Dependencias externas:** `lucide-react`, `react`
- **Importa:** `src/components/ui/Button.tsx`
- **Exporta:** `ConfirmDialog`, `Modal`
- **Usado por:** `src/pages/admin/AdminInventoryPage.tsx`, `src/pages/admin/AdminOrderDetailPage.tsx`, `src/pages/admin/AdminProductEditPage.tsx`, `src/pages/admin/AdminUsersPage.tsx`, `src/pages/customer/OrderDetailPage.tsx`, `src/pages/customer/ProfilePage.tsx`, `src/pages/employee/EmployeeTasksPage.tsx`

## src/context

### `src/context/AuthContext.tsx`

- **Nombre / tipo:** `AuthContext.tsx` · TypeScript + JSX (React)
- **Responsabilidad:** Sesión de Supabase Auth y perfil/rol del usuario; detecta recuperación de contraseña.
- **Relación con el negocio:** Distingue cliente, empleado y administrador.
- **Dependencias externas:** `@supabase/supabase-js`, `react`
- **Importa:** `src/lib/supabase.ts`, `src/services/account.ts`, `src/types/db.ts`
- **Exporta:** `AuthProvider`, `useAuth`
- **Servicios de Supabase:** Auth
- **Usado por:** `src/components/layout/AdminLayout.tsx`, `src/components/layout/ProtectedRoute.tsx`, `src/components/layout/PublicLayout.tsx`, `src/context/CartContext.tsx`, `src/main.tsx`, `src/pages/admin/AdminUsersPage.tsx`, `src/pages/customer/OrdersPage.tsx`, `src/pages/customer/ProfilePage.tsx`, `src/pages/customer/QuoteRequestPage.tsx`, `src/pages/public/AuthPages.tsx`, `src/pages/public/ProductPage.tsx`
- **Validaciones y seguridad:** El rol se lee de profiles (no del navegador).
- **Cómo comprobar que funciona:** Iniciar sesión cambia el menú.

### `src/context/CartContext.tsx`

- **Nombre / tipo:** `CartContext.tsx` · TypeScript + JSX (React)
- **Responsabilidad:** Contador del carrito en la cabecera.
- **Dependencias externas:** `react`
- **Importa:** `src/context/AuthContext.tsx`, `src/services/cart.ts`
- **Exporta:** `CartProvider`, `useCart`
- **Usado por:** `src/components/layout/PublicLayout.tsx`, `src/main.tsx`, `src/pages/customer/CartPage.tsx`, `src/pages/customer/CheckoutPage.tsx`, `src/pages/public/ProductPage.tsx`

### `src/context/SettingsContext.tsx`

- **Nombre / tipo:** `SettingsContext.tsx` · TypeScript + JSX (React)
- **Responsabilidad:** Parámetros públicos del negocio (contacto, entrega, pagos, cancelación).
- **Dependencias externas:** `react`
- **Importa:** `src/services/admin.ts`, `src/types/db.ts`
- **Exporta:** `SettingsProvider`, `useSettings`
- **Usado por:** `src/components/layout/PublicLayout.tsx`, `src/components/map/FulfillmentPicker.tsx`, `src/components/payments/PaymentPanel.tsx`, `src/main.tsx`, `src/pages/admin/AdminSettingsPage.tsx`, `src/pages/customer/CheckoutPage.tsx`, `src/pages/customer/OrderDetailPage.tsx`, `src/pages/public/HomePage.tsx`
- **Validaciones y seguridad:** Solo lee filas is_public.

### `src/context/ToastContext.tsx`

- **Nombre / tipo:** `ToastContext.tsx` · TypeScript + JSX (React)
- **Responsabilidad:** Notificaciones accesibles de éxito, advertencia y error.
- **Dependencias externas:** `lucide-react`, `react`
- **Exporta:** `ToastKind`, `ToastProvider`, `useToast`
- **Usado por:** `src/components/payments/CardPayment.tsx`, `src/components/payments/QrPayment.tsx`, `src/main.tsx`, `src/pages/admin/AdminCategoriesPage.tsx`, `src/pages/admin/AdminCounterSalePage.tsx`, `src/pages/admin/AdminDashboardPage.tsx`, `src/pages/admin/AdminInventoryPage.tsx`, `src/pages/admin/AdminOrderDetailPage.tsx`, `src/pages/admin/AdminProductEditPage.tsx`, `src/pages/admin/AdminProductionPage.tsx`, `src/pages/admin/AdminProductsPage.tsx`, `src/pages/admin/AdminRecipesPage.tsx`, `src/pages/admin/AdminSettingsPage.tsx`, `src/pages/admin/AdminSuppliersPage.tsx`, `src/pages/admin/AdminUsersPage.tsx`, `src/pages/customer/CartPage.tsx`, `src/pages/customer/CheckoutPage.tsx`, `src/pages/customer/OrderDetailPage.tsx`, `src/pages/customer/ProfilePage.tsx`, `src/pages/customer/QuoteRequestPage.tsx`, `src/pages/employee/EmployeeTasksPage.tsx`, `src/pages/public/AuthPages.tsx`, `src/pages/public/ProductPage.tsx`

## src/hooks

### `src/hooks/useAsync.ts`

- **Nombre / tipo:** `useAsync.ts` · TypeScript
- **Responsabilidad:** Carga de datos con estados (carga, error, recarga) y estado de conexión.
- **Dependencias externas:** `react`
- **Importa:** `src/lib/errors.ts`
- **Exporta:** `AsyncState`, `useAsync`, `useOnline`
- **Usado por:** `src/components/ui/Feedback.tsx`, `src/pages/admin/AdminAuditPage.tsx`, `src/pages/admin/AdminCategoriesPage.tsx`, `src/pages/admin/AdminCounterSalePage.tsx`, `src/pages/admin/AdminDashboardPage.tsx`, `src/pages/admin/AdminInventoryPage.tsx`, `src/pages/admin/AdminOrderDetailPage.tsx`, `src/pages/admin/AdminOrdersPage.tsx`, `src/pages/admin/AdminProductEditPage.tsx`, `src/pages/admin/AdminProductionPage.tsx`, `src/pages/admin/AdminProductsPage.tsx`, `src/pages/admin/AdminRecipesPage.tsx`, `src/pages/admin/AdminSettingsPage.tsx`, `src/pages/admin/AdminSuppliersPage.tsx`, `src/pages/admin/AdminUsersPage.tsx`, `src/pages/customer/CartPage.tsx`, `src/pages/customer/CheckoutPage.tsx`, `src/pages/customer/OrderDetailPage.tsx`, `src/pages/customer/OrdersPage.tsx`, `src/pages/customer/ProfilePage.tsx`, `src/pages/customer/QuoteRequestPage.tsx`, `src/pages/employee/EmployeeTasksPage.tsx`, `src/pages/public/CatalogPage.tsx`, `src/pages/public/HomePage.tsx`, `src/pages/public/ProductPage.tsx`

## src/index.css

### `src/index.css`

- **Nombre / tipo:** `index.css` · CSS (Tailwind v4)
- **Responsabilidad:** Tailwind v4, paleta de la marca, tipografías, componentes base y reducción de movimiento.
- **Relación con el negocio:** Identidad visual alegre y legible.
- **Usado por:** `src/main.tsx`
- **Cómo comprobar que funciona:** Se ve en todas las pantallas.
- **Para ampliarlo:** Cambiar colores en @theme.

## src/lib

### `src/lib/env.ts`

- **Nombre / tipo:** `env.ts` · TypeScript
- **Responsabilidad:** Lee y valida variables públicas; rechaza claves secretas en el navegador.
- **Exporta:** `EnvError`, `PublicEnv`, `readPublicEnv`
- **Variables de entorno:** `VITE_SITE_URL`, `VITE_STRIPE_PUBLISHABLE_KEY`, `VITE_SUPABASE_ANON_KEY`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_URL`
- **Usado por:** `src/lib/lib.test.ts`, `src/lib/supabase.ts`
- **Validaciones y seguridad:** Detecta sb_secret_, sk_, whsec_ y JWT service_role.
- **Cómo comprobar que funciona:** Pruebas en lib.test.ts.

### `src/lib/errors.ts`

- **Nombre / tipo:** `errors.ts` · TypeScript
- **Responsabilidad:** Traduce errores de red, Auth, PostgREST y PostgreSQL a mensajes en español.
- **Exporta:** `AppError`, `errorMessage`, `toAppError`
- **Usado por:** `src/components/map/FulfillmentPicker.tsx`, `src/components/payments/QrPayment.tsx`, `src/hooks/useAsync.ts`, `src/lib/lib.test.ts`, `src/pages/admin/AdminCategoriesPage.tsx`, `src/pages/admin/AdminCounterSalePage.tsx`, `src/pages/admin/AdminDashboardPage.tsx`, `src/pages/admin/AdminInventoryPage.tsx`, `src/pages/admin/AdminOrderDetailPage.tsx`, `src/pages/admin/AdminProductEditPage.tsx`, `src/pages/admin/AdminProductionPage.tsx`, `src/pages/admin/AdminProductsPage.tsx`, `src/pages/admin/AdminRecipesPage.tsx`, `src/pages/admin/AdminSettingsPage.tsx`, `src/pages/admin/AdminSuppliersPage.tsx`, `src/pages/admin/AdminUsersPage.tsx`, `src/pages/customer/CartPage.tsx`, `src/pages/customer/CheckoutPage.tsx`, `src/pages/customer/OrderDetailPage.tsx`, `src/pages/customer/ProfilePage.tsx`, `src/pages/customer/QuoteRequestPage.tsx`, `src/pages/employee/EmployeeTasksPage.tsx`, `src/pages/public/AuthPages.tsx`, `src/pages/public/ProductPage.tsx`
- **Validaciones y seguridad:** No muestra detalles técnicos sensibles.
- **Cómo comprobar que funciona:** Pruebas en lib.test.ts.
- **Para ampliarlo:** Agregar traducciones.

### `src/lib/format.ts`

- **Nombre / tipo:** `format.ts` · TypeScript
- **Responsabilidad:** Moneda (Bs), fechas en America/La_Paz, minutos, etiquetas y slugs.
- **Importa:** `src/types/db.ts`
- **Exporta:** `MEASURE_UNIT_LABEL`, `MOVEMENT_LABEL`, `PAYMENT_METHOD_LABEL`, `PAYMENT_STATUS_LABEL`, `SALE_UNIT_LABEL`, `TASK_STATUS_LABEL`, `addDays`, `formatDate`, `formatDateTime`, `formatMinutes`, `formatMoney`, `formatQty`, `parseDateOnly`, `slugify`, `todayInLaPaz`
- **Usado por:** `src/components/catalog/ProductCard.tsx`, `src/components/map/FulfillmentPicker.tsx`, `src/components/orders/OrderBits.tsx`, `src/components/payments/CardPayment.tsx`, `src/components/payments/PaymentPanel.tsx`, `src/components/payments/QrPayment.tsx`, `src/lib/lib.test.ts`, `src/pages/admin/AdminAuditPage.tsx`, `src/pages/admin/AdminCategoriesPage.tsx`, `src/pages/admin/AdminCounterSalePage.tsx`, `src/pages/admin/AdminDashboardPage.tsx`, `src/pages/admin/AdminInventoryPage.tsx`, `src/pages/admin/AdminOrderDetailPage.tsx`, `src/pages/admin/AdminOrdersPage.tsx`, `src/pages/admin/AdminProductEditPage.tsx`, `src/pages/admin/AdminProductionPage.tsx`, `src/pages/admin/AdminProductsPage.tsx`, `src/pages/admin/AdminRecipesPage.tsx`, `src/pages/admin/AdminUsersPage.tsx`, `src/pages/customer/CartPage.tsx`, `src/pages/customer/CheckoutPage.tsx`, `src/pages/customer/OrderDetailPage.tsx`, `src/pages/customer/OrdersPage.tsx`, `src/pages/customer/QuoteRequestPage.tsx`, `src/pages/employee/EmployeeTasksPage.tsx`, `src/pages/public/ProductPage.tsx`
- **Cómo comprobar que funciona:** Pruebas en lib.test.ts.

### `src/lib/fulfillment.ts`

- **Nombre / tipo:** `fulfillment.ts` · TypeScript
- **Responsabilidad:** Tipo y valor inicial del selector recojo/entrega.
- **Importa:** `src/types/db.ts`
- **Exporta:** `EMPTY_FULFILLMENT`, `FulfillmentValue`
- **Usado por:** `src/components/map/FulfillmentPicker.tsx`, `src/pages/customer/CheckoutPage.tsx`, `src/pages/customer/QuoteRequestPage.tsx`

### `src/lib/geo.ts`

- **Nombre / tipo:** `geo.ts` · TypeScript
- **Responsabilidad:** Haversine, vista previa de tarifa y búsqueda Nominatim (con caché y límite de 1/s).
- **Relación con el negocio:** Entregas a domicilio en La Paz.
- **Importa:** `src/types/db.ts`
- **Exporta:** `GeocodeResult`, `LA_PAZ_CENTER`, `LA_PAZ_VIEWBOX`, `geocodeLaPaz`, `haversineKm`, `previewDeliveryFee`
- **Usado por:** `src/components/map/DeliveryMap.tsx`, `src/lib/lib.test.ts`
- **Validaciones y seguridad:** La tarifa oficial la calcula la BD.
- **Cómo comprobar que funciona:** Pruebas en lib.test.ts (coincide con la BD).
- **Para ampliarlo:** Cambiar proveedor de geocodificación.

### `src/lib/idempotency.ts`

- **Nombre / tipo:** `idempotency.ts` · TypeScript
- **Responsabilidad:** Genera claves de idempotencia por operación.
- **Relación con el negocio:** Evita pedidos o cobros duplicados.
- **Exporta:** `newIdempotencyKey`
- **Usado por:** `src/components/payments/CardPayment.tsx`, `src/components/payments/QrPayment.tsx`, `src/lib/lib.test.ts`, `src/pages/admin/AdminCounterSalePage.tsx`, `src/pages/admin/AdminOrderDetailPage.tsx`, `src/pages/customer/CheckoutPage.tsx`, `src/pages/customer/QuoteRequestPage.tsx`
- **Cómo comprobar que funciona:** Prueba en lib.test.ts.

### `src/lib/lib.test.ts`

- **Nombre / tipo:** `lib.test.ts` · TypeScript
- **Responsabilidad:** 26 pruebas unitarias de utilidades y reglas.
- **Dependencias externas:** `vitest`
- **Importa:** `src/lib/env.ts`, `src/lib/errors.ts`, `src/lib/format.ts`, `src/lib/geo.ts`, `src/lib/idempotency.ts`, `src/lib/orderStatus.ts`, `src/lib/rules.ts`, `src/lib/validation.ts`, `src/services/cart.ts`, `src/services/catalog.ts`, `src/types/db.ts`
- **Variables de entorno:** `VITE_STRIPE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_URL`
- **Cómo comprobar que funciona:** `npm test`.

### `src/lib/orderStatus.ts`

- **Nombre / tipo:** `orderStatus.ts` · TypeScript
- **Responsabilidad:** Etiquetas, colores, transiciones y pasos de la línea de tiempo del pedido.
- **Relación con el negocio:** Seguimiento de pedidos.
- **Importa:** `src/types/db.ts`
- **Exporta:** `CLOSED_STATUSES`, `ORDER_STATUS_LABEL`, `ORDER_STATUS_TONE`, `PAYABLE_STATUSES`, `adminNextStatuses`, `canTransition`, `timelineSteps`
- **Usado por:** `src/components/orders/OrderBits.tsx`, `src/lib/lib.test.ts`, `src/pages/admin/AdminDashboardPage.tsx`, `src/pages/admin/AdminOrderDetailPage.tsx`, `src/pages/admin/AdminOrdersPage.tsx`, `src/pages/admin/AdminSettingsPage.tsx`, `src/pages/customer/OrderDetailPage.tsx`
- **Validaciones y seguridad:** Las transiciones reales las impone la BD.
- **Cómo comprobar que funciona:** Pruebas en lib.test.ts.
- **Para ampliarlo:** Mantener igual a order_transition_allowed.

### `src/lib/rules.ts`

- **Nombre / tipo:** `rules.ts` · TypeScript
- **Responsabilidad:** Reglas puras de interfaz: disponibilidad, problemas del carrito, costo estimado, redirección segura, mensajes de tarjeta, fases del QR.
- **Importa:** `src/services/cart.ts`, `src/services/production.ts`, `src/types/db.ts`
- **Exporta:** `BadgeTone`, `QrPhase`, `availabilityLabel`, `cardErrorMessage`, `lineProblem`, `qrPhaseFromStatus`, `recipeEstimatedCost`, `safeNext`
- **Usado por:** `src/components/catalog/ProductCard.tsx`, `src/components/payments/CardPayment.tsx`, `src/components/payments/QrPayment.tsx`, `src/lib/lib.test.ts`, `src/pages/admin/AdminRecipesPage.tsx`, `src/pages/customer/CartPage.tsx`, `src/pages/public/AuthPages.tsx`, `src/pages/public/ProductPage.tsx`
- **Validaciones y seguridad:** safeNext evita redirecciones abiertas.
- **Cómo comprobar que funciona:** Pruebas en lib.test.ts.

### `src/lib/storage.ts`

- **Nombre / tipo:** `storage.ts` · TypeScript
- **Responsabilidad:** Subida/lectura de imágenes del catálogo y de diseños (URL firmadas de 10 min).
- **Relación con el negocio:** Fotos de productos y diseños de clientes.
- **Importa:** `src/lib/supabase.ts`, `src/lib/validation.ts`
- **Exporta:** `customizationSignedUrl`, `productImageUrl`, `removeCustomization`, `removeProductImage`, `uploadCustomization`, `uploadProductImage`
- **Servicios de Supabase:** Storage
- **Usado por:** `src/components/catalog/ProductImage.tsx`, `src/pages/admin/AdminOrderDetailPage.tsx`, `src/pages/customer/OrderDetailPage.tsx`, `src/pages/customer/QuoteRequestPage.tsx`, `src/pages/employee/EmployeeTasksPage.tsx`, `src/services/catalogAdmin.ts`
- **Validaciones y seguridad:** Valida tipo/tamaño; diseños en carpeta del usuario.
- **Cómo comprobar que funciona:** Subir una foto desde el panel.

### `src/lib/supabase.ts`

- **Nombre / tipo:** `supabase.ts` · TypeScript
- **Responsabilidad:** Cliente único de Supabase (sesión persistente, PKCE) y nombres de buckets.
- **Relación con el negocio:** Conexión con la base de datos del negocio.
- **Dependencias externas:** `@supabase/supabase-js`
- **Importa:** `src/lib/env.ts`
- **Exporta:** `CUSTOMIZATION_BUCKET`, `PRODUCT_BUCKET`, `configurationError`, `publicEnv`, `supabase`
- **Usado por:** `src/components/payments/CardPayment.tsx`, `src/components/payments/PaymentPanel.tsx`, `src/context/AuthContext.tsx`, `src/lib/storage.ts`, `src/main.tsx`, `src/services/account.ts`, `src/services/admin.ts`, `src/services/adminOrders.ts`, `src/services/cart.ts`, `src/services/catalog.ts`, `src/services/catalogAdmin.ts`, `src/services/inventory.ts`, `src/services/orders.ts`, `src/services/payments.ts`, `src/services/production.ts`
- **Validaciones y seguridad:** Solo usa la clave pública.
- **Cómo comprobar que funciona:** La app carga productos al configurar .env.
- **Para ampliarlo:** Cambiar opciones de autenticación.

### `src/lib/validation.ts`

- **Nombre / tipo:** `validation.ts` · TypeScript
- **Responsabilidad:** Esquemas zod de formularios y validación de imágenes.
- **Dependencias externas:** `zod`
- **Exporta:** `ALLOWED_IMAGE_TYPES`, `MAX_IMAGE_BYTES`, `fieldErrors`, `loginSchema`, `productSchema`, `profileSchema`, `quoteRequestSchema`, `registerSchema`, `resetPasswordSchema`, `validateImageFile`
- **Usado por:** `src/lib/lib.test.ts`, `src/lib/storage.ts`, `src/pages/admin/AdminProductEditPage.tsx`, `src/pages/customer/ProfilePage.tsx`, `src/pages/customer/QuoteRequestPage.tsx`, `src/pages/public/AuthPages.tsx`
- **Validaciones y seguridad:** Primera barrera; la BD vuelve a validar.
- **Cómo comprobar que funciona:** Pruebas en lib.test.ts.
- **Para ampliarlo:** Agregar esquemas por formulario.

## src/main.tsx

### `src/main.tsx`

- **Nombre / tipo:** `main.tsx` · TypeScript + JSX (React)
- **Responsabilidad:** Arranque: estilos, proveedores globales y pantalla de error de configuración.
- **Dependencias externas:** `react`, `react-dom/client`
- **Importa:** `src/App.tsx`, `src/context/AuthContext.tsx`, `src/context/CartContext.tsx`, `src/context/SettingsContext.tsx`, `src/context/ToastContext.tsx`, `src/index.css`, `src/lib/supabase.ts`
- **Validaciones y seguridad:** Si falta o es inválida la configuración, no inicia y explica el motivo.
- **Cómo comprobar que funciona:** Sin .env muestra la pantalla de configuración pendiente.

## src/pages

### `src/pages/admin/AdminAuditPage.tsx`

- **Nombre / tipo:** `AdminAuditPage.tsx` · TypeScript + JSX (React)
- **Responsabilidad:** Consulta del registro de auditoría.
- **Dependencias externas:** `react`
- **Importa:** `src/components/ui/Feedback.tsx`, `src/components/ui/Field.tsx`, `src/hooks/useAsync.ts`, `src/lib/format.ts`, `src/services/admin.ts`
- **Exporta:** `AdminAuditPage`
- **Usado por:** `src/App.tsx`
- **Validaciones y seguridad:** Los permisos los valida la BD; la página solo es la interfaz.
- **Cómo comprobar que funciona:** Navegar a la ruta correspondiente (ver manual, cap. 10).

### `src/pages/admin/AdminCategoriesPage.tsx`

- **Nombre / tipo:** `AdminCategoriesPage.tsx` · TypeScript + JSX (React)
- **Responsabilidad:** Gestión de categorías.
- **Dependencias externas:** `lucide-react`, `react`
- **Importa:** `src/components/ui/Button.tsx`, `src/components/ui/Feedback.tsx`, `src/components/ui/Field.tsx`, `src/context/ToastContext.tsx`, `src/hooks/useAsync.ts`, `src/lib/errors.ts`, `src/lib/format.ts`, `src/services/catalogAdmin.ts`, `src/types/db.ts`
- **Exporta:** `AdminCategoriesPage`
- **Usado por:** `src/App.tsx`
- **Validaciones y seguridad:** Los permisos los valida la BD; la página solo es la interfaz.
- **Cómo comprobar que funciona:** Navegar a la ruta correspondiente (ver manual, cap. 10).

### `src/pages/admin/AdminCounterSalePage.tsx`

- **Nombre / tipo:** `AdminCounterSalePage.tsx` · TypeScript + JSX (React)
- **Responsabilidad:** Venta presencial con descuento inmediato de existencias.
- **Dependencias externas:** `lucide-react`, `react`, `react-router`
- **Importa:** `src/components/ui/Button.tsx`, `src/components/ui/Feedback.tsx`, `src/components/ui/Field.tsx`, `src/context/ToastContext.tsx`, `src/hooks/useAsync.ts`, `src/lib/errors.ts`, `src/lib/format.ts`, `src/lib/idempotency.ts`, `src/services/adminOrders.ts`, `src/services/catalogAdmin.ts`, `src/services/inventory.ts`, `src/types/db.ts`
- **Exporta:** `AdminCounterSalePage`
- **Usado por:** `src/App.tsx`
- **Validaciones y seguridad:** Los permisos los valida la BD; la página solo es la interfaz.
- **Cómo comprobar que funciona:** Navegar a la ruta correspondiente (ver manual, cap. 10).

### `src/pages/admin/AdminDashboardPage.tsx`

- **Nombre / tipo:** `AdminDashboardPage.tsx` · TypeScript + JSX (React)
- **Responsabilidad:** Indicadores del negocio por periodo y liberación de reservas vencidas.
- **Dependencias externas:** `lucide-react`, `react`, `react-router`
- **Importa:** `src/components/ui/Button.tsx`, `src/components/ui/Feedback.tsx`, `src/components/ui/Field.tsx`, `src/context/ToastContext.tsx`, `src/hooks/useAsync.ts`, `src/lib/errors.ts`, `src/lib/format.ts`, `src/lib/orderStatus.ts`, `src/services/admin.ts`, `src/services/adminOrders.ts`, `src/types/db.ts`
- **Exporta:** `AdminDashboardPage`
- **Usado por:** `src/App.tsx`
- **Validaciones y seguridad:** Los permisos los valida la BD; la página solo es la interfaz.
- **Cómo comprobar que funciona:** Navegar a la ruta correspondiente (ver manual, cap. 10).

### `src/pages/admin/AdminInventoryPage.tsx`

- **Nombre / tipo:** `AdminInventoryPage.tsx` · TypeScript + JSX (React)
- **Responsabilidad:** Existencias, ingresos, ajustes con motivo, materiales y movimientos.
- **Dependencias externas:** `lucide-react`, `react`
- **Importa:** `src/components/ui/Button.tsx`, `src/components/ui/Feedback.tsx`, `src/components/ui/Field.tsx`, `src/components/ui/Modal.tsx`, `src/context/ToastContext.tsx`, `src/hooks/useAsync.ts`, `src/lib/errors.ts`, `src/lib/format.ts`, `src/services/inventory.ts`, `src/types/db.ts`
- **Exporta:** `AdminInventoryPage`
- **Usado por:** `src/App.tsx`
- **Validaciones y seguridad:** Los permisos los valida la BD; la página solo es la interfaz.
- **Cómo comprobar que funciona:** Navegar a la ruta correspondiente (ver manual, cap. 10).

### `src/pages/admin/AdminOrderDetailPage.tsx`

- **Nombre / tipo:** `AdminOrderDetailPage.tsx` · TypeScript + JSX (React)
- **Responsabilidad:** Gestión de un pedido: cotización, estados, pagos, reembolsos, QR de prueba, tareas.
- **Dependencias externas:** `lucide-react`, `react`, `react-router`
- **Importa:** `src/components/orders/OrderBits.tsx`, `src/components/ui/Button.tsx`, `src/components/ui/Feedback.tsx`, `src/components/ui/Field.tsx`, `src/components/ui/Modal.tsx`, `src/context/ToastContext.tsx`, `src/hooks/useAsync.ts`, `src/lib/errors.ts`, `src/lib/format.ts`, `src/lib/idempotency.ts`, `src/lib/orderStatus.ts`, `src/lib/storage.ts`, `src/services/admin.ts`, `src/services/adminOrders.ts`, `src/services/inventory.ts`, `src/services/orders.ts`, `src/services/production.ts`, `src/types/db.ts`
- **Exporta:** `AdminOrderDetailPage`
- **Servicios de Supabase:** Storage
- **Usado por:** `src/App.tsx`
- **Validaciones y seguridad:** Los permisos los valida la BD; la página solo es la interfaz.
- **Cómo comprobar que funciona:** Navegar a la ruta correspondiente (ver manual, cap. 10).

### `src/pages/admin/AdminOrdersPage.tsx`

- **Nombre / tipo:** `AdminOrdersPage.tsx` · TypeScript + JSX (React)
- **Responsabilidad:** Listado y filtros de pedidos.
- **Dependencias externas:** `react`, `react-router`
- **Importa:** `src/components/orders/OrderBits.tsx`, `src/components/ui/Feedback.tsx`, `src/components/ui/Field.tsx`, `src/hooks/useAsync.ts`, `src/lib/format.ts`, `src/lib/orderStatus.ts`, `src/services/adminOrders.ts`, `src/types/db.ts`
- **Exporta:** `AdminOrdersPage`
- **Usado por:** `src/App.tsx`
- **Validaciones y seguridad:** Los permisos los valida la BD; la página solo es la interfaz.
- **Cómo comprobar que funciona:** Navegar a la ruta correspondiente (ver manual, cap. 10).

### `src/pages/admin/AdminProductEditPage.tsx`

- **Nombre / tipo:** `AdminProductEditPage.tsx` · TypeScript + JSX (React)
- **Responsabilidad:** Alta/edición de producto, fotos y plantillas.
- **Dependencias externas:** `lucide-react`, `react`, `react-router`
- **Importa:** `src/components/catalog/ProductImage.tsx`, `src/components/ui/Button.tsx`, `src/components/ui/Feedback.tsx`, `src/components/ui/Field.tsx`, `src/components/ui/Modal.tsx`, `src/context/ToastContext.tsx`, `src/hooks/useAsync.ts`, `src/lib/errors.ts`, `src/lib/format.ts`, `src/lib/validation.ts`, `src/services/catalogAdmin.ts`, `src/types/db.ts`
- **Exporta:** `AdminProductEditPage`
- **Usado por:** `src/App.tsx`
- **Validaciones y seguridad:** Los permisos los valida la BD; la página solo es la interfaz.
- **Cómo comprobar que funciona:** Navegar a la ruta correspondiente (ver manual, cap. 10).

### `src/pages/admin/AdminProductionPage.tsx`

- **Nombre / tipo:** `AdminProductionPage.tsx` · TypeScript + JSX (React)
- **Responsabilidad:** Asignación de tareas, fechas y atrasos.
- **Dependencias externas:** `react`, `react-router`
- **Importa:** `src/components/ui/Feedback.tsx`, `src/components/ui/Field.tsx`, `src/context/ToastContext.tsx`, `src/hooks/useAsync.ts`, `src/lib/errors.ts`, `src/lib/format.ts`, `src/services/admin.ts`, `src/services/production.ts`
- **Exporta:** `AdminProductionPage`
- **Usado por:** `src/App.tsx`
- **Validaciones y seguridad:** Los permisos los valida la BD; la página solo es la interfaz.
- **Cómo comprobar que funciona:** Navegar a la ruta correspondiente (ver manual, cap. 10).

### `src/pages/admin/AdminProductsPage.tsx`

- **Nombre / tipo:** `AdminProductsPage.tsx` · TypeScript + JSX (React)
- **Responsabilidad:** Listado de productos con publicar/destacar.
- **Dependencias externas:** `lucide-react`, `react`, `react-router`
- **Importa:** `src/components/catalog/ProductImage.tsx`, `src/components/ui/Button.tsx`, `src/components/ui/Feedback.tsx`, `src/components/ui/Field.tsx`, `src/context/ToastContext.tsx`, `src/hooks/useAsync.ts`, `src/lib/errors.ts`, `src/lib/format.ts`, `src/services/catalogAdmin.ts`, `src/types/db.ts`
- **Exporta:** `AdminProductsPage`
- **Usado por:** `src/App.tsx`
- **Validaciones y seguridad:** Los permisos los valida la BD; la página solo es la interfaz.
- **Cómo comprobar que funciona:** Navegar a la ruta correspondiente (ver manual, cap. 10).

### `src/pages/admin/AdminRecipesPage.tsx`

- **Nombre / tipo:** `AdminRecipesPage.tsx` · TypeScript + JSX (React)
- **Responsabilidad:** Recetas versionadas: materiales, etapas, tiempos y costo estimado.
- **Dependencias externas:** `lucide-react`, `react`
- **Importa:** `src/components/ui/Button.tsx`, `src/components/ui/Feedback.tsx`, `src/components/ui/Field.tsx`, `src/context/ToastContext.tsx`, `src/hooks/useAsync.ts`, `src/lib/errors.ts`, `src/lib/format.ts`, `src/lib/rules.ts`, `src/services/catalogAdmin.ts`, `src/services/inventory.ts`, `src/services/production.ts`, `src/types/db.ts`
- **Exporta:** `AdminRecipesPage`
- **Usado por:** `src/App.tsx`
- **Validaciones y seguridad:** Los permisos los valida la BD; la página solo es la interfaz.
- **Cómo comprobar que funciona:** Navegar a la ruta correspondiente (ver manual, cap. 10).

### `src/pages/admin/AdminSettingsPage.tsx`

- **Nombre / tipo:** `AdminSettingsPage.tsx` · TypeScript + JSX (React)
- **Responsabilidad:** Parámetros de negocio, entregas, capacidad, pagos y cancelación.
- **Dependencias externas:** `react`
- **Importa:** `src/components/ui/Button.tsx`, `src/components/ui/Feedback.tsx`, `src/components/ui/Field.tsx`, `src/context/SettingsContext.tsx`, `src/context/ToastContext.tsx`, `src/hooks/useAsync.ts`, `src/lib/errors.ts`, `src/lib/orderStatus.ts`, `src/services/admin.ts`, `src/types/db.ts`
- **Exporta:** `AdminSettingsPage`
- **Usado por:** `src/App.tsx`
- **Validaciones y seguridad:** Los permisos los valida la BD; la página solo es la interfaz.
- **Cómo comprobar que funciona:** Navegar a la ruta correspondiente (ver manual, cap. 10).

### `src/pages/admin/AdminSuppliersPage.tsx`

- **Nombre / tipo:** `AdminSuppliersPage.tsx` · TypeScript + JSX (React)
- **Responsabilidad:** Gestión de proveedores.
- **Dependencias externas:** `lucide-react`, `react`
- **Importa:** `src/components/ui/Button.tsx`, `src/components/ui/Feedback.tsx`, `src/components/ui/Field.tsx`, `src/context/ToastContext.tsx`, `src/hooks/useAsync.ts`, `src/lib/errors.ts`, `src/services/inventory.ts`, `src/types/db.ts`
- **Exporta:** `AdminSuppliersPage`
- **Usado por:** `src/App.tsx`
- **Validaciones y seguridad:** Los permisos los valida la BD; la página solo es la interfaz.
- **Cómo comprobar que funciona:** Navegar a la ruta correspondiente (ver manual, cap. 10).

### `src/pages/admin/AdminUsersPage.tsx`

- **Nombre / tipo:** `AdminUsersPage.tsx` · TypeScript + JSX (React)
- **Responsabilidad:** Roles y activación de cuentas (alta de empleados).
- **Dependencias externas:** `react`
- **Importa:** `src/components/ui/Button.tsx`, `src/components/ui/Feedback.tsx`, `src/components/ui/Field.tsx`, `src/components/ui/Modal.tsx`, `src/context/AuthContext.tsx`, `src/context/ToastContext.tsx`, `src/hooks/useAsync.ts`, `src/lib/errors.ts`, `src/lib/format.ts`, `src/services/admin.ts`, `src/types/db.ts`
- **Exporta:** `AdminUsersPage`
- **Usado por:** `src/App.tsx`
- **Validaciones y seguridad:** Los permisos los valida la BD; la página solo es la interfaz.
- **Cómo comprobar que funciona:** Navegar a la ruta correspondiente (ver manual, cap. 10).

### `src/pages/customer/CartPage.tsx`

- **Nombre / tipo:** `CartPage.tsx` · TypeScript + JSX (React)
- **Responsabilidad:** Carrito con validación de cantidades y existencias.
- **Dependencias externas:** `lucide-react`, `react`, `react-router`
- **Importa:** `src/components/catalog/ProductImage.tsx`, `src/components/ui/Button.tsx`, `src/components/ui/Feedback.tsx`, `src/context/CartContext.tsx`, `src/context/ToastContext.tsx`, `src/hooks/useAsync.ts`, `src/lib/errors.ts`, `src/lib/format.ts`, `src/lib/rules.ts`, `src/services/cart.ts`, `src/services/catalog.ts`
- **Exporta:** `CartPage`
- **Usado por:** `src/App.tsx`
- **Cómo comprobar que funciona:** Navegar a la ruta correspondiente (ver manual, cap. 10).

### `src/pages/customer/CheckoutPage.tsx`

- **Nombre / tipo:** `CheckoutPage.tsx` · TypeScript + JSX (React)
- **Responsabilidad:** Confirmación: recojo/entrega con mapa, fecha y resumen; maneja fecha sugerida.
- **Dependencias externas:** `lucide-react`, `react`, `react-router`
- **Importa:** `src/components/map/FulfillmentPicker.tsx`, `src/components/ui/Button.tsx`, `src/components/ui/Feedback.tsx`, `src/components/ui/Field.tsx`, `src/context/CartContext.tsx`, `src/context/SettingsContext.tsx`, `src/context/ToastContext.tsx`, `src/hooks/useAsync.ts`, `src/lib/errors.ts`, `src/lib/format.ts`, `src/lib/fulfillment.ts`, `src/lib/idempotency.ts`, `src/services/cart.ts`, `src/services/orders.ts`, `src/types/db.ts`
- **Exporta:** `CheckoutPage`
- **Usado por:** `src/App.tsx`
- **Cómo comprobar que funciona:** Navegar a la ruta correspondiente (ver manual, cap. 10).

### `src/pages/customer/OrderDetailPage.tsx`

- **Nombre / tipo:** `OrderDetailPage.tsx` · TypeScript + JSX (React)
- **Responsabilidad:** Seguimiento, cotización (aceptar/rechazar), pagos y cancelación.
- **Dependencias externas:** `lucide-react`, `react`, `react-router`
- **Importa:** `src/components/orders/OrderBits.tsx`, `src/components/payments/PaymentPanel.tsx`, `src/components/ui/Button.tsx`, `src/components/ui/Feedback.tsx`, `src/components/ui/Modal.tsx`, `src/context/SettingsContext.tsx`, `src/context/ToastContext.tsx`, `src/hooks/useAsync.ts`, `src/lib/errors.ts`, `src/lib/format.ts`, `src/lib/orderStatus.ts`, `src/lib/storage.ts`, `src/services/orders.ts`
- **Exporta:** `OrderDetailPage`
- **Servicios de Supabase:** Storage
- **Usado por:** `src/App.tsx`
- **Cómo comprobar que funciona:** Navegar a la ruta correspondiente (ver manual, cap. 10).

### `src/pages/customer/OrdersPage.tsx`

- **Nombre / tipo:** `OrdersPage.tsx` · TypeScript + JSX (React)
- **Responsabilidad:** Historial de pedidos del cliente.
- **Dependencias externas:** `lucide-react`, `react-router`
- **Importa:** `src/components/orders/OrderBits.tsx`, `src/components/ui/Button.tsx`, `src/components/ui/Feedback.tsx`, `src/context/AuthContext.tsx`, `src/hooks/useAsync.ts`, `src/lib/format.ts`, `src/services/orders.ts`
- **Exporta:** `OrdersPage`
- **Usado por:** `src/App.tsx`
- **Cómo comprobar que funciona:** Navegar a la ruta correspondiente (ver manual, cap. 10).

### `src/pages/customer/ProfilePage.tsx`

- **Nombre / tipo:** `ProfilePage.tsx` · TypeScript + JSX (React)
- **Responsabilidad:** Datos personales y direcciones guardadas.
- **Dependencias externas:** `lucide-react`, `react`
- **Importa:** `src/components/map/DeliveryMap.tsx`, `src/components/ui/Button.tsx`, `src/components/ui/Feedback.tsx`, `src/components/ui/Field.tsx`, `src/components/ui/Modal.tsx`, `src/context/AuthContext.tsx`, `src/context/ToastContext.tsx`, `src/hooks/useAsync.ts`, `src/lib/errors.ts`, `src/lib/validation.ts`, `src/services/account.ts`
- **Exporta:** `ProfilePage`
- **Usado por:** `src/App.tsx`
- **Cómo comprobar que funciona:** Navegar a la ruta correspondiente (ver manual, cap. 10).

### `src/pages/customer/QuoteRequestPage.tsx`

- **Nombre / tipo:** `QuoteRequestPage.tsx` · TypeScript + JSX (React)
- **Responsabilidad:** Solicitud de cotización con imagen propia o plantilla.
- **Dependencias externas:** `lucide-react`, `react`, `react-router`
- **Importa:** `src/components/map/FulfillmentPicker.tsx`, `src/components/ui/Button.tsx`, `src/components/ui/Feedback.tsx`, `src/components/ui/Field.tsx`, `src/context/AuthContext.tsx`, `src/context/ToastContext.tsx`, `src/hooks/useAsync.ts`, `src/lib/errors.ts`, `src/lib/format.ts`, `src/lib/fulfillment.ts`, `src/lib/idempotency.ts`, `src/lib/storage.ts`, `src/lib/validation.ts`, `src/services/catalog.ts`, `src/services/orders.ts`, `src/types/db.ts`
- **Exporta:** `QuoteRequestPage`
- **Servicios de Supabase:** Storage
- **Usado por:** `src/App.tsx`
- **Cómo comprobar que funciona:** Navegar a la ruta correspondiente (ver manual, cap. 10).

### `src/pages/employee/EmployeeTasksPage.tsx`

- **Nombre / tipo:** `EmployeeTasksPage.tsx` · TypeScript + JSX (React)
- **Responsabilidad:** Tareas asignadas en lista y semana; avance, bloqueo, historial.
- **Dependencias externas:** `lucide-react`, `react`
- **Importa:** `src/components/ui/Button.tsx`, `src/components/ui/Feedback.tsx`, `src/components/ui/Field.tsx`, `src/components/ui/Modal.tsx`, `src/context/ToastContext.tsx`, `src/hooks/useAsync.ts`, `src/lib/errors.ts`, `src/lib/format.ts`, `src/lib/storage.ts`, `src/services/production.ts`, `src/types/db.ts`
- **Exporta:** `EmployeeTasksPage`
- **Servicios de Supabase:** Storage
- **Usado por:** `src/App.tsx`
- **Validaciones y seguridad:** Los permisos los valida la BD; la página solo es la interfaz.
- **Cómo comprobar que funciona:** Navegar a la ruta correspondiente (ver manual, cap. 10).

### `src/pages/public/AuthPages.tsx`

- **Nombre / tipo:** `AuthPages.tsx` · TypeScript + JSX (React)
- **Responsabilidad:** Ingreso, registro, recuperación y restablecimiento de contraseña, 404.
- **Dependencias externas:** `lucide-react`, `react`, `react-router`
- **Importa:** `src/components/layout/Logo.tsx`, `src/components/ui/Button.tsx`, `src/components/ui/Feedback.tsx`, `src/components/ui/Field.tsx`, `src/context/AuthContext.tsx`, `src/context/ToastContext.tsx`, `src/lib/errors.ts`, `src/lib/rules.ts`, `src/lib/validation.ts`, `src/services/account.ts`
- **Exporta:** `ForgotPasswordPage`, `LoginPage`, `NotFoundPage`, `RegisterPage`, `ResetPasswordPage`
- **Usado por:** `src/App.tsx`
- **Cómo comprobar que funciona:** Navegar a la ruta correspondiente (ver manual, cap. 10).

### `src/pages/public/CatalogPage.tsx`

- **Nombre / tipo:** `CatalogPage.tsx` · TypeScript + JSX (React)
- **Responsabilidad:** Catálogo con búsqueda, filtros, orden y disponibilidad.
- **Dependencias externas:** `lucide-react`, `react`, `react-router`
- **Importa:** `src/components/catalog/ProductCard.tsx`, `src/components/ui/Feedback.tsx`, `src/components/ui/Field.tsx`, `src/hooks/useAsync.ts`, `src/services/catalog.ts`
- **Exporta:** `CatalogPage`
- **Usado por:** `src/App.tsx`
- **Cómo comprobar que funciona:** Navegar a la ruta correspondiente (ver manual, cap. 10).

### `src/pages/public/HomePage.tsx`

- **Nombre / tipo:** `HomePage.tsx` · TypeScript + JSX (React)
- **Responsabilidad:** Inicio con presentación del negocio, destacados y categorías.
- **Dependencias externas:** `lucide-react`, `react-router`
- **Importa:** `src/components/catalog/ProductCard.tsx`, `src/components/ui/Button.tsx`, `src/components/ui/Feedback.tsx`, `src/context/SettingsContext.tsx`, `src/hooks/useAsync.ts`, `src/services/catalog.ts`
- **Exporta:** `HomePage`
- **Usado por:** `src/App.tsx`
- **Cómo comprobar que funciona:** Navegar a la ruta correspondiente (ver manual, cap. 10).

### `src/pages/public/ProductPage.tsx`

- **Nombre / tipo:** `ProductPage.tsx` · TypeScript + JSX (React)
- **Responsabilidad:** Detalle de producto, galería, plantillas, cantidad y carrito.
- **Dependencias externas:** `lucide-react`, `react`, `react-router`
- **Importa:** `src/components/catalog/ProductImage.tsx`, `src/components/ui/Button.tsx`, `src/components/ui/Feedback.tsx`, `src/components/ui/Field.tsx`, `src/context/AuthContext.tsx`, `src/context/CartContext.tsx`, `src/context/ToastContext.tsx`, `src/hooks/useAsync.ts`, `src/lib/errors.ts`, `src/lib/format.ts`, `src/lib/rules.ts`, `src/services/cart.ts`, `src/services/catalog.ts`
- **Exporta:** `ProductPage`
- **Usado por:** `src/App.tsx`
- **Cómo comprobar que funciona:** Navegar a la ruta correspondiente (ver manual, cap. 10).

## src/services

### `src/services/account.ts`

- **Nombre / tipo:** `account.ts` · TypeScript
- **Responsabilidad:** Perfil, direcciones y autenticación.
- **Importa:** `src/lib/supabase.ts`, `src/types/db.ts`
- **Exporta:** `deleteAddress`, `getMyProfile`, `listAddresses`, `saveAddress`, `sendPasswordReset`, `signIn`, `signOut`, `signUp`, `updateMyProfile`, `updatePassword`
- **Servicios de Supabase:** tablas `customer_addresses`, `profiles`; Auth
- **Usado por:** `src/components/map/FulfillmentPicker.tsx`, `src/context/AuthContext.tsx`, `src/pages/customer/ProfilePage.tsx`, `src/pages/public/AuthPages.tsx`
- **Validaciones y seguridad:** Toda escritura sensible pasa por RPC validadas en la BD.
- **Cómo comprobar que funciona:** Cubierto por la prueba E2E y por las pruebas de base de datos.
- **Para ampliarlo:** Agregar funciones que llamen a nuevas tablas/RPC.

### `src/services/admin.ts`

- **Nombre / tipo:** `admin.ts` · TypeScript
- **Responsabilidad:** Usuarios/roles, configuración, panel y auditoría.
- **Importa:** `src/lib/supabase.ts`, `src/types/db.ts`
- **Exporta:** `getDashboard`, `getPublicSettings`, `listAllSettings`, `listAudit`, `listEmployees`, `listProfiles`, `profileNames`, `setUserRole`, `updateSetting`
- **Servicios de Supabase:** tablas `app_settings`, `audit_log`, `profiles`; RPC `admin_dashboard`, `admin_set_user_role`
- **Usado por:** `src/context/SettingsContext.tsx`, `src/pages/admin/AdminAuditPage.tsx`, `src/pages/admin/AdminDashboardPage.tsx`, `src/pages/admin/AdminOrderDetailPage.tsx`, `src/pages/admin/AdminProductionPage.tsx`, `src/pages/admin/AdminSettingsPage.tsx`, `src/pages/admin/AdminUsersPage.tsx`
- **Validaciones y seguridad:** Toda escritura sensible pasa por RPC validadas en la BD.
- **Cómo comprobar que funciona:** Cubierto por la prueba E2E y por las pruebas de base de datos.
- **Para ampliarlo:** Agregar funciones que llamen a nuevas tablas/RPC.

### `src/services/adminOrders.ts`

- **Nombre / tipo:** `adminOrders.ts` · TypeScript
- **Responsabilidad:** Pedidos del administrador, cotizaciones, pagos manuales, reembolsos, mostrador, mantenimiento.
- **Importa:** `src/lib/supabase.ts`, `src/types/db.ts`
- **Exporta:** `CounterLine`, `OrderFilters`, `counterSale`, `listOrders`, `recordPayment`, `recordRefund`, `resolveSandboxQr`, `runMaintenance`, `sendQuote`, `updateOrderStatus`
- **Servicios de Supabase:** tablas `orders`; RPC `admin_counter_sale`, `admin_record_payment`, `admin_record_refund`, `admin_sandbox_resolve_qr`, `admin_send_quote`, `admin_update_order_status`, `run_maintenance`
- **Usado por:** `src/pages/admin/AdminCounterSalePage.tsx`, `src/pages/admin/AdminDashboardPage.tsx`, `src/pages/admin/AdminOrderDetailPage.tsx`, `src/pages/admin/AdminOrdersPage.tsx`
- **Validaciones y seguridad:** Toda escritura sensible pasa por RPC validadas en la BD.
- **Cómo comprobar que funciona:** Cubierto por la prueba E2E y por las pruebas de base de datos.
- **Para ampliarlo:** Agregar funciones que llamen a nuevas tablas/RPC.

### `src/services/cart.ts`

- **Nombre / tipo:** `cart.ts` · TypeScript
- **Responsabilidad:** Carrito persistente en cart_items (sin precios).
- **Importa:** `src/lib/supabase.ts`, `src/types/db.ts`
- **Exporta:** `CartLine`, `addToCart`, `cartSubtotal`, `countCart`, `lineUnitPrice`, `listCart`, `removeCartLine`, `updateCartQuantity`
- **Servicios de Supabase:** tablas `cart_items`
- **Usado por:** `src/context/CartContext.tsx`, `src/lib/lib.test.ts`, `src/lib/rules.ts`, `src/pages/customer/CartPage.tsx`, `src/pages/customer/CheckoutPage.tsx`, `src/pages/public/ProductPage.tsx`
- **Validaciones y seguridad:** Toda escritura sensible pasa por RPC validadas en la BD.
- **Cómo comprobar que funciona:** Cubierto por la prueba E2E y por las pruebas de base de datos.
- **Para ampliarlo:** Agregar funciones que llamen a nuevas tablas/RPC.

### `src/services/catalog.ts`

- **Nombre / tipo:** `catalog.ts` · TypeScript
- **Responsabilidad:** Consultas públicas del catálogo y disponibilidad (catalog_availability).
- **Importa:** `src/lib/supabase.ts`, `src/types/db.ts`
- **Exporta:** `CatalogFilters`, `CatalogSort`, `getAvailability`, `getProductBySlug`, `listCategories`, `listProducts`, `sanitizeSearch`
- **Servicios de Supabase:** tablas `categories`, `products`; RPC `catalog_availability`
- **Usado por:** `src/lib/lib.test.ts`, `src/pages/customer/CartPage.tsx`, `src/pages/customer/QuoteRequestPage.tsx`, `src/pages/public/CatalogPage.tsx`, `src/pages/public/HomePage.tsx`, `src/pages/public/ProductPage.tsx`
- **Validaciones y seguridad:** Toda escritura sensible pasa por RPC validadas en la BD.
- **Cómo comprobar que funciona:** Cubierto por la prueba E2E y por las pruebas de base de datos.
- **Para ampliarlo:** Agregar funciones que llamen a nuevas tablas/RPC.

### `src/services/catalogAdmin.ts`

- **Nombre / tipo:** `catalogAdmin.ts` · TypeScript
- **Responsabilidad:** Gestión de productos, fotos, plantillas y categorías.
- **Importa:** `src/lib/storage.ts`, `src/lib/supabase.ts`, `src/types/db.ts`
- **Exporta:** `ProductInput`, `addProductImage`, `deleteCategory`, `deleteProduct`, `deleteProductImage`, `deleteTemplate`, `getProductForEdit`, `listAllCategories`, `listAllProducts`, `saveCategory`, `saveProduct`, `saveTemplate`, `updateProductFlags`
- **Servicios de Supabase:** tablas `categories`, `customization_templates`, `product_images`, `products`; Storage
- **Usado por:** `src/pages/admin/AdminCategoriesPage.tsx`, `src/pages/admin/AdminCounterSalePage.tsx`, `src/pages/admin/AdminProductEditPage.tsx`, `src/pages/admin/AdminProductsPage.tsx`, `src/pages/admin/AdminRecipesPage.tsx`
- **Validaciones y seguridad:** Toda escritura sensible pasa por RPC validadas en la BD.
- **Cómo comprobar que funciona:** Cubierto por la prueba E2E y por las pruebas de base de datos.
- **Para ampliarlo:** Agregar funciones que llamen a nuevas tablas/RPC.

### `src/services/inventory.ts`

- **Nombre / tipo:** `inventory.ts` · TypeScript
- **Responsabilidad:** Existencias, movimientos, ingresos, ajustes, verificación de materiales, proveedores.
- **Importa:** `src/lib/supabase.ts`, `src/types/db.ts`
- **Exporta:** `MaterialInput`, `adjustStock`, `createMaterial`, `deleteSupplier`, `isLowStock`, `listMovements`, `listStockItems`, `listSuppliers`, `materialCheck`, `receiveStock`, `saveSupplier`, `updateStockItem`
- **Servicios de Supabase:** tablas `inventory_movements`, `stock_items`, `suppliers`; RPC `admin_adjust_stock`, `admin_receive_stock`, `material_check`
- **Usado por:** `src/pages/admin/AdminCounterSalePage.tsx`, `src/pages/admin/AdminInventoryPage.tsx`, `src/pages/admin/AdminOrderDetailPage.tsx`, `src/pages/admin/AdminRecipesPage.tsx`, `src/pages/admin/AdminSuppliersPage.tsx`
- **Validaciones y seguridad:** Toda escritura sensible pasa por RPC validadas en la BD.
- **Cómo comprobar que funciona:** Cubierto por la prueba E2E y por las pruebas de base de datos.
- **Para ampliarlo:** Agregar funciones que llamen a nuevas tablas/RPC.

### `src/services/orders.ts`

- **Nombre / tipo:** `orders.ts` · TypeScript
- **Responsabilidad:** Compra (place_order), cotización, detalle, cancelación, entrega y fecha factible.
- **Importa:** `src/lib/supabase.ts`, `src/types/db.ts`
- **Exporta:** `OrderDetail`, `PlaceOrderInput`, `QuoteRequestInput`, `QuoteResponse`, `cancelOrder`, `getDeliveryQuote`, `getEarliestDate`, `getOrderDetail`, `listMyOrders`, `placeOrder`, `requestQuote`, `respondQuote`
- **Servicios de Supabase:** tablas `orders`; RPC `cancel_order`, `customer_respond_quote`, `delivery_quote`, `earliest_delivery_date`, `place_order`, `request_quote`
- **Usado por:** `src/components/map/FulfillmentPicker.tsx`, `src/pages/admin/AdminOrderDetailPage.tsx`, `src/pages/customer/CheckoutPage.tsx`, `src/pages/customer/OrderDetailPage.tsx`, `src/pages/customer/OrdersPage.tsx`, `src/pages/customer/QuoteRequestPage.tsx`
- **Validaciones y seguridad:** Toda escritura sensible pasa por RPC validadas en la BD.
- **Cómo comprobar que funciona:** Cubierto por la prueba E2E y por las pruebas de base de datos.
- **Para ampliarlo:** Agregar funciones que llamen a nuevas tablas/RPC.

### `src/services/payments.ts`

- **Nombre / tipo:** `payments.ts` · TypeScript
- **Responsabilidad:** Intentos de pago, estado y Edge Function de tarjeta.
- **Importa:** `src/lib/supabase.ts`, `src/types/db.ts`
- **Exporta:** `CardIntentResponse`, `cancelPaymentAttempt`, `createCardIntent`, `createPaymentAttempt`, `getPaymentStatus`
- **Servicios de Supabase:** RPC `cancel_payment_attempt`, `create_payment_attempt`, `get_payment_status`; Edge Functions `create-card-payment`
- **Usado por:** `src/components/payments/CardPayment.tsx`, `src/components/payments/QrPayment.tsx`
- **Validaciones y seguridad:** Toda escritura sensible pasa por RPC validadas en la BD.
- **Cómo comprobar que funciona:** Cubierto por la prueba E2E y por las pruebas de base de datos.
- **Para ampliarlo:** Agregar funciones que llamen a nuevas tablas/RPC.

### `src/services/production.ts`

- **Nombre / tipo:** `production.ts` · TypeScript
- **Responsabilidad:** Recetas, etapas y tareas de producción.
- **Importa:** `src/lib/supabase.ts`, `src/types/db.ts`
- **Exporta:** `AdminTask`, `RecipeWithLines`, `activateRecipe`, `assignTask`, `createRecipeVersion`, `listMyTasks`, `listOpenTasks`, `listRecipes`, `listStages`, `listTasksForOrder`, `removeRecipeMaterial`, `removeRecipeStage`, `taskHistory`, `updateMyTask`, `updateRecipe`, `upsertRecipeMaterial`, `upsertRecipeStage`
- **Servicios de Supabase:** tablas `production_stages`, `production_tasks`, `recipe_materials`, `recipe_stages`, `recipes`; RPC `admin_assign_task`, `employee_update_task`, `my_tasks`, `task_history`
- **Usado por:** `src/lib/rules.ts`, `src/pages/admin/AdminOrderDetailPage.tsx`, `src/pages/admin/AdminProductionPage.tsx`, `src/pages/admin/AdminRecipesPage.tsx`, `src/pages/employee/EmployeeTasksPage.tsx`
- **Validaciones y seguridad:** Toda escritura sensible pasa por RPC validadas en la BD.
- **Cómo comprobar que funciona:** Cubierto por la prueba E2E y por las pruebas de base de datos.
- **Para ampliarlo:** Agregar funciones que llamen a nuevas tablas/RPC.

## src/test

### `src/test/setup.ts`

- **Nombre / tipo:** `setup.ts` · TypeScript
- **Responsabilidad:** Configura matchers de Testing Library para Vitest.
- **Dependencias externas:** `@testing-library/jest-dom/vitest`

## src/types

### `src/types/db.ts`

- **Nombre / tipo:** `db.ts` · TypeScript
- **Responsabilidad:** Tipos TypeScript de tablas, enumeraciones, configuración y respuestas RPC.
- **Relación con el negocio:** Contrato entre frontend y base de datos.
- **Exporta:** `AppRole`, `AppSettingRow`, `AuditEntry`, `BusinessSettings`, `CancellationSettings`, `CartItem`, `Category`, `CustomerAddress`, `CustomizationTemplate`, `DashboardData`, `DeliveryQuote`, `DeliverySettings`, `FulfillmentType`, `InventoryMovement`, `MaterialCheckRow`, `MeasureUnit`, `MovementType`, `MyTask`, `Order`, `OrderChannel`, `OrderItem`, `OrderStatus`, `OrderStatusHistory`, `Payment`, `PaymentKind`, `PaymentMethod`, `PaymentSettings`, `PaymentStatus`, `PaymentStatusRow`, `Product`, `ProductImage`, `ProductType`, `ProductWithRelations`, `ProductionCapacitySettings`, `ProductionStage`, `ProductionTask`, `Profile`, `PublicSettings`, `Quote`, `QuoteStatus`, `Recipe`, `RecipeMaterial`, `RecipeStage`, `SaleUnit`, `StockItem`, `StockKind`, `Supplier`, `TaskLogEntry`, `TaskStatus`
- **Usado por:** `src/components/catalog/ProductCard.tsx`, `src/components/components.test.tsx`, `src/components/layout/ProtectedRoute.tsx`, `src/components/map/FulfillmentPicker.tsx`, `src/components/orders/OrderBits.tsx`, `src/components/payments/CardPayment.tsx`, `src/components/payments/PaymentPanel.tsx`, `src/components/payments/QrPayment.tsx`, `src/context/AuthContext.tsx`, `src/context/SettingsContext.tsx`, `src/lib/format.ts`, `src/lib/fulfillment.ts`, `src/lib/geo.ts`, `src/lib/lib.test.ts`, `src/lib/orderStatus.ts`, `src/lib/rules.ts`, `src/pages/admin/AdminCategoriesPage.tsx`, `src/pages/admin/AdminCounterSalePage.tsx`, `src/pages/admin/AdminDashboardPage.tsx`, `src/pages/admin/AdminInventoryPage.tsx`, `src/pages/admin/AdminOrderDetailPage.tsx`, `src/pages/admin/AdminOrdersPage.tsx`, `src/pages/admin/AdminProductEditPage.tsx`, `src/pages/admin/AdminProductsPage.tsx`, `src/pages/admin/AdminRecipesPage.tsx`, `src/pages/admin/AdminSettingsPage.tsx`, `src/pages/admin/AdminSuppliersPage.tsx`, `src/pages/admin/AdminUsersPage.tsx`, `src/pages/customer/CheckoutPage.tsx`, `src/pages/customer/QuoteRequestPage.tsx`, `src/pages/employee/EmployeeTasksPage.tsx`, `src/services/account.ts`, `src/services/admin.ts`, `src/services/adminOrders.ts`, `src/services/cart.ts`, `src/services/catalog.ts`, `src/services/catalogAdmin.ts`, `src/services/inventory.ts`, `src/services/orders.ts`, `src/services/payments.ts`, `src/services/production.ts`
- **Cómo comprobar que funciona:** Coinciden con las migraciones (typecheck).
- **Para ampliarlo:** Actualizar al cambiar el esquema.

## src/vite-env.d.ts

### `src/vite-env.d.ts`

- **Nombre / tipo:** `vite-env.d.ts` · TypeScript
- **Responsabilidad:** Tipos de las variables VITE_ disponibles en el código.
- **Variables de entorno:** `VITE_SITE_URL`, `VITE_STRIPE_PUBLISHABLE_KEY`, `VITE_SUPABASE_ANON_KEY`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_URL`
- **Cómo comprobar que funciona:** Typecheck sin errores.
- **Para ampliarlo:** Declarar nuevas variables públicas.

## supabase/config.toml

### `supabase/config.toml`

- **Nombre / tipo:** `config.toml` · TOML
- **Responsabilidad:** Configuración de Supabase CLI y verificación JWT por función.
- **Validaciones y seguridad:** El webhook se publica sin JWT (lo protege la firma de Stripe).
- **Cómo comprobar que funciona:** `npx supabase functions deploy`.

## supabase/functions

### `supabase/functions/.env.example`

- **Nombre / tipo:** `.env.example` · Variables de entorno (ejemplo)
- **Responsabilidad:** Plantilla de SECRETOS de servidor (Stripe, CORS).
- **Relación con el negocio:** Habilita el cobro con tarjeta.
- **Validaciones y seguridad:** Solo marcadores; se cargan con `supabase secrets set`.

### `supabase/functions/_shared/common.ts`

- **Nombre / tipo:** `common.ts` · TypeScript
- **Responsabilidad:** CORS, respuestas JSON, clientes Supabase (como usuario y privilegiado), conversión a centavos.
- **Dependencias externas:** `npm:@supabase/supabase-js@2`
- **Exporta:** `UUID_RE`, `adminClient`, `corsHeaders`, `json`, `toMinorUnits`, `userClient`
- **Variables de entorno:** `ALLOWED_ORIGINS`, `SUPABASE_ANON_KEY`, `SUPABASE_PUBLISHABLE_KEYS`, `SUPABASE_SECRET_KEYS`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`
- **Usado por:** `supabase/functions/create-card-payment/handler.ts`, `supabase/functions/stripe-webhook/handler.ts`
- **Validaciones y seguridad:** El cliente privilegiado solo existe en el servidor; CORS limitado a ALLOWED_ORIGINS.
- **Cómo comprobar que funciona:** Cubierto por functions.test.ts.
- **Para ampliarlo:** Agregar utilidades comunes de funciones.

### `supabase/functions/create-card-payment/handler.ts`

- **Nombre / tipo:** `handler.ts` · TypeScript
- **Responsabilidad:** Crea o reutiliza el PaymentIntent de Stripe para un intento validado por la base de datos.
- **Relación con el negocio:** Cobro de anticipos y saldos con tarjeta.
- **Dependencias externas:** `npm:stripe@17`
- **Importa:** `supabase/functions/_shared/common.ts`
- **Exporta:** `handler`
- **Servicios de Supabase:** tablas `app_settings`; RPC `create_payment_attempt`, `payment_set_provider_ref`
- **Variables de entorno:** `ALLOWED_ORIGINS`, `STRIPE_CURRENCY`, `STRIPE_SECRET_KEY`
- **Usado por:** `supabase/functions/create-card-payment/index.ts`, `supabase/functions/tests/functions.test.ts`
- **Validaciones y seguridad:** Monto tomado de la BD; idempotencia; clave según modo test/live; el navegador nunca confirma.
- **Cómo comprobar que funciona:** Pruebas Deno (405/401/503); prueba manual con tarjetas de Stripe.
- **Para ampliarlo:** Agregar otros métodos de Stripe o cambiar de proveedor.

### `supabase/functions/create-card-payment/index.ts`

- **Nombre / tipo:** `index.ts` · TypeScript
- **Responsabilidad:** Punto de entrada de la Edge Function (Deno.serve).
- **Importa:** `supabase/functions/create-card-payment/handler.ts`
- **Cómo comprobar que funciona:** Desplegar y llamar desde la app.

### `supabase/functions/stripe-webhook/handler.ts`

- **Nombre / tipo:** `handler.ts` · TypeScript
- **Responsabilidad:** Verifica la firma del webhook y aplica el resultado del pago.
- **Relación con el negocio:** Confirma automáticamente pedidos al pagarse el anticipo.
- **Dependencias externas:** `npm:stripe@17`
- **Importa:** `supabase/functions/_shared/common.ts`
- **Exporta:** `handler`
- **Servicios de Supabase:** RPC `payment_apply_provider_result`
- **Variables de entorno:** `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
- **Usado por:** `supabase/functions/stripe-webhook/index.ts`, `supabase/functions/tests/functions.test.ts`
- **Validaciones y seguridad:** Firma obligatoria; idempotente por event.id; compara monto y moneda.
- **Cómo comprobar que funciona:** 7 pruebas Deno con firmas válidas e inválidas.
- **Para ampliarlo:** Manejar reembolsos de Stripe (charge.refunded).

### `supabase/functions/stripe-webhook/index.ts`

- **Nombre / tipo:** `index.ts` · TypeScript
- **Responsabilidad:** Punto de entrada del webhook (Deno.serve).
- **Importa:** `supabase/functions/stripe-webhook/handler.ts`

### `supabase/functions/tests/functions.test.ts`

- **Nombre / tipo:** `functions.test.ts` · TypeScript
- **Responsabilidad:** Pruebas Deno de las Edge Functions con un PostgREST simulado.
- **Dependencias externas:** `npm:stripe@17`
- **Importa:** `supabase/functions/create-card-payment/handler.ts`, `supabase/functions/stripe-webhook/handler.ts`
- **Variables de entorno:** `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`
- **Validaciones y seguridad:** Prueba rechazo de firmas falsas.
- **Cómo comprobar que funciona:** `npm run test:functions` → 9 passed.

## supabase/migrations

### `supabase/migrations/20261020000100_schema.sql`

- **Nombre / tipo:** `20261020000100_schema.sql` · SQL (PostgreSQL)
- **Responsabilidad:** Tipos, tablas, relaciones y restricciones CHECK/UNIQUE.
- **Relación con el negocio:** Modelo de productos, inventario, recetas, pedidos, pagos, producción y auditoría.
- **Validaciones y seguridad:** CHECK impide stock negativo y reservar más de lo existente; pagos sin datos de tarjeta.
- **Cómo comprobar que funciona:** Pruebas T03–T06.
- **Para ampliarlo:** Nuevas columnas o tablas: crear una migración nueva, no editar esta.

### `supabase/migrations/20261020000200_indexes.sql`

- **Nombre / tipo:** `20261020000200_indexes.sql` · SQL (PostgreSQL)
- **Responsabilidad:** Índices para consultas frecuentes y unicidades parciales (una receta activa, una cotización vigente, idempotencia de mostrador).
- **Validaciones y seguridad:** Unicidades que evitan duplicados.
- **Cómo comprobar que funciona:** Se aplica sin errores; `\di public.*`.

### `supabase/migrations/20261020000300_core_functions_triggers.sql`

- **Nombre / tipo:** `20261020000300_core_functions_triggers.sql` · SQL (PostgreSQL)
- **Responsabilidad:** Funciones de rol, perfiles, auditoría, motor de inventario, capacidad, tarifa de entrega y ciclo de vida del pedido.
- **Relación con el negocio:** Reservas, consumos, fechas factibles, tareas automáticas.
- **Validaciones y seguridad:** SECURITY DEFINER con search_path vacío; rol siempre "cliente" al registrarse.
- **Cómo comprobar que funciona:** Pruebas T01, T22, T29, T60–T69.
- **Para ampliarlo:** Agregar efectos de estado en _orders_after_status.

### `supabase/migrations/20261020000400_business_rpc.sql`

- **Nombre / tipo:** `20261020000400_business_rpc.sql` · SQL (PostgreSQL)
- **Responsabilidad:** Funciones RPC de negocio (compra, cotización, pagos, mostrador, inventario, tareas, panel, roles).
- **Relación con el negocio:** Todos los flujos del negocio.
- **Validaciones y seguridad:** Recalculan precios/montos; validan propiedad y rol; idempotencia con bloqueo consultivo.
- **Cómo comprobar que funciona:** Pruebas T14–T87 y C01.
- **Para ampliarlo:** Nuevas operaciones: nueva función + grant en una nueva migración.

### `supabase/migrations/20261020000500_security_rls.sql`

- **Nombre / tipo:** `20261020000500_security_rls.sql` · SQL (PostgreSQL)
- **Responsabilidad:** Revoca privilegios por defecto, concede por columna, activa RLS y define políticas y EXECUTE.
- **Validaciones y seguridad:** Clientes solo ven lo suyo; empleados solo sus tareas; auditoría solo lectura del administrador.
- **Cómo comprobar que funciona:** Pruebas T07–T17, T23–T27, T41, T55–T59, T77–T78, T87.
- **Para ampliarlo:** Toda tabla nueva: RLS + políticas en su migración.

### `supabase/migrations/20261020000600_storage.sql`

- **Nombre / tipo:** `20261020000600_storage.sql` · SQL (PostgreSQL)
- **Responsabilidad:** Buckets product-images (público) y customizations (privado) con políticas.
- **Relación con el negocio:** Fotos del catálogo y diseños de clientes.
- **Validaciones y seguridad:** Carpeta por usuario; límites de 5 MB y tipos de imagen.
- **Cómo comprobar que funciona:** Pruebas T31, T35, T37, T58.
- **Para ampliarlo:** Nuevos buckets con sus políticas.

### `supabase/migrations/20261020000700_default_settings.sql`

- **Nombre / tipo:** `20261020000700_default_settings.sql` · SQL (PostgreSQL)
- **Responsabilidad:** Parámetros iniciales (contacto, entrega, capacidad, pagos, cancelación) y etapas de producción.
- **Relación con el negocio:** Valores PROPUESTOS a validar con el propietario.
- **Validaciones y seguridad:** No contiene secretos.
- **Cómo comprobar que funciona:** Tabla app_settings con 5 filas.
- **Para ampliarlo:** Cambiar valores desde Administración → Configuración.

### `supabase/migrations/20261020000800_settings_validation.sql`

- **Nombre / tipo:** `20261020000800_settings_validation.sql` · SQL (PostgreSQL)
- **Responsabilidad:** Validación en servidor de la estructura y rangos de app_settings.
- **Validaciones y seguridad:** Impide configuraciones imposibles aun con peticiones manipuladas.
- **Cómo comprobar que funciona:** Pruebas T84–T86.
- **Para ampliarlo:** Validar nuevas claves de configuración aquí o en otra migración.

## supabase/seed

### `supabase/seed/cleanup_demo.sql`

- **Nombre / tipo:** `cleanup_demo.sql` · SQL (PostgreSQL)
- **Responsabilidad:** Elimina con seguridad los datos demo (se detiene si ya hay pedidos que los usan).
- **Validaciones y seguridad:** Transaccional; no borra datos reales.
- **Cómo comprobar que funciona:** Tras ejecutarlo no quedan filas is_demo.

### `supabase/seed/seed_demo.sql`

- **Nombre / tipo:** `seed_demo.sql` · SQL (PostgreSQL)
- **Responsabilidad:** Datos de DEMOSTRACIÓN: categorías, productos, plantillas, materiales, existencias y recetas.
- **Relación con el negocio:** Permite probar y presentar el sistema.
- **Validaciones y seguridad:** No crea usuarios ni contraseñas; todo con is_demo = true.
- **Cómo comprobar que funciona:** Catálogo con 9 productos tras ejecutarlo.
- **Para ampliarlo:** Agregar más datos de ejemplo marcados como demo.

## supabase/tests

### `supabase/tests/database_tests.sql`

- **Nombre / tipo:** `database_tests.sql` · SQL (PostgreSQL)
- **Responsabilidad:** 87 pruebas de integridad, RLS, flujos y configuración; todo dentro de BEGIN…ROLLBACK.
- **Validaciones y seguridad:** No deja datos ni usuarios.
- **Cómo comprobar que funciona:** Local: npm run test:db. Supabase: SQL Editor sin errores.
- **Para ampliarlo:** Agregar casos con pg_temp.ok / expect_error.

### `supabase/tests/local/concurrency_buyer.sql`

- **Nombre / tipo:** `concurrency_buyer.sql` · SQL (PostgreSQL)
- **Responsabilidad:** Simula un comprador que mantiene el bloqueo de inventario 2 s.
- **Cómo comprobar que funciona:** Ejecutado dos veces en paralelo por test-db.sh.

### `supabase/tests/local/concurrency_check.sql`

- **Nombre / tipo:** `concurrency_check.sql` · SQL (PostgreSQL)
- **Responsabilidad:** Verifica que solo una de las compras simultáneas se confirmó.
- **Cómo comprobar que funciona:** Muestra "OK C01".

### `supabase/tests/local/concurrency_setup.sql`

- **Nombre / tipo:** `concurrency_setup.sql` · SQL (PostgreSQL)
- **Responsabilidad:** Prepara la prueba de compra simultánea de la última unidad.
- **Relación con el negocio:** Garantía contra sobreventa.
- **Cómo comprobar que funciona:** Parte de test-db.sh.

### `supabase/tests/local/supabase_shim.sql`

- **Nombre / tipo:** `supabase_shim.sql` · SQL (PostgreSQL)
- **Responsabilidad:** Emulación mínima de Supabase para PostgreSQL local (roles, auth, storage).
- **Validaciones y seguridad:** NUNCA ejecutar en Supabase.
- **Cómo comprobar que funciona:** Lo usa test-db.sh.
