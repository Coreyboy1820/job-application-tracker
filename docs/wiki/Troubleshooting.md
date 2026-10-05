# Troubleshooting

| Symptom | Check and recovery |
| --- | --- |
| Setup-required screen | Set both browser variables in `.env.local`, restart Vite; production needs a rebuild with correct values. |
| Sign-in rejected or signup awaits confirmation | Check project URL/key, email/password and confirmation email. Configure Auth site/redirect URLs for this hostname. |
| Records fail to load/save | Inspect displayed error, session validity, target project's applied migrations and RLS. Retry; do not weaken ownership policies. |
| Skills missing or outdated | Open details with a saved posting URL. Analysis must match the current URL; legacy versions refresh on open. Show all skills clears application scope. |
| Analysis says not configured | Set server `GEMINI_API_KEY`, ensure the function is deployed to the same Supabase project as the browser. |
| Analysis cannot read posting | Use a public HTTPS page. Login requirements, client-side rendering, bot restrictions, unsafe destinations and download limits can block it. Update URL and retry. |
| Gemini request fails | Check provider model access, current quota and server configuration. Retry transient errors; do not put the API key in browser settings. |
| Knowledge level reverts | A save failed or another save is pending. Check the error and retry when enabled. Ratings are per application; company changes update associated roles. |
| Copy prompt fails | Clipboard availability/permission varies with secure context/browser settings. Select preview text and copy manually. Opening ChatGPT does not copy or send it. |
| Preview does not reflect context changes | Use Update preview; Replace edited preview explicitly replaces manual edits. Check the batch number for large selections. |
| Calendar window blocked | Allow popups for the app and retry. Review existing Google events to avoid duplicates. Manual event creation remains available. |
| Calendar time differs | Interview times use the device zone. Verify the draft's zone/time before saving. Rolecall cannot synchronize later edits/deletes. |
| Repeated legacy import offer | Check import errors/browser storage availability. Marker is per account and written after successful import; source records are intentionally retained. |
| Database test cannot start | Install Docker or use local Supabase plus psql, ensure disposable database migrations are applied, and use a local DB URL. |

Report the screen/action, browser, reproducible sanitized example, and relevant error text in an issue. Never include passwords, session tokens, private meeting links, real candidate records or secret keys. Logs/network traces should be sanitized before sharing.

[Getting started](Getting-started.md) · [Testing](Testing-and-deployment.md) · [Data boundaries](Data-model-and-flows.md#external-data-boundaries)
