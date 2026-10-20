# Publication lock and release ledger

Rolecall coordinates publishers through one GitHub contents file:

- Repository: `Coreyboy1820/job-application-tracker`
- Operational branch: `sites-publication-state`
- File: `publication-state.json`
- Site: `appgprj_6aca682dbe0c819190f4d76b28122aec`, public audience

This branch is runtime metadata. Do not merge it into main, reset its history,
delete its state file, or use it as application source. Its writes do not match
the application's main-only push CI trigger. GitHub contents-write permission is
required; reading the repository alone does not prove coordination access.
The owner UUID identifies a publisher; it is not a secret or authentication token.

## Bootstrap once

Create the operational branch from an existing verified main commit, then run:

```sh
node scripts/sites-publication-state.mjs init
node scripts/sites-publication-state.mjs read
```

The CLI uses existing authenticated `gh` access; do not put tokens in arguments
or tracked files. Initialization requires that the branch already exists and the
state file does not. Existing state must be inspected, never reinitialized.
Runtime commands fail closed on a missing, malformed, wrong-project, or unknown
schema file. Keep credentials out of the ledger.

## Locking protocol

`read` returns `{sha,state}`, where `sha` is the current **file blob SHA**, not a
commit SHA. `apply` reads a snapshot and uses that SHA in the GitHub contents PUT.
Every transition increases `revision` and records a new operation UUID, including
unlock. Returning to an unlocked state never restores old bytes or an old SHA.
A second writer based on an earlier snapshot must fail rather than overwrite it.

Create a fresh v4 owner UUID for each publisher execution and a fresh v4
`operationId` for every mutation. Send command JSON on stdin:

```sh
node scripts/sites-publication-state.mjs apply < command.json
```

Commands share `action`, `owner`, and `operationId`:

| Action | Additional fields | Effect |
| --- | --- | --- |
| `acquire` | None | Acquires only an unlocked state; no expiry or takeover. |
| `begin` | `releaseId` (v4 UUID), `provenance` | Appends a pending record before any Sites save/deploy. |
| `record` | `releaseId`, `versionId` and/or `deploymentId` | Attaches observed IDs; existing IDs cannot change. |
| `finish` | `releaseId`, `status`, `evidence` | Records an observed terminal outcome; does not release ownership. |
| `unlock` | None | Releases only when no pending record remains. |

`provenance` requires `sourceSha`, `runId`, `runAttempt`, `artifactId`,
`archiveSha256`, and `sitesSourceSha`. Use lowercase SHA hashes, positive numeric
strings for GitHub IDs/attempts, and the helper's actual pushed Sites source SHA.
The repository and Site are fixed in the state schema. Eligibility still comes
from candidate verification against authenticated current-main CI metadata.
A successfully published source SHA or artifact cannot be begun again. Preserve
all prior release records; terminal records cannot be edited by these commands.

`status` is `succeeded` or `failed`. `evidence` contains canonical ISO `observedAt`,
a concrete `observation`, `publication`, and `terminalConfirmed: true`.
Success requires matching recorded and observed `versionId` and `deploymentId`.
For failure, record a verified terminal failed deployment with its matching ID,
or verified `publication: "not-started"` with `noSideEffects: true` and no
recorded publication IDs. An exception, timeout, or completed agent conversation
is not terminal evidence. The helper validates caller-supplied evidence; the
caller must obtain the actual Sites response and include its outcome/URL in the
observation. It does not poll Sites or independently prove publication success.

Read back state after each mutation before relying on its result. Before Sites
save/deploy, confirm the persisted owner, pending release, and provenance still
match the execution; also recheck current main and the Site's public audience.
Keep ownership through terminal reconciliation and the subsequent explicit
unlock. Do not invoke Sites publication if any read/write result is uncertain.

## GitHub connector without authenticated gh

Use the same transition implementation with native GitHub tools:

1. Fetch the exact file on `sites-publication-state` and obtain its complete
   contents and current blob SHA through the GitHub contents API.
2. Run `node scripts/sites-publication-state.mjs plan < input.json`, with
   `{ "state": <fetched state>, "command": <command> }`. This produces replacement
   JSON without network access.
3. Call GitHub's update-file tool with the explicit repository, branch, path,
   complete replacement JSON, descriptive commit message, and the **fetched blob
   SHA**. Do not omit the branch or substitute the branch's commit SHA.
4. Fetch and validate the resulting state before proceeding. On conflict, discard
   the planned replacement, re-read, and reconsider the operation. Never replace
   the expected SHA in a stale document with a newer one.

This is the [documented GitHub contents contract](https://docs.github.com/en/rest/repos/contents#create-or-update-file-contents).
Cloud access to these writes must be demonstrated separately. The CLI and native
tools must share this branch/file, not separate per-run lock stores.

## Interrupted or ambiguous operations

No automatic retries follow a failed mutation. A timeout may mean the write
committed: re-read and inspect `operationIds`, owner, and release provenance before
deciding what happened. Reusing an operation ID is rejected; do not generate a
new one and replay a publication whose outcome is unknown.

Locks do not expire because Sites has no demonstrated fencing mechanism to stop
an old publisher after its lease expires. An interrupted pending record keeps
its lock. Recovery requires an operator to establish that the original execution
has terminated, reconcile any saved version/deployment with Sites, record actual
terminal evidence as the retained owner, then unlock. If the outcome remains
unknown, leave the lock held. Never clear it solely because it is old.

The helper refuses to write state beyond its conservative size limit. Stop and
plan a history-preserving storage migration before publishing again; do not prune
records or reset revision to regain capacity. GitHub commit history also retains
every accepted state transition.

## Verification

Run `node --test scripts/sites-publication-state.node-test.mjs`. Local tests cover
state transitions and simulated CAS; a live readiness check must separately prove
GitHub write access, stale-SHA rejection, and lock readback from the intended
cloud environment. A lock test need not create a release or publish a Site.
A local or interactive web success does not prove an unattended scheduled run.

## Initial operational evidence

On October 19, 2026, this desktop session created the operational branch and
initialized the state file. A live GitHub test acquired and read back ownership,
rejected a competing owner, and submitted a competing replacement using the
original blob SHA; GitHub rejected that stale update. The original owner then
unlocked. Revision advanced from 0 to 2, leaving owner null and no releases.
The resulting blob SHA was `4cad212516d4b32acc33565bdc622f299d04c850`.
No Sites operation was invoked. This demonstrates GitHub persistence and CAS
from this session; it does not establish unattended cloud authorization.
