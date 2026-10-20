-- =============================================================================
-- Cotillón MiraLiz · Migración 004 · Funciones de negocio (RPC)
-- -----------------------------------------------------------------------------
-- Propósito : operaciones que modifican varias tablas y que deben ejecutarse
--             de forma atómica y con datos confiables (precios, existencias,
--             fechas, tarifas y pagos se recalculan aquí, nunca se aceptan del
--             navegador).
-- Depende de: 001, 002, 003
-- Llamada   : desde la app con supabase.rpc('<nombre>', {...}).
--             Todos los parámetros empiezan con p_.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Catálogo público: disponibilidad (sin exponer la tabla de inventario)
-- ---------------------------------------------------------------------------
create or replace function public.catalog_availability()
returns table (product_id uuid, available numeric)
language sql stable security definer set search_path = ''
as $$
  select p.id,
         case when p.product_type = 'reventa' then greatest(coalesce(si.quantity - si.reserved, 0), 0) end
    from public.products p
    join public.categories c on c.id = p.category_id and c.is_active
    left join public.stock_items si on si.product_id = p.id and si.is_active
   where p.is_published
$$;

-- Verificación de materiales para un producto (cliente: solo sí/no; staff: detalle).
create or replace function public.material_check(p_product uuid, p_quantity integer)
returns table (stock_item_id uuid, name text, unit public.measure_unit, needed numeric, available numeric, sufficient boolean)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not public.is_staff() then
    raise exception 'Operación permitida solo para el personal.' using errcode = '42501';
  end if;
  return query
    select n.stock_item_id, n.name, n.unit, n.needed, n.available, n.available >= n.needed
      from public._material_needs(p_product, p_quantity) n
     order by n.name;
end;
$$;

-- ---------------------------------------------------------------------------
-- 2. Utilidades internas de pedidos
-- ---------------------------------------------------------------------------
create or replace function public._required_advance(p_total numeric)
returns numeric
language sql stable security definer set search_path = ''
as $$
  select round(p_total * least(greatest(coalesce((public._setting('payments')->>'min_advance_percent')::numeric, 100), 0), 100) / 100, 2)
$$;

create or replace function public._reservation_deadline()
returns timestamptz
language sql stable security definer set search_path = ''
as $$
  select now() + make_interval(hours => coalesce((public._setting('payments')->>'reservation_hours')::integer, 48))
$$;

-- Valida la ubicación de entrega y devuelve distancia y tarifa calculadas en el servidor.
create or replace function public._validated_delivery(p_lat double precision, p_lng double precision, p_address text)
returns table (distance_km numeric, fee numeric)
language plpgsql stable security definer set search_path = ''
as $$
declare
  q record;
begin
  if p_address is null or char_length(trim(p_address)) < 3 then
    raise exception 'Ingrese la dirección de entrega.' using errcode = '22023';
  end if;
  select * into q from public.delivery_quote(p_lat, p_lng);
  if not q.enabled then
    raise exception 'La entrega a domicilio no está habilitada en este momento. Elija recojo en tienda.' using errcode = 'P0001';
  end if;
  if not q.within_coverage then
    raise exception 'La ubicación está fuera del área de cobertura (% km en línea recta).', q.distance_km using errcode = 'P0001';
  end if;
  distance_km := q.distance_km;
  fee := q.fee;
  return next;
end;
$$;

-- Reserva un conjunto agregado de necesidades (ítem → cantidad) en orden
-- determinista (evita bloqueos mutuos) tras verificar todas las faltantes.
create or replace function public._reserve_needs(p_order uuid, p_needs jsonb, p_reason text)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  r record;
  v_missing text := '';
begin
  -- 1) bloqueo y verificación completa (mensaje con todas las faltantes)
  for r in
    select si.id, si.name, si.quantity - si.reserved as available, (n.value)::numeric as needed, si.unit
      from jsonb_each_text(p_needs) n
      join public.stock_items si on si.id = n.key::uuid
     order by si.id
       for update of si
  loop
    if r.available < r.needed then
      v_missing := v_missing || format('%s (necesario %s, disponible %s %s); ', r.name, r.needed, r.available, r.unit);
    end if;
  end loop;
  if v_missing <> '' then
    raise exception 'Existencias insuficientes: %', rtrim(v_missing, '; ') using errcode = 'P0001', hint = 'stock_insuficiente';
  end if;
  -- 2) reserva
  for r in select n.key::uuid as id, (n.value)::numeric as needed from jsonb_each_text(p_needs) n order by n.key loop
    if r.needed > 0 then
      perform public._reserve_for_order(p_order, r.id, r.needed, p_reason);
    end if;
  end loop;
end;
$$;

create or replace function public._add_need(p_needs jsonb, p_item uuid, p_qty numeric)
returns jsonb
language sql immutable set search_path = ''
as $$
  select p_needs || jsonb_build_object(p_item::text, coalesce((p_needs->>p_item::text)::numeric, 0) + p_qty)
$$;

-- ---------------------------------------------------------------------------
-- 3. Confirmar compra desde el carrito
-- ---------------------------------------------------------------------------
create or replace function public.place_order(
  p_fulfillment        public.fulfillment_type,
  p_address_text       text default null,
  p_address_reference  text default null,
  p_lat                double precision default null,
  p_lng                double precision default null,
  p_requested_date     date default null,
  p_notes              text default '',
  p_idempotency_key    text default null
)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_uid       uuid := public._require_user();
  v_order     uuid;
  v_profile   public.profiles%rowtype;
  v_line      record;
  v_need      record;
  v_needs     jsonb := '{}'::jsonb;
  v_subtotal  numeric := 0;
  v_minutes   integer := 0;
  v_unit_min  integer;
  v_earliest  date;
  v_date      date;
  v_fee       numeric := 0;
  v_dist      numeric;
  v_total     numeric;
  v_count     integer := 0;
