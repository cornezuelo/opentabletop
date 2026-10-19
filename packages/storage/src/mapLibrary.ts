/**
 * The local map library in IndexedDB: every map this browser has opened, keyed by map id.
 * Its contents are maps in the format of `@open-tabletop/map` (`json`, versioned); backups
 * copy the entries as they are. Every write is announced to the other windows and apps of
 * this browser (`onLibraryChange`), so one holding a map open can read it again.
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

/** What changed in the library, as other windows and apps hear it. */
export type LibraryChange =
  { type: 'put'; id: string; modified: string } | { type: 'delete'; id: string } | { type: 'many' }

/** The channel the library's changes go out on. */
export const LIBRARY_CHANNEL = 'opentabletop.maps'

let channel: BroadcastChannel | null | undefined

/**
 * One channel per page, for sending and hearing alike: a channel doesn't hear its own
 * messages, so a page never hears its own writes. None where there is no BroadcastChannel.
 */
function libraryChannel(): BroadcastChannel | null {
  if (channel === undefined)
    channel = typeof BroadcastChannel === 'undefined' ? null : new BroadcastChannel(LIBRARY_CHANNEL)
  return channel
}

function announce(change: LibraryChange): void {
  try {
    libraryChannel()?.postMessage(change)
  } catch {
    // Others will see the change when they next read the library.
  }
}

/**
 * Calls `listener` whenever another window or app of this browser changes the library
 * (never for this page's own writes). Returns a function that stops listening.
 */
export function onLibraryChange(listener: (change: LibraryChange) => void): () => void {
  const ch = libraryChannel()
  if (!ch) return () => {}
  const handler = (event: MessageEvent) => {
    const data = event.data as LibraryChange | undefined
    if (data && typeof data === 'object' && typeof data.type === 'string') listener(data)
  }
  ch.addEventListener('message', handler)
  return () => ch.removeEventListener('message', handler)
}

export async function putLibraryMap(entry: LibraryEntry): Promise<void> {
  await run('readwrite', (store) => store.put(entry))
  announce({ type: 'put', id: entry.id, modified: entry.modified })
}

export async function getLibraryMap(id: string): Promise<LibraryEntry | null> {
  const entry = await run<LibraryEntry | undefined>('readonly', (store) => store.get(id))
  return entry ?? null
}

export async function deleteLibraryMap(id: string): Promise<void> {
  await run('readwrite', (store) => store.delete(id))
  announce({ type: 'delete', id })
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
  announce({ type: 'many' })
}
