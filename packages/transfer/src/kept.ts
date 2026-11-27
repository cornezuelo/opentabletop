import {
  picturesNamed,
  ROSTER_KEY,
  USER_PACKS_KEY,
  type LibraryEntry,
} from '@open-tabletop/storage'

/**
 * What the apps keep that can be exported and imported, as they keep it: the user's packs,
 * the map library, the campaigns, Travel's trips and the roster's characters. Everything
 * else (preferences, histories, Packs' test trips) goes only in backups.
 */
export interface Kept {
  packs: KeptPack[]
  maps: LibraryEntry[]
  campaigns: LibraryEntry[]
  /** Travel's saved trips, each as it's stored (migrated by Travel when read). */
  trips: Record<string, unknown>[]
  /** The roster's entries (`{ character, modified, playing? }`), as stored. */
  characters: Record<string, unknown>[]
  /**
   * The image library's entries: not chosen by themselves, they go with what names them (a
   * character's portrait, a party's banner).
   */
  images: LibraryEntry[]
  /** Notes' pages, as stored (read only to say what shows a picture: exports don't carry them). */
  notes?: LibraryEntry[]
  /** The campaigns' journals, as stored (the same). */
  journals?: LibraryEntry[]
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
  images: [],
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
  images: LibraryEntry[] = [],
  texts: { notes?: LibraryEntry[]; journals?: LibraryEntry[] } = {},
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
    images,
    ...(texts.notes && { notes: texts.notes }),
    ...(texts.journals && { journals: texts.journals }),
  }
}

/** The images of `kept` that the chosen things name (by item key), to go with them. */
export function chosenImages(kept: Kept, chosen: ReadonlySet<string>): LibraryEntry[] {
  const named = new Set<string>()
  const look = (value: unknown) => picturesNamed(value, named)
  for (const m of kept.maps) if (chosen.has(`map:${m.id}`)) look(parse(m.json))
  for (const c of kept.campaigns) if (chosen.has(`campaign:${c.id}`)) look(parse(c.json))
  for (const t of kept.trips) if (chosen.has(`trip:${t.id as string}`)) look(t)
  for (const e of kept.characters) if (chosen.has(`character:${characterIdOf(e)!}`)) look(e)
  return kept.images.filter((image) => named.has(image.id))
}
