# Rolecall documentation

Rolecall is a web application for tracking job applications, scheduling interviews, and turning job-posting skills into interview practice. Sign in with an email/password account to keep application records available across devices.

**Publication status:** these pages are reviewable wiki source. GitHub currently refuses to enable this private repository's wiki; publication and rendered-wiki verification remain pending. See [Maintenance](Maintenance.md) for the evidence and activation steps.

Start with [Application overview](Application-overview.md) for the user journey or [Getting started](Getting-started.md) to run the project. Contributors can follow [Architecture](Architecture.md), [Technology stack](Technology-stack.md), and [Data model and flows](Data-model-and-flows.md).

| Guide | Contents |
| --- | --- |
| [Application overview](Application-overview.md) | Applications, interviews, Skills, calendar drafts, and ChatGPT practice |
| [Architecture](Architecture.md) | Source layout, routing, state ownership, and dependencies |
| [Technology stack](Technology-stack.md) | Locked versions and the role of each tool |
| [Data model and flows](Data-model-and-flows.md) | Ownership, JSON records, analysis, caching, and external sharing |
| [Getting started](Getting-started.md) | Node 22, browser configuration, Supabase, and development |
| [Testing and deployment](Testing-and-deployment.md) | Automated checks, RLS verification, and release steps |
| [Troubleshooting](Troubleshooting.md) | Configuration, sign-in, analysis, clipboard, and calendar errors |
| [Maintenance](Maintenance.md) | Editing the wiki, refreshing screenshots, and keeping docs accurate |

Screenshots throughout this wiki use fictional application records and production UI components. They show desktop and narrow mobile viewports, not real account data. Documentation was checked against main commit `acf65ab4c7aa6b4bf2d38ad19771cdc8c97348e0`, including knowledge controls, cross-application practice selection, immediate interview saves, status ordering, and Sites candidate preparation. Public Site access does not grant access to account-owned records.

[Source repository](https://github.com/Coreyboy1820/job-application-tracker) · [Issue tracker](https://github.com/Coreyboy1820/job-application-tracker/issues)
