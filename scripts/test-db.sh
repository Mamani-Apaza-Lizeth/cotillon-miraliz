#!/usr/bin/env bash
# =============================================================================
# Pruebas de base de datos en un PostgreSQL LOCAL (no toca Supabase).
# Crea una base temporal, emula lo mínimo de Supabase, aplica migraciones,
# datos demo, la batería de pruebas y la prueba de concurrencia.
# Requisitos: PostgreSQL 15+ (psql, createdb, dropdb) y variables PGHOST,
# PGPORT, PGUSER (y PGPASSWORD si corresponde) apuntando a un servidor local.
# Uso:  ./scripts/test-db.sh            (en Windows: Git Bash o WSL)
# =============================================================================
set -euo pipefail
cd "$(dirname "$0")/.."
DB="${TEST_DB_NAME:-miraliz_test}"
PSQL=(psql -X -q -v ON_ERROR_STOP=1 -d "$DB")

echo "▶ Creando base de pruebas $DB"
dropdb --if-exists "$DB"
createdb "$DB"
"${PSQL[@]}" -f supabase/tests/local/supabase_shim.sql >/dev/null

echo "▶ Aplicando migraciones"
for f in supabase/migrations/*.sql; do
  echo "   · $(basename "$f")"
  "${PSQL[@]}" -f "$f" >/dev/null
done

echo "▶ Cargando datos de demostración"
"${PSQL[@]}" -f supabase/seed/seed_demo.sql >/dev/null

echo "▶ Ejecutando pruebas funcionales y de seguridad"
psql -X -v ON_ERROR_STOP=1 -d "$DB" -f supabase/tests/database_tests.sql 2>&1 | grep -E "OK |FALLO|ERROR|PASARON" | sed 's/^.*NOTICE:  //'

echo "▶ Ejecutando prueba de concurrencia"
"${PSQL[@]}" -f supabase/tests/local/concurrency_setup.sql >/dev/null
psql -X -q -d "$DB" -v uid=00000000-0000-4000-b000-000000000011 -v key=concurrencia-key-01 -f supabase/tests/local/concurrency_buyer.sql >/tmp/miraliz_c1.log 2>&1 &
P1=$!
sleep 0.5
psql -X -q -d "$DB" -v uid=00000000-0000-4000-b000-000000000012 -v key=concurrencia-key-02 -f supabase/tests/local/concurrency_buyer.sql >/tmp/miraliz_c2.log 2>&1 &
P2=$!
wait $P1 || true
wait $P2 || true
grep -h "Existencias insuficientes" /tmp/miraliz_c1.log /tmp/miraliz_c2.log | sed 's/^.*ERROR:  /   comprador rechazado → /' || true
psql -X -d "$DB" -f supabase/tests/local/concurrency_check.sql 2>&1 | grep -E "OK |FALLO" | sed 's/^.*NOTICE:  //'

echo "▶ Listo. Puede eliminar la base con: dropdb $DB"
