import { notableLines, type JournalEntry, type SessionState } from '@open-tabletop/session'

/** How a march of several places is told: all at once, or one place after another. */
export type Pace = 'instant' | 'quick' | 'slow'

export const PACES: readonly Pace[] = ['instant', 'quick', 'slow']

/** How long each place of a march is shown before the next, by pace (ms). */
export const PACE_MS: Record<Pace, number> = { instant: 0, quick: 450, slow: 1100 }

/**
 * A step being told one place at a time: the session is already where the step left it, and
 * only what's shown of it (the journal, where the party stands, the time) follows the telling.
 */
export interface Telling {
  /** The trip told (`tripKey`): another trip's session is shown as it is. */
  trip: string
  /** The first line the step wrote (its index in the journal). */
  from: number
  /** How many of the journal's lines are shown. */
  shown: number
  /** How many are shown next, one after another; the last is the whole step. */
  stops: number[]
  /** Where the party stood and when, before the step. */
  start: { location: string; time: number }
  /** Waiting for **Continue** on an important moment, with more of the step to tell. */
  holding: boolean
}

/** A trip told apart from another: its first line's real time. */
export const tripKey = (session: SessionState): string => session.journal[0]?.at ?? ''

/**
 * Where a step's lines (from `from` on) stop to be told: before each place entered after the
 * first, and at its end.
 */
export function stopsOf(journal: readonly JournalEntry[], from: number): number[] {
  const entered: number[] = []
  for (let i = from; i < journal.length; i++)
    if (journal[i]!.code === 'PLACE_ENTERED') entered.push(i)
  return [...entered.slice(1), journal.length]
}

/** Whether lines `[at, to)` of what's told have an important one (seen from `from` on). */
function notableIn(
  journal: readonly JournalEntry[],
  from: number,
  at: number,
  to: number,
): boolean {
  const told = journal.slice(from, to)
  const ids = new Set(journal.slice(at, to).map((e) => e.id))
  return notableLines(told).some((e) => ids.has(e.id))
}

/**
 * The telling of a step from `before` to `after`: none when it went through fewer than two
 * places. A step after another still being told is told after it (a moment the world brought).
 */
export function startTelling(
  before: SessionState,
  after: SessionState,
  current?: Telling | null,
): Telling | null {
  const trip = tripKey(after)
  const { journal } = after
  const end = current?.stops.at(-1)
  if (current && current.trip === trip && end !== undefined && journal.length >= end) {
    const more = stopsOf(journal, end).filter((s) => s > end)
    return { ...current, stops: [...current.stops, ...more] }
  }
  const from = before.journal.length
  const stops = stopsOf(journal, from)
  if (stops.length < 2) return null
  const shown = stops[0]!
  return {
    trip,
    from,
    shown,
    stops: stops.slice(1),
    start: { location: before.travel.location, time: before.travel.time },
    holding: notableIn(journal, from, from, shown),
  }
}

/**
 * The telling one place on: the next lines shown, holding on an important one while there's
 * more to tell; none once all is told.
 */
export function tellOn(telling: Telling, journal: readonly JournalEntry[]): Telling | null {
  const [next, ...stops] = telling.stops
  if (next === undefined || !stops.length) return null
  return {
    ...telling,
    shown: next,
    stops,
    holding: notableIn(journal, telling.from, telling.shown, next),
  }
}

/**
 * The session as it's told so far: the journal up to what's shown, the party where it entered
 * last and at that line's time; what the step left waiting (a pause, a check, a roll, a fight)
 * comes once it's all told.
 */
export function tellingView(session: SessionState, telling: Telling | null): SessionState {
  if (!telling || telling.trip !== tripKey(session) || telling.shown >= session.journal.length)
    return session
  const journal = session.journal.slice(0, telling.shown)
  const told = journal.slice(telling.from)
  const entered = told.findLast((e) => e.code === 'PLACE_ENTERED')
  const travel = {
    ...session.travel,
    location: entered ? String(entered.data?.place) : telling.start.location,
    time: told.at(-1)?.time ?? telling.start.time,
    progress: 0,
    pendingChecks: [],
  }
  delete travel.waiting
  const view: SessionState = { ...session, journal, travel }
  delete view.encounter
  delete view.yours
  // The step the shown lines belong to is the last one shown.
  const first = journal[telling.from]
  if (first && view.lastStep !== undefined && view.lastStep > Number(first.id.slice(1)))
    view.lastStep = Number(first.id.slice(1))
  return view
}
