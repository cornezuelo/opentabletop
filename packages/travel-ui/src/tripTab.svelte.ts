/**
 * Which of the trip panel's tabs is open: a preference of this browser
 * (`opentabletop.trip.tab`), shared by every app that shows a trip.
 */
const TAB_KEY = 'opentabletop.trip.tab'

/** The trip panel's tab, under its status and buttons. */
export type TripTab = 'party' | 'journal' | 'totals' | 'options'

class Tab {
  /** The tab chosen last (absent: the panel's first). */
  chosen = $state<TripTab | undefined>(readTab())
  /**
   * Who to show in the Party tab (a token clicked on the map, a row of the party at a
   * glance): one present, a character of the party, or the party's own sheet (`party`); its
   * card unfolded and scrolled to. `n` counts the asks, so the same one can be asked again.
   */
  shown = $state<{ id: string; n: number } | undefined>()

  choose(tab: TripTab): void {
    this.chosen = tab
    try {
      localStorage.setItem(TAB_KEY, tab)
    } catch {
      // No storage: it stays until the page reloads.
    }
  }
}

/**
 * Shows one in the Party tab, its card unfolded and scrolled to: one of those present, a
 * character of the party, or the party's own sheet (`party`).
 */
export function showInParty(id: string): void {
  tripTab.choose('party')
  tripTab.shown = { id, n: (tripTab.shown?.n ?? 0) + 1 }
}

function readTab(): TripTab | undefined {
  try {
    const raw = localStorage.getItem(TAB_KEY)
    return raw === 'party' || raw === 'journal' || raw === 'totals' || raw === 'options'
      ? raw
      : undefined
  } catch {
    return undefined
  }
}

export const tripTab = new Tab()
