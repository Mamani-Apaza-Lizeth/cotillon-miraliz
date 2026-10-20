-- =============================================================================
-- Cotillón MiraLiz · Migración 003 · Funciones base y triggers
-- -----------------------------------------------------------------------------
-- Propósito : funciones auxiliares de rol, creación segura de perfiles,
--             marcas de tiempo, auditoría, motor de inventario, validación de
--             transiciones de estado de pedidos y sus efectos (reservas,
--             consumos, liberaciones, tareas de producción).
-- Depende de: 001_schema, 002_indexes
-- Seguridad : las funciones SECURITY DEFINER fijan search_path = '' y usan
--             nombres totalmente calificados. Las funciones internas llevan
--             prefijo "_" y se les revoca EXECUTE en la migración 005.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Rol del usuario actual (fuente confiable: tabla profiles, no el JWT)
-- ---------------------------------------------------------------------------
create or replace function public.current_app_role()
returns public.app_role
language sql stable security definer set search_path = ''
as $$
  select p.role from public.profiles p where p.id = auth.uid() and p.is_active
$$;

create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select coalesce(public.current_app_role() = 'admin', false)
$$;

create or replace function public.is_staff()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select coalesce(public.current_app_role() in ('admin', 'empleado'), false)
$$;

-- Lanza error si el usuario actual no es administrador activo.
create or replace function public._require_admin()
returns void
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Operación permitida solo para el administrador.' using errcode = '42501';
  end if;
end;
$$;

-- Lanza error si no hay sesión de un usuario activo.
create or replace function public._require_user()
returns uuid
language plpgsql stable security definer set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null or public.current_app_role() is null then
    raise exception 'Debes iniciar sesión con una cuenta activa.' using errcode = '42501';
  end if;
  return v_uid;
end;
$$;

-- Lectura tipada de parámetros de configuración.
create or replace function public._setting(p_key text)
returns jsonb
language sql stable security definer set search_path = ''
as $$
  select s.value from public.app_settings s where s.key = p_key
$$;

-- Fecha "de hoy" en la zona horaria del negocio (America/La_Paz).
create or replace function public.business_today()
returns date
language sql stable security definer set search_path = ''
as $$
  select (now() at time zone coalesce(
            (select s.value->>'timezone' from public.app_settings s where s.key = 'business'),
            'America/La_Paz'))::date
$$;

-- ---------------------------------------------------------------------------
-- 2. Marcas de tiempo
-- ---------------------------------------------------------------------------
create or replace function public._touch_updated_at()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

do $$
declare t text;
begin
  foreach t in array array['profiles','app_settings','categories','products','customization_templates',
                           'suppliers','stock_items','recipes','cart_items','orders','payments','production_tasks']
  loop
    execute format('create trigger %I before update on public.%I for each row execute function public._touch_updated_at()',
                   t || '_touch_updated_at', t);
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- 3. Creación segura de perfiles al registrarse
--    El rol SIEMPRE es 'cliente'; cualquier "role" enviado en metadata se ignora.
-- ---------------------------------------------------------------------------
create or replace function public._handle_new_user()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_name  text := left(coalesce(new.raw_user_meta_data->>'full_name', ''), 120);
  v_phone text := new.raw_user_meta_data->>'phone';
begin
  if v_phone is not null and v_phone !~ '^[0-9+ ()-]{6,20}$' then
    v_phone := null;
  end if;
  insert into public.profiles (id, email, full_name, phone, role)
  values (new.id, coalesce(new.email, ''), v_name, v_phone, 'cliente')
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public._handle_new_user();

create or replace function public._sync_user_email()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  update public.profiles set email = coalesce(new.email, '') where id = new.id;
  return new;
end;
$$;

create trigger on_auth_user_email_changed
  after update of email on auth.users
  for each row when (old.email is distinct from new.email)
  execute function public._sync_user_email();

-- Defensa en profundidad: rol, estado y correo solo cambian desde funciones
-- privilegiadas (que se ejecutan como propietario) o desde el panel SQL.
create or replace function public._guard_profile_privileged_columns()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  if (new.role is distinct from old.role
      or new.is_active is distinct from old.is_active
      or new.email is distinct from old.email
      or new.id is distinct from old.id)
     and current_user not in ('postgres', 'supabase_admin', 'service_role') then
    raise exception 'No está permitido modificar el rol, el estado ni el correo del perfil.' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger profiles_guard_privileged
  before update on public.profiles
  for each row execute function public._guard_profile_privileged_columns();

