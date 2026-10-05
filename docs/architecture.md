# Frontend structure decision

Issue: [#43](https://github.com/Coreyboy1820/job-application-tracker/issues/43). Research date: October 5, 2026.

## Context

Rolecall is a Vite React application with Supabase authentication and account-owned application records. Interviews and extracted skills belong to applications, and several pages share the same records. The original `src/App.tsx` combined orchestration, screens, forms, routing, row conversion, legacy validation, and date helpers. Other pages and tests were spread across the source root. This made locating a feature and reviewing changes unnecessarily difficult.

## Research and alternatives

[React's Thinking in React](https://react.dev/learn/thinking-in-react) recommends decomposing UI by responsibility and placing shared state in a common parent. It does not prescribe a directory tree. [Redux's official style guide](https://redux.js.org/style-guide/#structure-files-as-feature-folders-with-single-file-logic) recommends keeping related feature logic together and distinguishes application setup from reusable code. Rolecall borrows that organization principle without adding Redux. [Bulletproof React's project structure](https://github.com/alan2207/bulletproof-react/blob/master/docs/project-structure.md) is a maintained example of feature directories combined with application composition and shared infrastructure; its dependency guidance favors composing features from the application layer. These are inputs to the following project-specific decision, rather than requirements imposed by React.

| Structure | Strengths | Costs for Rolecall | Decision |
| --- | --- | --- | --- |
| Layers: top-level `components`, `pages`, `hooks`, `services`, `utils` | Familiar; easy to find a technical category | An interview change spans many directories; growing generic folders hide ownership | Useful inside a feature, insufficient as the main structure |
| Feature folders containing all domain code | Changes stay near the feature they affect; clear ownership | Shared application records and cross-page navigation need a separate composition owner | Use for applications, authentication, interviews, and skills |
| Hybrid: `app`, `features`, `shared`, `styles`, `test` | Keeps domain code together and makes orchestration and reuse explicit | Requires discipline about shared code and imports | Selected for this repository |

The hybrid accommodates current boundaries with ordinary TypeScript imports. It avoids introducing a state framework, router, aliases, or backend changes just to move files. [Vite's guide](https://vite.dev/guide/#index-html-and-project-root) explains that root `index.html` is the application entry point; retaining it and `src/main.tsx` keeps the existing build contract.

## Selected structure

```text
src/
  main.tsx
  vite-env.d.ts
  app/
    App.tsx
    routing.ts
    useAppRoute.ts
  features/
    applications/
      components/
      data/
      statuses.ts
    auth/
      components/
    interviews/
      components/
      pages/
      interviewDates.ts
      googleCalendar.ts
    skills/
      pages/
      skillPriority.ts
  shared/
    components/
    lib/
    utils/
    types.ts
  styles/
    styles.css
    cloud.css
  test/
    components/
    integration/
    unit/
    setup.ts
```

`app/App.tsx` remains the common owner of session state, loaded application records, database mutations, and feature composition. Feature components receive records and callbacks through explicit props. Moving ownership would change persistence and asynchronous behavior; it is a separate refactor when there is a concrete need. Routing parsing lives in `routing.ts`; browser hash synchronization lives in `useAppRoute.ts`.

Application row conversion and legacy validation belong to `features/applications/data/`. Calendar links and interview date logic belong to interviews. Shared models remain shared because applications, interviews, and skills use them. A utility belongs in `shared` when its responsibility is independent of a feature; an application-only empty state stays in applications even if its UI is simple.

Use imports from `app` into features and shared, and from features into shared. Compose UI interactions between features through application callbacks; avoid feature-to-feature imports by default. One deliberate exception is `features/applications/data/legacyApplications.ts` importing `isValidInterviewDateTime` from `features/interviews/interviewDates.ts`: legacy application records embed interviews and must preserve the same validation as the scheduling form. This dependency is limited to a pure domain helper; the interview module imports only shared types, so it creates no cycle or UI coupling. Keep that helper in interviews while it remains interview-specific rather than promoting it to a generic shared utility. Shared modules must not import application or feature modules. Keep imports explicit rather than adding barrel modules. These are contributor conventions, checked in review rather than enforced by a new lint dependency.

Global CSS remains in `styles` because existing selectors span pages. `main.tsx` imports `styles/styles.css`, while `app/App.tsx` imports `styles/cloud.css`, preserving the existing import locations and CSS evaluation order. Supabase migrations and Edge Functions stay under `supabase/`; their server execution, secrets, and deployment boundaries are independent of the browser source tree.

## Old-to-new mapping

All paths below are relative to `src/` unless prefixed with `supabase/`.

| Original file or responsibility | Destination |
| --- | --- |
| `App.tsx`: root component and persistence | `app/App.tsx` |
| `App.tsx`: route types/parser and browser synchronization | `app/routing.ts`, `app/useAppRoute.ts` |
| `App.tsx`: application modal, details, status, empty state | `features/applications/components/{ApplicationModal,ApplicationDetailView,StatusSelect,EmptyState}.tsx` |
| `App.tsx`: available application statuses | `features/applications/statuses.ts` |
| `App.tsx`: database row conversions | `features/applications/data/applicationRow.ts` |
| `App.tsx`: legacy record normalization | `features/applications/data/legacyApplications.ts` |
| `storage.ts` | `features/applications/data/legacyStorage.ts` |
| `App.tsx`: authentication and setup screens | `features/auth/components/{AuthPanel,SetupRequired}.tsx` |
| `App.tsx`: interview modal and upcoming page | `features/interviews/components/InterviewModal.tsx`, `features/interviews/pages/UpcomingInterviewsPage.tsx` |
| `App.tsx`: interview date helpers | `features/interviews/interviewDates.ts` |
| `GoogleCalendarButton.tsx`, `googleCalendar.ts` | `features/interviews/components/GoogleCalendarButton.tsx`, `features/interviews/googleCalendar.ts` |
| `SkillsPage.tsx`, `CompanyInterviewQuestionsPage.tsx` | `features/skills/pages/` with original filenames |
| `skillPriority.ts` | `features/skills/skillPriority.ts` |
| `types.ts`, `lib/supabase.ts` | `shared/types.ts`, `shared/lib/supabase.ts` |
| `App.tsx`: statistic card and date formatting | `shared/components/StatCard.tsx`, `shared/utils/formatDate.ts` |
| `styles.css`, `cloud.css` | `styles/` with original filenames |
| `*.test.ts` | `test/unit/` with original filenames |
| Page/component `*.test.tsx` | `test/components/` with original filenames |
| `App.*.test.tsx` | `test/integration/` with original filenames |
| `main.tsx`, `vite-env.d.ts`, `test/setup.ts`, `supabase/` | Retained |

## Implementation and verification plan

1. Record current tests/build results and inspect component, persistence, and routing dependencies.
2. Move existing standalone modules into their owning domains; update imports and CSS entry imports.
3. Extract existing components, pure helpers, row mappings, and legacy normalization from App while preserving callbacks, state ownership, and validation behavior.
4. Move tests into `test/unit`, `test/components`, and `test/integration`; update their imports and mocks, retaining existing cases and shared setup. Add focused regression checks for newly exposed routing, date, row-mapping, and legacy compatibility boundaries where needed.
5. Run the complete `npm test` suite and `npm run build` using Node.js 22. Review the complete diff for behavior changes, import cycles, and accidentally exposed server credentials. Perform an independent review before submission.

Tests are grouped by scope: pure functions, routing hook checks, and Edge Function helper tests in `unit`, isolated UI in `components`, and application orchestration with mocked Supabase in `integration`. Server helper tests may import from `supabase/functions/` without moving production server code into the browser tree. Use `npx vitest run src/test/unit/skillPriority.test.ts` for a focused run.

This refactor supplies the directory groundwork for [#41](https://github.com/Coreyboy1820/job-application-tracker/issues/41). The wider audit and additional coverage of untested major features remain part of that issue. No database migration, Supabase function deployment, or visible UI change is required for the structure change.

Next-interview ordering uses `features/applications/applicationSort.ts` from application orchestration and the Skills page. It imports the pure interview date utility to validate dates consistently; this is a domain-data dependency, with no UI import or reverse dependency. Application sorting and within-application study ordering remain separate.
