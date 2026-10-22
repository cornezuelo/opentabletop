/**
 * Which of the trip panel's tabs is open: a preference of this browser
 * (`opentabletop.trip.tab`), shared by every app that shows a trip.
 */
const TAB_KEY = 'opentabletop.trip.tab'

/** The trip panel's tab, under its status and buttons. */
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
