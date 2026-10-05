import { IDBFactory } from 'fake-indexeddb'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { loadApplications } from '../../features/applications/data/legacyStorage'

const key = 'rolecall-applications-v1'
const saved = { id: 'saved-1', company: 'Acme', role: 'Engineer', location: 'Remote', dateApplied: '2026-10-01', status: 'Applied', url: '', notes: 'Original notes', nextStep: 'Follow up' }
function seed(record = saved): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('rolecall', 1)
    request.onupgradeneeded = () => request.result.createObjectStore('applications', { keyPath: 'id' })
    request.onerror = () => reject(request.error)
    request.onsuccess = () => {
      const db = request.result
      const transaction = db.transaction('applications', 'readwrite')
      transaction.objectStore('applications').add(record)
      transaction.oncomplete = () => { db.close(); resolve() }
      transaction.onerror = () => { db.close(); reject(transaction.error) }
    }
  })
}
beforeEach(() => {
  vi.stubGlobal('indexedDB', new IDBFactory())
  localStorage.clear()
})
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals() })
describe('browser database migration', () => {
  it('opens an empty database and returns no applications', async () => {
    expect(await loadApplications()).toEqual([])
  })
  it('copies legacy data transactionally and removes the old key after success', async () => {
    localStorage.setItem(key, JSON.stringify([saved]))
    expect(await loadApplications()).toEqual([saved])
    expect(localStorage.getItem(key)).toBeNull()
    expect(await loadApplications()).toEqual([saved])
  })
  it('preserves an existing database record instead of replacing it with an older browser copy', async () => {
    await seed()
    localStorage.setItem(key, JSON.stringify([{ ...saved, notes: 'Outdated notes' }, { ...saved, id: 'second' }]))
    expect(await loadApplications()).toEqual([saved, { ...saved, id: 'second' }])
    expect(localStorage.getItem(key)).toBeNull()
  })
  it.each(['{broken', '{}', JSON.stringify([{ ...saved, company: null }])])('leaves invalid legacy data unchanged: %s', async (value) => {
    localStorage.setItem(key, value)
    await expect(loadApplications()).rejects.toThrow()
    expect(localStorage.getItem(key)).toBe(value)
    localStorage.removeItem(key)
    expect(await loadApplications()).toEqual([])
  })
  it('retains the source when duplicate legacy IDs abort migration', async () => {
    const source = JSON.stringify([saved, { ...saved, notes: 'Duplicate ID' }])
    localStorage.setItem(key, source)
    await expect(loadApplications()).rejects.toThrow()
    expect(localStorage.getItem(key)).toBe(source)
    localStorage.removeItem(key)
    expect(await loadApplications()).toEqual([])
  })
  it('reports blocked database opens instead of hanging', async () => {
    const pending = {} as IDBOpenDBRequest
    vi.stubGlobal('indexedDB', { open: () => { queueMicrotask(() => pending.onblocked?.(new Event('blocked') as IDBVersionChangeEvent)); return pending } })
    await expect(loadApplications()).rejects.toThrow('blocked by another open tab')
  })
  it('reports storage permission failures without deleting the legacy copy', async () => {
    localStorage.setItem(key, JSON.stringify([saved]))
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('Storage unavailable') })
    await expect(loadApplications()).rejects.toThrow('Storage unavailable')
    vi.restoreAllMocks()
    expect(localStorage.getItem(key)).not.toBeNull()
  })
})
