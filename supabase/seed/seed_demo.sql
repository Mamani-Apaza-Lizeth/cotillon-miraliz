-- =============================================================================
-- Cotillón MiraLiz · Datos de DEMOSTRACIÓN (opcional)
-- -----------------------------------------------------------------------------
-- Uso      : ejecutar DESPUÉS de todas las migraciones, solo en entornos de
--            prueba o para la presentación del proyecto.
-- Marca    : todas las filas llevan is_demo = true. Se eliminan con
--            supabase/seed/cleanup_demo.sql.
-- Aviso    : nombres de productos y materiales se basan en el documento del
--            proyecto (mochilas, piñatas 2D, globos serigrafiados, telas,
--            cierres, pasadores, ribetes, plastoformo, silicona). Los PRECIOS,
--            CANTIDADES y TIEMPOS son DE DEMOSTRACIÓN, no son datos oficiales
--            del negocio.
-- No crea usuarios ni contraseñas.
-- =============================================================================

begin;

-- Categorías
insert into public.categories (name, slug, description, sort_order, is_demo) values
  ('Globos',              'globos',              'Globos de látex y metalizados para toda ocasión.', 10, true),
  ('Velas y decoración',  'velas-decoracion',    'Velas, banderines y decoración para mesas.', 20, true),
  ('Vajilla descartable', 'vajilla-descartable', 'Platos, vasos y servilletas temáticas.', 30, true),
  ('Personalizados',      'personalizados',      'Mochilas, piñatas 2D y globos serigrafiados hechos a pedido.', 40, true)
on conflict (slug) do nothing;

-- Proveedores
insert into public.suppliers (name, phone, notes, is_demo) values
  ('Distribuidora de telas (demo)', '70000001', 'Proveedor de ejemplo para pruebas.', true),
  ('Mayorista de cotillón (demo)',  '70000002', 'Proveedor de ejemplo para pruebas.', true);

-- Productos de reventa (el trigger crea su ítem de inventario)
insert into public.products (category_id, name, slug, description, product_type, sale_unit, units_per_sale, price,
                             is_published, is_featured, is_demo)
select c.id, v.name, v.slug, v.description, 'reventa', v.sale_unit::public.sale_unit, v.ups, v.price, true, v.featured, true
  from (values
    ('globos', 'Globos de látex N.º 9 surtidos', 'globos-latex-9-surtidos', 'Paquete de globos de colores surtidos, ideales para arcos y decoración.', 'paquete', 50, 25.00, true),
    ('globos', 'Globo metalizado número', 'globo-metalizado-numero', 'Globo metalizado con forma de número, 40 cm aprox.', 'unidad', 1, 12.00, false),
    ('velas-decoracion', 'Velas de cumpleaños con chispas', 'velas-chispas', 'Caja de velas de colores para torta.', 'caja', 24, 15.00, true),
    ('velas-decoracion', 'Banderín "Feliz Cumpleaños"', 'banderin-feliz-cumple', 'Banderín de cartulina metalizada.', 'unidad', 1, 18.00, false),
    ('vajilla-descartable', 'Platos descartables temáticos', 'platos-tematicos', 'Paquete de platos de cartón de 18 cm.', 'paquete', 10, 14.00, false),
    ('vajilla-descartable', 'Vasos de colores', 'vasos-colores', 'Paquete de vasos descartables de colores.', 'paquete', 12, 10.00, false)
  ) as v(cat, name, slug, description, sale_unit, ups, price, featured)
  join public.categories c on c.slug = v.cat
on conflict (slug) do nothing;

-- Productos personalizados
insert into public.products (category_id, name, slug, description, product_type, sale_unit, price,
                             allows_custom_design, min_order_qty, is_published, is_featured, is_demo)
select c.id, v.name, v.slug, v.description, 'personalizado', 'unidad', v.price, true, v.minq, true, true, true
  from (values
    ('Mochila personalizada', 'mochila-personalizada', 'Mochila de tela con la temática y colores de tu fiesta. Elige una plantilla o envía tu diseño para cotizar.', 18.00, 6),
    ('Piñata 2D', 'pinata-2d', 'Piñata plana de plastoformo decorada a mano con la temática que elijas.', 85.00, 1),
    ('Globos con serigrafía', 'globos-serigrafia', 'Globos impresos con nombre, edad o logotipo. Precio por globo.', 3.50, 25)
  ) as v(name, slug, description, price, minq)
  join public.categories c on c.slug = 'personalizados'
on conflict (slug) do nothing;

