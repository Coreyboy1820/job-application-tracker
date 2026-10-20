# Publication evidence and remaining gates

Rechecked October 20, 2026, America/Los_Angeles. Runtime receipts use UTC.
This records evidence. The publisher readback below was read-only; this branch does not enable or edit a cloud publisher task.

## Verified first release

PR #60 merged as GitHub source `acf65ab4c7aa6b4bf2d38ad19771cdc8c97348e0`.
Its [successful main-push CI run](https://github.com/Coreyboy1820/job-application-tracker/actions/runs/39376417058),
attempt 1, produced artifact `12243174478`. The candidate was downloaded and
verified locally against authenticated run metadata and current main. The owner
also reported cloud verification of the downloaded ZIP's authenticated digest,
metadata, checksums, destination, and archive with the trusted helper at that SHA.
These are distinct from confirming a saved cloud task's configuration.

The owner reported cloud lock acquisition/readback at revision 3, rejection of a
competing owner and stale-SHA write (GitHub 409), then unlock/readback at revision 4:

- [Acquisition commit](https://github.com/Coreyboy1820/job-application-tracker/commit/e0e4d5b7361c04dddbb65038e5471c6ffe2c8dc5)
- [Release commit](https://github.com/Coreyboy1820/job-application-tracker/commit/83540d6058c220215ba92711c499f588be7efd1b)

No separate cloud-run URL was exposed. Do not invent one or infer task settings
from GitHub ledger commits.

A subsequent read of `publication-state.json` on `sites-publication-state` found
revision **10**, owner **null**, and one succeeded release:

| Receipt | Value |
| --- | --- |
| Release ID | `fd33033d-17cb-4531-b854-d8b85d3f2f96` |
| GitHub source | `acf65ab4c7aa6b4bf2d38ad19771cdc8c97348e0` |
| Run / attempt / artifact | `39376417058` / `1` / `12243174478` |
| Candidate archive SHA-256 | `49acfe2a7f3fb9a4cffb123c2d3310dbf4cbf03c5198cf6200406674d61dcbeb` |
| Sites source | `8eed2d133f14105b9958e2fba3dd8a02f6d56232` |
| Saved version | `appgprj_6aca682dbe0c819190f4d76b28122aec~appgver_2e547bf791cc8191ba8c93cac862c05e` (version 2) |
| Deployment | `appgdep_6ad701e7c5b48191887752fd0b4f2536` |
| Ledger terminal observation | `2026-10-20T05:53:50.992Z` |

Native Sites version listing independently confirmed the saved version, Sites
source, and deployment IDs above. Native deployment status independently returned
`succeeded`, no failure message, and
https://rolecall-private.tealcrow6.chatgpt.site. The native Site read confirmed
public audience and current-user owner role. No new publication or sharing
mutation was performed while collecting this evidence.

GitHub and Sites source SHAs intentionally differ. The candidate archive digest
is not the final Sites package digest; the Sites helper packages the matching
source/build under its own archive contract.

## Remaining gates for issue #59

| Gate | Current evidence / next action |
| --- | --- |
| CI candidate production and verification | Passed for the real merged commit above; repeat for future current-main releases. |
| Durable cloud lock/CAS/readback | Owner-reported cloud pass; matching ledger transitions are durable. |
| First actual saved version and terminal deployment | Native Sites independently confirms version 2 succeeded; release ledger is unlocked. |
| Future-merge publisher configuration | Enabled task `Publish Rolecall main merges` (`6ad6fcf51ab8819191c31fccf5133a90`, `condition_watch`) was read back with the full saved publication protocol. The readback does not expose webhook filters or connector bindings; verify exact repo/base/merge delivery and attached GitHub/Sites access on the next real merge. |
| Duplicate/stale/failure handling | Local helper coverage exists; live duplicate event, overlapping merges, CI failure, artifact expiry, publication ambiguity, and recovery receipts are not yet recorded. |
| Rollback | Documented and locally tested; a live rollback and corrective release are not recorded. Do not disrupt production solely to manufacture a test receipt. |

Before closing #59, obtain an unattended publication result tied to a subsequent real merge event, confirm the hidden trigger/connection configuration through observed delivery, and complete required operational coverage.
A completed conversation, one successful publication, or an enabled verification
webhook alone does not establish automatic deployment on future merges. Do not
create a second publisher or alter the existing trigger from a session that
cannot inspect its configuration.

The separately requested **Resume Rolecall open issues** one-time schedule is a
development continuation. It explicitly prohibits deployment and does not
replace or enable the PR-merge publisher.

## Publisher readback

On October 20, 2026, the existing task **Publish Rolecall main merges** was read back enabled with ID `6ad6fcf51ab8819191c31fccf5133a90`, mode `condition_watch`, and updated timestamp `2026-10-20T05:55:35Z`. Its saved prompt contains the complete current-main CI gate, publication-state CAS/lock protocol, trusted candidate verification, public-audience preservation, supported Sites source synchronization, pending provenance, save/deploy reconciliation, terminal recording, and unlock requirements. The last-run timestamp exposed by the task was `2026-10-20T05:44:57Z`.

The readback surface does not expose webhook trigger filters or connector bindings. Therefore it cannot by itself prove exact repository/base/merge delivery or that the intended GitHub and Sites connections are attached. Do not create or replace the task; use the next real eligible merge to verify those properties and ongoing unattended publication.

## October 20 development-session recheck

Read-only native Sites calls confirmed the same project, public audience, owner
role, live URL, and latest saved version **2**. The recorded deployment still
returns `succeeded`, with no failure message. An authenticated GitHub read of
`publication-state.json` returned blob
`2565fa7064499275cbb85e11e5ce5b38c4c69160`, revision **10**, owner **null**,
and the same single successful release above. No lock or deployment was changed.

The Site-linked automation list returned only **Resume Rolecall open issues**
(`Automation_a163016077a08191adf6d8652d2b9808`), now disabled. This list is
limited to Site-linked schedules; it does not disprove the separate event
publisher readback above or establish whether the one-time development task ran.
This session exposes `create_schedule` for time-based VEVENT tasks, with no task
inspection/editing or event-trigger-management tool. No duplicate task was created.

For the next real eligible merge, retain a reviewable receipt with these fields:

| Evidence | Required observation |
| --- | --- |
| Event and task | Merged PR/base, triggering event, publisher task ID and cloud-run URL or explicitly unavailable URL. |
| Eligibility | Authenticated current-main SHA, successful push CI run/attempt, artifact ID and verified candidate digest. |
| Coordination | Lock acquisition/readback, pending release ID and durable provenance; duplicate/stale handling when applicable. |
| Publication | Exact Sites source SHA, saved version and deployment IDs, native terminal outcome and unchanged public audience. |
| Completion | Ledger terminal evidence and explicit unlock/readback, or retained ownership plus recovery details if ambiguous. |

Capture observations separately from configured instructions. A passing PR check
alone is not merge-trigger delivery. Do not manufacture a merge or production
failure to fill this record. The [official task documentation](https://learn.chatgpt.com/docs/automations)
places GitHub event-trigger management in ChatGPT web/mobile; use that surface
to inspect the existing task's hidden filters and connections.
