# Application overview

![Email/password sign-in on desktop](assets/signin-desktop.png)

## Applications

Create a record with company, role, location, application date, posting URL, notes, and next step. Statuses are **Rejected**, **Applied**, **Interviewing**, and **Offer**. Default status ordering follows that sequence and preserves saved order within a status. Older Interested records normalize to Applied. Search company/role/location, filter by status, and sort by status, newest, oldest, or next interview. Records with no future interview come last in next-interview ordering. Open the company/role to view details; row actions edit, delete, or manage interviews.

An **application** is one role at one company. Two applications at the same company remain separate records. A **skill** is extracted from that application's saved posting. Its knowledge level belongs to that application skill, rather than globally to the skill name.

![Desktop application list with fictional records](assets/applications-desktop.png)

![Mobile application list with fictional records](assets/applications-mobile.png)

## Interviews and Google Calendar

Save multiple rounds on an application. Adding, updating, or deleting a round saves immediately; closing the editor needs no second save. A failed operation keeps the saved schedule unchanged and displays an error so you can retry. Interview date/time uses the device's local time zone; choose the correct zone when entering it. Duration defaults to 60 minutes. Choose a preset type or **Other** for custom text. The Interviews page lists upcoming rounds chronologically, allows multi-type filtering, and opens the related application.

![Desktop interview agenda with type filters](assets/interview-filters-desktop.png)

![Mobile interview agenda with wrapped filters](assets/interview-filters-mobile.png)

In the interview editor, **Add interview**, **Update interview**, and **Delete** save directly to Rolecall. The editor stays open for more rounds; **Done** leaves the editor. Fields remain drafts until Add/Update is submitted. Saving disables editing and closing temporarily; errors preserve drafts or the existing interview for retry. If another device changed the schedule, Rolecall refreshes the list and asks you to review and retry rather than overwriting those changes.

![Desktop immediate-save interview editor](assets/interview-direct-save-desktop.png)

![Mobile immediate-save interview editor](assets/interview-direct-save-mobile.png)

![Mobile interview editor actions remain reachable](assets/interview-direct-save-mobile-actions.png)

**Add to Google Calendar** first explains sharing, then opens a prefilled Google event draft after you continue. The draft URL also includes application and interview IDs as a `Rolecall reference: application-id/interview-id` in event details, alongside the scheduling fields described in the sharing notice. Review and save the draft in Google. Rolecall marks that the draft was opened, not that an event exists. Reopening warns about duplicates; independently created events and stale device state cannot be detected. Changes/deletes in Rolecall do not synchronize to Google. See [external data boundaries](Data-model-and-flows.md#external-data-boundaries).

## Skills and company practice

Open application details with a public HTTPS posting link to run analysis. The server extracts skills and brief evidence quotes, generates three general practice questions per skill, and saves the result. **View skills** opens only that application's skills; **Show all skills** returns to the overall library. Missing/deleted applications show a recovery message.

Choose **Low**, **Medium**, **High**, or **No study needed** using the knowledge control at the bottom right of each skill card. Low is the default; lowest knowledge comes first, and no-study skills remain crossed out at the end. Application sorting and skill ordering are independent. Company practice combines skills/questions across roles at the selected company; changing a company skill's level updates its associated roles. A skill is excluded from active study only when all its associated roles are marked no-study.

![Desktop Skills with knowledge controls below each card](assets/knowledge-flags-desktop.png)

![Mobile Skills with knowledge controls below each card](assets/knowledge-flags-mobile.png)

![Company practice on desktop with fictional records](assets/company-practice-desktop.png)

![Company practice on mobile with fictional records](assets/company-practice-mobile.png)

## Selected-question ChatGPT practice

Open questions in Skills or company practice, select questions across skills, and choose **Prepare ChatGPT prompt** in the bar that remains visible while scrolling the practice section. The overall Skills library combines selections across applications and companies in one preparation bar. Application-filtered practice stays scoped to that application; company practice stays scoped to that company. Filters and collapsed cards can hide selected questions without removing them: the bar counts hidden selections and includes them in the preview.

![Selections across applications in one desktop preparation bar](assets/shared-skills-selection-desktop.png)

![Selections across applications on mobile](assets/shared-skills-selection-mobile.png)

![Company practice sticky controls on mobile](assets/chatgpt-sticky-company-390.png)

Review/edit the preview. Company and role context are optional and unchecked initially. Change context and choose **Update preview**, or explicitly **Replace edited preview** to regenerate edited text. Exact duplicate question text is combined; skill labels are retained. Large selections become numbered batches targeting 6,000 characters without truncating questions. This is a usability target, not a ChatGPT limit.

Use **Copy prompt**, then **Open ChatGPT**, paste, review, and send there. Copying and opening are separate; the link contains no prompt. If clipboard access fails, the preview supports manual copying. Cancel preserves selection, while **Clear selection** removes it. Selections and previews stay in memory and are not persisted or logged.

![Combined editable desktop prompt preview](assets/shared-skills-prompt-desktop.png)

![Combined mobile prompt preview](assets/shared-skills-prompt-mobile.png)

## Legacy records

If this browser has records from earlier local-storage or IndexedDB versions, sign-in offers an import into the account. The original browser copy is retained; a per-account marker prevents repeated offers after success. Invalid records and existing records are handled by the compatibility helpers. See [data flows](Data-model-and-flows.md#legacy-import).
