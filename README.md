# Cotillón MiraLiz · Sistema de gestión integral y tienda en línea

Sistema web para el negocio **Cotillón MiraLiz** (La Paz, Bolivia), desarrollado como implementación del Proyecto Integrador de Ingeniería de Sistemas de la Universidad Salesiana de Bolivia.

Resuelve los problemas descritos en el documento del proyecto: control de inventario de insumos, validación de materiales antes de aceptar pedidos, planificación de la producción según la capacidad del taller y registro ordenado de ventas, anticipos, saldos y acuerdos con los clientes.

| | |
|---|---|
| **Frontend** | React 19 · TypeScript · Vite 7 · Tailwind CSS 4 · React Router 7 |
| **Backend** | Supabase: Auth, PostgreSQL (RLS, funciones RPC, triggers), Storage, Edge Functions (Deno) |
| **Mapas** | Leaflet + OpenStreetMap (búsqueda con Nominatim) |
| **Pagos** | Stripe en modo de prueba (tarjeta) · proveedor QR de prueba · efectivo/transferencia registrados en tienda |
| **Pruebas** | 87 pruebas SQL + concurrencia · 33 Vitest · 9 Deno · flujo E2E con Playwright |

## Funcionalidades

- **Clientes:** catálogo con búsqueda y filtros, carrito persistente, compra con recojo o entrega a domicilio (mapa y tarifa por distancia), fecha de entrega factible, cotización con diseño propio, aceptación/rechazo de cotizaciones, pago de anticipo o saldo (QR / tarjeta), seguimiento e historial.
- **Empleados:** tareas asignadas (lista y semana), registro de avances y minutos, bloqueo, historial.
- **Administrador:** panel de indicadores, pedidos y cotizaciones, pagos manuales y reembolsos, venta de mostrador, productos/fotos/plantillas, categorías, inventario con movimientos, recetas versionadas, proveedores, producción, usuarios y roles, configuración, auditoría.

## Inicio rápido (Windows, PowerShell)

> Guía detallada para quien nunca usó Supabase: [`docs/MANUAL_TECNICO.md`](docs/MANUAL_TECNICO.md), capítulos 5 y 6.

1. Instale **Node.js 22 LTS** (o 20.19+) y Git. Compruebe: `node -v` y `npm -v`.
2. Cree un proyecto en <https://supabase.com> (región sugerida: South America – São Paulo).
3. En **SQL Editor**, ejecute en orden los archivos de `supabase/migrations/` (001 → 008). Opcional: `supabase/seed/seed_demo.sql`.
4. En la carpeta del proyecto:
   ```powershell
   Copy-Item .env.example .env
   notepad .env        # pegue Project URL y la clave Publishable (o anon)
   npm install
   npm run dev
   ```
5. Abra <http://localhost:5173>, **regístrese** y, en el SQL Editor, conviértase en administrador:
   ```sql
   select public.bootstrap_first_admin('su-correo@ejemplo.com');
   ```
6. Vuelva a iniciar sesión: verá el menú **Administración**.

## Comandos

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo en http://localhost:5173 |
| `npm run build` | Verifica tipos y genera la versión de producción en `dist/` |
| `npm run preview` | Sirve localmente la versión compilada |
| `npm run lint` | Análisis estático (ESLint) |
| `npm test` | Pruebas unitarias y de componentes (Vitest) |
| `npm run test:db` | Pruebas de base de datos en un PostgreSQL local (requiere `psql` y bash) |
| `npm run test:functions` | Pruebas de Edge Functions (requiere Deno) |

## Estructura

```
src/            Aplicación React (páginas, componentes, servicios, utilidades)
supabase/       Migraciones SQL, datos demo, pruebas SQL, Edge Functions
scripts/        Pruebas de base de datos y E2E locales
docs/           Manual técnico, diagramas, inventario, matriz de trazabilidad, pruebas, informe de estado
```

## Documentación

- [Manual técnico](docs/MANUAL_TECNICO.md) · [Análisis del PDF](docs/ANALISIS_DEL_PDF.md) · [Diagramas](docs/DIAGRAMAS.md)
- [Inventario de archivos](docs/INVENTARIO_DE_ARCHIVOS.md) · [Matriz de trazabilidad](docs/MATRIZ_TRAZABILIDAD.md)
- [Pruebas y evidencias](docs/PRUEBAS.md) · [Informe de estado](docs/INFORME_DE_ESTADO.md)

## Seguridad antes de publicar en GitHub

- Nunca suba `.env` ni `supabase/functions/.env` (ya están en `.gitignore`).
- La clave `service_role` / `sb_secret_…` y las claves `sk_…`/`whsec_…` de Stripe **jamás** van al frontend; la app se niega a iniciar si detecta una.
- Revise con `git status` antes de cada commit.

## Estado honesto

Los pagos funcionan en **modo de prueba**. Para cobrar dinero real hace falta contratar un proveedor disponible para empresas en Bolivia (Stripe no garantiza cuentas a empresas con sede en Bolivia) y un servicio de QR bancario; la integración está preparada pero esos contratos y credenciales no existen todavía. Tarifas, anticipo y capacidad del taller son **valores propuestos** a validar con el propietario. Detalle completo en [`docs/INFORME_DE_ESTADO.md`](docs/INFORME_DE_ESTADO.md).