-- Plantillas
insert into public.customization_templates (product_id, name, description, extra_price)
select p.id, v.name, v.description, v.extra
  from (values
    ('mochila-personalizada', 'Temática princesas', 'Colores rosado y lila con nombre bordado.', 0.00),
    ('mochila-personalizada', 'Temática superhéroes', 'Colores rojo y azul con nombre.', 0.00),
    ('pinata-2d', 'Número con nombre', 'Número de la edad con el nombre del cumpleañero.', 0.00),
    ('pinata-2d', 'Personaje genérico', 'Figura de animal o estrella decorada.', 10.00),
    ('globos-serigrafia', 'Nombre y edad', 'Texto en una cara del globo.', 0.00)
  ) as v(slug, name, description, extra)
  join public.products p on p.slug = v.slug
 where not exists (select 1 from public.customization_templates t where t.product_id = p.id and t.name = v.name);

-- Materiales
insert into public.stock_items (kind, name, unit, min_stock, ref_cost, supplier_id, is_demo)
select 'material', v.name, v.unit::public.measure_unit, v.min, v.cost,
       (select id from public.suppliers where name like 'Distribuidora de telas%' limit 1), true
  from (values
    ('Tela tocuyo estampada', 'metro', 10, 12.00),
    ('Cierres de 20 cm', 'unidad', 30, 1.50),
    ('Pasadores (cordón)', 'metro', 20, 0.80),
    ('Ribete', 'metro', 20, 0.50),
    ('Plancha de plastoformo 1 cm', 'plancha', 5, 15.00),
    ('Barras de silicona', 'barra', 20, 1.00),
    ('Papel crepé', 'pliego', 30, 1.20),
    ('Globos lisos para serigrafía', 'unidad', 100, 0.60),
    ('Tinta de serigrafía', 'mililitro', 200, 0.10)
  ) as v(name, unit, min, cost)
 where not exists (select 1 from public.stock_items s where s.name = v.name and s.kind = 'material');

-- Existencias iniciales (quedan registradas como movimientos de entrada)
do $$
declare r record;
begin
  for r in
    select si.id, v.qty from (values
      ('Globos de látex N.º 9 surtidos', 40), ('Globo metalizado número', 60), ('Velas de cumpleaños con chispas', 30),
      ('Banderín "Feliz Cumpleaños"', 15), ('Platos descartables temáticos', 25), ('Vasos de colores', 3),
      ('Tela tocuyo estampada', 60), ('Cierres de 20 cm', 150), ('Pasadores (cordón)', 120), ('Ribete', 100),
      ('Plancha de plastoformo 1 cm', 20), ('Barras de silicona', 80), ('Papel crepé', 120),
      ('Globos lisos para serigrafía', 500), ('Tinta de serigrafía', 2000)
    ) as v(name, qty)
    join public.stock_items si on si.name = v.name
    where si.is_demo and si.quantity = 0
  loop
    perform public._stock_apply(r.id, 'entrada', r.qty, null, 'Inventario inicial de demostración');
  end loop;
end;
$$;

update public.stock_items set min_stock = 5 where is_demo and kind = 'producto';

-- Recetas activas con materiales y etapas (tiempos de demostración)
insert into public.recipes (product_id, version, yield_qty, is_active, notes)
select p.id, 1, 1, true, 'Receta de demostración'
  from public.products p
 where p.slug in ('mochila-personalizada', 'pinata-2d', 'globos-serigrafia')
   and not exists (select 1 from public.recipes r where r.product_id = p.id);

insert into public.recipe_materials (recipe_id, stock_item_id, quantity)
select r.id, si.id, v.qty
  from (values
    ('mochila-personalizada', 'Tela tocuyo estampada', 0.5),
    ('mochila-personalizada', 'Pasadores (cordón)', 1.6),
    ('mochila-personalizada', 'Ribete', 1.0),
    ('pinata-2d', 'Plancha de plastoformo 1 cm', 1),
    ('pinata-2d', 'Barras de silicona', 4),
    ('pinata-2d', 'Papel crepé', 6),
    ('globos-serigrafia', 'Globos lisos para serigrafía', 1),
    ('globos-serigrafia', 'Tinta de serigrafía', 2)
  ) as v(slug, material, qty)
  join public.products p on p.slug = v.slug
  join public.recipes r on r.product_id = p.id and r.is_active
  join public.stock_items si on si.name = v.material and si.kind = 'material'
on conflict do nothing;

insert into public.recipe_stages (recipe_id, stage_id, minutes_per_unit)
select r.id, s.id, v.minutes
  from (values
    ('mochila-personalizada', 'corte', 5), ('mochila-personalizada', 'costura', 15), ('mochila-personalizada', 'decoracion', 5),
    ('pinata-2d', 'corte', 30), ('pinata-2d', 'armado', 40), ('pinata-2d', 'decoracion', 60),
    ('globos-serigrafia', 'serigrafia', 2)
  ) as v(slug, stage, minutes)
  join public.products p on p.slug = v.slug
  join public.recipes r on r.product_id = p.id and r.is_active
  join public.production_stages s on s.code = v.stage
on conflict do nothing;

commit;
