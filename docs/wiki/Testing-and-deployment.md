# Testing and deployment

## Browser and handler tests

Use Node 22 and locked dependencies:

```sh
npm ci
npm test
npm run build
npx vitest run src/test/unit/skillPriority.test.ts
```

`src/test/unit/` covers pure helpers, routing, compatibility and injected server boundaries. `components/` covers UI interactions; `integration/` covers App sessions, persistence, navigation and async failures with mocked Supabase. Shared cleanup is in `src/test/setup.ts`, and Vitest uses jsdom. Tests should assert behavior rather than implementation details.

The build runs `tsc -b` before bundling. No dedicated lint script or numeric coverage threshold is configured. CI runs `npm ci`, candidate-helper and publication-state Node tests, build, then application tests on main pushes and PRs targeting main. Node 22 and Actions variables provide browser build configuration. Only successful main pushes package/upload a tested candidate with provenance and checksums; PR validation does not upload release candidates. Check helpers locally with `node --test scripts/sites-candidate.node-test.mjs scripts/sites-publication-state.node-test.mjs`.

## Real database ownership checks

Vitest mocks cannot prove SQL grants/RLS. For a **disposable local** Supabase instance with migrations applied, install `psql` and run:

```sh
bash supabase/tests/run-local.sh
```

The runner defaults to `127.0.0.1:54322`; an optional `ROLECALL_TEST_DB_URL` must point to localhost/127.0.0.1. It rejects remote hosts. Fixture accounts and writes run in a rolled-back transaction. Checks include application/question ownership, forbidden cross-account writes, valid owned insertion and anonymous denial.

Or, with Docker available, run:

```sh
bash supabase/tests/run-isolated-docker.sh
```

This creates a unique official Supabase PostgreSQL container, applies migrations, runs ownership SQL, then removes its own container. It uses no host ports, external container network, or existing account data mounts. The pinned image is `public.ecr.aws/supabase/postgres:17.11.0.002`. It checks PostgreSQL policies/grants, not REST/GoTrue end-to-end behavior. Report unavailable prerequisites accurately rather than claiming those checks passed.

An additional server type check with Deno installed is:

```sh
deno check --no-lock supabase/functions/analyze-job-posting/index.ts
```

It needs access to the bootstrap's remote SDK import on first run. Live confirmation email, real auth-server refresh, Gemini quality/quota, job-board availability, and browser clipboard/popup behavior also need environment-specific checks.

## Release steps

1. Run tests/build and review the complete diff. For substantial changes, use an independent reviewer. Capture sanitized desktop/mobile screenshots for visible UI changes.
2. Configure build-time `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` for the deployment target. In Actions these are repository **variables**, never service-role/Gemini secrets.
3. For schema changes, apply new migrations to the intended linked Supabase project before deploying dependent code. Confirm target and backup/recovery procedure for that environment.
4. For analyzer changes, deploy `analyze-job-posting` with server secrets configured. Browser releases do not deploy Edge Functions automatically.
5. For the existing public Rolecall Site, use the exact successful current-main candidate and authenticated Sites workflow. Acquire/read back the lock, verify provenance and audience, preserve tested assets, record pending state and terminal version/deployment receipts, then release the lock. Follow the operational guides below. GitHub CI prepares candidates. The enabled **Publish Rolecall main merges** task was read back with the saved publication protocol, but its trigger filters, connector bindings, and unattended delivery after a subsequent merge remain unverified. Successful CI alone does not establish that the Site will update. Set Auth site/redirect URLs for the target hostname.
6. Smoke-test sign-in, application persistence, interviews, skill knowledge saves, analysis, Calendar drafts and ChatGPT copy/open at desktop/mobile sizes. Check errors and sign-out/account changes too.

No migration is required for ChatGPT handoff or a knowledge-selector visual change. Handler changes still require Edge Function redeployment. Calendar/ChatGPT link flows require no OAuth/OpenAI key deployment.

[Coverage inventory](https://github.com/Coreyboy1820/job-application-tracker/blob/main/docs/test-coverage.md) · [CI workflow](https://github.com/Coreyboy1820/job-application-tracker/blob/main/.github/workflows/build.yml) · [Database checks](https://github.com/Coreyboy1820/job-application-tracker/tree/main/supabase/tests)

## Sites operating references

The owner confirmed preserving **public** access, superseding the older private-delivery requirement. Public hosting does not disable authentication or RLS. Publication status changes independently of the wiki: consult [Sites delivery](https://github.com/Coreyboy1820/job-application-tracker/blob/main/docs/sites-delivery.md), [cloud task setup](https://github.com/Coreyboy1820/job-application-tracker/blob/main/docs/sites-auto-deploy-task.md), and [lock, receipts, recovery and rollback](https://github.com/Coreyboy1820/job-application-tracker/blob/main/docs/sites-publication-state.md). A successful candidate build alone does not prove a live release.
