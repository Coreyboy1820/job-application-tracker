# Rolecall — Job application tracker

A React + TypeScript web app for tracking job applications across devices. Supabase provides PostgreSQL storage and email/password sign-in; Postgres Row Level Security ensures each account can access only its own applications.

## Set up a Supabase project

1. Create a project in the [Supabase dashboard](https://supabase.com/dashboard).
2. Copy `.env.example` to `.env.local` and fill in `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` from the project's **Connect** dialog. The publishable key is intended for browser use. **Never put a service-role or secret key in a `VITE_` variable.**
3. Install the Supabase CLI and sign in. Then link the project and apply the checked-in schema migration:

   ```sh
   npx supabase login
   npx supabase link --project-ref YOUR_PROJECT_REF
   npx supabase db push
   ```

   The project ref is in the Supabase project URL. The migration creates the applications table, indexes, grants, and per-user Row Level Security policies.
4. In the Supabase dashboard, set the Auth site's URL and redirect URL to the app's URL. For local development, use `http://localhost:5173`. Email confirmation is on by default for hosted projects; a new user may need to confirm their email before signing in.

## Run it locally

You need Node.js and npm installed. From this folder, run:

```sh
npm install
npm run dev
```

Vite prints a local URL (usually `http://localhost:5173`). Open it in your browser. To make a production build, run `npm run build`.

## Using the app

- Create an account or sign in with email and password.
- Add an application with its company, role, status, date, posting link, notes, and next step.
- Search, filter, sort, update statuses, and delete applications. Changes are stored in Supabase and appear on devices using the same app and account.
- If this browser has records from the earlier local-storage or IndexedDB versions, Rolecall offers to copy them into your account after sign-in. The original browser copy is kept.

## How the pieces fit together

- `src/main.tsx` starts React and loads the stylesheet.
- `src/App.tsx` contains the sign-in screen, application list, forms, and database operations.
- `src/lib/supabase.ts` creates the browser client from local environment variables.
- `src/storage.ts` reads existing on-device records so they can be imported into the shared database.
- `supabase/migrations/` contains the versioned database schema and access rules.
- `src/styles.css` contains responsive page and component styles.
- `index.html` is the page Vite serves; React mounts into its `#root` element.

Supabase Auth identifies the user. Every application row has a `user_id`; the database enforces ownership even if a browser client is modified. The publishable key is safe to include in the frontend only because the table grants and RLS policies are restrictive. User data is no longer written to local storage, aside from the one-time import marker and the legacy records kept for import.
