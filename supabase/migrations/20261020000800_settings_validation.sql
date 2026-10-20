-- =============================================================================
-- Cotillón MiraLiz · Migración 008 · Validación de parámetros en el servidor
-- -----------------------------------------------------------------------------
-- Ejemplo de migración posterior: agrega validación de la estructura y rangos
-- de app_settings para que ni siquiera un administrador (o una petición
-- manipulada) pueda guardar valores imposibles (porcentajes > 100, tarifas
-- negativas, coordenadas inválidas, capacidad > 24 h, modo desconocido).
-- Depende de: 001, 003, 007
-- =============================================================================

create or replace function public._validate_setting()
returns trigger
language plpgsql set search_path = ''
as $$
declare
  v jsonb := new.value;
  k text;
begin
  if jsonb_typeof(v) <> 'object' then
    raise exception 'La configuración "%" debe ser un objeto JSON.', new.key using errcode = '22023';
  end if;

  if new.key = 'payments' then
    if coalesce(v->>'mode', '') not in ('test', 'live') then
      raise exception 'Modo de pagos inválido (use test o live).' using errcode = '22023';
    end if;
    if (v->>'min_advance_percent')::numeric not between 0 and 100 then
      raise exception 'El anticipo debe estar entre 0 y 100 %%.' using errcode = '22023';
    end if;
    if (v->>'reservation_hours')::integer < 1 or (v->>'reservation_hours')::integer > 720 then
      raise exception 'Las horas de reserva deben estar entre 1 y 720.' using errcode = '22023';
    end if;
    if (v->>'qr_ttl_minutes')::integer not between 1 and 60 then
      raise exception 'La vigencia del QR debe estar entre 1 y 60 minutos.' using errcode = '22023';
    end if;
    if v->>'mode' = 'live' and v->>'qr_provider' = 'sandbox_qr' then
      raise exception 'El proveedor QR de prueba no puede usarse en modo producción.' using errcode = '22023';
    end if;
  elsif new.key = 'delivery' then
    if (v->>'origin_lat')::double precision not between -90 and 90
       or (v->>'origin_lng')::double precision not between -180 and 180 then
      raise exception 'Coordenadas del local inválidas.' using errcode = '22023';
    end if;
    if (v->>'base_fee')::numeric < 0 or (v->>'per_km_fee')::numeric < 0 or coalesce((v->>'min_fee')::numeric, 0) < 0 then
      raise exception 'Las tarifas no pueden ser negativas.' using errcode = '22023';
    end if;
    if (v->>'max_km')::numeric <= 0 or (v->>'max_km')::numeric > 100 then
      raise exception 'La cobertura debe estar entre 0 y 100 km.' using errcode = '22023';
    end if;
  elsif new.key = 'production_capacity' then
    for k in select jsonb_object_keys(v->'minutes_by_weekday') loop
      if k not in ('0', '1', '2', '3', '4', '5', '6')
         or (v->'minutes_by_weekday'->>k)::integer not between 0 and 1440 then
        raise exception 'Capacidad diaria inválida (0 a 1440 minutos por día).' using errcode = '22023';
      end if;
    end loop;
    if coalesce((v->>'start_offset_days')::integer, 0) not between 0 and 60
       or coalesce((v->>'buffer_days')::integer, 0) not between 0 and 60
       or coalesce((v->>'resale_lead_days')::integer, 0) not between 0 and 60 then
      raise exception 'Los días configurados deben estar entre 0 y 60.' using errcode = '22023';
    end if;
  elsif new.key = 'cancellation' then
    if jsonb_typeof(v->'customer_statuses') <> 'array' or exists (
         select 1 from jsonb_array_elements_text(v->'customer_statuses') s
          where s not in ('cotizacion_pendiente', 'cotizacion_enviada', 'cotizacion_vencida', 'pendiente_pago')) then
      raise exception 'Estados de cancelación inválidos.' using errcode = '22023';
    end if;
  elsif new.key = 'business' then
    if coalesce(v->>'timezone', '') = '' or not exists (select 1 from pg_catalog.pg_timezone_names where name = v->>'timezone') then
      raise exception 'Zona horaria inválida.' using errcode = '22023';
    end if;
  end if;
  new.updated_by := coalesce(auth.uid(), new.updated_by);
  return new;
exception
  when invalid_text_representation or numeric_value_out_of_range then
    raise exception 'Valor numérico inválido en la configuración "%".', new.key using errcode = '22023';
end;
$$;

create trigger app_settings_validate
  before insert or update on public.app_settings
  for each row execute function public._validate_setting();
