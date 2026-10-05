const DB_NAME = 'hexmapper'
const STORE = 'maps'
const AUTOSAVE_KEY = 'autosave'

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1)
    request.onupgradeneeded = () => request.result.createObjectStore(STORE)
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

async function run<T>(
  mode: IDBTransactionMode,
  action: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await openDb()
  try {
    return await new Promise<T>((resolve, reject) => {
      const request = action(db.transaction(STORE, mode).objectStore(STORE))
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  } finally {
    db.close()
  }
}

export async function saveAutosave(json: string): Promise<void> {
  await run('readwrite', (store) => store.put(json, AUTOSAVE_KEY))
}

export async function loadAutosave(): Promise<string | null> {
  const value = await run<unknown>('readonly', (store) => store.get(AUTOSAVE_KEY))
  return typeof value === 'string' ? value : null
}
