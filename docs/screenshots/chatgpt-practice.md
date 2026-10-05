Issue #48 screenshots use fictional Acme fixtures with the production Skills and
practice preview components. No account data is shown.

- `chatgpt-question-selection.png`: questions selected within one application.
- `chatgpt-prompt-desktop.png`: editable prompt and separate Copy/Open actions.
- `chatgpt-prompt-mobile.png`: preview at a narrow viewport.

Firefox over local HTTPS verified native modal focus, explicit clipboard copying,
payload-free ChatGPT opening in a separate tab, Escape/focus return, and company
selection isolation. The preview remains available for manual-copy fallback.

Chromium 153.0.8010.12 also verified keyboard selection, native modal focus,
Escape/focus return, denied-clipboard fallback, and permission-granted clipboard
contents. The mobile screenshot uses a 390 × 844 viewport; the dialog has no
horizontal overflow. Firefox screenshots use a 1280-pixel desktop viewport.

The `chatgpt-sticky-application-*` and `chatgpt-sticky-company-*` screenshots
show the prompt controls pinned to the viewport top while scrolling fictional
practice content at 1280- and 390-pixel widths. Chromium verified the bar remains
visible and can open/cancel the preview in all four cases.
