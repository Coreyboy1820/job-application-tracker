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

You need Node.js and npm installed. From this folder, run:

```sh
npm install
npm run dev
```

Vite prints a local URL (usually `http://localhost:5173`). Open it in your browser. Run `npm test` to execute the component tests, or `npm run build` to make a production build.

## Using the app

- Create an account or sign in with email and password.
- Add an application with its company, role, status, date, posting link, notes, and next step.
- Schedule, edit, and remove multiple interview rounds for each application.
- Search, filter, sort, update statuses, and delete applications. Changes are stored in Supabase and appear on devices using the same app and account.
- Click a company or role to open its details and analyze its saved job posting link. Rolecall reads the page, asks an AI model to identify stated skills, and saves the description, evidence, and skill list to that application. Results are cached for the link and reused when you open the application again. Use **View skills** in the details to go to the Skills page.
- If this browser has records from the earlier local-storage or IndexedDB versions, Rolecall offers to copy them into your account after sign-in. The original browser copy is kept.

### Configure job-posting analysis

The analyzer runs as a Supabase Edge Function so the Gemini API key stays on the server. Create a Gemini API key in [Google AI Studio](https://aistudio.google.com/apikey), then add it as `GEMINI_API_KEY` in the Supabase dashboard under **Edge Function Secrets**. The function defaults to `gemini-3.1-flash-lite`; this model currently has a free API tier, subject to Google's changing quotas and terms. Free-tier prompts may be used by Google to improve its products, so only analyze job postings you are comfortable sending to Google. Deploy the `analyze-job-posting` function and apply the latest migration:

```sh
npx supabase db push
npx supabase functions deploy analyze-job-posting
```

You can also store `GEMINI_API_KEY=your-key` in an ignored `.env` file and run `npx supabase secrets set --env-file .env`. Keep that file private and out of Git.

For local Edge Function development, put `GEMINI_API_KEY=your-key` in `supabase/functions/.env` (this file is ignored by Git) and run `npx supabase functions serve analyze-job-posting --env-file supabase/functions/.env`.

The function only accepts public HTTPS posting links, limits downloaded pages to 2 MB, checks each redirect, and checks that DNS resolves to public addresses. Some job boards require a signed-in browser session, generate the page with JavaScript, or block automated requests; those pages show an error and can be retried after updating the link. Job description text is sent to Google's Gemini API for extraction, and the stored response includes short quotes as evidence for each skill. Set the optional `GEMINI_MODEL` function secret to override the default model.

## How the pieces fit together

- `src/main.tsx` starts React and loads the stylesheet.
- `src/App.tsx` contains the sign-in screen, application list, forms, and database operations.
- `src/lib/supabase.ts` creates the browser client from local environment variables.
- `src/storage.ts` reads existing on-device records so they can be imported into the shared database.
- `supabase/migrations/` contains the versioned database schema and access rules.
- `supabase/functions/analyze-job-posting/` fetches public job posting pages, extracts skills with structured AI output, and saves results for the signed-in owner.
- `src/styles.css` contains responsive page and component styles.
- `index.html` is the page Vite serves; React mounts into its `#root` element.

Supabase Auth identifies the user. Every application row has a `user_id`; the database enforces ownership even if a browser client is modified. The publishable key is safe to include in the frontend only because the table grants and RLS policies are restrictive. User data is no longer written to local storage, aside from the one-time import marker and the legacy records kept for import.

