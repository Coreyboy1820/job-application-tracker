# Getting started

## Prerequisites and browser development

Install Git, Node.js **22**, and npm. Clone the repository, then:

```sh
git clone https://github.com/Coreyboy1820/job-application-tracker.git
cd job-application-tracker
npm ci
cp .env.example .env.local
```

Set these **placeholder** browser values to the URL/publishable key from your Supabase project's Connect dialog:

```dotenv
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY
```

The publishable key is intended for browser use; ownership is enforced by grants/RLS. Never put a service-role key, secret key, or `GEMINI_API_KEY` in a `VITE_` variable. `.env.local` is ignored. Vite reads configuration at startup/build time, so restart after editing it.

```sh
npm run dev
npm test
npm run build
npm run preview
```

The development URL is usually `http://localhost:5173`; use the URL printed by Vite. Build output goes to `dist/`. Preview serves a built app locally and is not the production hosting service.

## Supabase project

Create a Supabase project. Install/use the Supabase CLI, sign in, link the target project, and apply migrations:

```sh
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push
```

Confirm the project ref before pushing: this changes the linked database schema/grants. Apply **all** checked-in migrations in order; they create applications, analysis fields, per-account question cache, interview JSON, and extraction versioning. Do not edit old applied migrations; add a new timestamped migration for future changes.

In Supabase Auth settings, set site URL and allowed redirect URL to the app URL (localhost during development). Hosted email confirmation may require checking the confirmation email before sign-in. This UI uses email/password, not social-provider buttons.

## Gemini and Edge Function

Obtain your Gemini API key from Google AI Studio and set `GEMINI_API_KEY` in Supabase **Edge Function Secrets**. Optionally set `GEMINI_MODEL`; source defaults to `gemini-3.1-flash-lite`. Review current provider quota/privacy terms for the chosen project. The key belongs exclusively on the server.

With the CLI linked and migrations applied:

```sh
npx supabase functions deploy analyze-job-posting
```

For secret-file setup, create a private ignored `.env` with `GEMINI_API_KEY=YOUR_GEMINI_API_KEY`, then use `npx supabase secrets set --env-file .env`. Never commit this file.

For a disposable local backend, Docker and Supabase CLI are required. Use `npx supabase start`, then point browser configuration at the local URL/public key reported by the CLI. `npx supabase db reset` recreates the local schema from migrations and can delete local data; use it only in a disposable development project. Put local function secrets in ignored `supabase/functions/.env` and serve with:

```sh
npx supabase functions serve analyze-job-posting --env-file supabase/functions/.env
```

[Testing/deployment](Testing-and-deployment.md) · [Troubleshooting](Troubleshooting.md) · [Example environment](https://github.com/Coreyboy1820/job-application-tracker/blob/main/.env.example) · [Local Supabase configuration](https://github.com/Coreyboy1820/job-application-tracker/blob/main/supabase/config.toml)
