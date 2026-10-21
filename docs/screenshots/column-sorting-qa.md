# Column sorting browser check

Reviewed the complete multi-column extension diff and preceding column-sorting changes with the `ui-review` skill. Exercised a local Vite fixture using installed Chromium. All records, account identity, and dates shown are fictional; no real Supabase connection was used.

- Clicking Status first and Next interview second produced priorities 1 and 2. Within the Applied group, the upcoming interview sorted before the unscheduled application.
- Toggling Status reversed its direction without changing priority order. Removing Status promoted Next interview to primary. Clear sorts restored the implicit default status order.
- The dropdown displayed Multiple columns for a stack. Choosing a scalar option replaced the stack, including choosing Status when Status was already primary.
- Keyboard Enter activated a focused header and appended it to the stack. Only the primary header exposed `aria-sort`; header descriptions included each active priority and direction.
- At 390px, priority chips wrapped inside the 358px summary container. The longest dropdown option fit within the toolbar. The 1050px table scrolled inside its container; the mobile screenshot shows Status and Next interview after horizontal scrolling.
- Desktop screenshot: `column-sorting-desktop.png` (1280 × 1000). Mobile screenshot: `column-sorting-mobile.png` (390 × 844). Both show Status priority 1 and Next interview priority 2.

No actionable findings in the feature diff. The existing mobile navigation can extend beyond 390px; this check did not change or resolve that separate layout issue. Physical devices, screen readers, and other browser engines were not tested. This review did not perform a full contrast audit.