begin
  if p_idempotency_key is null or char_length(p_idempotency_key) not between 8 and 100 then
    raise exception 'Falta la clave de idempotencia de la operación.' using errcode = '22023';
  end if;
  -- Serializa reintentos simultáneos con la misma clave (doble clic, StrictMode, red).
  perform pg_advisory_xact_lock(hashtextextended('miraliz:' || p_idempotency_key, 0));
  select id into v_order from public.orders where customer_id = v_uid and idempotency_key = p_idempotency_key;
  if found then
    return v_order;  -- reintento de la misma operación: no se duplica el pedido
  end if;

  select * into v_profile from public.profiles where id = v_uid;

  -- Precios y minutos recalculados desde la base de datos (nunca desde el navegador)
  for v_line in
    select ci.quantity, p.id as product_id, p.name, p.product_type, p.sale_unit, p.price, p.min_order_qty,
           p.is_published, t.id as template_id, t.name as template_name, coalesce(t.extra_price, 0) as extra,
           (ci.template_id is not null and (t.id is null or not t.is_active or t.product_id <> p.id)) as bad_template
      from public.cart_items ci
      join public.products p on p.id = ci.product_id
      left join public.customization_templates t on t.id = ci.template_id
     where ci.user_id = v_uid
  loop
    v_count := v_count + 1;
    if not v_line.is_published or v_line.price is null then
      raise exception 'El producto "%" ya no está disponible. Quítelo del carrito.', v_line.name using errcode = 'P0001';
    end if;
    if v_line.bad_template then
      raise exception 'La plantilla elegida para "%" ya no está disponible.', v_line.name using errcode = 'P0001';
    end if;
    if v_line.quantity < v_line.min_order_qty then
      raise exception 'La cantidad mínima de "%" es %.', v_line.name, v_line.min_order_qty using errcode = 'P0001';
    end if;
    v_subtotal := v_subtotal + (v_line.price + v_line.extra) * v_line.quantity;
    if v_line.product_type = 'personalizado' then
      v_unit_min := public._production_minutes_per_unit(v_line.product_id);
      if v_unit_min = 0 then
        raise exception 'El producto "%" aún no tiene receta de producción configurada. Solicite una cotización.', v_line.name using errcode = 'P0001';
      end if;
      v_minutes := v_minutes + v_unit_min * v_line.quantity;
    end if;
  end loop;

  if v_count = 0 then
    raise exception 'El carrito está vacío.' using errcode = 'P0001';
  end if;

  -- Fecha factible según capacidad de producción
  v_earliest := public.earliest_delivery_date(v_minutes);
  v_date := coalesce(p_requested_date, v_earliest);
  if v_date < v_earliest then
    raise exception 'La fecha solicitada no es viable. La fecha más próxima disponible es %.', to_char(v_earliest, 'DD/MM/YYYY')
      using errcode = 'P0001', detail = v_earliest::text, hint = 'fecha_no_viable';
  end if;

  -- Entrega: distancia y tarifa calculadas en el servidor
  if p_fulfillment = 'entrega' then
    select d.distance_km, d.fee into v_dist, v_fee from public._validated_delivery(p_lat, p_lng, p_address_text) d;
  end if;

  v_total := v_subtotal + v_fee;

  insert into public.orders (customer_id, customer_name, customer_phone, channel, status, fulfillment,
                             address_text, address_reference, delivery_lat, delivery_lng, delivery_distance_km,
                             delivery_fee, subtotal, total, required_advance, production_minutes,
                             requested_date, promised_date, notes, reservation_expires_at, idempotency_key, created_by)
  values (v_uid, v_profile.full_name, coalesce(v_profile.phone, ''), 'web', 'pendiente_pago', p_fulfillment,
          case when p_fulfillment = 'entrega' then left(p_address_text, 300) end,
          case when p_fulfillment = 'entrega' then left(coalesce(p_address_reference, ''), 300) end,
          case when p_fulfillment = 'entrega' then p_lat end,
          case when p_fulfillment = 'entrega' then p_lng end,
          v_dist, v_fee, v_subtotal, v_total, public._required_advance(v_total), v_minutes,
          p_requested_date, v_date, left(coalesce(p_notes, ''), 1000), public._reservation_deadline(),
          p_idempotency_key, v_uid)
  returning id into v_order;

  for v_line in
    select ci.quantity, ci.notes, p.id as product_id, p.name, p.product_type, p.sale_unit, p.price,
           t.id as template_id, t.name as template_name, coalesce(t.extra_price, 0) as extra,
           si.id as stock_item_id
      from public.cart_items ci
      join public.products p on p.id = ci.product_id
      left join public.customization_templates t on t.id = ci.template_id
      left join public.stock_items si on si.product_id = p.id
     where ci.user_id = v_uid
  loop
    insert into public.order_items (order_id, product_id, template_id, product_name, template_name, sale_unit, quantity,
                                    unit_price, requires_production, production_minutes, custom_description)
    values (v_order, v_line.product_id, v_line.template_id, v_line.name, v_line.template_name, v_line.sale_unit,
            v_line.quantity, v_line.price + v_line.extra, v_line.product_type = 'personalizado',
            case when v_line.product_type = 'personalizado'
                 then public._production_minutes_per_unit(v_line.product_id) * v_line.quantity else 0 end,
            nullif(v_line.notes, ''));

    if v_line.product_type = 'reventa' then
      if v_line.stock_item_id is null then
        raise exception 'El producto "%" no tiene inventario asociado.', v_line.name using errcode = 'P0001';
      end if;
      v_needs := public._add_need(v_needs, v_line.stock_item_id, v_line.quantity);
    else
      for v_need in select * from public._material_needs(v_line.product_id, v_line.quantity) loop
        v_needs := public._add_need(v_needs, v_need.stock_item_id, v_need.needed);
      end loop;
    end if;
  end loop;

  -- Reserva transaccional (bloqueo de filas): evita sobreventa concurrente
  perform public._reserve_needs(v_order, v_needs, 'Reserva por pedido web');

  delete from public.cart_items where user_id = v_uid;
  return v_order;
end;
$$;

-- ---------------------------------------------------------------------------
-- 4. Solicitud de cotización con diseño propio
-- ---------------------------------------------------------------------------
create or replace function public.request_quote(
  p_product            uuid,
  p_quantity           integer,
  p_description        text,
  p_requested_date     date,
  p_fulfillment        public.fulfillment_type,
  p_image_path         text default null,
  p_template           uuid default null,
  p_theme              text default null,
  p_colors             text default null,
  p_address_text       text default null,
  p_address_reference  text default null,
  p_lat                double precision default null,
  p_lng                double precision default null,
  p_notes              text default '',
  p_idempotency_key    text default null
)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_uid      uuid := public._require_user();
  v_prod     public.products%rowtype;
  v_tpl      public.customization_templates%rowtype;
  v_profile  public.profiles%rowtype;
  v_order    uuid;
  v_dist     numeric;
  v_fee      numeric := 0;
begin
  if p_idempotency_key is null or char_length(p_idempotency_key) not between 8 and 100 then
    raise exception 'Falta la clave de idempotencia de la operación.' using errcode = '22023';
  end if;
  -- Serializa reintentos simultáneos con la misma clave (doble clic, StrictMode, red).
  perform pg_advisory_xact_lock(hashtextextended('miraliz:' || p_idempotency_key, 0));
  select id into v_order from public.orders where customer_id = v_uid and idempotency_key = p_idempotency_key;
  if found then
    return v_order;
  end if;

  select * into v_prod from public.products where id = p_product;
  if not found or not v_prod.is_published or v_prod.product_type <> 'personalizado' then
    raise exception 'El producto no admite personalización.' using errcode = 'P0001';
  end if;
  if p_image_path is not null and not v_prod.allows_custom_design then
    raise exception 'Este producto no acepta diseños propios; elija una de las plantillas.' using errcode = 'P0001';
  end if;
  if p_quantity is null or p_quantity < v_prod.min_order_qty or p_quantity > 1000 then
    raise exception 'Cantidad inválida (mínimo %).', v_prod.min_order_qty using errcode = '22023';
  end if;
  if p_description is null or char_length(trim(p_description)) < 10 then
    raise exception 'Describa el trabajo que desea (mínimo 10 caracteres).' using errcode = '22023';
  end if;
  if p_image_path is not null and (p_image_path not like v_uid::text || '/%' or p_image_path ~ '\.\.') then
    raise exception 'La imagen de referencia no pertenece a su cuenta.' using errcode = '42501';
  end if;
  if p_requested_date is null or p_requested_date <= public.business_today() then
    raise exception 'La fecha deseada debe ser posterior a hoy.' using errcode = '22023';
  end if;
  if p_template is not null then
    select * into v_tpl from public.customization_templates where id = p_template and product_id = p_product and is_active;
    if not found then
      raise exception 'La plantilla elegida no está disponible.' using errcode = 'P0001';
    end if;
  end if;
  if p_fulfillment = 'entrega' then
    select d.distance_km, d.fee into v_dist, v_fee from public._validated_delivery(p_lat, p_lng, p_address_text) d;
  end if;

  select * into v_profile from public.profiles where id = v_uid;

  insert into public.orders (customer_id, customer_name, customer_phone, channel, status, fulfillment,
                             address_text, address_reference, delivery_lat, delivery_lng, delivery_distance_km,
                             delivery_fee, subtotal, total, requested_date, notes, idempotency_key, created_by)
  values (v_uid, v_profile.full_name, coalesce(v_profile.phone, ''), 'web', 'cotizacion_pendiente', p_fulfillment,
          case when p_fulfillment = 'entrega' then left(p_address_text, 300) end,
          case when p_fulfillment = 'entrega' then left(coalesce(p_address_reference, ''), 300) end,
          case when p_fulfillment = 'entrega' then p_lat end,
          case when p_fulfillment = 'entrega' then p_lng end,
          v_dist, v_fee, 0, 0, p_requested_date, left(coalesce(p_notes, ''), 1000), p_idempotency_key, v_uid)
  returning id into v_order;

  insert into public.order_items (order_id, product_id, template_id, product_name, template_name, sale_unit, quantity,
                                  unit_price, requires_production, custom_description, custom_theme, custom_colors,
                                  reference_image_path)
  values (v_order, v_prod.id, v_tpl.id, v_prod.name, v_tpl.name, v_prod.sale_unit, p_quantity, null, true,
          left(trim(p_description), 2000), left(p_theme, 120), left(p_colors, 120), p_image_path);

  return v_order;
