import { emptyRoster, readRoster, type Roster } from '@open-tabletop/session'
import { ROSTER_KEY } from '@open-tabletop/storage'

/**
 * The roster as this browser keeps it (`opentabletop.characters`: backups include it, and
 * join it on restoring): every app reads the same one, and sees another tab's changes as
 * they're saved. v1: the first.
 */
export { ROSTER_KEY }
const VERSION = 1

function read(storage: Pick<Storage, 'getItem'> | undefined): Roster {
  try {
    return readRoster(JSON.parse(storage?.getItem(ROSTER_KEY) ?? 'null'))
  } catch {
    return emptyRoster()
  }
}

const browserStorage = (): Storage | undefined => {
  try {
    return typeof localStorage === 'undefined' ? undefined : localStorage
  } catch {
    return undefined
  }
}

class RosterStore {
  /** The characters, as last saved here or in another tab. */
  roster = $state.raw<Roster>(read(browserStorage()))

  constructor() {
    if (typeof window !== 'undefined')
      window.addEventListener('storage', (e) => {
        if (e.key === ROSTER_KEY) this.roster = read(browserStorage())
      })
  }

  /** Saves a new roster (the same one: nothing to save). */
  set(next: Roster): void {
    if (next === this.roster) return
    this.roster = next
    try {
      browserStorage()?.setItem(ROSTER_KEY, JSON.stringify({ version: VERSION, ...next }))
    } catch {
      // No storage (private mode…): kept until the page reloads.
    }
  }

  /** Reads it again (a backup restored, a test). */
  reload(): void {
    this.roster = read(browserStorage())
  }
}

export const roster = new RosterStore()