-- ---------------------------------------------------------------------------
-- 4. Auditoría
-- ---------------------------------------------------------------------------
create or replace function public._audit(p_action text, p_entity text, p_entity_id text, p_details jsonb default '{}'::jsonb)
returns void
language sql security definer set search_path = ''
as $$
  insert into public.audit_log (actor_id, actor_role, action, entity, entity_id, details)
  values (auth.uid(), public.current_app_role()::text, p_action, p_entity, p_entity_id, coalesce(p_details, '{}'::jsonb));
$$;

create or replace function public._audit_trigger()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_old jsonb := case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end;
  v_new jsonb := case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end;
  v_row jsonb := coalesce(v_new, v_old);
  v_details jsonb := '{}'::jsonb;
  k text;
begin
  if tg_op = 'UPDATE' then
    for k in select jsonb_object_keys(v_new) loop
      if k not in ('updated_at') and (v_new->k) is distinct from (v_old->k) then
        v_details := v_details || jsonb_build_object(k, jsonb_build_object('antes', v_old->k, 'despues', v_new->k));
      end if;
    end loop;
    if v_details = '{}'::jsonb then
      return new;
    end if;
  else
    v_details := v_row - 'qr_payload';
  end if;
  perform public._audit(lower(tg_op), tg_table_name,
                        coalesce(v_row->>'id', v_row->>'key', v_row->>'recipe_id'), v_details);
  return coalesce(new, old);
end;
$$;

do $$
declare t text;
begin
  foreach t in array array['categories','products','customization_templates','suppliers','stock_items',
                           'recipes','recipe_materials','recipe_stages','app_settings','quotes','payments']
  loop
    execute format('create trigger %I after insert or update or delete on public.%I for each row execute function public._audit_trigger()',
                   t || '_audit', t);
  end loop;
end;
$$;

create trigger profiles_audit_role
  after update on public.profiles
  for each row when (old.role is distinct from new.role or old.is_active is distinct from new.is_active)
  execute function public._audit_trigger();

create trigger production_tasks_audit
  after update on public.production_tasks
  for each row when (old.assigned_to is distinct from new.assigned_to or old.status is distinct from new.status
                     or old.scheduled_date is distinct from new.scheduled_date)
  execute function public._audit_trigger();

-- ---------------------------------------------------------------------------
-- 5. Motor de inventario
--    Toda variación de existencias pasa por _stock_apply, que bloquea la fila,
--    valida y deja un movimiento en la bitácora. Las restricciones CHECK de
--    stock_items (quantity >= 0, reserved <= quantity) son la última barrera.
-- ---------------------------------------------------------------------------
create or replace function public._stock_apply(
  p_item           uuid,
  p_type           public.movement_type,
  p_qty            numeric,
  p_order          uuid default null,
  p_reason         text default '',
  p_unit_cost      numeric default null,
  p_from_reserved  boolean default true
)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_item public.stock_items%rowtype;
  v_dq numeric := 0;   -- variación de cantidad
  v_dr numeric := 0;   -- variación de reservado
begin
  if p_qty is null or p_qty <= 0 then
    raise exception 'La cantidad del movimiento debe ser mayor a cero.' using errcode = '22023';
  end if;

  select * into v_item from public.stock_items where id = p_item for update;
  if not found then
    raise exception 'El ítem de inventario no existe.' using errcode = 'P0002';
  end if;

  case p_type
    when 'entrada', 'ajuste_positivo' then
      v_dq := p_qty;
    when 'ajuste_negativo' then
      if v_item.quantity - v_item.reserved < p_qty then
        raise exception 'No se puede descontar %: solo hay % disponibles (% reservados) de "%".',
          p_qty, v_item.quantity - v_item.reserved, v_item.reserved, v_item.name using errcode = 'P0001';
      end if;
      v_dq := -p_qty;
    when 'reserva' then
      if v_item.quantity - v_item.reserved < p_qty then
        raise exception 'Stock insuficiente de "%": disponible %, solicitado %.',
          v_item.name, v_item.quantity - v_item.reserved, p_qty using errcode = 'P0001';
      end if;
      v_dr := p_qty;
    when 'liberacion_reserva' then
      v_dr := -least(p_qty, v_item.reserved);
    when 'salida_venta', 'consumo_produccion' then
      if p_from_reserved then
        if v_item.reserved < p_qty then
          raise exception 'Inconsistencia: la reserva de "%" es menor a lo que se intenta descontar.', v_item.name using errcode = 'P0001';
        end if;
        v_dr := -p_qty;
      elsif v_item.quantity - v_item.reserved < p_qty then
        raise exception 'Stock insuficiente de "%": disponible %, solicitado %.',
          v_item.name, v_item.quantity - v_item.reserved, p_qty using errcode = 'P0001';
      end if;
      v_dq := -p_qty;
  end case;

  update public.stock_items
     set quantity = quantity + v_dq, reserved = reserved + v_dr
   where id = p_item
   returning * into v_item;

  insert into public.inventory_movements
    (stock_item_id, movement_type, quantity, quantity_after, reserved_after, unit_cost, order_id, reason, created_by)
  values
    (p_item, p_type, abs(case when v_dq <> 0 then v_dq else coalesce(nullif(v_dr, 0), p_qty) end),
     v_item.quantity, v_item.reserved, p_unit_cost, p_order, coalesce(p_reason, ''), auth.uid());
