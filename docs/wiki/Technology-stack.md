# Technology stack

Versions below are resolved from the repository's `package-lock.json` for the merged implementation documented here. `package.json` contains allowed ranges; `npm ci` installs the lock. Update this table when the lock changes.

| Technology | Locked version | Purpose/source |
| --- | --- | --- |
| React / React DOM | 18.3.1 | Components, hooks, browser rendering; `src/main.tsx` |
| TypeScript | 5.6.3 | Strict types, unused-code checks; `tsconfig*.json` |
| Vite | 6.4.3 | Dev server and static production bundling; `vite.config.ts` |
| Vite React plugin | 4.7.0 | React transform support |
| Supabase JS | 2.117.2 | Browser Auth/database/functions; `src/shared/lib/supabase.ts` |
| lucide-react | 0.468.0 | UI icons |
| Vitest | 3.2.4 | Test runner; `vite.config.ts` |
| React Testing Library | 16.3.3 | User-facing component interaction tests |
| jsdom | 25.0.1 | Test DOM environment |
| fake-indexeddb | 6.2.5 | Legacy-storage transaction tests |

Node.js **22** matches CI. React types resolve to `@types/react` 18.3.31 and `@types/react-dom` 18.3.7. No dedicated lint/formatter script is configured; `npm run build` includes TypeScript checks.

Supabase provides email/password Auth, the database API, and PostgreSQL ownership policies. `supabase/config.toml` targets local PostgreSQL major **17**. Hosted platform/Deno runtime versions are managed outside npm; the Edge Function's remote Supabase JS import is `@2`, not pinned to the browser lock. Do not describe these as identical SDK versions.

The `analyze-job-posting` function runs on Deno using `Deno.serve`, DNS resolution, and fetch. Its injectable handler makes network/database error paths testable in Vitest without deploying a function. Google Gemini performs structured skill extraction and general question generation. The default model identifier in source is `gemini-3.1-flash-lite`; optional `GEMINI_MODEL` overrides it. Availability, pricing, quota, and data-use terms belong to Google's current service configuration, not an application guarantee.

Calendar drafts use URLs; ChatGPT practice uses local clipboard text plus a plain website link. Neither requires OAuth, an OpenAI API key, or a backend provider integration.

[Dependency manifest](https://github.com/Coreyboy1820/job-application-tracker/blob/main/package.json) · [Lockfile](https://github.com/Coreyboy1820/job-application-tracker/blob/main/package-lock.json) · [Configurations](https://github.com/Coreyboy1820/job-application-tracker/blob/main/vite.config.ts) · [Function bootstrap](https://github.com/Coreyboy1820/job-application-tracker/blob/main/supabase/functions/analyze-job-posting/index.ts)
