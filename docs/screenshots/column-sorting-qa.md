# Column sorting browser check

Reviewed the complete implementation diff with the `ui-review` skill and exercised a local Vite fixture using installed Chromium. All records, account identity, and interview dates in the screenshots are fictional. No real Supabase connection was used.

- Mouse activation toggled Company ascending/descending and Next interview earliest/latest, synchronized the dropdown, and updated the single active `aria-sort` header.
- Keyboard Enter activated the focused Company header.
- Upcoming interview dates rendered with date and time; applications without upcoming dates remained last in either order. The fixture included a past interview and multiple future dates.
- At 390px, the longest dropdown option fit within the toolbar. The 1050px table scrolled inside its 358px container; the mobile screenshot shows the Next interview column after horizontal scrolling.
- Desktop screenshot: `column-sorting-desktop.png` (1280 × 1000). Mobile screenshot: `column-sorting-mobile.png` (390 × 844).

No actionable findings in the feature diff. The existing mobile navigation can extend beyond 390px; this check did not change or resolve that separate layout issue. Physical devices, screen readers, and other browser engines were not tested. This review did not perform a full contrast audit.
