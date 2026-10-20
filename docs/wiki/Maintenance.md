# Maintaining the documentation

The source repository keeps reviewable wiki drafts under `docs/wiki/`; the published GitHub wiki is a **separate Git repository**, `https://github.com/Coreyboy1820/job-application-tracker.wiki.git`. A normal application PR does not update the published wiki by itself.

Edit the Markdown pages and `assets/` together, have the changes reviewed, then copy the contents of `docs/wiki/` into a checkout of the wiki repository and commit/push there. The staged pages use `.md` links so navigation also works in the source repository; convert local page links to canonical extensionless wiki slugs in the copied wiki checkout using the command below. Preserve wiki history; do not rebase or force-push. `_Sidebar.md` supplies navigation and `Home.md` is the entry page. Enable Wiki in repository settings and initialize Home in GitHub if the wiki repository has not yet been created. Publishing requires repository wiki write access.

Update documentation when user behavior, route/state ownership, dependency versions, schema/RLS, server secrets, setup/test/release commands or external sharing changes. Check the merged implementation, not only issue/PR descriptions. Keep contributor decisions/research in `docs/architecture.md`, `docs/test-coverage.md`, and `docs/chatgpt-interview-handoff.md`; wiki pages link to those stable main-branch sources rather than replacing them.

## Current publication restriction

On October 19, 2026, authenticated SSH `git ls-remote` against the wiki repository still returned **Repository not found**. This cannot distinguish a disabled/uninitialized wiki from an account restriction; no settings were changed in this check.

Earlier, on October 5, 2026, administrator-authenticated `gh repo edit --enable-wiki` and an explicit repository API update with `has_wiki: true` returned/rechecked `has_wiki: false`. The wiki Git remote returned repository-not-found. Thus the pages cannot currently be published or checked in GitHub's rendered wiki. These are the observed restrictions, not a claim about the account's subscription (the account-plan field was unavailable).

[GitHub documents](https://docs.github.com/en/communities/documenting-your-project-with-wikis/about-wikis) that private-repository wikis require GitHub Pro, Team, or Enterprise, while public-repository wikis are available on Free plans. A repository/account administrator should confirm eligibility, resolve that restriction, and enable Wiki without changing repository visibility or account billing as part of this documentation task. Then initialize Home, push these pages/assets, verify rendered links/images/Mermaid/sidebar, and change README to the live wiki entry point.

## Copying pages for publication

After Wiki is enabled and Home initialized, clone the wiki repository outside the application checkout. From the application repository root, this example copies into `/tmp/rolecall-wiki-publish` and converts only links whose target is a staged page filename. It preserves anchors, external links, image paths, and the original `docs/wiki/` drafts. If that checkout path already exists, use it only when it is your intended wiki checkout.

```sh
git clone https://github.com/Coreyboy1820/job-application-tracker.wiki.git /tmp/rolecall-wiki-publish
python3 - <<'PYCODE'
from pathlib import Path
import re
import shutil

source = Path('docs/wiki')
target = Path('/tmp/rolecall-wiki-publish')
page_names = {page.name for page in source.glob('*.md')}
for page in source.glob('*.md'):
    def wiki_link(match):
        destination = match.group(1)
        filename, separator, anchor = destination.partition('#')
        if filename in page_names:
            destination = filename[:-3] + (separator + anchor if separator else '')
        return '](' + destination + ')'
    content = re.sub(r'\]\(([^)]+)\)', wiki_link, page.read_text())
    (target / page.name).write_text(content)
shutil.copytree(source / 'assets', target / 'assets', dirs_exist_ok=True)
PYCODE
```

Review the wiki checkout diff, commit and push from that checkout, then inspect Home, sidebar, all page links/anchors, images, and Mermaid on GitHub. These commands copy files only; they do not commit or publish automatically. Do not run the conversion on repository drafts, which need `.md` links for browsing in GitHub's source view.

## Screenshots and diagrams

Assets are committed inside the wiki repository, so image references use stable relative `assets/<name>.png` paths rather than branch URLs or local paths. Existing images were captured from production components with fictional Acme/Globex fixtures; no credentials/account data were used. Desktop captures use 1280-pixel widths and mobile captures use 390-pixel widths. Reproduce the current production screen with fictional fixtures, verify responsive layout and interactions, and replace the relevant image with a descriptive filename and alt text. Do not publish a temporary fixture harness or real account screenshot.

Interview images demonstrate agenda/type filters, Skills demonstrates application scope and priority, and practice images demonstrate sticky controls and editable prompt previews. They represent selected main workflows rather than every dialog. Knowledge-control and combined-selection images now reuse sanitized production-component captures from issues #51 and #56. Application-list images predate #63 status ordering and may show Interested: refresh them before final wiki acceptance. The immediate-save interview editor also needs new desktop/mobile captures. Application-list and sign-in captures are created with a fictional in-memory database/auth fixture; no network account data is used.

Mermaid diagrams live in page code blocks. Keep labels short and state when diagram entities are conceptual (embedded JSON is not a table). Verify rendered diagrams and links in GitHub after publication. If a renderer does not support Mermaid, provide a static exported diagram alongside the source.

## Documentation verification

Before publishing, check sidebar/page links, anchored links, all asset paths, stable source links, fenced code blocks, version tables against the lockfile, and setup commands against package scripts/current CLI prerequisites. Run repository tests/build for repository changes as required by AGENTS.md. Wiki rendering/navigation checks complement these commands; neither proves the other.

Describe remaining environment-specific checks accurately. Provider pricing/quotas/model availability should point users to their current provider settings rather than make fixed promises. Keep placeholders in examples and inspect new screenshots/files for secrets before committing.

[Home](Home.md) · [Architecture](Architecture.md) · [Testing and deployment](Testing-and-deployment.md)
