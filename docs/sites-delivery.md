# Rolecall Sites delivery

Issue #59 follow-up, October 19, 2026 (America/Los_Angeles). PR #60 is merged.
The first post-merge candidate has been published successfully as Site version 2,
and its append-only ledger is unlocked at revision 10. Cloud lock and candidate
verification passed in owner-supplied reports; Sites independently confirms the
saved source and terminal deployment. **Automatic future-merge publication is not
yet confirmed:** the saved publisher task configuration and live failure/recovery
coverage remain outstanding. Keep #59 open. See the
[evidence and remaining gates](sites-publication-evidence.md).

## Existing destination

- URL: https://rolecall-private.tealcrow6.chatgpt.site
- Project: `appgprj_6aca682dbe0c819190f4d76b28122aec`
- Configuration: `.openai/hosting.json`, static directory `dist`
- Access: public. The owner explicitly confirmed preserving public access on
  October 19, 2026, superseding issue #59's original owner-only requirement.
  Recheck current ownership and audience before each publication; stop on drift.

The GitHub repository is the application source of truth. Sites has a separate
source repository: a GitHub commit SHA is not automatically a Sites source SHA.
Never substitute one for the other when saving a Sites version.

## CI behavior

`.github/workflows/build.yml` validates pull requests and pushes to `main` with
Node.js 22, `npm ci`, the production build, and the complete test suite. Only a
successful push to `main` packages and uploads a deployment candidate. Failed
checks prevent packaging/upload; PRs do not publish or upload release candidates.

Set repository variables `VITE_SUPABASE_URL` and
`VITE_SUPABASE_PUBLISHABLE_KEY` to the existing project's browser configuration.
Candidate packaging fails when either is missing. No Sites deployment token,
Supabase service-role key, or Gemini secret belongs in this workflow.

The artifact `sites-build-<source SHA>-<run attempt>` is retained for 30 days and
contains:

- `sites-build.tar.gz`: only `dist` and `.openai/hosting.json`
- `release.json`: source SHA, repository, CI run/attempt, destination, and an
  explicit awaiting-publication status, schema version, workflow/ref/event, and
  expected public audience
- `SHA256SUMS`: archive/metadata checksums for download verification

Build assets contain the browser publishable configuration, as they do in the
live app. Artifacts never package `.env.local`, repository credentials, or source
secrets. Read permission on this private GitHub repository is required to download
its artifacts. Workflow summaries distinguish candidate preparation from a live
release. New runs cancel superseded CI for the same ref; this does not provide a
production deployment lock. Publishers must use the dedicated operational ledger.

## Candidate verification

CI runs the candidate helper's behavior tests and packages with
`node scripts/sites-candidate.mjs package release`. Packaging checks the hosting
identity and archive contents. A publisher must independently obtain authenticated
GitHub run metadata and current main before using:

```sh
node scripts/sites-candidate.mjs verify /path/to/candidate /path/to/trusted-context.json
```

The context object requires `repository`, `source_sha`, `current_main_sha`,
`run_id`, `run_attempt`, `workflow`, `event`, `ref`, and `conclusion`. Use the exact
repository, workflow path `.github/workflows/build.yml`, event `push`, ref
`refs/heads/main`, and successful conclusion from GitHub; both SHA values must
match current main. Never construct this context from the downloaded artifact.

Verification checks fixed candidate filenames and checksums, expected metadata,
hosting configuration, required files, and archive member paths/types before
extraction. Links, traversal, duplicate entries, and unexpected members are
rejected; decompressed tar content is capped at 100 MiB. It does not download
artifacts, extract files, authenticate GitHub, lock publication, or deploy.
A passing check is point-in-time evidence; recheck main under the publication
lock immediately before saving/deploying.

## Verified platform limitation

The available Sites source-write credential is short-lived (`token_expires_at`)
and must remain in session memory. The experimental `publish_on_push` capability
also has an expiring publication window. Neither establishes durable GitHub
Actions authentication or a supported external credential-refresh endpoint.
Do not save these tokens as GitHub secrets or reverse-engineer Sites endpoints.

