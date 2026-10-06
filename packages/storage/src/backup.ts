import type { LibraryEntry } from './mapLibrary'

/**
 * A backup of everything the OpenTabletop apps keep in one browser: their localStorage
 * entries (user packs, trips, Oracle histories and decks, favorites, preferences…) and
 * the map library. Restoring it on another machine resumes whole campaigns.
 *
 * Entries are copied as they are: each app keeps its own data versioned (maps migrate
 * when opened), so the backup only versions its own envelope.
 */
export interface Backup {
  format: typeof BACKUP_FORMAT
  version: number
  /** ISO time the backup was made. */
  created: string
  /** localStorage entries of the apps, by key. */
  storage: Record<string, string>
  /** The Hexmapper's map library. */
  maps: LibraryEntry[]
}

export const BACKUP_FORMAT = 'opentabletop-backup'
export const BACKUP_VERSION = 1

/** Every app keeps its browser data under these prefixes (see the root CLAUDE.md). */
export const KEY_PREFIXES = ['opentabletop.', 'hexmapper.'] as const

/** Shared storage keys that need more than "the backup wins" when merging. */
export const USER_PACKS_KEY = 'opentabletop.userPacks'
export const FAVORITES_KEY = 'opentabletop.favorites'

/** The Hexmapper's crash copy of the open map: only meaningful in this browser, now. */
const LOCAL_ONLY = new Set(['hexmapper.pending'])

/** A key whose value belongs in a backup. */
export function isAppKey(key: string): boolean {
  return KEY_PREFIXES.some((p) => key.startsWith(p)) && !LOCAL_ONLY.has(key)
}

export function createBackup(
  storage: Record<string, string>,
  maps: LibraryEntry[],
  created: string = new Date().toISOString(),
): Backup {
  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    created,
    storage: Object.fromEntries(Object.entries(storage).filter(([key]) => isAppKey(key))),
    maps,
  }
}

/** File name for a backup made at `created`, by the local date: opentabletop-backup-2026-10-07.json. */
export function backupFileName(created: string): string {
  const date = new Date(created)
  const pad = (n: number) => String(n).padStart(2, '0')
  const day = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
  return `${BACKUP_FORMAT}-${day}.json`
}

export type BackupError = 'invalid' | 'newer'

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const isEntry = (value: unknown): value is LibraryEntry =>
  isRecord(value) &&
  typeof value.id === 'string' &&
  value.id !== '' &&
  typeof value.name === 'string' &&
  typeof value.modified === 'string' &&
  typeof value.json === 'string'

/** Reads a backup file. Unknown keys and broken map entries are dropped. */
export function parseBackup(json: string): { backup?: Backup; error?: BackupError } {
  let raw: unknown
  try {
    raw = JSON.parse(json)
  } catch {
    return { error: 'invalid' }
  }
  if (!isRecord(raw) || raw.format !== BACKUP_FORMAT || typeof raw.version !== 'number')
    return { error: 'invalid' }
  if (raw.version > BACKUP_VERSION) return { error: 'newer' }
  // Older versions would be migrated here, one step at a time.
  if (!isRecord(raw.storage) || !Array.isArray(raw.maps)) return { error: 'invalid' }
  const storage: Record<string, string> = {}
  for (const [key, value] of Object.entries(raw.storage))
    if (isAppKey(key) && typeof value === 'string') storage[key] = value
  return {
    backup: {
      format: BACKUP_FORMAT,
      version: BACKUP_VERSION,
      created: typeof raw.created === 'string' ? raw.created : '',
      storage,
      maps: raw.maps.filter(isEntry),
    },
  }
}

/**
 * - `replace`: this browser ends up exactly like the backup (its own data is removed).
 * - `merge`: the backup is added: maps by id (the newer one stays), user packs by folder
 *   and favorites joined (the backup's copy wins), anything else taken from the backup.
 */
export type RestoreMode = 'replace' | 'merge'

export interface RestorePlan {
  /** Keys to write, or to remove (null). */
  storage: Record<string, string | null>
  putMaps: LibraryEntry[]
  removeMaps: string[]
}

/** What restoring `backup` changes, given what this browser has now. Pure, for testing. */
export function planRestore(
  current: { storage: Record<string, string>; maps: Omit<LibraryEntry, 'json'>[] },
  backup: Backup,
  mode: RestoreMode,
): RestorePlan {
  const storage: RestorePlan['storage'] = {}
  if (mode === 'replace') {
    for (const key of Object.keys(current.storage))
      if (KEY_PREFIXES.some((p) => key.startsWith(p)) && !(key in backup.storage))
        storage[key] = null
    Object.assign(storage, backup.storage)
    const kept = new Set(backup.maps.map((m) => m.id))
    return {
      storage,
      putMaps: backup.maps,
      removeMaps: current.maps.filter((m) => !kept.has(m.id)).map((m) => m.id),
    }
  }
  for (const [key, value] of Object.entries(backup.storage)) {
    const mine = current.storage[key]
    storage[key] =
      mine === undefined
        ? value
        : key === USER_PACKS_KEY
          ? mergeLists(mine, value, (p) => (isRecord(p) ? p.root : undefined))
          : key === FAVORITES_KEY
            ? mergeLists(mine, value, (id) => id)
            : value
  }
  const mine = new Map(current.maps.map((m) => [m.id, m]))
  return {
    storage,
    // ISO times compare as text; on a tie the backup's copy is taken.
    putMaps: backup.maps.filter((m) => {
      const here = mine.get(m.id)
      return !here || here.modified <= m.modified
    }),
    removeMaps: [],
  }
}

/** Two JSON lists joined by identity; the second list's items win. Broken JSON loses. */
function mergeLists(mine: string, theirs: string, identity: (item: unknown) => unknown): string {
  const parse = (text: string): unknown[] => {
    try {
      const value: unknown = JSON.parse(text)
      return Array.isArray(value) ? value : []
    } catch {
      return []
    }
  }
  const incoming = parse(theirs)
  const taken = new Set(incoming.map(identity))
  return JSON.stringify([...parse(mine).filter((item) => !taken.has(identity(item))), ...incoming])
}

/** Numbers for the confirmation dialog. */
export function summarize(backup: Backup): { maps: number; packs: number; created: string } {
  let packs = 0
  try {
    const value: unknown = JSON.parse(backup.storage[USER_PACKS_KEY] ?? '[]')
    packs = Array.isArray(value) ? value.length : 0
  } catch {
    // Not a list: nothing to count.
  }
  return { maps: backup.maps.length, packs, created: backup.created }
}
