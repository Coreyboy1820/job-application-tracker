import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createHandler, type HandlerDependencies } from '../../../supabase/functions/analyze-job-posting/handler'
import { SKILL_EXTRACTION_VERSION } from '../../../supabase/functions/analyze-job-posting/analysis-version'

const id = '12345678-1234-1234-1234-123456789abc'
const questions = ['How would you diagnose a TypeScript type error?', 'How do you model safe data boundaries?', 'How would you refactor a generic API?']
const application = { id, company: 'Acme', role: 'Engineer', url: 'https://jobs.example.com/role', skills: [] }
const html = `<main>${'Build production software with TypeScript and maintain reliable services. '.repeat(12)}</main>`
let env: Record<string, string>
let client: { loadApplication: ReturnType<typeof vi.fn>; readQuestions: ReturnType<typeof vi.fn>; storeQuestions: ReturnType<typeof vi.fn>; saveApplication: ReturnType<typeof vi.fn> }
let network: ReturnType<typeof vi.fn>
let dns: ReturnType<typeof vi.fn<HandlerDependencies['resolveDns']>>
let factory: ReturnType<typeof vi.fn<HandlerDependencies['createClient']>>
function handler() { return createHandler({ env: (name) => env[name], resolveDns: dns, fetch: network as typeof fetch, createClient: factory }) }
function request(body: unknown = { applicationId: id }, authorization: string | null = 'Bearer user-token') {
  return new Request('https://function.example.com', { method: 'POST', headers: { ...(authorization ? { Authorization: authorization } : {}), 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
}
function modelResponse(value: unknown) { return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(value) }] } }] }), { headers: { 'Content-Type': 'application/json' } }) }
beforeEach(() => {
  env = { SUPABASE_URL: 'https://project.example.com', SUPABASE_ANON_KEY: 'public-key', GEMINI_API_KEY: 'server-secret' }
  client = { loadApplication: vi.fn().mockResolvedValue(application), readQuestions: vi.fn().mockResolvedValue([{ skill_key: 'typescript', questions }]), storeQuestions: vi.fn().mockResolvedValue(undefined), saveApplication: vi.fn().mockResolvedValue(undefined) }
  factory = vi.fn().mockReturnValue(client)
  dns = vi.fn().mockImplementation(async (_host, type) => type === 'A' ? ['93.184.216.34'] : [])
  network = vi.fn().mockResolvedValueOnce(new Response(html, { headers: { 'Content-Type': 'text/html' } })).mockResolvedValue(modelResponse({ skills: [{ name: 'TypeScript', category: 'technical', importance: 'required', evidence: 'TypeScript', individualSkills: [] }] }))
})
afterEach(() => vi.useRealTimers())
describe('job analysis request boundary', () => {
  it('allows CORS preflight and rejects unsupported methods before accessing data', async () => {
    const serve = handler()
    expect((await serve(new Request('https://function.example.com', { method: 'OPTIONS' }))).headers.get('Access-Control-Allow-Origin')).toBe('*')
    expect((await serve(new Request('https://function.example.com'))).status).toBe(405)
    expect(factory).not.toHaveBeenCalled()
  })
  it('requires authorization and configured public credentials', async () => {
    expect((await handler()(request(undefined, null))).status).toBe(401)
    delete env.SUPABASE_ANON_KEY
    env.SUPABASE_PUBLISHABLE_KEYS = '{broken'
    expect((await handler()(request())).status).toBe(401)
    expect(factory).not.toHaveBeenCalled()
  })
  it.each([null, [], {}, { applicationId: 1 }, { applicationId: 'invalid' }, { applicationId: '-'.repeat(36) }])('rejects invalid application input %j without accessing data', async (body) => {
    expect((await handler()(request(body))).status).toBe(400)
    expect(factory).not.toHaveBeenCalled()
  })
  it('rejects malformed JSON without opening a database client', async () => {
    const invalid = new Request('https://function.example.com', { method: 'POST', headers: { Authorization: 'Bearer user-token' }, body: '{broken' })
    expect((await handler()(invalid)).status).toBe(400)
    expect(factory).not.toHaveBeenCalled()
  })
  it('does not fetch a posting for an inaccessible application', async () => {
    client.loadApplication.mockResolvedValue(null)
    expect((await handler()(request())).status).toBe(404)
    expect(factory).toHaveBeenCalledWith(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, 'Bearer user-token')
    expect(network).not.toHaveBeenCalled()
  })
  it('reuses completed analysis without external requests or saves', async () => {
    client.loadApplication.mockResolvedValue({ ...application, skills_source_url: application.url, skills_analyzed_at: '2026-10-05T00:00:00Z', interview_questions_version: 1, skill_extraction_version: SKILL_EXTRACTION_VERSION, job_description: 'Saved text' })
    const response = await handler()(request())
    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({ cached: true, jobDescription: 'Saved text' })
    expect(network).not.toHaveBeenCalled()
    expect(client.saveApplication).not.toHaveBeenCalled()
  })
  it('uses cached questions, saves analysis, and keeps server secrets out of the result', async () => {
    const response = await handler()(request())
    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({ skills: [{ name: 'TypeScript', interviewQuestions: questions }] })
    expect(client.saveApplication).toHaveBeenCalledWith(id, expect.objectContaining({ skill_extraction_version: SKILL_EXTRACTION_VERSION }))
    expect(network).toHaveBeenCalledTimes(2)
    expect(client.storeQuestions).not.toHaveBeenCalled()
  })
  it('generates missing questions, persists them, and prefers the winning stored cache entry', async () => {
    const winning = questions.map((question) => `Stored: ${question}`)
    client.readQuestions.mockResolvedValueOnce([]).mockResolvedValueOnce([{ skill_key: 'typescript', questions: winning }])
    network.mockReset()
      .mockResolvedValueOnce(new Response(html, { headers: { 'Content-Type': 'text/html' } }))
      .mockResolvedValueOnce(modelResponse({ skills: [{ name: 'TypeScript', category: 'technical', importance: 'required', evidence: 'TypeScript', individualSkills: [] }] }))
      .mockResolvedValueOnce(modelResponse({ skills: [{ skillKey: 'typescript', questions }] }))
    const response = await handler()(request())
    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({ skills: [{ interviewQuestions: winning }] })
    expect(client.storeQuestions).toHaveBeenCalledWith([{ skill_key: 'typescript', skill_name: 'TypeScript', questions }])
    expect(network).toHaveBeenCalledTimes(3)
  })
  it('does not save application analysis when generated question cache persistence fails', async () => {
    client.readQuestions.mockResolvedValue([])
    client.storeQuestions.mockRejectedValue(new Error('Interview questions were generated, but could not be saved for reuse. Please retry.'))
    network.mockReset()
      .mockResolvedValueOnce(new Response(html, { headers: { 'Content-Type': 'text/html' } }))
      .mockResolvedValueOnce(modelResponse({ skills: [{ name: 'TypeScript', category: 'technical', importance: 'required', evidence: 'TypeScript', individualSkills: [] }] }))
      .mockResolvedValueOnce(modelResponse({ skills: [{ skillKey: 'typescript', questions }] }))
    expect((await handler()(request())).status).toBe(502)
    expect(client.saveApplication).not.toHaveBeenCalled()
  })
  it('reports a save error instead of returning unsaved results', async () => {
    client.saveApplication.mockRejectedValue(new Error('Skills were found, but could not be saved to the application. Please retry.'))
    const response = await handler()(request())
    expect(response.status).toBe(502)
    expect(await response.json()).toMatchObject({ error: expect.stringContaining('could not be saved') })
  })
  it('reports cache read failure without saving an incomplete skill list', async () => {
    client.readQuestions.mockRejectedValue(new Error('Could not load saved interview questions. Please retry.'))
    expect((await handler()(request())).status).toBe(502)
    expect(client.saveApplication).not.toHaveBeenCalled()
  })
  it('reports missing Gemini configuration without saving analysis', async () => {
    delete env.GEMINI_API_KEY
    expect((await handler()(request())).status).toBe(503)
    expect(client.saveApplication).not.toHaveBeenCalled()
  })
  it('reports malformed AI output without saving analysis', async () => {
    network.mockReset().mockResolvedValueOnce(new Response(html, { headers: { 'Content-Type': 'text/html' } })).mockResolvedValueOnce(new Response(JSON.stringify({ candidates: [] })))
    expect((await handler()(request())).status).toBe(502)
    expect(client.saveApplication).not.toHaveBeenCalled()
  })
})
describe('posting network safety', () => {
  it.each(['http://jobs.example.com/role', 'https://user:password@jobs.example.com/role', 'https://127.0.0.1/role', 'https://localhost/role', 'https://host.internal/role'])('rejects unsafe URL %s before a fetch', async (url) => {
    client.loadApplication.mockResolvedValue({ ...application, url })
    expect((await handler()(request())).status).toBe(422)
    expect(network).not.toHaveBeenCalled()
  })
  it.each(['10.0.0.1', '127.0.0.1', '169.254.169.254', '192.168.1.1', '::1', 'fd00::1', '::ffff:127.0.0.1'])('rejects hosts resolving to private address %s', async (address) => {
    dns.mockResolvedValue([address])
    expect((await handler()(request())).status).toBe(422)
    expect(network).not.toHaveBeenCalled()
  })
  it('validates a redirect target before fetching it', async () => {
    network.mockReset().mockResolvedValue(new Response(null, { status: 302, headers: { Location: 'https://localhost/admin' } }))
    expect((await handler()(request())).status).toBe(422)
    expect(network).toHaveBeenCalledTimes(1)
  })
  it('limits redirect chains', async () => {
    network.mockReset().mockResolvedValue(new Response(null, { status: 302, headers: { Location: '/again' } }))
    expect((await handler()(request())).status).toBe(502)
    expect(network).toHaveBeenCalledTimes(4)
  })
  it('rejects non HTML content', async () => {
    network.mockReset().mockResolvedValue(new Response('binary', { headers: { 'Content-Type': 'application/octet-stream' } }))
    expect((await handler()(request())).status).toBe(502)
    expect(client.saveApplication).not.toHaveBeenCalled()
  })
  it('limits streamed HTML by bytes', async () => {
    network.mockReset().mockResolvedValue(new Response('x'.repeat(2_000_001), { headers: { 'Content-Type': 'text/html' } }))
    const response = await handler()(request())
    expect(await response.json()).toMatchObject({ error: 'The job posting page is too large to analyze.' })
    expect(client.saveApplication).not.toHaveBeenCalled()
  })
  it('aborts a stalled posting request after twelve seconds', async () => {
    vi.useFakeTimers()
    network.mockReset().mockImplementation((_url, options) => new Promise((_resolve, reject) => options.signal.addEventListener('abort', () => reject(new Error('Fetch aborted')))))
    const pending = handler()(request())
    await vi.advanceTimersByTimeAsync(12_000)
    expect((await pending).status).toBe(502)
    expect(client.saveApplication).not.toHaveBeenCalled()
  })
})
