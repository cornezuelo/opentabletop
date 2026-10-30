/**
 * Libraries in IndexedDB: stores of entries keyed by id (the maps, the campaigns), each
 * entry's contents a versioned JSON its own package reads (`@open-tabletop/map`,
 * `@open-tabletop/campaign`); backups copy the entries as they are. Every write is announced
 * to the other windows and apps of this browser on the library's channel, so one holding
 * an entry open can read it again.
 */
const DB_NAME = 'opentabletop'
/** v2: the map library; v3: the campaigns. */
const DB_VERSION = 3
const STORES = ['library', 'campaigns'] as const
/** Where they were kept before the Hexmapper was called Map (up to v0.25.0). */
const OLD_DB_NAME = 'hexmapper'

export type StoreName = (typeof STORES)[number]

export interface LibraryEntry {
  id: string
  name: string
  modified: string
  json: string
  /** The entry it hangs under (a sub-map's parent map), for listing them as a tree. */
  parent?: string
}

const request = <T>(r: IDBRequest<T>): Promise<T> =>
  new Promise((resolve, reject) => {
    r.onsuccess = () => resolve(r.result)
    r.onerror = () => reject(r.error)
  })

function openNamed(name: string, version?: number): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const open = indexedDB.open(name, version)
    open.onupgradeneeded = () => {
      const db = open.result
      for (const store of STORES)
        if (!db.objectStoreNames.contains(store)) db.createObjectStore(store, { keyPath: 'id' })
    }
    open.onsuccess = () => resolve(open.result)
    open.onerror = () => reject(open.error)
  })
}

/**
 * Brings the libraries of the old database into the new one (an entry the new one has
 * already stays), then deletes the old one. Once per page; if it fails, the old database
 * is left as it was, to try again next time.
 */
async function moveOldDb(): Promise<void> {
  const names = indexedDB.databases ? (await indexedDB.databases()).map((d) => d.name) : null
  if (names && !names.includes(OLD_DB_NAME)) return
  const old = await openNamed(OLD_DB_NAME)
  try {
    const kept = STORES.filter((s) => old.objectStoreNames.contains(s))
    const entries = await Promise.all(
      kept.map((s) => request<LibraryEntry[]>(old.transaction(s).objectStore(s).getAll())),
    )
    if (entries.some((list) => list.length)) {
      const db = await openNamed(DB_NAME, DB_VERSION)
      try {
        await new Promise<void>((resolve, reject) => {
          const tx = db.transaction(kept, 'readwrite')
          kept.forEach((s, i) => {
            const store = tx.objectStore(s)
            for (const entry of entries[i])
              store.count(entry.id).onsuccess = (e) => {
                if (!(e.target as IDBRequest<number>).result) store.put(entry)
              }
          })
          tx.oncomplete = () => resolve()
          tx.onerror = () => reject(tx.error)
          tx.onabort = () => reject(tx.error)
        })
      } finally {
        db.close()
      }
    }
  } finally {
    old.close()
  }
  await request(indexedDB.deleteDatabase(OLD_DB_NAME))
}

let moved: Promise<void> | undefined

async function openDb(): Promise<IDBDatabase> {
  await (moved ??= moveOldDb().catch(() => undefined))
  return openNamed(DB_NAME, DB_VERSION)
}

/** What changed in a library, as other windows and apps hear it. */
export type LibraryChange =
  { type: 'put'; id: string; modified: string } | { type: 'delete'; id: string } | { type: 'many' }

export interface Library {
  /** The channel its changes go out on. */
  channel: string
  put(entry: LibraryEntry): Promise<void>
  get(id: string): Promise<LibraryEntry | null>
  delete(id: string): Promise<void>
  /** All entries, newest first, without their JSON (for listing). */
  list(): Promise<Omit<LibraryEntry, 'json'>[]>
  /** Every entry with its JSON (for backups). */
  all(): Promise<LibraryEntry[]>
  /** Writes several entries and deletes others in one transaction (restoring a backup). */
  update(put: LibraryEntry[], remove?: string[]): Promise<void>
  /**
   * Calls `listener` whenever another window or app of this browser changes the library
   * (never for this page's own writes). Returns a function that stops listening.
   */
  onChange(listener: (change: LibraryChange) => void): () => void
  /**
   * Like `onChange`, and for this page's own writes too (what only shows what's kept, as the
   * bar's **Playing**, reads again either way).
   */
  onAnyChange(listener: (change: LibraryChange) => void): () => void
}

/** A library: an IndexedDB store, its changes announced on `channel`. */
export function createLibrary(store: StoreName, channelName: string): Library {
  async function run<T>(
    mode: IDBTransactionMode,
    action: (store: IDBObjectStore) => IDBRequest<T>,
  ): Promise<T> {
    const db = await openDb()
    try {
      return await new Promise<T>((resolve, reject) => {
        const request = action(db.transaction(store, mode).objectStore(store))
        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(request.error)
      })
    } finally {
      db.close()
    }
  }

  let channel: BroadcastChannel | null | undefined
  /**
   * One channel per page, for sending and hearing alike: a channel doesn't hear its own
   * messages, so a page never hears its own writes. None where there is no BroadcastChannel.
   */
  function pageChannel(): BroadcastChannel | null {
    if (channel === undefined)
      channel = typeof BroadcastChannel === 'undefined' ? null : new BroadcastChannel(channelName)
    return channel
  }

  // This page's own listeners of `onAnyChange` (a channel doesn't hear its own messages).
  const here = new Set<(change: LibraryChange) => void>()

  function announce(change: LibraryChange): void {
    for (const listener of here) listener(change)
    try {
      pageChannel()?.postMessage(change)
    } catch {
      // Others will see the change when they next read the library.
    }
  }

  return {
    channel: channelName,
    async put(entry) {
      await run('readwrite', (s) => s.put(entry))
      announce({ type: 'put', id: entry.id, modified: entry.modified })
    },
    async get(id) {
      return (await run<LibraryEntry | undefined>('readonly', (s) => s.get(id))) ?? null
    },
    async delete(id) {
      await run('readwrite', (s) => s.delete(id))
      announce({ type: 'delete', id })
    },
    async list() {
      const entries = await run<LibraryEntry[]>('readonly', (s) => s.getAll())
      return entries
        .map(({ id, name, modified, parent }) => ({
          id,
          name,
          modified,
          ...(parent && { parent }),
        }))
        .sort((a, b) => b.modified.localeCompare(a.modified))
    },
    all() {
      return run<LibraryEntry[]>('readonly', (s) => s.getAll())
    },
    async update(put, remove = []) {
      const db = await openDb()
      try {
        await new Promise<void>((resolve, reject) => {
          const tx = db.transaction(store, 'readwrite')
          const s = tx.objectStore(store)
          for (const id of remove) s.delete(id)
          for (const entry of put) s.put(entry)
          tx.oncomplete = () => resolve()
          tx.onerror = () => reject(tx.error)
          tx.onabort = () => reject(tx.error)
        })
      } finally {
        db.close()
      }
      announce({ type: 'many' })
    },
    onChange(listener) {
      const ch = pageChannel()
      if (!ch) return () => {}
      const handler = (event: MessageEvent) => {
        const data = event.data as LibraryChange | undefined
        if (data && typeof data === 'object' && typeof data.type === 'string') listener(data)
      }
      ch.addEventListener('message', handler)
      return () => ch.removeEventListener('message', handler)
    },
    onAnyChange(listener) {
      here.add(listener)
      const stop = this.onChange(listener)
      return () => {
        here.delete(listener)
        stop()
      }
    },
  }
}
