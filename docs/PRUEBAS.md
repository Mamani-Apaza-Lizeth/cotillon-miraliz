# Pruebas y control de calidad

## 1. Estrategia

| Nivel | Herramienta | Qué cubre | Dónde |
|---|---|---|---|
| Base de datos | SQL + PostgreSQL 16 con emulación mínima de Supabase | Restricciones, triggers, RPC, RLS por rol, Storage, pagos, inventario, configuración | `supabase/tests/database_tests.sql` |
| Concurrencia | Dos sesiones `psql` simultáneas | Sobreventa de la última unidad | `scripts/test-db.sh` + `supabase/tests/local/concurrency_*.sql` |
| Unidad / componentes | Vitest + Testing Library (jsdom) | Formatos, fechas, Haversine, reglas, validaciones, errores, entorno, componentes | `src/lib/lib.test.ts`, `src/components/components.test.tsx` |
| Edge Functions | `deno test` con PostgREST simulado | Firma del webhook, mapeo de estados, idempotencia/reintentos, controles de acceso | `supabase/functions/tests/functions.test.ts` |
| Extremo a extremo | Playwright + PostgREST + base real | Flujo completo cliente → pago → admin → producción → empleado | `scripts/e2e-local/` |
| Estático | TypeScript estricto, ESLint, `deno check` | Tipos y reglas de hooks | `npm run typecheck`, `npm run lint` |

## 2. Resultados reales de esta entrega

Ejecutados el 20/10/2026 en el entorno de desarrollo. Salidas completas en `docs/evidencias/`.

| Prueba | Resultado | Evidencia |
|---|---|---|
| Base de datos (T01–T87) | **87/87 OK** | `pruebas_base_de_datos.txt` |
| Concurrencia (C01) | **OK** — un comprador rechazado: "Existencias insuficientes" | `pruebas_base_de_datos.txt` |
| Vitest | **33/33 OK** (2 archivos) | `pruebas_frontend.txt` |
| Deno (Edge Functions) | **9/9 OK** + `deno check` sin errores | `pruebas_edge_functions.txt` |
| TypeScript / ESLint | **0 errores, 0 advertencias** | `pruebas_frontend.txt` |
| Compilación de producción | **OK** | `compilacion_produccion.txt` |
| E2E local (13 capturas, escritorio y móvil) | **Flujo completo sin errores de consola** | `prueba_e2e_local.txt`, `capturas/` |

Durante la prueba E2E se detectó y corrigió un defecto real: al montar dos veces el componente de pago QR (modo estricto de React) dos peticiones simultáneas con la misma clave de idempotencia chocaban con la restricción única. Se corrigió en la base de datos con un bloqueo consultivo por clave (`pg_advisory_xact_lock`) y en la interfaz con una guarda; la segunda ejecución E2E pasó limpia.

**Limitaciones del entorno de prueba (no se afirmó lo que no se pudo verificar):** no se usó un proyecto Supabase real (se emularon `auth.uid()`, roles y Storage sobre PostgreSQL 16), no se enviaron correos, no se subieron archivos a un Storage real, no se desplegaron Edge Functions ni se procesaron pagos en Stripe (no hay credenciales). Las teselas del mapa y las fuentes de Google no cargan en el entorno aislado, por eso las capturas muestran el mapa gris; en un navegador con internet se ven normalmente.

## 3. Catálogo de pruebas automatizadas de base de datos

