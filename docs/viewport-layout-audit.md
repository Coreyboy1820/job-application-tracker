# Viewport layout audit — issue #71

Used `issue-implementer` and `ui-review` guidance to review the scoped change and exercise a local fictional-data Vite fixture in installed Chromium. The only application change removes `.main-content`'s `max-width:1600px`; sidebar widths, content padding, form/dialog limits, viewport metadata, and the PR #70 mobile header remain unchanged. No actionable findings in the implementation diff.

## Reproduction and hosted evidence

The public hosted HTML at `https://rolecall-private.tealcrow6.chatgpt.site` serves Rolecall directly, with native `width=device-width, initial-scale=1.0` metadata and an application asset `/assets/index-AckPe24Y.css` containing `.main-content{margin-left:236px;padding:0 42px 30px;max-width:1600px}`. This verifies that the deployed application includes the same cap. The authenticated hosted workspace was unavailable for visual reproduction; no claim is made about an authenticated Sites embed or its parent container. The local reproduction isolates an application CSS constraint without an embedding host.

Exact baseline screenshots were captured before editing source, using the same fictional records and viewport dimensions as the after screenshots:

| Viewport | Before content width | Before right gap | After content width | After right gap |
| --- | ---: | ---: | ---: | ---: |
| 1280 | — | — | 1044 | 0 |
| 1440 | — | — | 1204 | 0 |
| 1920 | 1600 | 84 | 1684 | 0 |
| 2560 | 1600 | 724 | 2324 | 0 |

Desktop content starts at x=236. Width measurements include its existing 42px padding on each side. A 15px right gap on views requiring a scrollbar is the native vertical scrollbar, not unused application space.

## Browser coverage

- Resized through 1280, 1440, 1920, 2560, 320, 360, 390, and 430px widths; 844×390 landscape; 1024×768 and 768×768 split-window sizes; then grew back to 2560px. No page-wide horizontal overflow appeared.
- Applications, Interviews, Skills, and company practice were exercised at 390, 844, and 2560px. Wide application tables scroll within their own container (572px container and 1050px table at 844px).
- The mobile header retains the brand above three visible navigation buttons. Previous header interaction coverage remains applicable because its markup and rules are unchanged.
- Status followed by Next interview created the expected two-priority stack without page overflow.
- Application detail, application editor, interview editor, and prompt preview fit at 390px portrait and 844×390 landscape. Landscape editor/interview/prompt dialogs were scrolled to their ends without escaping viewport bounds. Editor/interview heights were 350px and prompt height 358px in the 390px-tall viewport. Application detail keeps its existing internal scrolling region.
- The native viewport declaration permits zoom; no zoom-disabling flags were introduced.

## Screenshots and limits

Matched fictional-data evidence in `screenshots/issue-71/`: `before-2560.png`, `after-2560.png`, `before-390.png`, and `after-390.png` (all 1000px high). Phone screenshots preserve the earlier layout while the desktop pair demonstrates the removed unused strip.

No real account or production mutations were used. Physical phones, iOS Safari, Android browser UI, screen readers, OS text enlargement, and authenticated hosted/embedded layouts were not tested. The lead ran the final source with Node.js 22: all 277 tests passed and the production build passed. The documentation paragraph explaining the fluid workspace, preserved mobile header, and bounded forms matches the implementation.
