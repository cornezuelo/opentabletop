/**
 * Which tab of the World panel is open: a preference of this browser
 * (`opentabletop.world.tab`), like the trip panel's.
 */
const KEY = 'opentabletop.world.tab'

export const WORLD_TABS = ['now', 'events', 'clocks', 'timeline', 'factions'] as const
export type WorldTab = (typeof WORLD_TABS)[number]

function read(): WorldTab | undefined {
  try {
    const raw = localStorage.getItem(KEY)
    return WORLD_TABS.includes(raw as WorldTab) ? (raw as WorldTab) : undefined
  } catch {
    return undefined
  }
}

class Tab {
  /** The tab chosen last (absent: the first). */
  chosen = $state<WorldTab | undefined>(read())

  choose(tab: WorldTab): void {
    this.chosen = tab
    try {
      localStorage.setItem(KEY, tab)
    } catch {
      // No storage: it stays until the page reloads.
    }
  }
}

export const worldTab = new Tab()
