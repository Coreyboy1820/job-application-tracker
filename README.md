# Rolecall — Job application tracker

A React + TypeScript web app for tracking job applications across devices. Supabase provides PostgreSQL storage and email/password sign-in; Postgres Row Level Security ensures each account can access only its own applications.

## Set up a Supabase project

1. Create a project in the [Supabase dashboard](https://supabase.com/dashboard).
2. Copy `.env.example` to `.env.local` and fill in `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` from the project's **Connect** dialog. The publishable key is intended for browser use. **Never put a service-role or secret key in a `VITE_` variable.**
3. Install the Supabase CLI and sign in. Then link the project and apply the checked-in database migrations:

   ```sh
   npx supabase login
   npx supabase link --project-ref YOUR_PROJECT_REF
   npx supabase db push
   ```

   The project ref is in the Supabase project URL. The migrations create the applications table, indexes, grants, and per-user Row Level Security policies.
4. In the Supabase dashboard, set the Auth site's URL and redirect URL to the app's URL. For local development, use `http://localhost:5173`. Email confirmation is on by default for hosted projects; a new user may need to confirm their email before signing in.

For GitHub Actions builds, add repository variables named `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` under **Settings → Secrets and variables → Actions → Variables**. The build workflow reads these values. They are publishable browser settings, not private credentials; never add a service-role or secret key to the app or workflow.

## Run it locally

Use Node.js 22 and npm to match CI. From this folder, run:

```sh
npm ci
npm run dev
```

Vite prints a local URL (usually `http://localhost:5173`). Open it in your browser. Run `npm test` to execute the test suite, or `npm run build` to make a production build.

### Continuous integration

The **CI / Build and test** check runs on pull requests targeting `main` and pushes to `main`. It installs the exact dependency versions from `package-lock.json`, builds the production app, and then runs the test suite. The check fails if either command fails.

## Using the app

- Create an account or sign in with email and password.
- Add an application with its company, role, status, date, posting link, notes, and next step.
- Schedule, edit, and remove multiple interview rounds for each application.
- View upcoming interviews in chronological order from the Interviews page; open any interview to return to its application.
- Search, filter, sort, update statuses, and delete applications. Changes are stored in Supabase and appear on devices using the same app and account.
- Click a company or role to open its details and analyze its saved job posting link. Rolecall reads the page, asks an AI model to identify stated skills, and saves the description, evidence, and skill list to that application. Results are cached for the link and reused when you open the application again. Use **View skills** in the details to go to the Skills page.
- In the Skills page, choose a knowledge level for each skill: Low, Medium, High, or No study needed. Skills default to Low. Levels are stored per application skill and feed the existing study-priority ordering: lower levels sort first, while skills marked No study needed remain crossed out and sort last. Company interview practice groups skills across roles and moves skills marked No study needed for every associated role to the bottom. Use the knowledge-level dropdown in the company skill card's badge to set that skill's level for all associated roles at the company.
- If this browser has records from the earlier local-storage or IndexedDB versions, Rolecall offers to copy them into your account after sign-in. The original browser copy is kept.

### Add interviews to Google Calendar

Save the interview schedule, then choose **Add to Google Calendar** from the schedule or upcoming interviews. Review the sharing notice and continue; Google opens a prefilled draft. Sign in to Google if asked, review the details, and click **Save** in Calendar. Rolecall does not request OAuth permissions, read your calendar, or store Google credentials. Interview details are sent to Google in the event URL only when you continue.

The event includes company, role, interview type, notes, location/meeting link, and date/time. Times use the current device time zone; choose the matching zone when scheduling. Duration defaults to 60 minutes and can be changed. Existing interviews remain compatible.

Rolecall records that the Calendar draft was opened in the existing account-owned interview data; it cannot verify whether Google saved it. Reopening requires an explicit duplicate warning. Check Google Calendar for an existing event before saving another draft, including after using another device. Launch tracking is a warning, not guaranteed deduplication: stale tabs/devices and independently created Google events cannot be detected. There is no automatic synchronization: update or delete the Calendar event manually when changing or deleting the interview. If pop-ups are blocked, allow them for Rolecall and retry; if Google rejects the draft, create the event manually from the saved interview details.

This uses [Google's documented event-link flow](https://developers.google.com/workspace/calendar/api/concepts/inviting-attendees-to-events). Authenticated Calendar API integration could support automatic synchronization and reliable event IDs, but requires additional OAuth setup and Calendar access; this flow avoids that permission requirement. No new database migration or Google API key is needed.

### Configure job-posting analysis

The analyzer runs as a Supabase Edge Function so the Gemini API key stays on the server. Create a Gemini API key in [Google AI Studio](https://aistudio.google.com/apikey), then add it as `GEMINI_API_KEY` in the Supabase dashboard under **Edge Function Secrets**. The function defaults to `gemini-3.1-flash-lite`; this model currently has a free API tier, subject to Google's changing quotas and terms. Free-tier prompts may be used by Google to improve its products, so only analyze job postings you are comfortable sending to Google. Deploy the `analyze-job-posting` function and apply the latest migration:

```sh
npx supabase db push
npx supabase functions deploy analyze-job-posting
```

Grouped examples are saved as individual skills: debugging tools such as GDB, JTAG, and serial debuggers become GDB, JTAG, and serial debugging. Duplicate skills and redundant broad categories are removed; standalone skills without listed examples are retained. Older analyses are re-extracted from their saved description when next opened, preserving study settings for matching individual skills. Apply the migration before deploying the updated function.

Gemini generates three general interview questions per normalized skill name. Those question sets are stored in an account-scoped cache and reused when the same skill appears in another application; existing saved analyses are refreshed once the next time the application is opened.

You can also store `GEMINI_API_KEY=your-key` in an ignored `.env` file and run `npx supabase secrets set --env-file .env`. Keep that file private and out of Git.

For local Edge Function development, put `GEMINI_API_KEY=your-key` in `supabase/functions/.env` (this file is ignored by Git) and run `npx supabase functions serve analyze-job-posting --env-file supabase/functions/.env`.

The function only accepts public HTTPS posting links, limits downloaded pages to 2 MB, checks each redirect, and checks that DNS resolves to public addresses. Some job boards require a signed-in browser session, generate the page with JavaScript, or block automated requests; those pages show an error and can be retried after updating the link. Job description text is sent to Google's Gemini API for extraction, and the stored response includes short quotes as evidence for each skill. Set the optional `GEMINI_MODEL` function secret to override the default model.

## How the pieces fit together

- `src/main.tsx` starts React and imports `src/styles/styles.css`; `src/app/App.tsx` imports `src/styles/cloud.css`.
- `src/app/App.tsx` owns session and application state, database operations, and feature composition; `routing.ts` and `useAppRoute.ts` handle hash navigation.
- `src/features/applications/` contains application forms, details, status UI, database row mappings, and legacy-record import helpers.
- `src/features/auth/` contains sign-in and missing-configuration screens.
- `src/features/interviews/` contains scheduling, upcoming interviews, date helpers, and Google Calendar draft links.
- `src/features/skills/` contains skills and company practice pages and study-priority logic.
- `src/shared/` contains common models, the Supabase browser client, and reusable UI and utilities.
- `src/test/unit/`, `src/test/components/`, and `src/test/integration/` contain tests; `src/test/setup.ts` provides shared cleanup.
- `supabase/migrations/` contains the versioned database schema and access rules.
- `supabase/functions/analyze-job-posting/` fetches public job posting pages, extracts skills with structured AI output, and saves results for the signed-in owner.
- `index.html` is the page Vite serves; React mounts into its `#root` element.

See [the architecture decision](docs/architecture.md) for the alternatives, module boundaries, file mapping, and test placement conventions. For a focused utility test, run `npx vitest run src/test/unit/skillPriority.test.ts`.

Supabase Auth identifies the user. Every application row has a `user_id`; the database enforces ownership even if a browser client is modified. The publishable key is safe to include in the frontend only because the table grants and RLS policies are restrictive. User data is no longer written to local storage, aside from the one-time import marker and the legacy records kept for import.


## Interview handoff research

[ChatGPT interview handoff research](docs/chatgpt-interview-handoff.md) recommends a future selected-question preview, explicit clipboard copy, and separate ChatGPT opening. This document does not implement that handoff.
