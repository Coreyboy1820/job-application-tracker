#!/usr/bin/env bash
set -euo pipefail
# Fresh database only: no host ports, external network, or mounted user data.
rolecall_test_root="$(cd "$(dirname "$0")/../.." && pwd)"
rolecall_test_container="rolecall-rls-test-$$-${RANDOM}"
rolecall_test_image='public.ecr.aws/supabase/postgres:17.11.0.002'
command -v docker >/dev/null || { echo 'Docker is required for isolated database tests.' >&2; exit 1; }
docker run --detach --name "$rolecall_test_container" --network none \
  --env POSTGRES_PASSWORD=local-test-only "$rolecall_test_image" >/dev/null
trap 'docker rm --force "$rolecall_test_container" >/dev/null' EXIT
rolecall_db_ready=false
for rolecall_attempt in {1..60}; do
  if docker exec "$rolecall_test_container" pg_isready -h 127.0.0.1 -U postgres -d postgres >/dev/null 2>&1; then
    rolecall_db_ready=true
    break
  fi
  sleep 0.5
done
if [[ "$rolecall_db_ready" != true ]]; then
  echo 'Disposable PostgreSQL did not become ready.' >&2
  exit 1
fi
cat "$rolecall_test_root"/supabase/migrations/*.sql "$rolecall_test_root/supabase/tests/ownership.sql" |
  docker exec -i "$rolecall_test_container" psql -U postgres -d postgres -X -v ON_ERROR_STOP=1
