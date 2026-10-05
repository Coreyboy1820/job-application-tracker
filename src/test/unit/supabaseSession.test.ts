import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

let projectNumber = 0
beforeEach(() => {
  vi.resetModules()
  localStorage.clear()
  vi.stubEnv('VITE_SUPABASE_URL', `https://rolecall-session-${++projectNumber}.example.com`)
  vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', 'browser-public-key')
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Unexpected network access')))
})
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); localStorage.clear() })
describe('configured browser database session contract', () => {
  it.each(['{broken', JSON.stringify({ user: { id: 'old-user' } }), 'null'])('returns no signed-in session from malformed persisted data: %s', async (stored) => {
    localStorage.setItem(`sb-rolecall-session-${projectNumber}-auth-token`, stored)
    const { supabase, isSupabaseConfigured } = await import('../../shared/lib/supabase')
    expect(isSupabaseConfigured).toBe(true)
    expect(supabase).not.toBeNull()
    try {
      const result = await supabase!.auth.getSession()
      expect(result.data.session).toBeNull()
      expect(fetch).not.toHaveBeenCalled()
    } finally {
      supabase!.auth.stopAutoRefresh()
    }
  })
  it('does not initialize a database client when browser configuration is absent', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', '')
    const { supabase, isSupabaseConfigured } = await import('../../shared/lib/supabase')
    expect(isSupabaseConfigured).toBe(false)
    expect(supabase).toBeNull()
    expect(fetch).not.toHaveBeenCalled()
  })
})
