/**
 * Local map library in IndexedDB: every map this browser has opened, keyed by map id.
 * Version 1 had a single "autosave" entry in the `maps` store; version 2 adds the
 * `library` store and migrates that entry into it.
 */
const DB_NAME = 'hexmapper'
const LEGACY_STORE = 'maps'
const LEGACY_KEY = 'autosave'
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
    request.onupgradeneeded = (event) => {
      const db = request.result
      if (!db.objectStoreNames.contains(LEGACY_STORE)) db.createObjectStore(LEGACY_STORE)
      const library = db.createObjectStore(STORE, { keyPath: 'id' })
      if (event.oldVersion >= 1) migrateLegacy(request.transaction!, library)
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

function migrateLegacy(tx: IDBTransaction, library: IDBObjectStore): void {
  const get = tx.objectStore(LEGACY_STORE).get(LEGACY_KEY)
  get.onsuccess = () => {
    const json = get.result
    if (typeof json !== 'string') return
    try {
      const meta = JSON.parse(json).meta ?? {}
      if (typeof meta.id === 'string')
        library.put({ id: meta.id, name: meta.name ?? '', modified: meta.modified ?? '', json })
    } catch {
      // Unreadable legacy autosave: nothing to migrate.
    }
  }
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