end;
$$;

-- Reserva y registra la reserva por pedido (para liberarla/consumirla sin duplicar).
create or replace function public._reserve_for_order(p_order uuid, p_item uuid, p_qty numeric, p_reason text)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  perform public._stock_apply(p_item, 'reserva', p_qty, p_order, p_reason);
  insert into public.stock_reservations (order_id, stock_item_id, quantity)
  values (p_order, p_item, p_qty);
end;
$$;

-- Cierra las reservas activas de un pedido: 'liberada' devuelve a disponible,
-- 'consumida' descuenta definitivamente. Solo actúa sobre reservas 'activa',
-- por lo que llamarla dos veces no descuenta dos veces.
create or replace function public._close_reservations(p_order uuid, p_kind public.stock_kind, p_new_state public.reservation_state)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  r record;
begin
  for r in
    select sr.id, sr.stock_item_id, sr.quantity
      from public.stock_reservations sr
      join public.stock_items si on si.id = sr.stock_item_id
     where sr.order_id = p_order and sr.state = 'activa' and (p_kind is null or si.kind = p_kind)
     order by sr.stock_item_id
     for update of sr
  loop
    if p_new_state = 'liberada' then
      perform public._stock_apply(r.stock_item_id, 'liberacion_reserva', r.quantity, p_order, 'Liberación de reserva');
    elsif p_new_state = 'consumida' then
      perform public._stock_apply(r.stock_item_id,
        case when p_kind = 'material' then 'consumo_produccion'::public.movement_type else 'salida_venta'::public.movement_type end,
        r.quantity, p_order, 'Descuento definitivo de pedido');
    end if;
    update public.stock_reservations set state = p_new_state, closed_at = now() where id = r.id;
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- 6. Necesidad de materiales según receta activa
-- ---------------------------------------------------------------------------
create or replace function public._material_needs(p_product uuid, p_qty integer)
returns table (stock_item_id uuid, name text, unit public.measure_unit, needed numeric, available numeric)
language sql stable security definer set search_path = ''
as $$
  select si.id, si.name, si.unit,
         round(rm.quantity * p_qty / r.yield_qty, 3) as needed,
         si.quantity - si.reserved as available
    from public.recipes r
    join public.recipe_materials rm on rm.recipe_id = r.id
    join public.stock_items si on si.id = rm.stock_item_id
   where r.product_id = p_product and r.is_active
$$;

create or replace function public._production_minutes_per_unit(p_product uuid)
returns integer
language sql stable security definer set search_path = ''
as $$
  select coalesce(sum(rs.minutes_per_unit), 0)::integer
    from public.recipes r
    join public.recipe_stages rs on rs.recipe_id = r.id
   where r.product_id = p_product and r.is_active
$$;

-- ---------------------------------------------------------------------------
-- 7. Capacidad de producción y fecha factible
--    Carga = minutos restantes de tareas abiertas + minutos de pedidos que
--    esperan pago (ya comprometidos). Se recorre el calendario sumando la
--    capacidad diaria configurada hasta cubrir carga + minutos nuevos.
-- ---------------------------------------------------------------------------
create or replace function public.current_production_load()
returns integer
language sql stable security definer set search_path = ''
as $$
  select (
    coalesce((select sum(greatest(t.est_minutes - t.spent_minutes, 0))
                from public.production_tasks t
               where t.status <> 'completada'), 0)
  + coalesce((select sum(o.production_minutes)
                from public.orders o
               where o.status = 'pendiente_pago'), 0)
  )::integer
