-- =============================================================================
-- Cotillón MiraLiz · Migración 007 · Configuración operativa inicial
-- -----------------------------------------------------------------------------
-- Inserta los parámetros que el sistema necesita para funcionar y las etapas
-- de producción descritas en el documento del proyecto (corte, costura,
-- armado, decoración, serigrafía).
--
-- IMPORTANTE: tarifas, porcentaje de anticipo, capacidad diaria y coordenadas
-- del local son VALORES PROPUESTOS por el equipo de desarrollo. El documento
-- del proyecto no los define. Deben ser validados por el propietario y
-- ajustados desde Administración → Configuración.
-- ON CONFLICT DO NOTHING: volver a ejecutar no pisa valores ya ajustados.
-- =============================================================================

insert into public.app_settings (key, value, is_public, description) values
('business', jsonb_build_object(
   'name', 'Cotillón MiraLiz',
   'city', 'La Paz, Bolivia',
   'phones', jsonb_build_array('67139111', '78855776'),
   'address_note', 'Zona cercana a la Universidad Salesiana de Bolivia, La Paz (dirección exacta a confirmar con el propietario).',
   'timezone', 'America/La_Paz'),
 true, 'Datos de contacto visibles en la tienda.'),

('delivery', jsonb_build_object(
   'enabled', true,
   'origin_lat', -16.4955, 'origin_lng', -68.1336, 'origin_is_placeholder', true,
   'base_fee', 10, 'per_km_fee', 3, 'min_fee', 10, 'max_km', 12),
 true, 'Entrega a domicilio. Tarifa = base_fee + per_km_fee × km en línea recta (mínimo min_fee). PROPUESTA: validar con el propietario y fijar las coordenadas reales del local.'),

('production_capacity', jsonb_build_object(
   'minutes_by_weekday', jsonb_build_object('0', 0, '1', 480, '2', 480, '3', 480, '4', 480, '5', 480, '6', 240),
   'start_offset_days', 1, 'buffer_days', 0, 'resale_lead_days', 0, 'is_estimate', true),
 false, 'Minutos de trabajo disponibles por día de la semana (0 = domingo). ESTIMACIÓN inicial: reemplazar por la capacidad real del taller.'),

('payments', jsonb_build_object(
   'mode', 'test', 'currency', 'BOB',
   'min_advance_percent', 50, 'reservation_hours', 48, 'qr_ttl_minutes', 10,
   'qr_provider', 'sandbox_qr', 'card_enabled', false,
   'bank_transfer_note', 'Para transferencias, consulte los datos bancarios por teléfono.'),
 true, 'Modo de pagos (test/live), anticipo mínimo (%), horas de reserva sin pago y métodos habilitados. PROPUESTA a validar.'),

('cancellation', jsonb_build_object(
   'customer_statuses', jsonb_build_array('cotizacion_pendiente', 'cotizacion_enviada', 'cotizacion_vencida', 'pendiente_pago'),
   'policy_text', 'Puede cancelar en línea mientras el pedido no tenga pagos. Con pagos registrados o producción iniciada, comuníquese con la tienda.'),
 true, 'Política de cancelación PROPUESTA: validar con el propietario.')
on conflict (key) do nothing;

insert into public.production_stages (code, name, sort_order) values
  ('corte',      'Corte',      10),
  ('costura',    'Costura',    20),
  ('armado',     'Armado',     30),
  ('decoracion', 'Decoración', 40),
  ('serigrafia', 'Serigrafía', 50)
on conflict (code) do nothing;
