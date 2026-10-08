# Employer-hosted Greenhouse postings

Rolecall reads public HTML and `JobPosting` JSON-LD without running page scripts. Some employer pages contain an empty Greenhouse embed instead of a job description. The analyzer now supports a verified fallback for Zipline job detail links on `www.zipline.com` and `zipline.com`, with a numeric `/open-roles/<job-id>` path. An optional `gh_jid` must occur at most once and match the path ID.

## Verified provider mapping

On October 7, 2026, Zipline's supplied [job detail page](https://www.zipline.com/open-roles/7989547003?gh_jid=7989547003) contained an empty `greenhouse-embed` element. The employer's served JavaScript constructed the embed URL `https://boards.greenhouse.io/embed/job_app?for=flyzipline&token=${jobId}`. The [public Greenhouse response](https://boards-api.greenhouse.io/v1/boards/flyzipline/jobs/7989547003?content=true) returned job ID `7989547003`, title **Embedded Firmware Engineer**, a nonempty encoded HTML description, and an `absolute_url` matching the employer link. This verifies the `flyzipline` board directly from the employer integration and provider response, rather than from the company name or `gh_jid` alone. See Greenhouse's [Job Board API documentation](https://developers.greenhouse.io/job-board.html).

The implementation keeps this board mapping explicit. It does not fetch or execute scripts at runtime, discover arbitrary API URLs in page content, or claim support for every employer using Greenhouse. Adding another employer requires independently verifying its board and link format and adding corresponding validation/tests.

## Extraction and safety

- Normal HTML/JSON-LD postings retain their existing extraction path. A supported embed without readable structured job content uses the fixed public Job Board API endpoint with `content=true`.
- The response must be JSON with the requested job ID, matching public HTTPS Zipline detail URL, and readable description. Encoded provider HTML is decoded and stripped of markup before AI analysis; generic site navigation is excluded.
- Employer and provider requests share a twelve-second deadline. Each destination and redirect must pass existing public HTTPS/DNS checks; provider redirects additionally stay on `boards-api.greenhouse.io`. Each response is limited to two million bytes, with at most three redirects, and extracted text retains the existing 28,000-character cap.
- Unsupported Greenhouse embeds without readable server-rendered content, malformed/mismatched IDs, missing/closed postings, rate limits, bad responses, unsafe destinations, and network failures stop analysis rather than saving partial results. A direct readable public posting link remains the fallback for unsupported employers.
- The saved employer URL remains `skills_source_url`. Opening a current analyzed application reuses its stored description, skills, and question cache. No schema, extraction-version, ownership/RLS, credential, or client-secret change is required.

## Validation and deployment

Behavior tests cover extraction, encoded descriptions, identity validation, stored-source caching, normal extraction, provider failures, unsupported embeds, DNS/redirect controls, byte limits, and a shared timeout. Tests inject network/model responses. The public provider mapping above was also verified live: the actual request handler fetched the employer page and provider response, extracted 6,204 characters containing the firmware requirements, and retained the saved employer URL. Only the model/database boundaries were simulated for this check; no Gemini call or real account mutation occurred.

After merging, redeploy the updated Edge Function:

```sh
supabase functions deploy analyze-job-posting
```

No migration or new secret is needed. Existing failed unanalyzed applications can be reopened after deployment to retry extraction.
