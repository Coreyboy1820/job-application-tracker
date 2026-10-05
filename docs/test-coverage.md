# Test coverage and local checks

Tests are organized by behavior in `src/test/unit`, `src/test/components`, and
`src/test/integration`. Shared DOM cleanup remains in `src/test/setup.ts`.
Run `npm test` and `npm run build` using Node.js 22.

## Coverage map

- Application persistence: `App.persistence.test.tsx` exercises create ownership,
  trimmed input, insert retries, failed edits, failed/successful deletes, and load
  errors. Existing row tests cover browser/database field normalization.
- Authentication: the same integration suite covers restored sessions, password
  sign-in, auth events, expiry, failed sign-out, account switches, and late initial
  session results, including sign-out/sign-in to the same account while a create
  request is pending. `AuthPanel.test.tsx` covers signup confirmation, signup
  errors, sign-in retries, and disabled pending submits. `supabaseSession.test.ts`
  uses the real SDK with malformed local session storage and missing browser
  configuration; it asserts no network requests occur. App API calls are mocked.
- Browser migration: `legacyStorage.test.ts` uses `fake-indexeddb` for real
  transactions, existing-record preservation, invalid source retention, atomic
  aborts, blocked opens, and storage errors. `legacyApplications.test.ts` covers
  compatibility normalization separately.
- Job analysis: `job-analysis-handler.test.ts` exercises the request handler with
  injected environment, DNS, HTTP, and database boundaries. It covers authorization,
  inaccessible applications, input validation, completed analysis reuse, cache
  reads, AI configuration/output errors, save failures, unsafe URLs and DNS,
  redirect validation/limits, content type, streamed byte limits, and fetch timeout.
  Existing analysis/skill extraction/question suites cover analysis versioning,
  user ratings, splitting skills, and question normalization.
- Interview schedule and Google Calendar: component and App integration suites
  cover editing, validation, schedule persistence, calendar launch markers, pending
  saves, and calendar links.
- Skills: existing component tests cover filtering, ranking, and rating callbacks;
  `App.rating-persistence.test.tsx` covers failed comfort-level saves and
  blocking overlapping updates. App integration suites cover application
  navigation and persistence. `PracticeHandoff.test.tsx` and page-specific handoff
  tests cover selection isolation, optional context, preserved edits, clipboard
  outcomes, cancellation/focus, and stale selections. `practicePrompt.test.ts`
  covers exact deduplication, data boundaries, and complete-question batching.

## Database ownership checks

Start a **disposable local** Supabase project and apply repository migrations
(`supabase start`, `supabase db reset`). Install PostgreSQL's `psql` client, then run:

```sh
bash supabase/tests/run-local.sh
```

The runner defaults to `127.0.0.1:54322`, accepts a local
`ROLECALL_TEST_DB_URL`, and refuses remote hosts. Its SQL transaction creates two
fixture accounts, checks application/question isolation, forbidden cross-account
writes, valid owned insertion, and anonymous access denial, then rolls everything
back. A failure exits nonzero and the disconnected transaction rolls back.

These checks are separate from Vitest because mocked database clients cannot
verify deployed PostgreSQL grants and RLS. They require a local database; they
must not be reported as passing when the prerequisites are unavailable.

For Docker-only environments, the following creates a fresh official Supabase
PostgreSQL container, applies all checked-in migrations, executes the same SQL,
and removes the container:

```sh
bash supabase/tests/run-isolated-docker.sh
```

The isolated runner uses no host ports, external container network, or user data
mounts. It does not connect to an existing local Supabase project. This path was
verified with `supabase/postgres:17.11.0.002`: application and question ownership,
cross-account write rejection, and anonymous grants checks passed. It validates
PostgreSQL RLS and grants, not REST/GoTrue integration.

## Deployment and remaining boundaries

The handler extraction keeps `index.ts` as the Deno/Supabase bootstrap. Redeploy
`analyze-job-posting` after shipping it; no schema migration is required.
Unit tests exercise handler behavior without network access or real Gemini keys.
Live email confirmation, real OAuth providers, third-party job-board availability,
Gemini quality, and browser popup behavior require manual or environment-specific
checks. Expired-session refresh against an actual auth server remains an environment
check; malformed SDK storage and the session event contract consumed by Rolecall
are automated locally.
