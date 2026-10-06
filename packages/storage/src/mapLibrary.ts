/**
 * The local map library in IndexedDB: every map this browser has opened, keyed by map id.
 * The Hexmapper owns its contents (`json` is its own versioned map format); backups copy
 * the entries as they are.
 */
const DB_NAME = 'hexmapper'
const STORE = 'library'

export interface LibraryEntry {
  id: string
  name: string
  modified: string
  json: string
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 2)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'id' })
    }
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

export async function putLibraryMap(entry: LibraryEntry): Promise<void> {
  await run('readwrite', (store) => store.put(entry))
}

export async function getLibraryMap(id: string): Promise<LibraryEntry | null> {
  const entry = await run<LibraryEntry | undefined>('readonly', (store) => store.get(id))
  return entry ?? null
}

export async function deleteLibraryMap(id: string): Promise<void> {
  await run('readwrite', (store) => store.delete(id))
}

/** All maps, newest first, without their JSON (for listing). */
export async function listLibrary(): Promise<Omit<LibraryEntry, 'json'>[]> {
  const entries = await run<LibraryEntry[]>('readonly', (store) => store.getAll())
  return entries
    .map(({ id, name, modified }) => ({ id, name, modified }))
    .sort((a, b) => b.modified.localeCompare(a.modified))
}

/** Every map with its JSON (for backups). */
export async function allLibraryMaps(): Promise<LibraryEntry[]> {
  return run<LibraryEntry[]>('readonly', (store) => store.getAll())
}

/** Writes several maps and deletes others in one transaction (restoring a backup). */
export async function updateLibrary(put: LibraryEntry[], remove: string[] = []): Promise<void> {
  const db = await openDb()
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite')
      const store = tx.objectStore(STORE)
      for (const id of remove) store.delete(id)
      for (const entry of put) store.put(entry)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
      tx.onabort = () => reject(tx.error)
    })
  } finally {
    db.close()
  }
}
