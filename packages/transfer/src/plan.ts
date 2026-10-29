import { ROSTER_KEY, USER_PACKS_KEY, type LibraryEntry } from '@open-tabletop/storage'
import { characterIdOf, isRecord, TRIPS_KEY, type Kept } from './kept'
import { keyOf } from './items'

/** What importing one thing does here: adds it, finds it there already, or replaces yours. */
export type ImportStatus = 'new' | 'same' | 'changed'

/** Each thing of `kept`, by item key, with what it is to compare it by. */
function contents(kept: Kept): Map<string, string> {
  const out = new Map<string, string>()
  for (const p of kept.packs)
    out.set(
      keyOf('pack', p.root),
      JSON.stringify([...p.files].sort((a, b) => a.path.localeCompare(b.path))),
    )
  for (const m of kept.maps) out.set(keyOf('map', m.id), m.json)
  for (const c of kept.campaigns) out.set(keyOf('campaign', c.id), c.json)
  for (const t of kept.trips) out.set(keyOf('trip', t.id as string), JSON.stringify(t))
  for (const e of kept.characters)
    out.set(keyOf('character', characterIdOf(e)!), JSON.stringify(e.character))
  return out
}

/** The keys of everything `kept` holds. */
export const keysOf = (kept: Kept): Set<string> => new Set(contents(kept).keys())

/** What importing each thing of `incoming` would do, given what's `here`. */
export function importStatus(here: Kept, incoming: Kept): Map<string, ImportStatus> {
  const mine = contents(here)
  const out = new Map<string, ImportStatus>()
  for (const [key, value] of contents(incoming))
    out.set(key, !mine.has(key) ? 'new' : mine.get(key) === value ? 'same' : 'changed')
  return out
}

/** What to write to import the chosen things. */
export interface ImportPlan {
  /** Browser storage entries to write (user packs, Travel's trips, the roster). */
  storage: Record<string, string>
  putMaps: LibraryEntry[]
  putCampaigns: LibraryEntry[]
}

const parse = (text: string | undefined): unknown => {
  try {
    return text === undefined ? undefined : JSON.parse(text)
  } catch {
    return undefined
  }
}

/** Joins `incoming` into a stored list, replacing what has the same identity. */
function join<T>(list: unknown[], incoming: T[], identity: (item: unknown) => unknown): unknown[] {
  const taken = new Set(incoming.map(identity))
  return [...list.filter((item) => !taken.has(identity(item))), ...incoming]
}

/**
 * Writes the chosen things of `incoming` into what this browser keeps (`storage`, its
 * entries as they are): each added, or replacing what has its id (a pack its folder).
 * Everything else stays.
 */
export function planImport(
  storage: Record<string, string>,
  incoming: Kept,
  chosen: ReadonlySet<string>,
): ImportPlan {
  const out: ImportPlan = { storage: {}, putMaps: [], putCampaigns: [] }
  const now = new Date().toISOString()

  const packs = incoming.packs.filter((p) => chosen.has(keyOf('pack', p.root)))
  if (packs.length) {
    const list = parse(storage[USER_PACKS_KEY])
    out.storage[USER_PACKS_KEY] = JSON.stringify(
      join(
        Array.isArray(list) ? list : [],
        packs.map((p) => ({ ...p, origin: 'user' })),
        (p) => (isRecord(p) ? p.root : undefined),
      ),
    )
  }

  // Library entries count as changed now, so the apps holding older copies read them again.
  out.putMaps = incoming.maps
    .filter((m) => chosen.has(keyOf('map', m.id)))
    .map((m) => ({ ...m, modified: now }))
  out.putCampaigns = incoming.campaigns
    .filter((c) => chosen.has(keyOf('campaign', c.id)))
    .map((c) => ({ ...c, modified: now }))

  const trips = incoming.trips.filter((t) => chosen.has(keyOf('trip', t.id as string)))
  if (trips.length) {
    const stored = parse(storage[TRIPS_KEY])
    const here = isRecord(stored) && Array.isArray(stored.trips) ? stored : undefined
    const list = join((here?.trips as unknown[] | undefined) ?? [], trips, (t) =>
      isRecord(t) ? t.id : undefined,
    )
    out.storage[TRIPS_KEY] = JSON.stringify({
      ...here,
      current: typeof here?.current === 'string' ? here.current : trips[0].id,
      trips: list,
    })
  }

  const characters = incoming.characters
    .filter((e) => chosen.has(keyOf('character', characterIdOf(e)!)))
    .map((e) => ({ ...e, modified: now }))
  if (characters.length) {
    const stored = parse(storage[ROSTER_KEY])
    const here = isRecord(stored) && Array.isArray(stored.characters) ? stored : undefined
    out.storage[ROSTER_KEY] = JSON.stringify({
      version: 1,
      ...here,
      characters: join(
        (here?.characters as unknown[] | undefined) ?? [],
        characters,
        characterIdOf,
      ),
    })
  }
  return out
}
