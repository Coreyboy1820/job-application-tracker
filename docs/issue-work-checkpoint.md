# Open issue work checkpoint

Owner request: work all open issues in parallel, each on its own branch. Preserve
unrelated local changes and existing history. Do not rebase or force-push. Read
AGENTS.md and current issue/PR discussions before continuing; this snapshot is
not a replacement for current GitHub state.

## Continuation

A one-time Sites-linked development task **Resume Rolecall open issues** was
saved and read back enabled for October 20, 2026 at **00:20 America/Los_Angeles**.
Task ID: `Automation_a163016077a08191adf6d8652d2b9808`.
It is not the production publisher. Its instructions prohibit merging, closing
issues, publishing/deploying, changing sharing, or running production migrations.
Saving it does not prove its future cloud execution or development capabilities.

Use pushed GitHub branches and PRs for continuation; `/tmp` checkouts and personal
skills from this desktop are not durable cloud inputs. If cloud source/tools
are unavailable, report the exact missing capability rather than inventing work.

## Branches and current results

| Issue | Branch | Work / remaining limits |
| --- | --- | --- |
| #65 dependency advisories | `fix/issue-65-test-dependencies` | PR #66. Vitest/mocker locked 4.1.12; tinypool removed; two test compatibility changes preserve assertions. Clean npm ci on Node 22, 253 app tests, build, 23 helper tests, audit zero, independent review pass. GitHub CI should be checked on current head. |
| #50 wiki | `docs/issue-50-refresh` | Current workflows, application statuses, interview saving, practice selection, and screenshots refreshed. Local links/assets checked and independently reviewed. GitHub admin PATCH requesting has_wiki=true returns false; GET still false, authenticated wiki remote unavailable. Do not change repository visibility or billing. Rendered wiki verification is blocked until the platform restriction is resolved. |
| #61 mobile sizing | `fix/issue-61-mobile-layout` | Independent UI work in progress. Read its eventual PR for final measurements, screenshots, checks, and limitations. Real iOS/Android pinch, keyboard, and in-app host behavior require device verification; Chromium emulation cannot establish them. |
| #59 publication | `docs/issue-59-publication-evidence` | First release independently confirmed at Site version 2; ledger revision 10 owner null. Enabled publisher `6ad6fcf51ab8819191c31fccf5133a90` and its full saved protocol were read back. Hidden webhook filters/connector bindings, the next real merge delivery, and live failure/rollback coverage remain unverified. |

Initial branch base was main `acf65ab4c7aa6b4bf2d38ad19771cdc8c97348e0`.
Recheck current main before changing code, comparing screenshots, or selecting a
release candidate. Keep issues separate; do not accidentally merge their branches
into one PR. Issue #65's test-tool upgrade may need coordinated validation when
later branches are merged, without weakening existing assertions.

## Production boundaries

Existing Site: `appgprj_6aca682dbe0c819190f4d76b28122aec`, public audience,
https://rolecall-private.tealcrow6.chatgpt.site. Preserve that audience. The
original issue #59 private-only text was superseded by the owner's explicit
public-audience instruction. Production ledger branch `sites-publication-state`
is runtime metadata: never reset, prune, delete, or merge it into main.
A ledger read is not permission to clear another execution's lock.

A successful first deployment does not establish automatic future-merge publishing. The existing publisher and saved prompt have now been read back; do not create another publisher or replace its trigger. The available readback still omits trigger filters and connector bindings. Keep #59 open for its remaining acceptance gates.

## Delivery expectations

Review complete diffs and new files. For application changes use Node.js 22,
locked npm ci, npm test and npm run build; run publication helper tests when
relevant. Document visual evidence and real-device limits for #61. Documentation
follow-ups may reuse the unchanged main application checks as AGENTS.md allows.
Get a fresh independent review for substantial changes and resolve findings.
No issue was closed or newly prepared branch merged by this batch.
