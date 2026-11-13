import type { SessionState } from '@open-tabletop/session'
import {
  PACE_MS,
  PACES,
  startTelling,
  tellingView,
  tellOn,
  tripKey,
  type Pace,
  type Telling,
} from './pace'

/**
 * A march told one place at a time (`pace`, a preference of this browser shared by every app
 * that plays a trip, `opentabletop.trip.pace`): the host tells a step it played (`tell`) and
 * shows its session through `view`; the session itself is already where the step left it.
 */
const PACE_KEY = 'opentabletop.trip.pace'

class Pacing {
  pace = $state<Pace>(readPace())
  telling = $state<Telling | null>(null)
  private timer: ReturnType<typeof setTimeout> | undefined
  private journal: SessionState['journal'] = []
  private listeners = new Set<() => void>()

  /** A step was played, from `before` to `after`: told a place at a time, at the chosen pace. */
  tell(before: SessionState, after: SessionState): void {
    if (this.pace === 'instant') return this.finish()
    const next = startTelling(before, after, this.telling)
    if (!next) return this.finish()
    this.journal = after.journal
    this.set(next)
  }

  /** The session as it's told so far (as it is when nothing is being told of it). */
  view(session: SessionState): SessionState {
    return tellingView(session, this.telling)
  }

  /** Whether this trip's step is being told. */
  tells(session: SessionState): boolean {
    return !!this.telling && this.telling.trip === tripKey(session)
  }

  /** Whether the telling of this trip waits on an important moment for **Continue**. */
  holds(session: SessionState): boolean {
    return this.tells(session) && !!this.telling?.holding
  }

  /** The telling goes on past the important moment it held on. */
  resume(): void {
    if (this.telling?.holding) this.set({ ...this.telling, holding: false })
  }

  /** Everything is told at once (the player acts, or skips it). */
  finish(): void {
    clearTimeout(this.timer)
    if (!this.telling) return
    this.telling = null
    this.changed()
  }

  setPace(pace: Pace): void {
    this.pace = pace
    if (pace === 'instant') this.finish()
    try {
      localStorage.setItem(PACE_KEY, JSON.stringify({ pace }))
    } catch {
      // No storage: it stays until the page reloads.
    }
  }

  /** Called each time what's told changes (a map moves the party's token with it). */
  listen(listener: () => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  private set(telling: Telling | null): void {
    clearTimeout(this.timer)
    this.telling = telling
    this.changed()
    if (!telling || telling.holding) return
    this.timer = setTimeout(() => {
      if (this.telling) this.set(tellOn(this.telling, this.journal))
    }, PACE_MS[this.pace])
  }

  private changed(): void {
    for (const listener of this.listeners) listener()
  }
}

function readPace(): Pace {
  try {
    const pace = (JSON.parse(localStorage.getItem(PACE_KEY) ?? '{}') as { pace?: unknown }).pace
    return PACES.includes(pace as Pace) ? (pace as Pace) : 'quick'
  } catch {
    return 'quick'
  }
}

export const pacing = new Pacing()
