# Fase 1 · Análisis del documento del proyecto

Fuente: *Proyecto Integrador "Cotillón MiraLiz" — Segunda entrega* (Universidad Salesiana de Bolivia, Ingeniería de Sistemas, 2026; 22 páginas).

Este documento separa, como pide el enunciado, cuatro tipos de información:

| Marca | Significado |
|---|---|
| **[PDF]** | Obtenido directamente del documento académico. |
| **[PROMPT]** | Requisito adicional expresamente solicitado en el enunciado de desarrollo. |
| **[DECISIÓN]** | Decisión técnica del equipo para completar la implementación. |
| **[DEMO]** | Dato de ejemplo usado solo para pruebas (marcado `is_demo` en la base de datos). |

## 1. El negocio

- **[PDF]** Negocio familiar de La Paz que fabrica y comercializa artículos de cotillón (cap. 3.3).
- **[PDF]** Dos líneas de trabajo: (a) reventa de artículos comunes comprados por caja; (b) elaboración artesanal y a pedido de **mochilas**, **piñatas 2D** y **serigrafía en globos**, según temática y colores del cliente.
- **[PDF]** Clientes particulares para cumpleaños y celebraciones; relación de confianza a lo largo de varios encargos.
- **[PDF]** Estructura: un dueño/encargado (atiende al público, coordina pedidos personalizados, compra insumos) y trabajadores en **corte, costura, armado, decoración y serigrafía** (cap. 3.4).
- **[PROMPT]** Ubicación general cerca de la Universidad Salesiana de Bolivia; teléfonos 67139111 y 78855776.
  - *Verificación:* el PDF **no** menciona dirección ni teléfonos. Se usan tal como los entrega el enunciado, sin inventar una dirección exacta. Las coordenadas del local quedan como **parámetro provisional** (`origin_is_placeholder: true`) que el propietario debe fijar.

## 2. Problemas identificados [PDF]

| # | Problema (cap. 2 y 3.2) | Respuesta del sistema |
|---|---|---|
| P1 | Stock de insumos (telas, cierres, pasadores, ribetes, plastoformo, silicona, decoración) calculado a ojo; compras de último momento. | Inventario con existencias, stock mínimo, alertas y bitácora de movimientos. |
| P2 | No se sabe si hay material para aceptar un pedido nuevo (no hay relación producto ↔ insumos). | Recetas (lista de materiales) + verificación y reserva transaccional de materiales al confirmar. |
| P3 | Sin control de horas por pedido ni de la capacidad semanal; jornadas excesivas o tiempos muertos. | Etapas con minutos por unidad, tareas de producción, capacidad diaria configurable y cálculo de fecha factible. |
| P4 | Sin registro de ventas, anticipos, costos ni de lo acordado con el cliente (temática, colores, cantidad, anticipo). | Pedidos con historial, cotizaciones formales, pagos/anticipos/saldos con comprobante, catálogo en línea. |

## 3. Objetivos específicos [PDF] y módulos

| Objetivo (cap. 5) | Módulo implementado |
|---|---|
| Módulo de control de inventarios de insumos y materia prima. | Inventario (`stock_items`, `inventory_movements`, panel Inventario). |
| Mecanismo que valide disponibilidad de materiales antes de confirmar un pedido. | `recipes`, `recipe_materials`, `_reserve_needs`, `material_check`. |
| Calendario de producción que organice el tiempo y calcule capacidad semanal. | `production_tasks`, `earliest_delivery_date`, `production_capacity`, vista semanal del empleado. |
| Módulo de ventas, anticipos y catálogo en línea. | Catálogo, carrito, pedidos, cotizaciones, pagos, venta de mostrador. |

## 4. Requisitos técnicos sugeridos por el PDF

- **[PDF]** Arquitectura cliente-servidor sobre TCP/IP; acceso desde computadoras y celulares (cap. 2.4) → aplicación web responsive.
- **[PDF]** Base de datos relacional con integridad referencial (cap. 2.5) → PostgreSQL con claves foráneas, CHECK y transacciones.
- **[PDF]** Seguridad: confidencialidad, integridad, disponibilidad; control de acceso con usuarios y contraseñas; resguardo de anticipos y datos de contacto (cap. 2.7) → Supabase Auth, RLS, funciones privilegiadas, auditoría.
- **[PDF]** Investigación operativa: programación de tareas bajo restricciones de capacidad (cap. 2.6) → algoritmo de capacidad acumulada por día.
- **[PDF]** Pendiente para entregas futuras: Marco Aplicativo, Costos y Seguridad. Este sistema provee la base técnica de esos capítulos.

## 5. Requisitos añadidos por el enunciado [PROMPT]

Supabase como plataforma; tres roles (administrador, empleado, cliente); cotización con imagen propia ("Cotización pendiente"); mapa interactivo y tarifa por distancia; pagos con tarjeta y QR con entorno de pruebas; contador de 10 s que nunca confirma un pago; auditoría; panel de estadísticas; manual técnico integral; ZIP y repositorio listo para GitHub.

## 6. Ambigüedades y cómo se resolvieron

| Tema | Situación en el PDF | Resolución [DECISIÓN] |
|---|---|---|
| Dirección y teléfonos | No figuran. | Teléfonos del enunciado; dirección como "zona cercana a la USB, por confirmar"; coordenadas configurables. |
| Precios, tarifas de entrega, anticipo | No figuran. | Productos con precios **[DEMO]**; tarifa base Bs 10 + Bs 3/km, anticipo 50 %, reserva 48 h: **propuestas configurables** marcadas como tales en la base y en la interfaz. |
| Jornada y capacidad del taller | No se cuantifica. | 480 min lunes–viernes y 240 min sábado como **estimación** (`is_estimate: true`), editable. |
| Política de cancelación | No figura. | Cancelación en línea sin pagos y antes de producción; con pagos, a través de la tienda. Configurable. |
| "Calendario de producción" (Investigación Operativa) | Concepto general. | Planificación por capacidad acumulada (FIFO) + fecha programada por tarea; es una heurística documentada, no un optimizador. |
| Proveedor de pagos en Bolivia | No se menciona. | Stripe en **modo de prueba** para tarjeta (sus tarjetas de prueba son oficiales). Stripe no garantiza cuentas para empresas con sede en Bolivia: para cobros reales se requiere un proveedor disponible en el país. QR: proveedor de **prueba** controlado; el QR interoperable real requiere contrato bancario. |
| Costos | El PDF pide costos reales de cada trabajo. | Se calcula **costo estimado** de materiales (costo de referencia × receta) y se registran minutos reales trabajados. El costo real completo (mano de obra valorizada, gastos) queda para el capítulo de Costos. |

No se encontraron contradicciones entre el PDF y el enunciado; solo información faltante, resuelta como se indica.