end;
$$;

-- El administrador envía (o reemplaza) la cotización.
create or replace function public.admin_send_quote(
  p_order               uuid,
  p_unit_price          numeric,
  p_production_minutes  integer,
  p_proposed_date       date,
  p_valid_until         date,
  p_conditions          text default ''
)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_order    public.orders%rowtype;
  v_item     public.order_items%rowtype;
  v_earliest date;
  v_version  integer;
  v_quote    uuid;
begin
  perform public._require_admin();
  select * into v_order from public.orders where id = p_order for update;
  if not found or v_order.status not in ('cotizacion_pendiente', 'cotizacion_enviada', 'cotizacion_vencida') then
    raise exception 'El pedido no está esperando una cotización.' using errcode = 'P0001';
  end if;
  if p_unit_price is null or p_unit_price <= 0 then
    raise exception 'El precio propuesto debe ser mayor a cero.' using errcode = '22023';
  end if;
  if p_production_minutes is null or p_production_minutes < 0 or p_production_minutes > 100000 then
    raise exception 'Minutos de producción inválidos.' using errcode = '22023';
  end if;
  v_earliest := public.earliest_delivery_date(p_production_minutes);
  if p_proposed_date is null or p_proposed_date < v_earliest then
    raise exception 'Con la carga actual, la fecha más próxima viable es %.', to_char(v_earliest, 'DD/MM/YYYY')
      using errcode = 'P0001', detail = v_earliest::text, hint = 'fecha_no_viable';
  end if;
  if p_valid_until is null or p_valid_until < public.business_today() or p_valid_until > p_proposed_date then
    raise exception 'La vigencia debe estar entre hoy y la fecha de entrega propuesta.' using errcode = '22023';
  end if;

  select * into v_item from public.order_items where order_id = p_order order by created_at limit 1;

  update public.quotes set status = 'reemplazada', decided_at = now()
   where order_id = p_order and status = 'enviada';

  select coalesce(max(version), 0) + 1 into v_version from public.quotes where order_id = p_order;

  insert into public.quotes (order_id, version, unit_price, items_total, production_minutes, proposed_date,
                             valid_until, conditions, created_by)
  values (p_order, v_version, round(p_unit_price, 2), round(p_unit_price, 2) * v_item.quantity, p_production_minutes,
          p_proposed_date, p_valid_until, left(coalesce(p_conditions, ''), 1000), auth.uid())
  returning id into v_quote;

  if v_order.status <> 'cotizacion_enviada' then
    perform set_config('miraliz.status_note', 'Cotización v' || v_version || ' enviada', true);
    update public.orders set status = 'cotizacion_enviada' where id = p_order;
  end if;
  return v_quote;
end;
$$;

-- El cliente acepta o rechaza la cotización vigente.
-- Devuelve: 'aceptada' | 'rechazada' | 'vencida' | 'condiciones_cambiaron'
create or replace function public.customer_respond_quote(p_quote uuid, p_accept boolean, p_note text default null)
returns text
language plpgsql security definer set search_path = ''
as $$
declare
  v_uid     uuid := public._require_user();
  v_quote   public.quotes%rowtype;
  v_order   public.orders%rowtype;
  v_item    public.order_items%rowtype;
  v_needs   jsonb := '{}'::jsonb;
  v_need    record;
  v_short   boolean := false;
  v_fee     numeric;
  v_dist    numeric;
  v_total   numeric;
begin
  select * into v_quote from public.quotes where id = p_quote for update;
  if not found then
    raise exception 'Cotización no encontrada.' using errcode = 'P0002';
  end if;
  select * into v_order from public.orders where id = v_quote.order_id for update;
  if v_order.customer_id is distinct from v_uid then
    raise exception 'Cotización no encontrada.' using errcode = 'P0002';
  end if;
  if v_quote.status <> 'enviada' or v_order.status <> 'cotizacion_enviada' then
    raise exception 'La cotización ya no está disponible para responder.' using errcode = 'P0001';
  end if;

  if not p_accept then
    update public.quotes set status = 'rechazada', decided_at = now(), decision_note = left(p_note, 500) where id = p_quote;
    perform set_config('miraliz.status_note', 'Cotización rechazada por el cliente', true);
    update public.orders set status = 'cotizacion_rechazada' where id = v_order.id;
    return 'rechazada';
  end if;

  if v_quote.valid_until < public.business_today() then
    update public.quotes set status = 'vencida', decided_at = now() where id = p_quote;
    perform set_config('miraliz.status_note', 'La cotización venció antes de ser aceptada', true);
    update public.orders set status = 'cotizacion_vencida' where id = v_order.id;
    return 'vencida';
  end if;

  select * into v_item from public.order_items where order_id = v_order.id order by created_at limit 1;

  -- ¿Siguen las condiciones? (capacidad y materiales)
  if v_quote.proposed_date < public.earliest_delivery_date(v_quote.production_minutes) then
    v_short := true;
  end if;
  for v_need in select * from public._material_needs(v_item.product_id, v_item.quantity) loop
    if v_need.available < v_need.needed then
      v_short := true;
    end if;
    v_needs := public._add_need(v_needs, v_need.stock_item_id, v_need.needed);
  end loop;
  if v_short then
    update public.quotes set status = 'vencida', decided_at = now(),
           decision_note = 'Las condiciones de capacidad o materiales cambiaron' where id = p_quote;
    perform set_config('miraliz.status_note', 'Condiciones cambiaron: se requiere nueva cotización', true);
    update public.orders set status = 'cotizacion_vencida' where id = v_order.id;
    return 'condiciones_cambiaron';
  end if;

  -- Revalidar tarifa de entrega con los parámetros vigentes
  v_fee := 0;
  if v_order.fulfillment = 'entrega' then
    select d.distance_km, d.fee into v_dist, v_fee
      from public._validated_delivery(v_order.delivery_lat, v_order.delivery_lng, v_order.address_text) d;
  end if;
  v_total := v_quote.items_total + v_fee;

  update public.order_items
     set unit_price = v_quote.unit_price, production_minutes = v_quote.production_minutes
   where id = v_item.id;

  update public.quotes set status = 'aceptada', decided_at = now(), decision_note = left(p_note, 500) where id = p_quote;

  perform set_config('miraliz.status_note', 'Cotización v' || v_quote.version || ' aceptada', true);
  update public.orders
     set status = 'pendiente_pago',
         subtotal = v_quote.items_total,
         delivery_fee = v_fee,
         delivery_distance_km = coalesce(v_dist, delivery_distance_km),
         total = v_total,
         required_advance = public._required_advance(v_total),
         production_minutes = v_quote.production_minutes,
         promised_date = v_quote.proposed_date,
         reservation_expires_at = public._reservation_deadline()
   where id = v_order.id;

  perform public._reserve_needs(v_order.id, v_needs, 'Reserva por cotización aceptada');
  return 'aceptada';