$$;

create or replace function public.earliest_delivery_date(p_new_minutes integer default 0)
returns date
language plpgsql stable security definer set search_path = ''
as $$
declare
  v_cfg      jsonb := coalesce(public._setting('production_capacity'), '{}'::jsonb);
  v_today    date := public.business_today();
  v_offset   integer := coalesce((v_cfg->>'start_offset_days')::integer, 1);
  v_buffer   integer := coalesce((v_cfg->>'buffer_days')::integer, 0);
  v_resale   integer := coalesce((v_cfg->>'resale_lead_days')::integer, 0);
  v_need     bigint;
  v_acc      bigint := 0;
  v_day      date;
  v_cap      integer;
  i          integer := 0;
begin
  if coalesce(p_new_minutes, 0) <= 0 then
    return v_today + v_resale;
  end if;
  v_need := public.current_production_load() + p_new_minutes;
  v_day := v_today + v_offset - 1;
  loop
    v_day := v_day + 1;
    i := i + 1;
    v_cap := coalesce((v_cfg->'minutes_by_weekday'->>(extract(dow from v_day)::int)::text)::integer, 0);
    v_acc := v_acc + greatest(v_cap, 0);
    exit when v_acc >= v_need;
    if i > 366 then
      raise exception 'La capacidad de producción configurada no alcanza para el próximo año. Revise la configuración.' using errcode = 'P0001';
    end if;
  end loop;
  return v_day + v_buffer;
end;
$$;

-- ---------------------------------------------------------------------------
-- 8. Cotización de entrega (distancia en línea recta, fórmula de Haversine)
--    Es una APROXIMACIÓN: no es la distancia real por calles.
-- ---------------------------------------------------------------------------
create or replace function public.delivery_quote(p_lat double precision, p_lng double precision)
returns table (distance_km numeric, fee numeric, within_coverage boolean, enabled boolean)
language plpgsql stable security definer set search_path = ''
as $$
declare
  c        jsonb := coalesce(public._setting('delivery'), '{}'::jsonb);
  o_lat    double precision := (c->>'origin_lat')::double precision;
  o_lng    double precision := (c->>'origin_lng')::double precision;
  v_dist   double precision;
  v_fee    numeric;
  r        constant double precision := 6371.0;
begin
  if p_lat is null or p_lng is null or p_lat not between -90 and 90 or p_lng not between -180 and 180 then
    raise exception 'Coordenadas inválidas.' using errcode = '22023';
  end if;
  if o_lat is null or o_lng is null then
    raise exception 'El punto de origen de entregas no está configurado.' using errcode = 'P0001';
  end if;
  v_dist := 2 * r * asin(sqrt(
              power(sin(radians(p_lat - o_lat) / 2), 2)
            + cos(radians(o_lat)) * cos(radians(p_lat)) * power(sin(radians(p_lng - o_lng) / 2), 2)));
  v_fee := round(coalesce((c->>'base_fee')::numeric, 0) + coalesce((c->>'per_km_fee')::numeric, 0) * v_dist::numeric, 2);
  if (c->>'min_fee') is not null then
    v_fee := greatest(v_fee, (c->>'min_fee')::numeric);
  end if;
  distance_km := round(v_dist::numeric, 2);
  fee := v_fee;
  within_coverage := v_dist <= coalesce((c->>'max_km')::double precision, 0);
  enabled := coalesce((c->>'enabled')::boolean, false);
  return next;
end;
$$;

-- ---------------------------------------------------------------------------
-- 9. Ciclo de vida del pedido: transiciones válidas y efectos
-- ---------------------------------------------------------------------------
create or replace function public.order_transition_allowed(p_from public.order_status, p_to public.order_status)
returns boolean
language sql immutable set search_path = ''
as $$
  select (p_from, p_to) in (
    ('cotizacion_pendiente'::public.order_status, 'cotizacion_enviada'::public.order_status),
    ('cotizacion_pendiente', 'cancelado'),
    ('cotizacion_enviada',   'pendiente_pago'),
    ('cotizacion_enviada',   'cotizacion_rechazada'),
    ('cotizacion_enviada',   'cotizacion_vencida'),
    ('cotizacion_enviada',   'cancelado'),
    ('cotizacion_vencida',   'cotizacion_enviada'),
    ('cotizacion_vencida',   'cancelado'),
    ('pendiente_pago',       'confirmado'),
    ('pendiente_pago',       'cancelado'),
    ('confirmado',           'en_produccion'),
    ('confirmado',           'listo'),
    ('confirmado',           'cancelado'),
    ('en_produccion',        'listo'),
    ('en_produccion',        'cancelado'),
    ('listo',                'en_camino'),
    ('listo',                'entregado'),
    ('listo',                'cancelado'),
    ('en_camino',            'entregado'),
    ('en_camino',            'listo')
  )
