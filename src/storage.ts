import type { Application } from './types'

const databaseName = 'rolecall'
const databaseVersion = 1
const applicationStoreName = 'applications'
const legacyStorageKey = 'rolecall-applications-v1'

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(databaseName, databaseVersion)
    request.onupgradeneeded = () => {
      const database = request.result
      if (!database.objectStoreNames.contains(applicationStoreName)) {
        const store = database.createObjectStore(applicationStoreName, { keyPath: 'id' })
        store.createIndex('status', 'status')
        store.createIndex('dateApplied', 'dateApplied')
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('Could not open the local database.'))
    request.onblocked = () => reject(new Error('The local database is blocked by another open tab. Close other Rolecall tabs and retry.'))
  })
}

function transactionComplete(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve()
    transaction.onabort = () => reject(transaction.error ?? new Error('The local database transaction was cancelled.'))
    transaction.onerror = () => reject(transaction.error ?? new Error('The local database transaction failed.'))
  })
}

function isApplication(value: unknown): value is Application {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Partial<Application>
  return typeof candidate.id === 'string' && typeof candidate.company === 'string'
    && typeof candidate.role === 'string' && typeof candidate.location === 'string'
    && typeof candidate.dateApplied === 'string' && typeof candidate.status === 'string'
    && typeof candidate.url === 'string' && typeof candidate.notes === 'string'
    && typeof candidate.nextStep === 'string'
}

async function migrateLegacyApplications(database: IDBDatabase): Promise<void> {
  const legacyJson = localStorage.getItem(legacyStorageKey)
  if (!legacyJson) return
  const parsed: unknown = JSON.parse(legacyJson)
  if (!Array.isArray(parsed) || !parsed.every(isApplication)) {
    throw new Error('The previous browser data could not be read safely. It has been left unchanged.')
  }
  const transaction = database.transaction(applicationStoreName, 'readwrite')
  const completed = transactionComplete(transaction)
  const store = transaction.objectStore(applicationStoreName)
  for (const application of parsed) {
    const existing = store.get(application.id)
    existing.onsuccess = () => { if (existing.result === undefined) store.add(application) }
  }
  await completed
  localStorage.removeItem(legacyStorageKey)
}

export async function loadApplications(): Promise<Application[]> {
  const database = await openDatabase()
  try {
    await migrateLegacyApplications(database)
    const transaction = database.transaction(applicationStoreName, 'readonly')
    const completed = transactionComplete(transaction)
    const request = transaction.objectStore(applicationStoreName).getAll()
    const applications = await new Promise<Application[]>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result as Application[])
      request.onerror = () => reject(request.error ?? new Error('Could not read the local database.'))
    })
    await completed
    return applications
  } finally { database.close() }
}
