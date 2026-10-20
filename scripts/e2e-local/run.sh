#!/usr/bin/env bash
# =============================================================================
# Prueba E2E LOCAL de la interfaz contra la base de datos real (sin Supabase).
# Componentes: PostgreSQL local + PostgREST + proxy que imita las rutas de
# Supabase (/rest/v1, /auth/v1/user) + Vite + Playwright (Chromium).
# Limitaciones: no emula Storage, el envío de correos ni las Edge Functions;
# las sesiones se inyectan con JWT de prueba firmados localmente.
# Requisitos: PGHOST/PGPORT/PGUSER (E2E_DB_HOST = host TCP para PostgREST, por defecto localhost), binario postgrest en PATH (o POSTGREST_BIN),
# Node 20+, Python 3 con playwright (pip install playwright && playwright install chromium).
# Uso: ./scripts/e2e-local/run.sh <carpeta-de-capturas>
# =============================================================================
set -euo pipefail
cd "$(dirname "$0")/../.."
OUT="${1:-./e2e-capturas}"; mkdir -p "$OUT"
DB=miraliz_e2e; HERE=scripts/e2e-local
SECRET="${E2E_JWT_SECRET:-miraliz-e2e-local-secret-0123456789abcdef}"
dropdb --if-exists "$DB"; createdb "$DB"
psql -q -v ON_ERROR_STOP=1 -d "$DB" -f supabase/tests/local/supabase_shim.sql >/dev/null
for f in supabase/migrations/*.sql; do psql -q -v ON_ERROR_STOP=1 -d "$DB" -f "$f" >/dev/null; done
psql -q -v ON_ERROR_STOP=1 -d "$DB" -f supabase/seed/seed_demo.sql >/dev/null
psql -q -d "$DB" <<'SQL' >/dev/null
do $$ begin if not exists (select 1 from pg_roles where rolname = 'authenticator') then
  create role authenticator login noinherit password 'authpass'; end if; end $$;
grant anon, authenticated, service_role to authenticator;
insert into auth.users (id, email, raw_user_meta_data) values
 ('11111111-1111-4111-8111-111111111111', 'duena@miraliz.test', '{"full_name":"Rosa (propietaria)"}'),
 ('22222222-2222-4222-8222-222222222222', 'taller@miraliz.test', '{"full_name":"Lizeth (taller)"}'),
 ('33333333-3333-4333-8333-333333333333', 'cliente@miraliz.test', '{"full_name":"Mateo Quispe","phone":"70123456"}');
select public.bootstrap_first_admin('duena@miraliz.test');
update public.profiles set role = 'empleado' where id = '22222222-2222-4222-8222-222222222222';
SQL
cat > /tmp/miraliz-postgrest.conf <<CONF
db-uri = "postgres://authenticator:authpass@${E2E_DB_HOST:-localhost}:${PGPORT:-5432}/$DB"
db-schemas = "public"
db-anon-role = "anon"
jwt-secret = "$SECRET"
jwt-aud = "authenticated"
server-host = "127.0.0.1"
server-port = 3000
CONF
"${POSTGREST_BIN:-postgrest}" /tmp/miraliz-postgrest.conf > /tmp/miraliz-postgrest.log 2>&1 & P1=$!
node $HERE/proxy.mjs > /tmp/miraliz-proxy.log 2>&1 & P2=$!
ANON=$(E2E_JWT_SECRET="$SECRET" node $HERE/jwt.mjs anon)
VITE_SUPABASE_URL=http://127.0.0.1:54321 VITE_SUPABASE_PUBLISHABLE_KEY="$ANON" npx vite --host 127.0.0.1 --port 5173 --strictPort > /tmp/miraliz-vite.log 2>&1 & P3=$!
trap 'kill $P1 $P2 $P3 2>/dev/null || true' EXIT
sleep 6
E2E_JWT_SECRET="$SECRET" python3 $HERE/flow.py "$OUT"
echo "Capturas en $OUT"