$$;

create or replace function public._orders_before_status()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  if new.status is distinct from old.status then
    if not public.order_transition_allowed(old.status, new.status) then
      raise exception 'Transición de estado no permitida: % → %.', old.status, new.status using errcode = 'P0001';
    end if;
    if new.status = 'en_camino' and new.fulfillment <> 'entrega' then
      raise exception 'Solo los pedidos con entrega a domicilio pueden pasar a "en camino".' using errcode = 'P0001';
    end if;
    if new.status = 'entregado' and new.total - new.amount_paid > 0 then
      raise exception 'No se puede entregar: el pedido tiene un saldo pendiente de Bs %.', new.total - new.amount_paid using errcode = 'P0001';
    end if;
    if new.status = 'confirmado' then
      new.confirmed_at := now();
      new.reservation_expires_at := null;
    elsif new.status = 'entregado' then
      new.delivered_at := now();
    end if;
  end if;
  return new;
end;
$$;

create trigger orders_before_status
  before update of status on public.orders
  for each row execute function public._orders_before_status();

-- Crea las tareas de producción a partir de la receta activa o, si el ítem
-- se cotizó sin receta, una tarea general con los minutos de la cotización.
create or replace function public._create_production_tasks(p_order uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  it record;
  st record;
  v_has_stage boolean;
begin
  if exists (select 1 from public.production_tasks where order_id = p_order) then
    return;
  end if;
  for it in select * from public.order_items where order_id = p_order and requires_production loop
    v_has_stage := false;
    for st in
      select ps.id as stage_id, ps.name, ps.sort_order, rs.minutes_per_unit
        from public.recipes r
        join public.recipe_stages rs on rs.recipe_id = r.id
        join public.production_stages ps on ps.id = rs.stage_id
       where r.product_id = it.product_id and r.is_active
       order by ps.sort_order
    loop
      v_has_stage := true;
      insert into public.production_tasks (order_id, order_item_id, stage_id, title, est_minutes, sort_order)
      values (p_order, it.id, st.stage_id, st.name || ' · ' || it.product_name || ' ×' || it.quantity,
              st.minutes_per_unit * it.quantity, st.sort_order);
    end loop;
    if not v_has_stage then
      insert into public.production_tasks (order_id, order_item_id, stage_id, title, est_minutes)
      values (p_order, it.id, null, 'Elaboración · ' || it.product_name || ' ×' || it.quantity, it.production_minutes);
    end if;
  end loop;
end;
$$;

create or replace function public._orders_after_status()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.order_status_history (order_id, from_status, to_status, changed_by, note)
    values (new.id, null, new.status, auth.uid(), 'Pedido creado');
    return new;
  end if;

  if new.status is distinct from old.status then
    insert into public.order_status_history (order_id, from_status, to_status, changed_by, note)
    values (new.id, old.status, new.status, auth.uid(), coalesce(current_setting('miraliz.status_note', true), ''));

    perform public._audit('cambio_estado', 'orders', new.id::text,
                          jsonb_build_object('de', old.status, 'a', new.status));

    if new.status = 'confirmado' then
      perform public._create_production_tasks(new.id);
    elsif new.status = 'en_produccion' then
      perform public._close_reservations(new.id, 'material', 'consumida');
    elsif new.status = 'listo' and old.status = 'confirmado' then
      -- Pedido sin producción iniciada que pasa directo a listo: consume materiales si los hubiera.
      perform public._close_reservations(new.id, 'material', 'consumida');
    elsif new.status = 'entregado' then
      perform public._close_reservations(new.id, 'material', 'consumida');
      perform public._close_reservations(new.id, 'producto', 'consumida');
    elsif new.status in ('cancelado', 'cotizacion_rechazada', 'cotizacion_vencida') then
      perform public._close_reservations(new.id, null, 'liberada');
    end if;
  end if;
  return new;
end;
$$;

create trigger orders_after_insert
  after insert on public.orders
  for each row execute function public._orders_after_status();

create trigger orders_after_status
  after update of status on public.orders
  for each row execute function public._orders_after_status();

-- ---------------------------------------------------------------------------
-- 10. Pagos: recálculo del saldo y confirmación automática
-- ---------------------------------------------------------------------------
create or replace function public._recalc_order_payments(p_order uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_paid numeric;
  v_order public.orders%rowtype;
begin
  select * into v_order from public.orders where id = p_order for update;
  select coalesce(sum(case when kind = 'cobro' then amount else -amount end), 0)
    into v_paid
    from public.payments
   where order_id = p_order and status = 'aprobado';

  update public.orders set amount_paid = greatest(v_paid, 0) where id = p_order;

  if v_order.status = 'pendiente_pago' and v_paid >= v_order.required_advance and v_paid > 0 then
    perform set_config('miraliz.status_note', 'Confirmado automáticamente al registrar el anticipo requerido', true);
    update public.orders set status = 'confirmado' where id = p_order;
    perform set_config('miraliz.status_note', '', true);
  end if;
end;
$$;

create or replace function public._payments_after_change()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if tg_op = 'INSERT' or new.status is distinct from old.status or new.amount is distinct from old.amount then
    perform public._recalc_order_payments(new.order_id);
  end if;
  return new;
end;
$$;

create trigger payments_after_change
  after insert or update on public.payments
  for each row execute function public._payments_after_change();

-- Un pago aprobado es definitivo: no puede volver a otro estado ni cambiar de monto.
create or replace function public._payments_guard()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  if old.status = 'aprobado' and (new.status <> 'aprobado' or new.amount <> old.amount or new.order_id <> old.order_id) then
    raise exception 'Un pago aprobado no puede modificarse. Registre un reembolso si corresponde.' using errcode = 'P0001';
  end if;
  if old.status in ('rechazado', 'fallido', 'cancelado', 'expirado') and new.status <> old.status then
    raise exception 'El intento de pago ya está cerrado (%).', old.status using errcode = 'P0001';
  end if;
  if new.status = 'aprobado' and old.status <> 'aprobado' then
    new.confirmed_at := coalesce(new.confirmed_at, now());
    new.receipt_number := coalesce(new.receipt_number,
      'RC-' || to_char(now() at time zone 'America/La_Paz', 'YYYYMMDD') || '-' || upper(substr(replace(new.id::text, '-', ''), 1, 8)));
  end if;
  return new;
end;
$$;

create trigger payments_guard
  before update on public.payments
  for each row execute function public._payments_guard();

create or replace function public._payments_before_insert()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  if new.status = 'aprobado' then
    new.confirmed_at := coalesce(new.confirmed_at, now());
    new.receipt_number := coalesce(new.receipt_number,
      'RC-' || to_char(now() at time zone 'America/La_Paz', 'YYYYMMDD') || '-' || upper(substr(replace(new.id::text, '-', ''), 1, 8)));
  end if;
  return new;
end;
$$;

create trigger payments_before_insert
  before insert on public.payments
  for each row execute function public._payments_before_insert();

-- ---------------------------------------------------------------------------
-- 11. Integridad de recetas: los materiales deben ser de tipo 'material'
-- ---------------------------------------------------------------------------
create or replace function public._recipe_material_kind_check()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  if not exists (select 1 from public.stock_items where id = new.stock_item_id and kind = 'material') then
    raise exception 'Solo se pueden usar ítems de tipo material en una receta.' using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger recipe_materials_kind_check
  before insert or update on public.recipe_materials
  for each row execute function public._recipe_material_kind_check();

-- Al crear un producto de reventa se crea su ítem de inventario.
create or replace function public._product_stock_item()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if new.product_type = 'reventa' then
    -- Las existencias de un producto de reventa se cuentan en su unidad de venta.
    insert into public.stock_items (kind, product_id, name, unit, is_demo)
    values ('producto', new.id, new.name,
            case new.sale_unit when 'caja' then 'caja'::public.measure_unit
                               when 'paquete' then 'paquete'::public.measure_unit
                               when 'metro' then 'metro'::public.measure_unit
                               else 'unidad'::public.measure_unit end,
            new.is_demo)
    on conflict (product_id) do nothing;
  end if;
  return new;
end;
$$;

create trigger products_create_stock_item
  after insert or update of product_type on public.products
  for each row execute function public._product_stock_item();