end;
$$;

-- ---------------------------------------------------------------------------
-- 5. Cancelación y cambios de estado
-- ---------------------------------------------------------------------------
create or replace function public.cancel_order(p_order uuid, p_reason text)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_uid     uuid := public._require_user();
  v_order   public.orders%rowtype;
  v_allowed jsonb := coalesce(public._setting('cancellation')->'customer_statuses',
                              '["cotizacion_pendiente","cotizacion_enviada","cotizacion_vencida","pendiente_pago"]'::jsonb);
begin
  select * into v_order from public.orders where id = p_order for update;
  if not found then
    raise exception 'Pedido no encontrado.' using errcode = 'P0002';
  end if;
  if p_reason is null or char_length(trim(p_reason)) < 3 then
    raise exception 'Indique el motivo de la cancelación.' using errcode = '22023';
  end if;

  if public.is_admin() then
    if v_order.status in ('entregado', 'cancelado', 'cotizacion_rechazada') then
      raise exception 'El pedido ya está cerrado.' using errcode = 'P0001';
    end if;
  else
    if v_order.customer_id is distinct from v_uid then
      raise exception 'Pedido no encontrado.' using errcode = 'P0002';
    end if;
    if not (v_allowed ? v_order.status::text) then
      raise exception 'En el estado actual el pedido solo puede cancelarse comunicándose con la tienda.' using errcode = 'P0001';
    end if;
    if v_order.amount_paid > 0 then
      raise exception 'El pedido tiene pagos registrados. Comuníquese con la tienda para gestionar la cancelación y el reembolso.' using errcode = 'P0001';
    end if;
  end if;

  update public.payments set status = 'cancelado', error_message = 'Pedido cancelado'
   where order_id = p_order and status = 'pendiente';
  update public.quotes set status = 'rechazada', decided_at = now(), decision_note = 'Pedido cancelado'
   where order_id = p_order and status = 'enviada';

  perform set_config('miraliz.status_note', 'Cancelado: ' || left(trim(p_reason), 200), true);
  update public.orders set status = 'cancelado', cancel_reason = left(trim(p_reason), 500) where id = p_order;
end;
$$;

create or replace function public.admin_update_order_status(p_order uuid, p_status public.order_status, p_note text default '')
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_order public.orders%rowtype;
begin
  perform public._require_admin();
  if p_status not in ('en_produccion', 'listo', 'en_camino', 'entregado') then
    raise exception 'Este estado se asigna automáticamente (pagos/cotizaciones) o mediante cancelación.' using errcode = 'P0001';
  end if;
  select * into v_order from public.orders where id = p_order for update;
  if not found then
    raise exception 'Pedido no encontrado.' using errcode = 'P0002';
  end if;
  perform set_config('miraliz.status_note', left(coalesce(p_note, ''), 300), true);
  update public.orders set status = p_status where id = p_order;
end;
$$;

-- ---------------------------------------------------------------------------
-- 6. Pagos manuales, reembolsos y venta de mostrador (solo administrador)
-- ---------------------------------------------------------------------------
create or replace function public.admin_record_payment(
  p_order uuid, p_amount numeric, p_method public.payment_method, p_note text, p_idempotency_key text)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_order public.orders%rowtype;
  v_id    uuid;
begin
  perform public._require_admin();
  if p_method not in ('efectivo', 'transferencia') then
    raise exception 'Los pagos con tarjeta o QR se registran mediante el proveedor de pagos.' using errcode = 'P0001';
  end if;
  if p_idempotency_key is null or char_length(p_idempotency_key) < 8 then
    raise exception 'Falta la clave de idempotencia.' using errcode = '22023';
  end if;
  -- Serializa reintentos simultáneos con la misma clave (doble clic, StrictMode, red).
  perform pg_advisory_xact_lock(hashtextextended('miraliz:' || p_idempotency_key, 0));
  select id into v_id from public.payments where order_id = p_order and idempotency_key = p_idempotency_key;
  if found then
    return v_id;
  end if;
  select * into v_order from public.orders where id = p_order for update;
  if not found or v_order.status not in ('pendiente_pago', 'confirmado', 'en_produccion', 'listo', 'en_camino') then
    raise exception 'El pedido no admite pagos en su estado actual.' using errcode = 'P0001';
  end if;
  if p_amount is null or p_amount <= 0 or p_amount > v_order.balance then
    raise exception 'Monto inválido. Saldo pendiente: Bs %.', v_order.balance using errcode = '22023';
  end if;
  insert into public.payments (order_id, kind, method, provider, environment, amount, status, idempotency_key,
                               note, created_by, confirmed_by)
  values (p_order, 'cobro', p_method, 'manual', 'live', round(p_amount, 2), 'aprobado', p_idempotency_key,
          left(coalesce(p_note, ''), 500), auth.uid(), auth.uid())
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.admin_record_refund(
  p_order uuid, p_amount numeric, p_method public.payment_method, p_reason text, p_idempotency_key text)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_order public.orders%rowtype;
  v_id    uuid;
begin
  perform public._require_admin();
  if p_method not in ('efectivo', 'transferencia') then
    raise exception 'Los reembolsos se registran como efectivo o transferencia.' using errcode = '22023';
  end if;
  -- Serializa reintentos simultáneos con la misma clave (doble clic, StrictMode, red).
  perform pg_advisory_xact_lock(hashtextextended('miraliz:' || p_idempotency_key, 0));
  select id into v_id from public.payments where order_id = p_order and idempotency_key = p_idempotency_key;
  if found then
    return v_id;
  end if;
  select * into v_order from public.orders where id = p_order for update;
  if not found then
    raise exception 'Pedido no encontrado.' using errcode = 'P0002';
  end if;
  if p_amount is null or p_amount <= 0 or p_amount > v_order.amount_paid then
    raise exception 'El reembolso no puede superar lo pagado (Bs %).', v_order.amount_paid using errcode = '22023';
  end if;
  if p_reason is null or char_length(trim(p_reason)) < 5 then
    raise exception 'Indique el motivo del reembolso.' using errcode = '22023';
  end if;
  insert into public.payments (order_id, kind, method, provider, environment, amount, status, idempotency_key,
                               note, created_by, confirmed_by)
  values (p_order, 'reembolso', p_method, 'manual', 'live', round(p_amount, 2), 'aprobado', p_idempotency_key,
          left(trim(p_reason), 500), auth.uid(), auth.uid())
  returning id into v_id;
  return v_id;