The [official Sites guide](https://learn.chatgpt.com/docs/sites) documents Sites
operations through ChatGPT web/desktop and saving/deploying source versions. No
supported external CI deployment API was established by the available docs/tools.
This is a capability finding, not a claim that future or other account-specific
integrations cannot exist.

The owner reported successful cloud lock and candidate verification after PR #60
merged. The first actual Sites publication also has native terminal evidence.
These establish the recorded capabilities, not the configuration of a future
merge-triggered publisher. Local `gh` authentication alone does not establish
cloud access. A polling schedule differs from immediate merge-triggered
publishing; do not silently treat them as equivalent.

## Supported authenticated publication

Use the Sites skill and native tools from an authenticated ChatGPT session:

1. Select the latest successful **main push** CI run. Confirm its source SHA is
   still the desired main head and there is no newer release being published.
   Download its artifact, verify `SHA256SUMS`, and compare `release.json` with the
   authenticated GitHub run metadata. Checksums alone do not prove provenance.
2. Obtain the GitHub source at that exact SHA in an isolated checkout; keep local
   environment files and credentials outside tracked source. Read the current
   Site and confirm public access. Reuse the existing project identity.
3. Obtain a fresh Sites source-write credential through the supported native
   operation. Keep it in session memory; pass it only through the source helper's
   hidden stdin. Open the existing Site checkout before changing its source.
4. Synchronize the exact application source without rebasing or force pushing.
   Validate the downloaded archive's destination and paths before extraction;
   restore the tested `dist` assets rather than rebuilding with different browser
   configuration. Use the Sites source workflow to push that matching source and
   package its static output. Retain the helper's verified **Sites** source SHA
   and archive; record the originating GitHub SHA separately.
5. Recheck for a newer main commit before publishing. Use the normal public-audience
   save-then-deploy operations with the helper's exact source SHA and archive.
   Do not change sharing settings or use private-only operations.
6. Poll only nonterminal deployments. Report success only when status is
   `succeeded` with its URL. Record GitHub SHA/run, Sites source SHA, saved version
   ID, deployment ID, and outcome in the release record/issue. Failed publication
   must not be reported as deployment success. Reconcile any saved version or
   running deployment before retrying to avoid duplicate releases.

Every publisher must use the existing durable per-Site lock and a current-main
check before publication. CI cancellation alone cannot prevent an older publisher
from replacing a newer live release.

## Recovery and rollback

If validation fails, fix the source/configuration and rerun CI. If an artifact has
expired, produce another validated build for the intended source before publishing.
If a credential expires, obtain another through the native tool; never reuse or
log expired tokens. Investigate terminal deployment failures before retrying.

For rollback, follow the [serialized rollback protocol](sites-publication-state.md#serialized-rollback).
It retains the lock and appends a pending rollback referencing a prior successful
release and its saved version, then records a new terminal deployment receipt.
Stop the publisher first and keep it disabled until a corrective release is ready.
Keep GitHub history intact. Local state-machine coverage does not establish a
verified live Sites rollback.

Supabase migrations and Edge Function deployment are separate releases.

## Finish issue #59

Identify supported unattended authentication and a trigger/bridge with verified
private GitHub access. Implement successful-main gating, exact artifact/source
transfer, serialized publication, stale-run protection, deployment status and
rollback records. Test failed CI, concurrent merges, publication failure, public
access, and a real merged commit before closing the issue. The candidate workflow
and first release do not by themselves prove ongoing continuous deployment.

## Historical pre-merge evidence

On October 19, 2026, PR #60 remained open/draft with passing original CI.
Both required GitHub variable names were present. Main had successful push CI,
but the candidate workflow was not merged, so those runs did not establish
candidate upload. The current Site is active, public, owner-managed, and has
no linked automations. No sharing change or deployment was made in this follow-up.

Official documentation now establishes GitHub PR-merge event tasks on ChatGPT
web/mobile, and a separate Workspace Agent trigger API. Neither is a direct
Sites deployment API. The current tools cannot configure an event task or start
a fresh cloud run, and no published Workspace Agent API channel/token is
configured. See [deployment task setup](sites-auto-deploy-task.md) for the exact
readiness check, stop conditions, and deployment requirements. Publication
coordination now has a GitHub contents-CAS implementation and
[operational guide](sites-publication-state.md). Cloud coordination access, the
publication path, and end-to-end tests remain to be demonstrated;
artifact verification alone does not complete automatic deployment.

## Historical interactive web readiness result

The owner supplied a first-run report: current main
`a6410a4699640755b291224cf5e735d9ee7f8758`, successful main-push CI run
`39373573152`, attempt 1, and no candidate artifacts (expected before PR #60
merges). The web chat opened Sites source
`e2654e1f3f60902d801e0e43d9ed8e029089de30` and found public save/deploy tools.
No publication, sharing change, or schedule was made. This is reported web-chat
evidence, not proof of a fresh unattended run. Candidate download/verification
moves to the post-merge check; production publishing stays disabled meanwhile.


## Historical verification task setup

The owner reported creating **Verify Rolecall publication lock**, enabled for
GitHub PR-merge events in this repository, with its prompt restricting action to
main merges. It is verification-only and prohibits publishing and sharing
changes. Its immediate-run request was rejected: “Run now is available only for
ordinary cloud-scheduled tasks.” No cloud execution occurred. State was read at
revision 2, owner null, no releases; the Site remained public. The task ID,
configuration receipt, and cloud execution URL remain outstanding. This updates
the earlier setup report without treating a saved task as a working publisher.

Current post-merge receipts supersede these historical readiness limits; see
[publication evidence](sites-publication-evidence.md).
