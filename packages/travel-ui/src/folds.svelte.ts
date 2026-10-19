/**
 * Which sections of the trip panel each viewer keeps folded: a preference of this browser
 * (`opentabletop.trip.folds`), shared by every app that shows a trip.
 */
const KEY = 'opentabletop.trip.folds'

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
