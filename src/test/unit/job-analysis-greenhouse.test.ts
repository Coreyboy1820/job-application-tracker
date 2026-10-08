import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createHandler } from '../../../supabase/functions/analyze-job-posting/handler'
import { SKILL_EXTRACTION_VERSION } from '../../../supabase/functions/analyze-job-posting/analysis-version'

const id = '12345678-1234-1234-1234-123456789abc'
const url = 'https://www.zipline.com/open-roles/7989547003?gh_jid=7989547003'
const endpoint = 'https://boards-api.greenhouse.io/v1/boards/flyzipline/jobs/7989547003?content=true'
const description = 'Develop embedded firmware in C++ and verify safety-critical avionics & reliable flight controls. '.repeat(8)
const embed = '<main><div class="styles-module__greenhouse-embed"></div></main>'
const questions = ['Explain a firmware failure.', 'How do you test avionics?', 'Describe a debugging strategy.']
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json; charset=utf-8' } })
const html = (body = embed) => new Response(body, { headers: { 'Content-Type': 'text/html' } })
const provider = (updates: Record<string, unknown> = {}) => json({ id: 7989547003, absolute_url: url, content: `&lt;div&gt;&lt;h2&gt;Embedded Firmware Engineer&lt;/h2&gt;&lt;p&gt;${description.replace(/&/g, '&amp;')}&lt;/p&gt;&lt;/div&gt;`, ...updates })
const model = () => json({ candidates: [{ content: { parts: [{ text: JSON.stringify({ skills: [{ name: 'C++', category: 'technical', importance: 'required', evidence: 'C++', individualSkills: [] }] }) }] } }] })
let application: Record<string, unknown>
let network: ReturnType<typeof vi.fn>
let dns: ReturnType<typeof vi.fn>
let client: { loadApplication: ReturnType<typeof vi.fn>; readQuestions: ReturnType<typeof vi.fn>; storeQuestions: ReturnType<typeof vi.fn>; saveApplication: ReturnType<typeof vi.fn> }
function serve() {
  const env: Record<string, string> = { SUPABASE_URL: 'https://project.example.com', SUPABASE_ANON_KEY: 'public', GEMINI_API_KEY: 'secret' }
  return createHandler({ env: (key) => env[key], resolveDns: dns, fetch: network as typeof fetch, createClient: () => client })(new Request('https://function.example.com', { method: 'POST', headers: { Authorization: 'Bearer user', 'Content-Type': 'application/json' }, body: JSON.stringify({ applicationId: id }) }))
}
beforeEach(() => {
  application = { id, company: 'Zipline', role: 'Engineer', url, skills: [] }
  client = { loadApplication: vi.fn().mockImplementation(async () => application), readQuestions: vi.fn().mockResolvedValue([{ skill_key: 'c++', questions }]), storeQuestions: vi.fn(), saveApplication: vi.fn().mockResolvedValue(undefined) }
  dns = vi.fn().mockImplementation(async (_host, type) => type === 'A' ? ['93.184.216.34'] : [])
  network = vi.fn().mockResolvedValueOnce(html()).mockResolvedValueOnce(provider()).mockResolvedValue(model())
})
afterEach(() => vi.useRealTimers())