| Grupo | Pruebas |
|---|---|
| Registro y roles | T01 rol "admin" en metadata ignorado · T02 bootstrap único · T12 cliente no cambia su rol · T13 edita su nombre · T54 admin no se quita su rol |
| Integridad | T03 receta solo con materiales · T04 sin stock negativo · T05 reservado ≤ existencia · T06 publicado requiere precio |
| Visitante | T07 solo publicados · T08/T09 sin acceso a inventario ni pedidos · T10 disponibilidad por RPC · T11 cotización de entrega |
| Permisos del cliente | T14 sin funciones de admin · T15 sin confirmar pagos · T16 sin crear inventario · T17 sin carrito ajeno · T23–T25 aislamiento · T27 no cancela ajeno · T41 no modifica pagos |
| Compra | T18 fuera de cobertura · T19 precio y tarifa del servidor · T20 idempotencia · T21 carrito vacío tras compra · T22 reserva · T26 sobreventa · T28 fecha inviable · T29 fecha calculada · T30 reserva de material |
| Cotización y archivos | T31 carpeta ajena · T32 imagen ajena · T33 pendiente sin precio · T34 no se paga · T35 diseño ajeno invisible · T36 fecha inviable del admin · T37 admin ve el diseño · T38 cliente ajeno no responde · T39–T40 aceptación con anticipo |
| Pagos | T42 monto bajo · T43 idempotencia · T44 QR pendiente · T45 cliente no aprueba su QR · T46 tarjeta deshabilitada · T47–T48 confirmación y saldo · T49 tareas creadas · T50 monto distinto rechazado · T51 webhook duplicado · T52 webhook válido · T53 saldo parcial · T64 no entrega con saldo · T65 no cobra de más · T80 QR expirado |
| Producción | T55–T56 empleado sin datos financieros · T57 sus tareas · T58 ve el diseño de su tarea · T59 no cambia estados · T60 en producción · T61 consumo de materiales · T62 no reabre · T63 listo automático |
| Estados y cancelación | T66 entregado · T67 transición inválida · T68–T69 liberación única · T81–T82 vencimiento de reservas |
| Mostrador y auditoría | T70 sin sobreventa · T71 idempotente · T72 pagada · T73–T75 ajuste con motivo y auditoría · T76 trazabilidad · T77–T78 auditoría protegida · T79 historial |
| Panel y configuración | T83 ingresos cobrados · T84–T86 validación de parámetros · T87 cliente no modifica configuración |

## 4. Casos manuales (para ejecutar con un proyecto Supabase real)

Prepare: proyecto con migraciones y `seed_demo.sql`, un administrador, un empleado y dos clientes (A y B).

| ID | Escenario | Pasos | Resultado esperado |
|---|---|---|---|
| M-01 | Búsqueda y filtros | Catálogo: buscar "globo", filtrar "Personalizados", ordenar por precio | Resultados coherentes; "No encontramos productos" si no hay coincidencias |
| M-02 | Producto no publicado | Admin despublica un producto | Desaparece de la tienda; sigue en el panel |
| M-03 | Recuperar contraseña | "¿Olvidó su contraseña?" → correo → enlace | Pantalla "Nueva contraseña"; acceso con la nueva |
| M-04 | Cambio de precio | Cliente compra; admin cambia el precio | El pedido conserva el precio anterior |
| M-05 | Receta versionada | Nueva versión, cambiar material, activar | Pedidos nuevos usan la versión activa |
| M-06 | Falta de materiales | Ajustar plastoformo a 0; comprar piñata | "Existencias insuficientes: Plancha de plastoformo…" |
| M-07 | Cotización vencida | Enviar cotización con vigencia hoy; aceptar al día siguiente | Queda "Cotización vencida" |
| M-08 | Tarjetas de prueba | Con Stripe configurado, pagar con cada tarjeta del manual §9.2 | Mensajes de la tabla; solo 4242… aprueba |
| M-09 | Reembolso | Cancelar un pedido con anticipo y registrar reembolso | Pagado disminuye; auditoría registra |
| M-10 | Proveedores | Crear proveedor y asignarlo a un material | Aparece en el material |
| M-11 | Limpiar demo | Ejecutar `cleanup_demo.sql` sin pedidos demo | Quedan solo datos reales |
| M-12 | Concurrencia real | Dos navegadores, último paquete de "Vasos de colores", confirmar a la vez | Solo uno obtiene el pedido |
| M-13 | Rol desde el navegador | En la consola del navegador: `supabase.from('profiles').update({role:'admin'})` | Error de permiso |
| M-14 | Fuera de cobertura | Marcar El Alto lejano / otra ciudad | Aviso de cobertura; no permite confirmar |
| M-15 | Sin conexión | Desactivar la red | Barra "Sin conexión"; mensajes de error comprensibles |

## 5. Cómo ejecutar

```bash
npm test                 # Vitest
npm run lint && npm run typecheck
npm run build
npm run test:db          # requiere PostgreSQL local (PGHOST, PGPORT, PGUSER)
npm run test:functions   # requiere Deno 2
./scripts/e2e-local/run.sh ./capturas   # requiere postgrest y Playwright
```
En Supabase: pegar `supabase/tests/database_tests.sql` en el SQL Editor y ejecutar (no deja datos).
