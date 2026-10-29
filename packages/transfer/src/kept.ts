import { ROSTER_KEY, USER_PACKS_KEY, type LibraryEntry } from '@open-tabletop/storage'

/**
 * What the apps keep that can be exported and imported, as they keep it: the user's packs,
 * the map library, the campaigns, Travel's trips and the roster's characters. Everything
 * else (preferences, histories, Systems' test trips) goes only in backups.
 */
export interface Kept {
  packs: KeptPack[]
  maps: LibraryEntry[]
  campaigns: LibraryEntry[]
  /** Travel's saved trips, each as it's stored (migrated by Travel when read). */
  trips: Record<string, unknown>[]
  /** The roster's entries (`{ character, modified, playing? }`), as stored. */
  characters: Record<string, unknown>[]
}

/** A pack of the user's, as the pack library keeps it (`root` is its folder and id). */
export interface KeptPack {
  root: string
  files: { path: string; content: string }[]
  /** On a copy of a bundled pack: what the bundled files were when it was made. */
  basedOn?: Record<string, string>
}

/** Where Travel keeps its trips (travel-ui's `TRAVEL_TRIPS_KEY`). */
export const TRIPS_KEY = 'opentabletop.travel.trips'

export const emptyKept = (): Kept => ({
  packs: [],
  maps: [],
  campaigns: [],
  trips: [],
  characters: [],
})

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const parse = (text: string | undefined): unknown => {
  try {
    return text === undefined ? undefined : JSON.parse(text)
  } catch {
    return undefined
  }
}

export const isPack = (p: unknown): p is KeptPack =>
  isRecord(p) &&
  typeof p.root === 'string' &&
  p.root !== '' &&
  Array.isArray(p.files) &&
  p.files.every((f) => isRecord(f) && typeof f.path === 'string' && typeof f.content === 'string')

export const isTrip = (t: unknown): t is Record<string, unknown> & { id: string } =>
  isRecord(t) && typeof t.id === 'string' && t.id !== '' && Array.isArray(t.way)

export const characterIdOf = (entry: unknown): string | undefined =>
  isRecord(entry) && isRecord(entry.character) && typeof entry.character.id === 'string'
    ? entry.character.id
    : undefined

/** What the apps keep, read from their browser storage entries and libraries. */
export function readKept(
  storage: Record<string, string>,
  maps: LibraryEntry[],
  campaigns: LibraryEntry[],
): Kept {
  const packs = parse(storage[USER_PACKS_KEY])
  const trips = parse(storage[TRIPS_KEY])
  const roster = parse(storage[ROSTER_KEY])
  return {
    packs: Array.isArray(packs)
      ? packs
          .filter(isPack)
          .map((p) => ({ root: p.root, files: p.files, ...(p.basedOn && { basedOn: p.basedOn }) }))
      : [],
    maps,
    campaigns,
    trips: isRecord(trips) && Array.isArray(trips.trips) ? trips.trips.filter(isTrip) : [],
    characters:
      isRecord(roster) && Array.isArray(roster.characters)
        ? roster.characters.filter((e): e is Record<string, unknown> => !!characterIdOf(e))
        : [],
  }
}
