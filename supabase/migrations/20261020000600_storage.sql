-- =============================================================================
-- Cotillón MiraLiz · Migración 006 · Supabase Storage
-- -----------------------------------------------------------------------------
-- Buckets:
--   product-images  (PÚBLICO)  fotos del catálogo y de plantillas. Solo el
--                              administrador sube, reemplaza o borra.
--   customizations  (PRIVADO)  imágenes de referencia de los clientes.
--                              Ruta obligatoria: <uid del cliente>/<archivo>.
--                              Leen: el dueño, el administrador y el empleado
--                              que tiene asignada una tarea de ese pedido.
-- Límites: 5 MB; JPG, PNG o WEBP (validados por Storage y por la interfaz).
-- Depende de: 003 (is_admin), 005
-- =============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('product-images', 'product-images', true,  5242880, array['image/jpeg', 'image/png', 'image/webp']),
  ('customizations', 'customizations', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- ¿Puede el usuario actual leer este archivo de personalización?
create or replace function public.can_read_customization(p_name text)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select auth.uid() is not null and (
       split_part(p_name, '/', 1) = auth.uid()::text
    or public.is_admin()
    or exists (
         select 1
           from public.production_tasks t
           join public.order_items oi on oi.id = t.order_item_id
          where oi.reference_image_path = p_name
            and t.assigned_to = auth.uid()
            and public.is_staff())
  )
$$;
grant execute on function public.can_read_customization(text) to authenticated;

-- product-images
create policy "miraliz catalogo lectura publica" on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'product-images');
create policy "miraliz catalogo admin sube" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'product-images' and public.is_admin());
create policy "miraliz catalogo admin actualiza" on storage.objects
  for update to authenticated
  using (bucket_id = 'product-images' and public.is_admin())
  with check (bucket_id = 'product-images' and public.is_admin());
create policy "miraliz catalogo admin borra" on storage.objects
  for delete to authenticated
  using (bucket_id = 'product-images' and public.is_admin());

-- customizations
create policy "miraliz diseno sube en su carpeta" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'customizations' and split_part(name, '/', 1) = (select auth.uid())::text);
create policy "miraliz diseno lectura autorizada" on storage.objects
  for select to authenticated
  using (bucket_id = 'customizations' and public.can_read_customization(name));
create policy "miraliz diseno borra propio sin usar" on storage.objects
  for delete to authenticated
  using (bucket_id = 'customizations'
         and split_part(name, '/', 1) = (select auth.uid())::text
         and not exists (select 1 from public.order_items oi where oi.reference_image_path = name));
