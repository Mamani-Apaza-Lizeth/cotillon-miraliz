-- Prueba de concurrencia (solo local): dos clientes compran la última unidad a la vez.
insert into auth.users (id, email) values
  ('00000000-0000-4000-b000-000000000011', 'concurrente1@miraliz.test'),
  ('00000000-0000-4000-b000-000000000012', 'concurrente2@miraliz.test');
insert into public.categories (id, name, slug) values ('10000000-0000-4000-b000-000000000001', 'Concurrencia', 'zz-concurrencia');
insert into public.products (id, category_id, name, slug, product_type, sale_unit, price, is_published)
values ('20000000-0000-4000-b000-000000000001', '10000000-0000-4000-b000-000000000001', 'Última unidad', 'zz-ultima-unidad', 'reventa', 'unidad', 5, true);
select public._stock_apply((select id from public.stock_items where product_id = '20000000-0000-4000-b000-000000000001'), 'entrada', 1, null, 'concurrencia');
insert into public.cart_items (user_id, product_id, quantity) values
  ('00000000-0000-4000-b000-000000000011', '20000000-0000-4000-b000-000000000001', 1),
  ('00000000-0000-4000-b000-000000000012', '20000000-0000-4000-b000-000000000001', 1);