describe('verified Zipline Greenhouse adapter', () => {
  it('retrieves real job content, excludes navigation, and caches against the saved employer URL', async () => {
    network.mockReset().mockResolvedValueOnce(html(`<nav>${'Browse all careers '.repeat(60)}</nav>${embed}`)).mockResolvedValueOnce(provider()).mockResolvedValue(model())
    const response = await serve()
    expect(response.status).toBe(200)
    const result = await response.json()
    expect(result.jobDescription).toContain(description.trim())
    expect(result.jobDescription).toContain('Embedded Firmware Engineer')
    expect(result.jobDescription).not.toMatch(/<p>|&lt;|Browse all careers/)
    expect(result.sourceUrl).toBe(url)
    expect(network.mock.calls[1][0].toString()).toBe(endpoint)
    expect(dns).toHaveBeenCalledWith('boards-api.greenhouse.io', 'A')
    const updates = client.saveApplication.mock.calls[0][1]
    expect(updates.skills_source_url).toBe(url)
    application = { ...application, ...updates }
    network.mockClear()
    expect((await serve()).status).toBe(200)
    expect(network).not.toHaveBeenCalled()
  })
  it('allows a matching employer path without gh_jid and retains its exact saved URL', async () => {
    application.url = url.split('?')[0]
    expect((await serve()).status).toBe(200)
    expect(client.saveApplication.mock.calls[0][1].skills_source_url).toBe(application.url)
  })
  it('keeps normal HTML and structured JobPosting extraction without contacting the provider', async () => {
    network.mockReset().mockResolvedValueOnce(html(`<script type="application/ld+json">${JSON.stringify({ '@type': 'JobPosting', description: `<p>${description}</p>` })}</script>${embed}`)).mockResolvedValue(model())
    expect((await serve()).status).toBe(200)
    expect(network).toHaveBeenCalledTimes(2)
    expect(network.mock.calls[1][0].toString()).not.toContain('greenhouse')
  })
  it('preserves readable server-rendered content beside another employer’s application embed', async () => {
    application.url = 'https://employer.example/job'
    network.mockReset().mockResolvedValueOnce(html(`<main><h1>Firmware Engineer</h1><p>${description}</p><div class="greenhouse-embed"></div></main>`)).mockResolvedValue(model())
    const response = await serve()
    expect(response.status).toBe(200)
    expect((await response.json()).jobDescription).toContain(description.trim())
    expect(network).toHaveBeenCalledTimes(2)
  })
  it('falls back when Zipline structured data contains only a short placeholder', async () => {
    network.mockReset().mockResolvedValueOnce(html(`<script type="application/ld+json">${JSON.stringify({ '@type': 'JobPosting', description: '<p>Apply today</p>' })}</script>${embed}`)).mockResolvedValueOnce(provider()).mockResolvedValue(model())
    expect((await serve()).status).toBe(200)
    expect(network.mock.calls[1][0].toString()).toBe(endpoint)
  })
  it('reuses a saved employer description for an extraction-version upgrade', async () => {
    application = { ...application, skills_source_url: url, skills_analyzed_at: '2026-10-07T00:00:00Z', interview_questions_version: 1, skill_extraction_version: SKILL_EXTRACTION_VERSION - 1, job_description: description }
    network.mockReset().mockResolvedValue(model())
    expect((await serve()).status).toBe(200)
    expect(network).toHaveBeenCalledTimes(1)
  })
  it.each(['https://www.zipline.com/open-roles/abc?gh_jid=7989547003', 'https://www.zipline.com/open-roles/7989547003?gh_jid=42', `${url}&gh_jid=7989547003`, 'https://www.zipline.com/open-roles/0', 'https://www.zipline.com:8443/open-roles/7989547003'])('rejects malformed employer identity %s before provider requests', async (posting) => {
    application.url = posting
    expect((await serve()).status).not.toBe(200)
    expect(network).toHaveBeenCalledTimes(1)
    expect(client.saveApplication).not.toHaveBeenCalled()
  })
  it.each([{ id: 42 }, { absolute_url: 'https://attacker.example/open-roles/7989547003' }, { absolute_url: 'https://www.zipline.com/open-roles/42' }, { absolute_url: 'https://user@www.zipline.com/open-roles/7989547003' }, { content: null }, { content: '<p>Closed</p>' }])('rejects a mismatched or incomplete provider posting %j', async (updates) => {
    network.mockReset().mockResolvedValueOnce(html()).mockResolvedValue(provider(updates))
    expect((await serve()).status).not.toBe(200)
    expect(client.saveApplication).not.toHaveBeenCalled()
    expect(network).toHaveBeenCalledTimes(2)
  })
  it.each([404, 410, 429, 403, 500])('returns an actionable error for provider HTTP %i without AI analysis', async (status) => {
    network.mockReset().mockResolvedValueOnce(html()).mockResolvedValue(json({}, status))
    const response = await serve()
    expect(response.status).toBe(502)
    expect((await response.json()).error).toMatch(/Greenhouse|current openings/)
    expect(network).toHaveBeenCalledTimes(2)
    expect(client.saveApplication).not.toHaveBeenCalled()
  })
  it.each([new Response('invalid', { headers: { 'Content-Type': 'application/json' } }), json([]), new Response('login page', { headers: { 'Content-Type': 'text/html' } })])('rejects invalid provider JSON or content type', async (response) => {
    network.mockReset().mockResolvedValueOnce(html()).mockResolvedValue(response)
    expect((await serve()).status).toBe(502)
    expect(client.saveApplication).not.toHaveBeenCalled()
  })
  it('does not derive boards or fetch endpoints from untrusted embed content', async () => {
    application.url = 'https://employer.example/role?gh_jid=7989547003'
    network.mockReset().mockResolvedValueOnce(html(`<main><nav>${'Generic careers navigation '.repeat(50)}</nav><iframe src="https://localhost/private?for=flyzipline"></iframe><script>fetch('https://attacker.example/jobs')</script><div class="greenhouse-embed"></div></main>`))
    expect((await serve()).status).toBe(502)
    expect(network).toHaveBeenCalledTimes(1)
    expect(client.saveApplication).not.toHaveBeenCalled()
  })
  it('rejects private provider DNS before sending a provider request', async () => {
    dns.mockImplementation(async (host, type) => type === 'A' ? [host === 'boards-api.greenhouse.io' ? '10.0.0.1' : '93.184.216.34'] : [])
    expect((await serve()).status).toBe(422)
    expect(network).toHaveBeenCalledTimes(1)
  })
  it.each(['https://localhost/secret', 'http://boards-api.greenhouse.io/private', 'https://attacker.example/jobs'])('rejects unsafe or unsupported provider redirects %s', async (location) => {
    network.mockReset().mockResolvedValueOnce(html()).mockResolvedValue(new Response(null, { status: 302, headers: { Location: location } }))
    expect((await serve()).status).not.toBe(200)
    expect(network).toHaveBeenCalledTimes(2)
    expect(client.saveApplication).not.toHaveBeenCalled()
  })
  it('limits same-provider redirects and validates every target', async () => {
    network.mockReset().mockResolvedValueOnce(html()).mockResolvedValue(new Response(null, { status: 302, headers: { Location: '/again' } }))
    expect((await serve()).status).toBe(502)
    expect(network).toHaveBeenCalledTimes(5)
    expect(dns.mock.calls.filter(([host]) => host === 'boards-api.greenhouse.io')).toHaveLength(8)
  })
  it('limits provider response bytes before parsing', async () => {
    network.mockReset().mockResolvedValueOnce(html()).mockResolvedValue(new Response('x'.repeat(2_000_001), { headers: { 'Content-Type': 'application/json' } }))
    expect((await serve()).status).toBe(502)
    expect(client.saveApplication).not.toHaveBeenCalled()
  })
  it('shares the twelve-second deadline across employer and provider requests', async () => {
    vi.useFakeTimers()
    network.mockReset().mockImplementationOnce(async () => { await new Promise((resolve) => setTimeout(resolve, 8_000)); return html() }).mockImplementation((_url, options) => new Promise((_resolve, reject) => options.signal.addEventListener('abort', () => reject(new Error('Fetch aborted')))))
    const pending = serve()
    await vi.advanceTimersByTimeAsync(12_000)
    expect((await pending).status).toBe(502)
    expect(client.saveApplication).not.toHaveBeenCalled()
  })
  it('reports provider network failures without saving partial analysis', async () => {
    network.mockReset().mockResolvedValueOnce(html()).mockRejectedValue(new Error('Network unavailable'))
    expect((await serve()).status).toBe(502)
    expect(client.saveApplication).not.toHaveBeenCalled()
  })
})
