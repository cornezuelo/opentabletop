/**
 * What this browser kept under the Map app's old name (the Hexmapper, up to v0.25.0), moved
 * to its new one. Run when an app starts (`@open-tabletop/storage/start`), before anything
 * reads them, so data from older versions (and restored from older backups) keeps working.
 */
import { ROSTER_KEY } from './backup'

/** Old keys and their new ones. */
export const RENAMED_KEYS: Readonly<Record<string, string>> = {
  'hexmapper.currentMap': 'opentabletop.map.currentMap',
  'hexmapper.pending': 'opentabletop.map.pending',
  'hexmapper.pendingCampaign': 'opentabletop.map.pendingCampaign',
  'opentabletop.hexmapper.oracle': 'opentabletop.map.oracle',
  'opentabletop.hexmapper.examples': 'opentabletop.map.examples',
}

type KeyStore = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

/**
 * Moves the old keys to their new names (an old key only comes from older data, so it wins
 * over a new one), and the roster's characters playing on a map to the app `map`.
 */
export function renameOldKeys(storage: KeyStore): void {
  for (const [old, key] of Object.entries(RENAMED_KEYS)) {
    const value = storage.getItem(old)
    if (value === null) continue
    storage.setItem(key, value)
    storage.removeItem(old)
  }
  const roster = storage.getItem(ROSTER_KEY)
  if (roster?.includes('"hexmapper"')) {
    const renamed = renameRosterPlaces(roster)
    if (renamed !== roster) storage.setItem(ROSTER_KEY, renamed)
  }
}

/** A roster (JSON) whose characters playing in `hexmapper` play in `map`. Broken JSON stays. */
function renameRosterPlaces(json: string): string {
  try {
    const roster: unknown = JSON.parse(json)
    if (!isRecord(roster) || !Array.isArray(roster.characters)) return json
    const characters = roster.characters.map((entry: unknown) =>
      isRecord(entry) && isRecord(entry.playing) && entry.playing.app === 'hexmapper'
        ? { ...entry, playing: { ...entry.playing, app: 'map' } }
        : entry,
    )
    return JSON.stringify({ ...roster, characters })
  } catch {
    return json
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