end;
$$;

-- p_items: [{"product_id": "...", "quantity": 2}, ...]
create or replace function public.admin_counter_sale(
  p_items jsonb, p_method public.payment_method, p_customer_name text, p_customer_phone text,
  p_note text, p_idempotency_key text)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_uid    uuid := auth.uid();
  v_order  uuid;
  v_line   record;
  v_total  numeric := 0;
  v_count  integer := 0;
begin
  perform public._require_admin();
  if p_method not in ('efectivo', 'transferencia') then
    raise exception 'En mostrador se registran pagos en efectivo o transferencia.' using errcode = '22023';
  end if;
  if p_idempotency_key is null or char_length(p_idempotency_key) < 8 then
    raise exception 'Falta la clave de idempotencia.' using errcode = '22023';
  end if;
  -- Serializa reintentos simultáneos con la misma clave (doble clic, StrictMode, red).
  perform pg_advisory_xact_lock(hashtextextended('miraliz:' || p_idempotency_key, 0));
  select id into v_order from public.orders
   where channel = 'mostrador' and created_by = v_uid and idempotency_key = p_idempotency_key;
  if found then
    return v_order;
  end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Agregue al menos un producto.' using errcode = '22023';
  end if;

  for v_line in
    select (e->>'product_id')::uuid as product_id, sum((e->>'quantity')::integer) as quantity
      from jsonb_array_elements(p_items) e group by 1
  loop
    if v_line.quantity is null or v_line.quantity <= 0 then
      raise exception 'Cantidad inválida.' using errcode = '22023';
    end if;
  end loop;

  insert into public.orders (customer_id, customer_name, customer_phone, channel, status, fulfillment, subtotal, total,
                             notes, idempotency_key, created_by)
  values (null, left(coalesce(nullif(trim(p_customer_name), ''), 'Cliente de mostrador'), 120),
          left(coalesce(p_customer_phone, ''), 20), 'mostrador', 'entregado', 'recojo', 0, 0,
          left(coalesce(p_note, ''), 1000), p_idempotency_key, v_uid)
  returning id into v_order;

  for v_line in
    select p.id, p.name, p.sale_unit, p.price, p.product_type, si.id as stock_item_id, x.quantity
      from (select (e->>'product_id')::uuid as product_id, sum((e->>'quantity')::integer) as quantity
              from jsonb_array_elements(p_items) e group by 1) x
      join public.products p on p.id = x.product_id
      left join public.stock_items si on si.product_id = p.id
     order by si.id
  loop
    v_count := v_count + 1;
    if v_line.product_type <> 'reventa' or v_line.price is null or v_line.stock_item_id is null then
      raise exception 'El producto "%" no puede venderse en mostrador (no es de reventa o no tiene precio).', v_line.name using errcode = 'P0001';
    end if;
    insert into public.order_items (order_id, product_id, product_name, sale_unit, quantity, unit_price)
    values (v_order, v_line.id, v_line.name, v_line.sale_unit, v_line.quantity, v_line.price);
    perform public._stock_apply(v_line.stock_item_id, 'salida_venta', v_line.quantity, v_order,
                                'Venta de mostrador', null, false);
    v_total := v_total + v_line.price * v_line.quantity;
  end loop;

  if v_count <> (select count(distinct (e->>'product_id')) from jsonb_array_elements(p_items) e) then
    raise exception 'Uno o más productos no existen.' using errcode = 'P0002';
  end if;

  update public.orders set subtotal = v_total, total = v_total, delivered_at = now(), confirmed_at = now()
   where id = v_order;

  insert into public.payments (order_id, kind, method, provider, environment, amount, status, idempotency_key,
                               note, created_by, confirmed_by)
  values (v_order, 'cobro', p_method, 'manual', 'live', v_total, 'aprobado', p_idempotency_key,
          'Venta de mostrador', v_uid, v_uid);
  return v_order;
end;
$$;

-- ---------------------------------------------------------------------------
-- 7. Inventario (solo administrador)
-- ---------------------------------------------------------------------------
create or replace function public.admin_receive_stock(p_item uuid, p_quantity numeric, p_unit_cost numeric, p_note text default '')
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  perform public._require_admin();
  perform public._stock_apply(p_item, 'entrada', p_quantity, null, left(coalesce(nullif(p_note, ''), 'Ingreso de mercadería'), 300),
                              p_unit_cost);
  if p_unit_cost is not null and p_unit_cost >= 0 then
    update public.stock_items set ref_cost = round(p_unit_cost, 2) where id = p_item;
  end if;
end;
$$;

create or replace function public.admin_adjust_stock(p_item uuid, p_delta numeric, p_reason text)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  perform public._require_admin();
  if p_reason is null or char_length(trim(p_reason)) < 5 then
    raise exception 'Todo ajuste manual requiere un motivo (mínimo 5 caracteres).' using errcode = '22023';
  end if;
  if p_delta is null or p_delta = 0 then
    raise exception 'El ajuste no puede ser cero.' using errcode = '22023';
  end if;
  perform public._stock_apply(p_item,
    case when p_delta > 0 then 'ajuste_positivo'::public.movement_type else 'ajuste_negativo'::public.movement_type end,
    abs(p_delta), null, left(trim(p_reason), 300));
  perform public._audit('ajuste_inventario', 'stock_items', p_item::text,
                        jsonb_build_object('delta', p_delta, 'motivo', left(trim(p_reason), 300)));
end;
$$;

-- ---------------------------------------------------------------------------
-- 8. Producción: asignación y avance de tareas
-- ---------------------------------------------------------------------------
create or replace function public.admin_assign_task(p_task uuid, p_employee uuid, p_scheduled_date date)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  perform public._require_admin();
  if p_employee is not null and not exists (
       select 1 from public.profiles where id = p_employee and is_active and role in ('empleado', 'admin')) then
    raise exception 'El responsable debe ser un empleado activo.' using errcode = 'P0001';
  end if;
  update public.production_tasks
     set assigned_to = p_employee, scheduled_date = p_scheduled_date
   where id = p_task and status <> 'completada';
  if not found then
    raise exception 'Tarea no encontrada o ya completada.' using errcode = 'P0002';
  end if;
end;
$$;

create or replace function public.employee_update_task(
  p_task uuid, p_status public.task_status, p_minutes integer default 0, p_note text default '')
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_uid   uuid := public._require_user();
  v_task  public.production_tasks%rowtype;
  v_order public.orders%rowtype;
