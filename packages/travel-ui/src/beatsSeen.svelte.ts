import type { JournalEntry, SessionState } from '@open-tabletop/session'
import { lastNotableBeat, type Beat } from './beats'

/**
 * The important moments shown up front: whether each waits for **Continue** (a preference of
 * this browser, `opentabletop.trip.beats`, shared by every app that plays a trip), and those
 * put away since the page opened.
 */
const BEATS_KEY = 'opentabletop.trip.beats'

class BeatsSeen {
  /** Every important moment waits for Continue, not only the pauses. */
  stop = $state(readStop())
  /** The moments put away, by trip and moment (`seenKey`). */
  private seen = $state<string[]>([])

  /** Whether a trip's moment (its first line) was put away. */
  isSeen(session: SessionState, first: JournalEntry): boolean {
    return this.seen.includes(seenKey(session, first))
  }

  /** The important moment the last step ended on, while it isn't put away. */
  showing(session: SessionState): Beat<JournalEntry> | undefined {
    const beat = lastNotableBeat(session)
    return beat && !this.isSeen(session, beat.entries[0]!) ? beat : undefined
  }

  /** Whether the trip waits for its important moment to be put away (the player chose so). */
  holds(session: SessionState): boolean {
    return this.stop && !!this.showing(session)
  }

  putAway(session: SessionState, first: JournalEntry): void {
    this.seen = [...this.seen.slice(-49), seenKey(session, first)]
  }

  setStop(on: boolean): void {
    this.stop = on
    try {
      localStorage.setItem(BEATS_KEY, JSON.stringify({ stop: on }))
    } catch {
      // No storage: it stays until the page reloads.
    }
  }
}

/** A moment of a trip told apart from another trip's: the trip's first line's real time and its own. */
const seenKey = (session: SessionState, first: JournalEntry) =>
  `${session.journal[0]?.at ?? ''}|${first.id}|${first.at}`

function readStop(): boolean {
  try {
    return (JSON.parse(localStorage.getItem(BEATS_KEY) ?? '{}') as { stop?: unknown }).stop === true
  } catch {
    return false
  }
}

export const beatsSeen = new BeatsSeen()
