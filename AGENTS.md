# Rolecall — Agent Instructions

## Lead and delegate

Act as lead engineer: understand the task, choose relevant skills, delegate useful independent work, integrate results, and verify the outcome. Inspect the affected code before planning non-trivial changes.

Prefer focused subagents for separable investigation, implementation, migration, testing, and review work. Keep small or tightly coupled changes with one agent; do not delegate merely to fill agent slots.

For each subagent assignment:

- Give a narrow objective, acceptance criteria, owned files or areas, and validation expectations.
- Name relevant skills, provide their resolved `SKILL.md` paths, and require the agent to read them before starting. Load only skills relevant to that assignment.
- Provide necessary task context and applicable repository constraints. Avoid concurrent writes to the same files.
- Require the agent to report results, checks, skills used, and access problems.

Wait for dependent results and review them before integration. For substantial changes, assign a fresh agent to review the complete diff for correctness, regressions, security, and test gaps. The lead resolves findings and remains responsible for the final result.

## Skills

Keep reusable workflow details in skills rather than duplicating them here. Use the installed skill catalog to resolve paths; personal skills may not be installed in every environment. Report missing relevant skills and continue with available repository guidance where feasible.

| Task | Skill |
| --- | --- |
| Draft or create an issue | `issue-writer` |
| Implement an issue | `issue-implementer` |
| Explain architecture or trace code | `codebase-explainer` |
| Investigate and fix a regression | `regression-investigator` |
| Change schema, data, constraints, or RLS | `supabase-migrations` |
| Review UI behavior, accessibility, or responsive layouts | `ui-review` |
| Prepare release notes and rollout steps | `release-preparation` |

Skills support the assigned scope; they do not authorize unrelated GitHub actions or deployments. Repository-specific Git rules below apply even when a reusable skill suggests a broader workflow.

## Repository map and conventions

Rolecall uses React, TypeScript, Vite, and Supabase. Read `docs/architecture.md` for module boundaries and rationale.

- `src/app/`: session state, persistence orchestration, feature composition, and hash routing.
- `src/features/{applications,auth,interviews,skills}/`: domain UI and helpers; application row mapping and legacy imports live under `applications/data/`.
- `src/shared/`: shared models, utilities, and the browser Supabase client. Global styles live in `src/styles/`; icons use `lucide-react`.
- `src/test/{unit,components,integration}/`: Vitest and React Testing Library tests using jsdom; shared cleanup is in `src/test/setup.ts`.
- `supabase/migrations/`: database changes, named `YYYYMMDDHHMMSS_description.sql`. Job analysis and question caching live in `supabase/functions/analyze-job-posting/`.

Follow existing TypeScript style: two-space indentation, single quotes, no statement-ending semicolons, PascalCase components/types, and camelCase functions/variables. Map database snake_case fields to frontend camelCase models. Name tests `*.test.ts` or `*.test.tsx` as appropriate.

## Validation and delivery

Use Node.js 22 and install locked dependencies with `npm ci`. `npm run dev` starts Vite; `npm run preview` serves the production build.

For code changes, run `npm test` and `npm run build` before submission; the build includes TypeScript checks. There is no separate lint script. Test changed behavior, including affected persistence, legacy compatibility, and failure paths. Never weaken tests to make incorrect behavior pass. Documentation-only follow-ups may reuse passing checks from the same unchanged application code.

Review the complete diff, including new files. Report changed behavior, validation results and limits, remaining concerns, and migration or deployment steps. Use short imperative commit subjects and link related issues in PRs; include screenshots for visible UI changes.

## Git and configuration

- Preserve unrelated working-tree changes and existing commit history. Merge when needed; do not rebase or force-push.
- Create a new GitHub branch, PR, or issue for new functionality, not routine fixes, unless the user explicitly requests otherwise. Update the existing PR when asked to revise it.
- Use `.env.example` for browser configuration. Never expose service-role keys or `GEMINI_API_KEY` through `VITE_` variables; keep Gemini credentials in Supabase function secrets.
- Preserve account ownership checks and Row Level Security policies.
