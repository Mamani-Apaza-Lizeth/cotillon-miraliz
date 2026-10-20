import json, subprocess, sys, time
from playwright.sync_api import sync_playwright
import os
HERE = os.path.dirname(os.path.abspath(__file__))
S = sys.argv[1]; BASE = 'http://127.0.0.1:5173'
ADMIN = ('11111111-1111-4111-8111-111111111111', 'duena@miraliz.test')
EMP = ('22222222-2222-4222-8222-222222222222', 'taller@miraliz.test')
CLI = ('33333333-3333-4333-8333-333333333333', 'cliente@miraliz.test')
def token(uid, email):
    return subprocess.check_output(['node', '-e', f"import('{HERE}/jwt.mjs').then(m=>process.stdout.write(m.sign({{sub:'{uid}',role:'authenticated',aud:'authenticated',email:'{email}'}})))"]).decode()
def session(uid, email):
    t = token(uid, email)
    return json.dumps({'access_token': t, 'refresh_token': 'local', 'token_type': 'bearer', 'expires_in': 86400,
        'expires_at': int(time.time()) + 86400, 'user': {'id': uid, 'email': email, 'aud': 'authenticated', 'role': 'authenticated', 'app_metadata': {}, 'user_metadata': {}, 'created_at': '2026-01-01T00:00:00Z'}})
errors = []
def ctx(b, who, w=1366, h=900):
    c = b.new_context(viewport={'width': w, 'height': h})
    c.add_init_script(f"localStorage.setItem('sb-127-auth-token', {json.dumps(session(*who))})")
    pg = c.new_page()
    pg.on('pageerror', lambda e: errors.append(str(e)))
    pg.on('console', lambda m: errors.append(m.text) if m.type == 'error' and 'ERR_TUNNEL' not in m.text else None)
    return pg
def shot(pg, name, full=True):
    pg.wait_for_timeout(700); pg.screenshot(path=f'{S}/{name}.png', full_page=full)
with sync_playwright() as p:
    b = p.chromium.launch()
    cli = ctx(b, CLI)
    # 1) compra de reventa
    cli.goto(BASE + '/producto/globos-latex-9-surtidos', wait_until='networkidle')
    cli.get_by_role('button', name='Sumar uno').click()
    cli.get_by_role('button', name='Agregar al carrito').click()
    cli.wait_for_timeout(800)
    # 2) personalizado con plantilla
    cli.goto(BASE + '/producto/pinata-2d', wait_until='networkidle')
    cli.get_by_label('Plantilla de diseño').select_option(label='Número con nombre')
    cli.get_by_label('Datos para la personalización').fill('Número 5, nombre MATEO, colores verde y azul')
    cli.get_by_role('button', name='Agregar al carrito').click()
    cli.wait_for_timeout(800)
    cli.goto(BASE + '/carrito', wait_until='networkidle'); shot(cli, 'e2e_01_carrito')
    cli.get_by_role('link', name='Continuar').click(); cli.wait_for_load_state('networkidle')
    cli.get_by_text('Entrega a domicilio', exact=True).click()
    cli.wait_for_timeout(1500)
    # marcar punto en el mapa (clic en el centro)
    box = cli.locator('.leaflet-container').bounding_box()
    cli.mouse.click(box['x'] + box['width']/2 + 40, box['y'] + box['height']/2 + 20)
    cli.get_by_label('Dirección', exact=True).fill('Av. Chacaltaya 1258, zona Achachicala')
    cli.get_by_label('Referencia').fill('Portón verde')
    cli.wait_for_timeout(1500); shot(cli, 'e2e_02_checkout')
    cli.get_by_role('button', name='Confirmar pedido').click()
    cli.wait_for_url('**/mis-pedidos/*', timeout=15000); cli.wait_for_load_state('networkidle')
    order_url = cli.url; shot(cli, 'e2e_03_pedido_creado')
    cli.get_by_role('button', name='Pago con QR').click(); cli.wait_for_timeout(2500)
    shot(cli, 'e2e_04_qr', full=False)
    # 3) administrador confirma el QR de prueba
    adm = ctx(b, ADMIN)
    adm.goto(BASE + '/admin/pedidos', wait_until='networkidle'); shot(adm, 'e2e_05_admin_pedidos')
    adm.goto(order_url.replace('/mis-pedidos/', '/admin/pedidos/'), wait_until='networkidle')
    adm.get_by_role('button', name='Confirmar pago de prueba').click(); adm.wait_for_timeout(1500)
    adm.reload(wait_until='networkidle'); shot(adm, 'e2e_06_admin_pedido_confirmado')
    # 4) el cliente ve el pago verificado (sondeo cada 10 s)
    cli.wait_for_timeout(11000); shot(cli, 'e2e_07_cliente_pago_verificado', full=False)
    # 5) asignar tareas al empleado
    adm.goto(BASE + '/admin/produccion', wait_until='networkidle')
    for sel in adm.locator('select[aria-label^="Responsable"]').all():
        sel.select_option(label='Lizeth (taller)'); adm.wait_for_timeout(700)
    shot(adm, 'e2e_08_admin_produccion')
    emp = ctx(b, EMP)
    emp.goto(BASE + '/empleado/tareas', wait_until='networkidle')
    emp.get_by_role('button', name='Iniciar / reanudar').first.click()
    emp.get_by_label('Minutos trabajados en esta sesión').fill('25')
    emp.get_by_role('button', name='Guardar').click(); emp.wait_for_timeout(1500)
    shot(emp, 'e2e_09_empleado_tareas')
    adm.goto(BASE + '/admin', wait_until='networkidle'); shot(adm, 'e2e_10_admin_dashboard')
    adm.goto(BASE + '/admin/inventario', wait_until='networkidle'); shot(adm, 'e2e_11_admin_inventario')
    # 6) cotización con diseño propio no se puede sin imagen; cliente móvil
    mob = ctx(b, CLI, 390, 844)
    mob.goto(order_url, wait_until='networkidle'); shot(mob, 'e2e_12_movil_pedido')
    # 7) seguridad: cliente intenta abrir admin
    cli.goto(BASE + '/admin', wait_until='networkidle'); shot(cli, 'e2e_13_cliente_sin_acceso_admin', full=False)
    b.close()
print('ORDER', order_url)
print('ERRORES', errors[:15])