begin
  if not public.is_staff() then
    raise exception 'Operación permitida solo para el personal.' using errcode = '42501';
  end if;
  select * into v_task from public.production_tasks where id = p_task for update;
  if not found or (v_task.assigned_to is distinct from v_uid and not public.is_admin()) then
    raise exception 'La tarea no está asignada a usted.' using errcode = '42501';
  end if;
  if v_task.status = 'completada' then
    raise exception 'La tarea ya fue completada.' using errcode = 'P0001';
  end if;
  if p_status is null or not (v_task.status, p_status) in (
       ('pendiente'::public.task_status, 'en_progreso'::public.task_status), ('pendiente', 'bloqueada'),
       ('en_progreso', 'completada'), ('en_progreso', 'bloqueada'), ('en_progreso', 'pendiente'), ('en_progreso', 'en_progreso'),
       ('bloqueada', 'en_progreso'), ('bloqueada', 'pendiente'), ('pendiente', 'pendiente'), ('bloqueada', 'bloqueada')) then
    raise exception 'Cambio de etapa no permitido: % → %.', v_task.status, p_status using errcode = 'P0001';
  end if;
  if coalesce(p_minutes, 0) < 0 or coalesce(p_minutes, 0) > 960 then
    raise exception 'Los minutos registrados deben estar entre 0 y 960.' using errcode = '22023';
  end if;

  select * into v_order from public.orders where id = v_task.order_id for update;
  if v_order.status not in ('confirmado', 'en_produccion') then
    raise exception 'El pedido % no está en producción (estado: %).', v_order.code, v_order.status using errcode = 'P0001';
  end if;

  update public.production_tasks
     set status = p_status,
         spent_minutes = spent_minutes + coalesce(p_minutes, 0),
         started_at = case when p_status = 'en_progreso' then coalesce(started_at, now()) else started_at end,
         completed_at = case when p_status = 'completada' then now() else null end
   where id = p_task;

  insert into public.task_logs (task_id, employee_id, minutes_spent, new_status, note)
  values (p_task, v_uid, coalesce(p_minutes, 0), p_status, left(coalesce(p_note, ''), 1000));

  if p_status in ('en_progreso', 'completada') and v_order.status = 'confirmado' then
    perform set_config('miraliz.status_note', 'Producción iniciada', true);
    update public.orders set status = 'en_produccion' where id = v_order.id;
  end if;

  if not exists (select 1 from public.production_tasks where order_id = v_order.id and status <> 'completada') then
    perform set_config('miraliz.status_note', 'Todas las tareas de producción completadas', true);
    update public.orders set status = 'listo' where id = v_order.id and status in ('confirmado', 'en_produccion');
  end if;
end;
$$;

-- Tareas del usuario (empleado) con la información operativa mínima necesaria.
create or replace function public.my_tasks()
returns table (
  id uuid, title text, status public.task_status, est_minutes integer, spent_minutes integer,
  scheduled_date date, stage_name text, order_id uuid, order_code text, order_status public.order_status,
  promised_date date, fulfillment public.fulfillment_type, product_name text, template_name text, quantity integer,
  custom_description text, custom_theme text, custom_colors text, reference_image_path text
)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not public.is_staff() then
    raise exception 'Operación permitida solo para el personal.' using errcode = '42501';
  end if;
  return query
    select t.id, t.title, t.status, t.est_minutes, t.spent_minutes, t.scheduled_date, ps.name,
           o.id, o.code, o.status, o.promised_date, o.fulfillment, oi.product_name, oi.template_name, oi.quantity,
           oi.custom_description, oi.custom_theme, oi.custom_colors, oi.reference_image_path
      from public.production_tasks t
      join public.orders o on o.id = t.order_id
      join public.order_items oi on oi.id = t.order_item_id
      left join public.production_stages ps on ps.id = t.stage_id
     where t.assigned_to = auth.uid()
     order by (t.status = 'completada'), t.scheduled_date nulls last, o.promised_date, t.sort_order;
end;
$$;

-- Bitácora visible para el empleado sobre sus tareas.
create or replace function public.task_history(p_task uuid)
returns table (created_at timestamptz, minutes_spent integer, new_status public.task_status, note text, employee_name text)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not exists (select 1 from public.production_tasks t where t.id = p_task
                   and (t.assigned_to = auth.uid() or public.is_admin())) then
    raise exception 'Tarea no encontrada.' using errcode = 'P0002';
  end if;
  return query
    select l.created_at, l.minutes_spent, l.new_status, l.note, p.full_name
      from public.task_logs l left join public.profiles p on p.id = l.employee_id
     where l.task_id = p_task order by l.created_at;
end;
$$;

-- ---------------------------------------------------------------------------
-- 9. Pagos en línea (tarjeta mediante Stripe, QR mediante proveedor configurado)
-- ---------------------------------------------------------------------------
create or replace function public.create_payment_attempt(
  p_order uuid, p_method public.payment_method, p_amount numeric, p_idempotency_key text)
returns public.payments
language plpgsql security definer set search_path = ''
as $$
declare
  v_uid     uuid := public._require_user();
  v_order   public.orders%rowtype;
  v_cfg     jsonb := coalesce(public._setting('payments'), '{}'::jsonb);
  v_mode    text := coalesce(v_cfg->>'mode', 'test');
  v_min     numeric;
  v_pay     public.payments%rowtype;
  v_provider text;
begin
  if p_idempotency_key is null or char_length(p_idempotency_key) not between 8 and 100 then
    raise exception 'Falta la clave de idempotencia.' using errcode = '22023';
  end if;
  -- Serializa reintentos simultáneos con la misma clave (doble clic, StrictMode, red).
  perform pg_advisory_xact_lock(hashtextextended('miraliz:' || p_idempotency_key, 0));
  select * into v_pay from public.payments where order_id = p_order and idempotency_key = p_idempotency_key;
  if found then
    if (select customer_id from public.orders where id = p_order) is distinct from v_uid then
      raise exception 'Pedido no encontrado.' using errcode = 'P0002';
    end if;
    return v_pay;
  end if;

  select * into v_order from public.orders where id = p_order for update;
  if not found or v_order.customer_id is distinct from v_uid then
    raise exception 'Pedido no encontrado.' using errcode = 'P0002';
  end if;
  if v_order.status not in ('pendiente_pago', 'confirmado', 'en_produccion', 'listo', 'en_camino') then
    raise exception 'El pedido no admite pagos en su estado actual.' using errcode = 'P0001';
  end if;
  if v_order.balance <= 0 then
    raise exception 'El pedido no tiene saldo pendiente.' using errcode = 'P0001';
  end if;
  v_min := least(v_order.balance, greatest(v_order.required_advance - v_order.amount_paid, 0));
  if p_amount is null or round(p_amount, 2) <> p_amount or p_amount <= 0 or p_amount > v_order.balance
     or (p_amount < v_min) then
    raise exception 'Monto inválido: debe estar entre Bs % y Bs %.', greatest(v_min, 0.01), v_order.balance using errcode = '22023';
  end if;

  if p_method = 'tarjeta' then
    if not coalesce((v_cfg->>'card_enabled')::boolean, false) then
      raise exception 'El pago con tarjeta no está habilitado.' using errcode = 'P0001';
    end if;
    v_provider := 'stripe';
  elsif p_method = 'qr' then
    v_provider := coalesce(v_cfg->>'qr_provider', 'none');
    if v_provider <> 'sandbox_qr' then
      raise exception 'El cobro por QR real requiere un contrato con un banco o pasarela y aún no está configurado.' using errcode = 'P0001';
    end if;
    if v_mode <> 'test' then
      raise exception 'El proveedor QR de prueba solo puede usarse en modo de pruebas.' using errcode = 'P0001';
    end if;
  else
    raise exception 'Método no disponible en línea.' using errcode = '22023';
  end if;

  -- QR: un solo código vigente por pedido. Los intentos con tarjeta NO se cancelan aquí:
  -- su resultado definitivo lo informa el proveedor por webhook.
  if p_method = 'qr' then
    update public.payments set status = 'cancelado', error_message = 'Reemplazado por un nuevo intento'
     where order_id = p_order and method = 'qr' and status = 'pendiente';
  end if;

  insert into public.payments (order_id, kind, method, provider, environment, amount, status, idempotency_key,
                               expires_at, created_by)
  values (p_order, 'cobro', p_method, v_provider, v_mode, p_amount, 'pendiente', p_idempotency_key,
          case when p_method = 'qr'
               then now() + make_interval(mins => coalesce((v_cfg->>'qr_ttl_minutes')::integer, 10)) end,
          v_uid)
  returning * into v_pay;

  if p_method = 'qr' then
    update public.payments
       set qr_payload = 'MIRALIZ-PRUEBA|' || v_pay.id || '|' || v_order.code || '|BOB ' || to_char(p_amount, 'FM999999990.00')
     where id = v_pay.id
     returning * into v_pay;
  end if;
  return v_pay;
