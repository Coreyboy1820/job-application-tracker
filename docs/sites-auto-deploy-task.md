# Rolecall deployment task setup

Status: proposed cloud bridge, not enabled or verified. Repository preparation is
tracked in PR #60. Saving a task does not prove it can deploy the Site.

## Configure the trigger

On eligible ChatGPT plans, use ChatGPT **web or mobile**, connect GitHub with
access to `Coreyboy1820/job-application-tracker`, and enable Sites in the task's
chat. In Scheduled, request a task triggered only when PRs merge into `main` in
that repository. Do not include review/comment events or a polling schedule.
Confirm that the saved trigger filters match before enabling it.

The current desktop session can read GitHub and Sites, but its Sites scheduling
tool accepts only a time-based VEVENT. It cannot create a GitHub event trigger,
inspect that trigger's configuration, or start a fresh cloud test run.

Official references:

- [Event-triggered tasks and cloud context](https://learn.chatgpt.com/docs/automations)
- [Manage a Site](https://learn.chatgpt.com/docs/sites/managing-a-site)

## First run: verify capabilities without publishing

Use this request in a new web chat with the intended task connections, then use
Run now in the saved task to repeat it in a fresh cloud run:

> Verify readiness to deploy Rolecall from successful main CI builds in
> Coreyboy1820/job-application-tracker to existing Sites project
> appgprj_6aca682dbe0c819190f4d76b28122aec. Read docs/sites-delivery.md and
> docs/sites-auto-deploy-task.md from the intended repository revision. Do not
> publish, change sharing, or create another Site. Prove you can obtain current
> main, authenticated CI run metadata and its matching artifact, verify it using
> scripts/sites-candidate.mjs, and obtain supported Sites source access and
> publication tools. Report the exact GitHub SHA/run and inspected Site audience,
> but no tokens. Use docs/sites-publication-state.md to read the existing GitHub
> publication state, acquire a test lock, prove competing-owner and stale-SHA
> writes are rejected, and unlock without creating a release. Report any missing
> capability instead of assuming access. If PR #60 has not
> merged, report candidate download as awaiting the first post-merge main artifact
> rather than weakening production eligibility or requesting repeated checks.

A task that cannot access a shell/helper, download artifacts, acquire a durable
lock, or obtain Sites publication authorization must stop without publishing.
Repository access in this local conversation is not evidence of cloud access.
The lock and release ledger use the dedicated GitHub state branch described in
[publication coordination](sites-publication-state.md). Verify its initialization
and write access from the cloud task. No event task is provisioned by PR #60.

## Publication instructions after readiness is demonstrated

Save these requirements in the task prompt or attach this document. Remote tasks
cannot depend on personal skills or files on this computer. The Sites skill must
be available to the cloud task; read it for supported source and publishing calls.

1. Treat the merge event as a wake-up signal. Read current `main` and select its
   successful **push** run of `.github/workflows/build.yml`, not PR validation or
   an older passing commit. If CI is still running, poll for at most 15 minutes;
   stop and report pending/failed/cancelled CI without publishing. Recovery uses
   Run now after successful CI; there is no automatic retry trigger for CI reruns.
2. Follow [publication coordination](sites-publication-state.md) to acquire the
   durable per-Site lock and update the persistent release ledger. Keep it
   through terminal
   deployment reconciliation; do not replace it with a prompt saying “do not
   overlap.” Stop if the lock or release record is unavailable. Read the record;
   reconcile pending deployments and skip an already successful source/artifact.
3. Download the exact authenticated run's candidate artifact. Construct a trusted
   context JSON independently from GitHub: `repository`, `source_sha`,
   `current_main_sha`, `run_id`, `run_attempt`, `workflow`, `event`, `ref`, and
   `conclusion`. Run `node scripts/sites-candidate.mjs verify <candidate-dir>
   <trusted-context.json>` from the trusted publisher checkout. Do not use a
   candidate-supplied script or metadata as evidence of its own authenticity.
4. Read the current Site and confirm project identity and **public** access, as
   requested by the owner on October 19, 2026. Stop on audience drift; do not
   change sharing automatically. Preserve the existing Site and URL.
5. Use the Sites skill to open its source with a fresh supported credential.
   Synchronize the selected GitHub source without rewriting either history.
   Validate before extracting the candidate and restore its exact `dist` and
   hosting manifest; do not substitute a locally rebuilt bundle. Package with the
   supported helper and keep its verified Sites source SHA separate from GitHub's.
6. Recheck current main, lock ownership, and the Site audience immediately before
   publication. If source is stale, release the lock and let a subsequent run
   select current main. Use `begin` to persist the pending release and provenance
   before calling Sites save/deploy, and read it back. Save the verified archive;
   use `record` to persist the returned saved version ID before deploying it.
   Deploy with the normal public-audience operation; do not use private-only
   publication or publish-on-push as a substitute.
7. Use `record` to persist the returned deployment ID before polling. The pending
   record must retain GitHub SHA/run/artifact and Sites source/version provenance. A saved version or a completed
   agent run is not proof of a successful deployment. Poll nonterminal deployment
   states only; use `finish` with observed terminal evidence and outcome/URL, then
   explicitly `unlock`. Reconcile an ambiguous save/deploy response before
   retrying. Keep the lock if publication is unresolved; surface failures for
   intervention.

## Enablement evidence

Keep the task disabled until its cloud capabilities, lock, and receipt storage
are demonstrated. Artifact download is a post-merge gate: until PR #60 reaches
main, successful main runs legitimately have no candidate artifacts. Do not
weaken main-push gating or repeatedly test an artifact that cannot yet exist.
Before calling automatic deployment complete, record the task
ID/configuration and cloud test URLs, plus results for a real merged commit,
failed CI, duplicate events, overlapping merges, stale candidates, artifact
expiry, publication failure, and rollback. Verify the preserved public audience.

A merge-triggered task may coalesce nearby events and deploy the latest current
main. It does not promise a separate deployment for every intermediate merge.
If every merge must deploy, or failed CI must retry unattended, implement and
verify an appropriate trigger/queue rather than silently changing that contract.

## Alternative: Workspace Agent API

A published Workspace Agent with an API channel can be triggered by GitHub
Actions using the [documented API](https://learn.chatgpt.com/workspace-agents/trigger-runs).
It requires a real published trigger ID and a separately provisioned
[Workspace Agent access token](https://learn.chatgpt.com/workspace-agents/authentication),
plus verified GitHub/Sites connections in that agent. None are configured here.
The token is for triggering agents, not direct Sites deployment. Do not store
short-lived Sites tokens in GitHub secrets or assume API run completion proves
publication. This route can be implemented once those prerequisites are available.
