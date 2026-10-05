#!/usr/bin/env bash
set -euo pipefail
# Refuse remote targets. No production credentials or external DB are used.
rolecall_test_db_url="${ROLECALL_TEST_DB_URL:-postgresql://postgres:postgres@127.0.0.1:54322/postgres}"
if [[ ! "$rolecall_test_db_url" =~ ^postgres(ql)?://[^/]*@(127\.0\.0\.1|localhost)(:[0-9]+)?/ ]]; then
  echo 'ROLECALL_TEST_DB_URL must point to a local disposable Supabase database.' >&2
  exit 1
fi
command -v psql >/dev/null || { echo 'Install psql and start local Supabase before running this check.' >&2; exit 1; }
psql "$rolecall_test_db_url" -X -v ON_ERROR_STOP=1 -f "$(dirname "$0")/ownership.sql"