end;
$$;

-- Estado de un intento; marca como expirado un QR cuyo plazo terminó.
create or replace function public.get_payment_status(p_payment uuid)
returns table (id uuid, status public.payment_status, amount numeric, method public.payment_method,
               expires_at timestamptz, receipt_number text, error_message text, environment text)
language plpgsql security definer set search_path = ''
as $$
declare
  v_pay public.payments%rowtype;
begin
  select py.* into v_pay from public.payments py join public.orders o on o.id = py.order_id
   where py.id = p_payment and (o.customer_id = auth.uid() or public.is_admin());
  if not found then
    raise exception 'Pago no encontrado.' using errcode = 'P0002';
  end if;
  if v_pay.status = 'pendiente' and v_pay.method = 'qr' and v_pay.expires_at < now() then
    update public.payments set status = 'expirado', error_message = 'El código QR expiró' where payments.id = p_payment
    returning * into v_pay;
  end if;
  return query select v_pay.id, v_pay.status, v_pay.amount, v_pay.method, v_pay.expires_at,
                      v_pay.receipt_number, v_pay.error_message, v_pay.environment;
end;
$$;

create or replace function public.cancel_payment_attempt(p_payment uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  update public.payments py set status = 'cancelado', error_message = 'Cancelado por el usuario'
    from public.orders o
   where py.id = p_payment and o.id = py.order_id and py.status = 'pendiente'
     and (o.customer_id = auth.uid() or public.is_admin());
end;
$$;

-- Confirmación controlada para el proveedor QR DE PRUEBA (no mueve dinero real).
create or replace function public.admin_sandbox_resolve_qr(p_payment uuid, p_approve boolean)
returns public.payment_status
language plpgsql security definer set search_path = ''
as $$
declare
  v_pay public.payments%rowtype;
begin
  perform public._require_admin();
  select * into v_pay from public.payments where id = p_payment for update;
  if not found or v_pay.provider <> 'sandbox_qr' or v_pay.environment <> 'test' then
    raise exception 'Solo los pagos QR del entorno de pruebas pueden resolverse manualmente.' using errcode = '42501';
  end if;
  if v_pay.status <> 'pendiente' then
    raise exception 'El intento ya está cerrado (%).', v_pay.status using errcode = 'P0001';
  end if;
  if v_pay.expires_at < now() then
    update public.payments set status = 'expirado', error_message = 'El código QR expiró' where id = p_payment;
    return 'expirado';
  end if;
  update public.payments
     set status = case when p_approve then 'aprobado'::public.payment_status else 'rechazado'::public.payment_status end,
         confirmed_by = auth.uid(),
         error_message = case when p_approve then null else 'Rechazado en entorno de pruebas' end,
         provider_ref = 'SANDBOX-' || replace(p_payment::text, '-', '')
   where id = p_payment;
  return case when p_approve then 'aprobado'::public.payment_status else 'rechazado'::public.payment_status end;
end;
$$;

-- --- Solo para el backend (Edge Functions con clave secreta / service_role) ---
create or replace function public.payment_set_provider_ref(p_payment uuid, p_provider_ref text)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  update public.payments set provider_ref = p_provider_ref
   where id = p_payment and status = 'pendiente' and (provider_ref is null or provider_ref = p_provider_ref);
  if not found then
    raise exception 'Intento de pago no válido para asociar referencia.' using errcode = 'P0001';
  end if;
end;
$$;

create or replace function public.payment_apply_provider_result(
  p_provider text, p_event_id text, p_event_type text, p_provider_ref text,
  p_status public.payment_status, p_amount numeric, p_currency text, p_error text default null)
returns text
language plpgsql security definer set search_path = ''
as $$
declare
  v_pay public.payments%rowtype;
  v_inserted bigint;
begin
  insert into public.payment_events (provider, event_id, event_type, summary)
  values (p_provider, p_event_id, p_event_type,
          jsonb_build_object('ref', p_provider_ref, 'status', p_status, 'amount', p_amount, 'currency', p_currency))
  on conflict (provider, event_id) do nothing
  returning id into v_inserted;
  if v_inserted is null then
    return 'duplicado';
  end if;

  select * into v_pay from public.payments where provider = p_provider and provider_ref = p_provider_ref for update;
  if not found then
    return 'sin_pago_asociado';
  end if;
  update public.payment_events set payment_id = v_pay.id where id = v_inserted;

  if v_pay.status <> 'pendiente' then
    if p_status = 'aprobado' and v_pay.status <> 'aprobado' then
      -- El proveedor cobró un intento que ya estaba cerrado (p. ej. pedido cancelado):
      -- queda registrado para que el administrador lo revise y reembolse si corresponde.
      perform public._audit('pago_requiere_revision', 'payments', v_pay.id::text,
        jsonb_build_object('estado_local', v_pay.status, 'proveedor', p_provider, 'referencia', p_provider_ref,
                           'monto', p_amount, 'evento', p_event_id));
    end if;
    return 'ya_cerrado';
  end if;
  if p_status = 'aprobado' and (p_amount is distinct from v_pay.amount or upper(p_currency) <> v_pay.currency) then
    update public.payments set status = 'fallido', error_message = 'El monto confirmado no coincide con el intento'
     where id = v_pay.id;
    return 'monto_no_coincide';
  end if;
  update public.payments set status = p_status, error_message = left(p_error, 300) where id = v_pay.id;
  return 'aplicado';
end;
$$;

-- ---------------------------------------------------------------------------
-- 10. Mantenimiento: vencimiento de reservas y cotizaciones
-- ---------------------------------------------------------------------------
create or replace function public.run_maintenance()
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  r record;
  v_cancelled integer := 0;
  v_expired   integer := 0;
begin
  if not (public.is_admin() or current_user in ('postgres', 'service_role')) then
    raise exception 'Operación permitida solo para el administrador.' using errcode = '42501';
  end if;
  update public.payments set status = 'expirado', error_message = 'El código QR expiró'
   where status = 'pendiente' and method = 'qr' and expires_at < now();

  for r in
    select o.id from public.orders o
     where o.status = 'pendiente_pago' and o.reservation_expires_at < now() and o.amount_paid = 0
       and not exists (select 1 from public.payments p where p.order_id = o.id and p.status = 'pendiente'
                         and p.created_at > now() - interval '30 minutes')
     for update skip locked
  loop
    update public.payments set status = 'cancelado', error_message = 'Reserva vencida'
     where order_id = r.id and status = 'pendiente';
    perform set_config('miraliz.status_note', 'Reserva vencida sin pago', true);
    update public.orders set status = 'cancelado', cancel_reason = 'Reserva vencida sin pago' where id = r.id;
    v_cancelled := v_cancelled + 1;
  end loop;

  for r in
    select q.id, q.order_id from public.quotes q join public.orders o on o.id = q.order_id
     where q.status = 'enviada' and q.valid_until < public.business_today() and o.status = 'cotizacion_enviada'
     for update of q skip locked
  loop
    update public.quotes set status = 'vencida', decided_at = now() where id = r.id;
    perform set_config('miraliz.status_note', 'Cotización vencida', true);
    update public.orders set status = 'cotizacion_vencida' where id = r.order_id;
    v_expired := v_expired + 1;
  end loop;

  return jsonb_build_object('pedidos_cancelados', v_cancelled, 'cotizaciones_vencidas', v_expired);
end;
$$;

-- ---------------------------------------------------------------------------
-- 11. Usuarios y roles
-- ---------------------------------------------------------------------------
create or replace function public.admin_set_user_role(p_user uuid, p_role public.app_role, p_active boolean default true)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  perform public._require_admin();
  if p_user = auth.uid() then
    raise exception 'No puede cambiar su propio rol ni desactivar su propia cuenta.' using errcode = 'P0001';
  end if;
  update public.profiles set role = p_role, is_active = coalesce(p_active, true) where id = p_user;
  if not found then
    raise exception 'Usuario no encontrado.' using errcode = 'P0002';
  end if;
  if not exists (select 1 from public.profiles where role = 'admin' and is_active) then
    raise exception 'Debe existir al menos un administrador activo.' using errcode = 'P0001';
  end if;
  -- Al quitar el rol de empleado, sus tareas abiertas quedan sin asignar.
  if p_role <> 'empleado' or not coalesce(p_active, true) then
    update public.production_tasks set assigned_to = null where assigned_to = p_user and status <> 'completada';
  end if;
end;
$$;

-- Crea el PRIMER administrador. Solo ejecutable desde el SQL Editor (rol postgres)
-- y solo si todavía no existe ningún administrador.
create or replace function public.bootstrap_first_admin(p_email text)
returns text
language plpgsql security definer set search_path = ''
as $$
declare
  v_id uuid;
begin
  if exists (select 1 from public.profiles where role = 'admin') then
    raise exception 'Ya existe un administrador. Use el panel de administración para gestionar roles.' using errcode = 'P0001';
  end if;
  select id into v_id from public.profiles where lower(email) = lower(trim(p_email));
  if not found then
    raise exception 'No existe un usuario registrado con el correo %. Regístrese primero en la aplicación.', p_email using errcode = 'P0002';
  end if;
  update public.profiles set role = 'admin', is_active = true where id = v_id;
  insert into public.audit_log (actor_id, actor_role, action, entity, entity_id, details)
  values (null, 'sistema', 'bootstrap_admin', 'profiles', v_id::text, jsonb_build_object('email', lower(trim(p_email))));
  return 'Administrador configurado: ' || lower(trim(p_email));
end;
$$;

-- ---------------------------------------------------------------------------
-- 12. Panel administrativo
-- ---------------------------------------------------------------------------
create or replace function public.admin_dashboard(p_from date, p_to date)
returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare
  v_from timestamptz;
  v_to   timestamptz;
  v_tz   text := coalesce(public._setting('business')->>'timezone', 'America/La_Paz');
  v      jsonb;
begin
  perform public._require_admin();
  if p_from is null or p_to is null or p_to < p_from then
    raise exception 'Rango de fechas inválido.' using errcode = '22023';
  end if;
  v_from := (p_from::timestamp) at time zone v_tz;
  v_to   := ((p_to + 1)::timestamp) at time zone v_tz;

  select jsonb_build_object(
    'ventas_registradas', (select coalesce(sum(total), 0) from public.orders
                            where created_at >= v_from and created_at < v_to
                              and status not in ('cancelado', 'cotizacion_pendiente', 'cotizacion_enviada',
                                                 'cotizacion_rechazada', 'cotizacion_vencida')),
    'pedidos_en_periodo', (select count(*) from public.orders where created_at >= v_from and created_at < v_to),
    'ingresos_cobrados', (select coalesce(sum(case when kind = 'cobro' then amount else -amount end), 0)
                            from public.payments where status = 'aprobado' and confirmed_at >= v_from and confirmed_at < v_to),
    'ingresos_por_metodo', (select coalesce(jsonb_object_agg(method, total), '{}'::jsonb) from (
                              select method, sum(case when kind = 'cobro' then amount else -amount end) as total
                                from public.payments where status = 'aprobado' and confirmed_at >= v_from and confirmed_at < v_to
                               group by method) m),
    'saldos_por_cobrar', (select coalesce(sum(balance), 0) from public.orders
                           where status in ('pendiente_pago', 'confirmado', 'en_produccion', 'listo', 'en_camino')),
    'pedidos_por_estado', (select coalesce(jsonb_object_agg(status, n), '{}'::jsonb) from (
                             select status, count(*) as n from public.orders
                              where status not in ('entregado', 'cancelado', 'cotizacion_rechazada') group by status) s),
    'cotizaciones_pendientes', (select count(*) from public.orders where status = 'cotizacion_pendiente'),
    'pagos_pendientes', (select count(*) from public.orders where status = 'pendiente_pago'),
    'stock_bajo', (select coalesce(jsonb_agg(jsonb_build_object('id', id, 'name', name, 'kind', kind, 'quantity', quantity,
                                     'reserved', reserved, 'min_stock', min_stock, 'unit', unit) order by name), '[]'::jsonb)
                     from public.stock_items where is_active and quantity - reserved <= min_stock),
    'consumo_materiales', (select coalesce(jsonb_agg(jsonb_build_object('name', si.name, 'unit', si.unit, 'total', x.total)
                                     order by x.total desc), '[]'::jsonb)
                             from (select stock_item_id, sum(quantity) as total from public.inventory_movements
                                    where movement_type = 'consumo_produccion' and created_at >= v_from and created_at < v_to
                                    group by stock_item_id) x
                             join public.stock_items si on si.id = x.stock_item_id),
    'ventas_por_dia', (select coalesce(jsonb_agg(jsonb_build_object('dia', d, 'total', t) order by d), '[]'::jsonb) from (
                          select (created_at at time zone v_tz)::date as d, sum(total) as t from public.orders
                           where created_at >= v_from and created_at < v_to
                             and status not in ('cancelado', 'cotizacion_pendiente', 'cotizacion_enviada',
                                                'cotizacion_rechazada', 'cotizacion_vencida')
                           group by 1) s),
    'carga_trabajo_minutos', public.current_production_load(),
    'tareas_pendientes', (select count(*) from public.production_tasks where status <> 'completada'),
    'tareas_sin_asignar', (select count(*) from public.production_tasks where status <> 'completada' and assigned_to is null),
    'tareas_atrasadas', (select count(*) from public.production_tasks t join public.orders o on o.id = t.order_id
                          where t.status <> 'completada'
                            and (t.scheduled_date < public.business_today() or o.promised_date < public.business_today())),
    'fecha_factible_hoy', public.earliest_delivery_date(60)
  ) into v;
  return v;
end;
$$;
