# Informe de estado (entrega del 20/10/2026)

Estados: **Implementada y verificada** (probada automáticamente en esta entrega) · **Implementada, pendiente de prueba** (código completo; requiere un servicio real para probarla) · **Preparada, pendiente de credenciales** · **Pendiente de implementación** · **No disponible por limitaciones de la herramienta**.

| Funcionalidad | Estado | Observación |
|---|---|---|
| Esquema, restricciones, índices (PostgreSQL) | Implementada y verificada | 8 migraciones aplicadas en PostgreSQL 16 local |
| RLS y permisos por rol | Implementada y verificada | Pruebas por rol; falta repetirlas en un proyecto Supabase real |
| Registro con rol "cliente" y primer administrador | Implementada y verificada (BD) | Correos de confirmación: pendiente de prueba con Supabase Auth |
| Inicio/cierre de sesión, recuperación de contraseña (UI) | Implementada, pendiente de prueba | Requiere Supabase Auth y correo |
| Catálogo, búsqueda, filtros, disponibilidad | Implementada y verificada | E2E local |
| Carrito persistente y compra | Implementada y verificada | E2E local + T19–T30 |
| Prevención de sobreventa concurrente | Implementada y verificada | C01 |
| Reservas, consumo y liberación de inventario | Implementada y verificada | T22, T61, T68–T69, T82 |
| Inventario, ingresos, ajustes, alertas, movimientos | Implementada y verificada | T73–T76, E2E |
| Recetas versionadas y costo estimado | Implementada y verificada (BD) | Pantalla verificada por compilación; prueba manual M-05 |
| Capacidad y fecha factible | Implementada y verificada | T28, T29, T36 |
| Tareas, asignación, avance (empleado) | Implementada y verificada | T57–T63, E2E |
| Cotizaciones con diseño propio | Implementada y verificada (BD) | Subida real a Storage: pendiente de prueba |
| Storage (buckets y políticas) | Implementada, pendiente de prueba | Políticas probadas sobre emulación; falta Storage real |
| Mapa, búsqueda de direcciones, tarifa | Implementada y verificada (cálculo) | Teselas y Nominatim no accesibles en el entorno aislado; probar con internet |
| Pagos QR en entorno de pruebas | Implementada y verificada | T44–T48, T80, E2E |
| Pagos QR reales | Preparada, pendiente de credenciales | Requiere contrato con banco/pasarela y una Edge Function con su API |
| Pago con tarjeta (Stripe modo prueba) | Implementada, pendiente de prueba | Funciones verificadas con Deno (firma, estados); falta cuenta Stripe y despliegue |
| Pagos con tarjeta reales en Bolivia | Preparada, pendiente de credenciales | Requiere un proveedor que acepte empresas bolivianas |
| Pagos manuales, reembolsos, venta de mostrador | Implementada y verificada (BD) | T64–T72 |
| Panel de indicadores | Implementada y verificada | T83, E2E |
| Auditoría | Implementada y verificada | T75, T77, T78 |
| Configuración con validación en servidor | Implementada y verificada | T84–T87 |
| Notificaciones por correo de cambios de pedido | Pendiente de implementación | Fuera del alcance mínimo; el seguimiento está en la app |
| Tareas programadas (vencimientos automáticos) | Preparada | Botón en el panel; `pg_cron` documentado (manual §13.5) |
| Despliegue en internet | Pendiente (decisión del equipo) | Guía en el manual, cap. 15 |
| Publicación en GitHub | Preparada | Repositorio Git local con commit inicial; no se publicó sin autorización |
| ZIP del proyecto | Implementada y verificada | Generado y revisado su contenido |
| Capturas reales de Supabase en el manual | No disponible por limitaciones de la herramienta | Se usan nombres exactos de menús en su lugar |

## Valores que debe validar el propietario

Coordenadas del local · tarifa base, por km, mínima y cobertura · porcentaje de anticipo · horas de reserva sin pago · capacidad diaria del taller · política de cancelación · precios reales (los de demostración deben eliminarse).
