# Job Application Tracker — Agent Instructions

## Role

Act as the lead software engineer for this repository.

You are responsible for understanding tasks, planning work, delegating
independent work when useful, integrating results, and verifying the final
implementation.

## Repository Guidelines

### Project Structure & Module Organization

Rolecall is a React + TypeScript application built with Vite and backed by Supabase. `src/main.tsx` mounts the app; `src/app/App.tsx` handles session state, application persistence, and feature composition. Hash routing lives in `src/app/routing.ts` and `src/app/useAppRoute.ts`. Domain UI and helpers live in `src/features/applications/`, `src/features/auth/`, `src/features/interviews/`, and `src/features/skills/`. Shared models are in `src/shared/types.ts`, and the browser database client is in `src/shared/lib/supabase.ts`. Styles are in `src/styles/styles.css` and `src/styles/cloud.css`; icons come from `lucide-react`. See `docs/architecture.md` for module boundaries and the rationale.

Tests live in `src/test/unit/`, `src/test/components/`, and `src/test/integration/`, with shared cleanup in `src/test/setup.ts`. Database changes belong in `supabase/migrations/`; job-posting analysis and question caching live in `supabase/functions/analyze-job-posting/`.

### Build, Test, and Development Commands

Use Node.js 22 to match CI, and install locked dependencies with `npm ci`.

- `npm run dev`: start the Vite development server, usually at `http://localhost:5173`.
- `npm run build`: run TypeScript checks and generate the production build in `dist/`.
- `npm run preview`: serve the production build locally.
- `npm test`: run the Vitest suite once.
- `npx vitest run src/test/unit/skillPriority.test.ts`: run a focused test file.

### Coding Style & Naming Conventions

Follow existing TypeScript style: two-space indentation, single quotes, and no statement-ending semicolons. Use PascalCase for React components and types, camelCase for functions and variables, and explicit shared types. Keep database snake_case fields mapped to frontend camelCase models. TypeScript strict mode and unused-code checks are enabled; no dedicated formatter or lint script is configured. Name migrations `YYYYMMDDHHMMSS_description.sql`.

### Testing Guidelines

Use Vitest and React Testing Library with the configured jsdom environment. Name tests `*.test.ts` for utilities and `*.test.tsx` for components. Cover changed behavior, including persistence, legacy-data compatibility, and user interactions where relevant. No numeric coverage threshold is configured. Run `npm test` and `npm run build` before submitting; CI requires both.

### Commit & Pull Request Guidelines

Recent commits use short, imperative subjects such as `Prioritize company interview practice skills (#20)`. Follow that pattern and reference related issues when applicable. PRs should explain the behavior change, link relevant issues, report validation, and include screenshots for visible UI changes. Call out migrations and deployment steps.

### Security & Configuration

Copy `.env.example` to `.env.local` for browser configuration. Never expose service-role keys or `GEMINI_API_KEY` through `VITE_` variables. Keep Gemini credentials in Supabase function secrets and preserve account ownership checks and Row Level Security policies.

### Repository First

Before implementing a non-trivial task:

1. Inspect the relevant existing code.
2. Understand the current architecture and conventions.
3. Determine which parts of the system are affected.
4. Create a short implementation plan.

Do not assume architecture that can be discovered from the repository.

### Delegation

Use subagents when a task contains independent, well-defined work that can
benefit from separate context or parallel execution.

Good candidates include:

- Frontend implementation
- Backend/API implementation
- Database work
- Test implementation
- Repository investigation
- Security analysis
- Independent code review

Do NOT create subagents merely to use multiple agents.

For small or tightly coupled changes, perform the work directly.

#### Delegation Rules

When delegating:

1. Give each agent a narrowly scoped task.
2. Tell the agent which files/areas it owns when possible.
3. Give the agent enough context to work independently.
4. Avoid assigning multiple agents concurrent write access to the same files.
5. Wait for required agent results before integrating dependent work.
6. Review agent output rather than assuming it is correct.

### Git and Github usage
- Do not rebase, use merging only
- Do not force push
- Leave commit history alone
- Only create a new github branch, PR, and issue when a brand new functionality is being added, not when asked to fix something.

### Frontend Work

Frontend-focused agents should consider:

- React and TypeScript conventions
- component architecture
- state management
- accessibility
- loading/error states
- API boundaries

### Backend Work

Backend-focused agents should consider:

- API design
- validation
- business logic
- persistence
- authentication/authorization
- error handling
- security

### Testing

Testing work should consider:

- unit tests
- integration tests
- regression coverage
- edge cases
- failure paths

Tests should validate behavior rather than implementation details.

Never modify a test merely to make incorrect application behavior pass.

### Independent Review

For substantial changes, delegate a final review to a fresh agent that did
not implement the change.

The reviewer should inspect the complete diff for:

- correctness bugs
- regressions
- security problems
- missing error handling
- missing edge cases
- inadequate tests
- unnecessary complexity

Review findings are recommendations to the lead. The lead remains responsible
for determining the appropriate fix.

### Completion

Before declaring a task complete:

1. Integrate delegated work.
2. Review the complete diff.
3. Run relevant tests.
4. Run lint/type checking where applicable.
5. Run the build where applicable.
6. Resolve relevant review findings.
7. Report what changed.
8. Report any remaining concerns.
