import type { RollWay, SessionState } from '@open-tabletop/session'

/**
 * Who rolls the trip's dice, as the player last chose it in a trip's **Rolls** (a preference
 * of this browser, `opentabletop.trip.rolls`, shared by every app that plays a trip): each
 * trip keeps its own, and a new trip starts with the last one chosen.
 */
const ROLLS_KEY = 'opentabletop.trip.rolls'

const WAYS: readonly RollWay[] = ['matters', 'all']

/** The way of rolling a trip has now, remembered for the next new trip. */
export function setRollWay(session: SessionState, way: RollWay | undefined): SessionState {
  try {
    localStorage.setItem(ROLLS_KEY, JSON.stringify({ way: way ?? null }))
  } catch {
    // No storage: new trips start with the computer rolling.
  }
  const next = { ...session }
  if (way) next.rollWay = way
  else delete next.rollWay
  return next
}

/** A new trip with the way of rolling last chosen (none: the computer rolls everything). */
export function withLastRollWay(session: SessionState): SessionState {
  try {
    const way = (JSON.parse(localStorage.getItem(ROLLS_KEY) ?? '{}') as { way?: unknown }).way
    return WAYS.includes(way as RollWay) ? { ...session, rollWay: way as RollWay } : session
  } catch {
    return session
  }
}
