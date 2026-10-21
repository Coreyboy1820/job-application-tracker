# Mobile layout audit — issue #61

Audit date: October 20, 2026. Related issue: [#61](https://github.com/Coreyboy1820/job-application-tracker/issues/61).

## Changes and verified causes

The page body had a 360px minimum width, so 320px screens could not fit it. Mobile navigation stayed on one row, statistics positioned values over their labels, and several flex items retained intrinsic content widths. The table's absolutely positioned screen-reader labels could also contribute to page-wide overflow. The table now establishes their positioning container while retaining its own horizontal scrolling.

Responsive overrides allow navigation and actions to wrap, keep search/form controls inside their containers, and wrap long detail text. Mobile form inputs use 16px text, and primary form/navigation actions have at least 44px height. This removes a common focus-zoom trigger without disabling browser zoom. Dialog height follows the dynamic viewport, includes safe-area spacing, and leaves its contents scrollable. Interview content has padding without nesting the form's padding; its Done action remains inside the scroll area. The mobile practice selection bar scrolls with the page instead of sticking over content.

The viewport meta tag remains `width=device-width, initial-scale=1.0`; no zoom restriction, transform scaling, or touch interception was added.

## Browser evidence

Chrome for Testing 153.0.8010.12 headless desktop engine, using CDP viewport emulation and fictional local data. Sizes: 320×900, 360×900, 390×900, 430×900, 844×390 landscape, and 1280×900 desktop. Signed-in fixtures contain four applications, scheduled interviews, saved descriptions with a long unbroken token, extracted skills, and practice questions. No live account or external mutation was used.

Each route was checked after state settled. Every dialog was closed and absence of dialogs asserted before opening the next. Page horizontal overflow was checked against `document.documentElement.clientWidth`; vertical desktop scrollbars account for the difference from `innerWidth`. Dialog bounds and their internal horizontal overflow were checked separately.

| Surface | Verified at all six sizes |
| --- | --- |
| Authentication | Signed-out form fits the page |
| Navigation/header and dashboard statistics | No page-wide horizontal overflow; wrapping mobile navigation |
| Application list | Page fits; intentionally wide data table remains independently scrollable |
| Application detail | Dialog fits viewport and has no internal horizontal overflow |
| Application editor | Dialog fits viewport and has no internal horizontal overflow |
| Interview schedule/editor | Dialog fits viewport and has no internal horizontal overflow |
| Upcoming interviews/calendar actions | Populated schedule fits the page; calendar buttons remain present |
| Skills, application-filtered Skills, company practice | Populated routes fit the page |
| Question selection and prompt preview | Question selected; preview opens and fits the viewport |

At 320×420, the interview editor stays within its 400px available height and its Done action becomes visible after scrolling to the bottom. This verifies a reduced layout viewport, not an actual software keyboard.

The same Applications state at 320×740 measured **718px scroll width before** the responsive override and **305px afterward**, matching the available width after the vertical scrollbar. Desktop remained free of page-wide horizontal overflow. The baseline screenshots disable only the added responsive stylesheet; they are a matched layout comparison, not an earlier production build.

| Screenshot | Before | After |
| --- | --- | --- |
| Applications, 320×740 | [Before](screenshots/issue-61/before-320.png) | [After](screenshots/issue-61/after-320.png) |
| Applications, 1280×900 | [Before](screenshots/issue-61/before-1280.png) | [After](screenshots/issue-61/after-1280.png) |

Additional captures: [application detail](screenshots/issue-61/detail-390.png), [application editor](screenshots/issue-61/application-editor-390.png), [interview editor](screenshots/issue-61/interview-editor-390.png), [prompt preview](screenshots/issue-61/prompt-390.png), and [reduced-height interview editor](screenshots/issue-61/interview-short-height.png).

## Validation and remaining work

Node.js 22.23.3: `npm test` passed all 35 files / 253 tests; `npm run build` passed, including TypeScript. Existing interaction/persistence coverage remains unchanged; browser measurements cover the CSS changes.

The reported pinch-zoom behavior has **not** been reproduced on physical iOS Safari or Android Chrome. Direct hosted versus embedded ChatGPT Sites behavior, minimum browser zoom scale, actual software keyboard, safe-area hardware, OS text enlargement, touch interaction, and mobile browser chrome changes remain unverified. A reduced viewport is not equivalent to those checks. Loading/error/empty states and keyboard navigation were reviewed in source/existing tests, not exhaustively exercised in the visual matrix. Long company/role names and actual browser text enlargement still need targeted device checks. Keep #61 open until the device/hosting checks establish the reported zoom cause and remaining acceptance criteria are verified.

No migration or Supabase deployment is needed. The CSS and component changes need the normal frontend publication step to affect the hosted site.

## Mobile header follow-up

Reviewed the header-only follow-up against the current local HEAD using the `ui-review` skill. Local Chromium checks used fictional application data and no real Supabase connection.

At 320, 360, 390, and 430px, Rolecall occupied the top-left first row. Applications, Interviews, and Skills occupied equal-width columns on the second row, with all icons, counts, and labels visible. All three buttons measured 60px high; their content did not overflow. The document did not exceed the viewport width. Mouse clicks on each navigation button changed the route and updated both its active class and `aria-current`. The 1280px viewport retained the existing vertical desktop sidebar.

Evidence: `screenshots/issue-61/header-after-320.png`, `header-after-390.png`, and `header-after-1280.png`. These show the resulting layout, not a reconstructed before state. No actionable findings. Physical devices, screen readers, and other browser engines remain untested.

The final toolbar refinement was checked with the longest sort option selected. At 320px, search and sort naturally wrapped into separate 243px-wide rows. At 390px, they shared a row with approximately 143px and 163px widths; neither control overflowed its container. Refreshed all three header screenshots after this change. Final validation on Node.js 22.23.3 passed all 277 tests across 35 files and the production build, including TypeScript checks.
