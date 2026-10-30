import type { LibraryEntry } from './library'

/**
 * A backup of everything the OpenTabletop apps keep in one browser: their localStorage
 * entries (user packs, trips, Oracle histories and decks, favorites, preferences…), the
 * map library and the campaigns. Restoring it on another machine resumes whole campaigns.
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
  /** Map's map library. */
  maps: LibraryEntry[]
  /** The campaigns (their maps are in `maps`). */
  campaigns: LibraryEntry[]
}

export const BACKUP_FORMAT = 'opentabletop-backup'
/** v2: campaigns (v1 backups have none: their maps make theirs when opened). */
export const BACKUP_VERSION = 2

/**
 * Every app keeps its browser data under these prefixes (see the root CLAUDE.md); `hexmapper.`
 * is the Map app's old one (`renamed.ts`).
 */
export const KEY_PREFIXES = ['opentabletop.', 'hexmapper.'] as const

/** Shared storage keys that need more than "the backup wins" when merging. */
export const USER_PACKS_KEY = 'opentabletop.userPacks'
export const FAVORITES_KEY = 'opentabletop.favorites'
/** The Characters app's roster (character-ui): its characters joined, the newer of each kept. */
export const ROSTER_KEY = 'opentabletop.characters'

/** Map's crash copies of the open map and its campaign: only meaningful in this browser, now. */
const LOCAL_ONLY = new Set([
  'opentabletop.map.pending',
  'opentabletop.map.pendingCampaign',
  'hexmapper.pending',
  'hexmapper.pendingCampaign',
])

/** A key whose value belongs in a backup. */
export function isAppKey(key: string): boolean {
  return KEY_PREFIXES.some((p) => key.startsWith(p)) && !LOCAL_ONLY.has(key)
}

export function createBackup(
  storage: Record<string, string>,
  maps: LibraryEntry[],
  campaigns: LibraryEntry[],
  created: string = new Date().toISOString(),
): Backup {
  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    created,
    storage: Object.fromEntries(Object.entries(storage).filter(([key]) => isAppKey(key))),
    maps,
    campaigns,
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
      campaigns: Array.isArray(raw.campaigns) ? raw.campaigns.filter(isEntry) : [],
    },
  }
}

/**
 * - `replace`: this browser ends up exactly like the backup (its own data is removed).
 * - `merge`: the backup is added: maps and campaigns by id (the newer one stays), user packs by folder
 *   and favorites joined (the backup's copy wins), the roster's characters by id (the newer
 *   one stays), anything else taken from the backup.
 */
export type RestoreMode = 'replace' | 'merge'

export interface RestorePlan {
  /** Keys to write, or to remove (null). */
  storage: Record<string, string | null>
  putMaps: LibraryEntry[]
  removeMaps: string[]
  putCampaigns: LibraryEntry[]
  removeCampaigns: string[]
}

/** What restoring `backup` changes, given what this browser has now. Pure, for testing. */
export function planRestore(
  current: {
    storage: Record<string, string>
    maps: Omit<LibraryEntry, 'json'>[]
    campaigns: Omit<LibraryEntry, 'json'>[]
  },
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
    const keptCampaigns = new Set(backup.campaigns.map((c) => c.id))
    return {
      storage,
      putMaps: backup.maps,
      removeMaps: current.maps.filter((m) => !kept.has(m.id)).map((m) => m.id),
      putCampaigns: backup.campaigns,
      removeCampaigns: current.campaigns.filter((c) => !keptCampaigns.has(c.id)).map((c) => c.id),
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
            : key === ROSTER_KEY
              ? mergeRoster(mine, value)
              : value
  }
  // ISO times compare as text; on a tie the backup's copy is taken.
  const newer = (entries: LibraryEntry[], current: Omit<LibraryEntry, 'json'>[]) => {
    const mine = new Map(current.map((e) => [e.id, e]))
    return entries.filter((e) => {
      const here = mine.get(e.id)
      return !here || here.modified <= e.modified
    })
  }
  return {
    storage,
    putMaps: newer(backup.maps, current.maps),
    removeMaps: [],
    putCampaigns: newer(backup.campaigns, current.campaigns),
    removeCampaigns: [],
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

/**
 * Two rosters joined: every character of both, by id, the one changed last kept (on a tie,
 * the backup's). Broken JSON loses.
 */
function mergeRoster(mine: string, theirs: string): string {
  const parse = (text: string): { version?: unknown; characters: unknown[] } => {
    try {
      const value: unknown = JSON.parse(text)
      const list = isRecord(value) ? value.characters : undefined
      return { ...(isRecord(value) ? value : {}), characters: Array.isArray(list) ? list : [] }
    } catch {
      return { characters: [] }
    }
  }
  const idOf = (e: unknown) => (isRecord(e) && isRecord(e.character) ? e.character.id : undefined)
  const modified = (e: unknown) => (isRecord(e) && typeof e.modified === 'string' ? e.modified : '')
  const here = parse(mine)
  const incoming = parse(theirs)
  const out = new Map<unknown, unknown>(here.characters.map((e) => [idOf(e), e]))
  for (const e of incoming.characters) {
    const old = out.get(idOf(e))
    if (old === undefined || modified(old) <= modified(e)) out.set(idOf(e), e)
  }
  return JSON.stringify({ ...here, ...incoming, characters: [...out.values()] })
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
