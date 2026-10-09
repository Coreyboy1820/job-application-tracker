# Rolecall — Job application tracker

A React + TypeScript application for tracking job applications across devices, scheduling interviews, studying extracted skills, and preparing selected questions for ChatGPT practice. Supabase provides email/password authentication and account-owned PostgreSQL storage.

**[Read the documentation](docs/wiki/Home.md)** for application workflows, architecture, technologies, data flows, configuration, testing, deployment, screenshots, and diagrams.

## Run locally

Use Node.js 22 and npm to match CI:

```sh
npm ci
cp .env.example .env.local
npm run dev
```

Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` in `.env.local` from your Supabase project's Connect dialog. Never expose service-role/secret keys or `GEMINI_API_KEY` in `VITE_` variables. Apply the repository migrations and configure Auth URLs and server function secrets using the [setup guide](docs/wiki/Getting-started.md).

Vite prints the development URL, usually `http://localhost:5173`. Run `npm test` and `npm run build` before submitting changes. CI installs locked dependencies, builds, and runs tests on main pushes and PRs targeting main. Database ownership checks and function deployment are separate from browser CI; see [testing and deployment](docs/wiki/Testing-and-deployment.md).

## Contributor references

- [Agent instructions](AGENTS.md)
- [Architecture decision and module boundaries](docs/architecture.md)
- [Test coverage and isolated database checks](docs/test-coverage.md)
- [ChatGPT handoff research](docs/chatgpt-interview-handoff.md)
- [Wiki source and maintenance guide](docs/wiki/Maintenance.md)

The wiki is published separately from application code. Reviewable pages and sanitized assets live in `docs/wiki/`; publishing requires updating the repository's wiki Git repository.

The target [GitHub wiki](https://github.com/Coreyboy1820/job-application-tracker/wiki) is not published yet: GitHub currently keeps Wiki disabled despite administrator enable requests. The [maintenance guide](docs/wiki/Maintenance.md) records the publishing restriction and activation steps.
