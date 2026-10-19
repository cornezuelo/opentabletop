/**
 * Which sections of the trip panel each viewer keeps folded, and which of its tabs is open:
 * preferences of this browser (`opentabletop.trip.folds`, `opentabletop.trip.tab`), shared
 * by every app that shows a trip.
 */
const KEY = 'opentabletop.trip.folds'
const TAB_KEY = 'opentabletop.trip.tab'

function read(): Record<string, boolean> {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? '{}') as unknown
    return typeof raw === 'object' && raw !== null && !Array.isArray(raw)
      ? (raw as Record<string, boolean>)
      : {}
  } catch {
    return {}
  }
}

class Folds {
  /** Whether each section is open, by id; a section not here is as it starts. */
  open = $state<Record<string, boolean>>(read())

  isOpen(id: string, start = true): boolean {
    return this.open[id] ?? start
  }

  toggle(id: string, start = true): void {
    this.open = { ...this.open, [id]: !this.isOpen(id, start) }
    try {
      localStorage.setItem(KEY, JSON.stringify(this.open))
    } catch {
      // No storage (private mode…): it stays as it is until the page reloads.
    }
  }
}

export const folds = new Folds()

/** The trip panel's tab, under what the last step did. */
export type TripTab = 'party' | 'journal' | 'totals'

class Tab {
  /** The tab chosen last (absent: the panel's first). */
  chosen = $state<TripTab | undefined>(readTab())

  choose(tab: TripTab): void {
    this.chosen = tab
    try {
      localStorage.setItem(TAB_KEY, tab)
    } catch {
      // No storage: it stays until the page reloads.
    }
  }
}

function readTab(): TripTab | undefined {
  try {
    const raw = localStorage.getItem(TAB_KEY)
    return raw === 'party' || raw === 'journal' || raw === 'totals' ? raw : undefined
  } catch {
    return undefined
  }
}

export const tripTab = new Tab()
