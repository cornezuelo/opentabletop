import { afterEach, describe, expect, it, vi } from 'vitest'
import type { JournalEntry, SessionState } from '@open-tabletop/session'
import { startTelling, stopsOf, tellingView, tellOn } from './pace'
import { pacing } from './pacing.svelte'

/** A journal line: its number, code and data. */
const line = (n: number, code: string, data?: Record<string, unknown>): JournalEntry => ({
  id: `j${n}`,
  time: n * 10,
  at: n === 1 ? 'trip' : `t${n}`,
  source: 'travel',
  code,
  ...(data && { data }),
})

/** A session standing at `location` with these lines. */
const session = (journal: JournalEntry[], location = 'a', extra: Partial<SessionState> = {}) =>
  ({
    journal,
    travel: { location, time: journal.at(-1)?.time ?? 0, progress: 30, pendingChecks: [] },
    ...extra,
  }) as unknown as SessionState

const before = session([line(1, 'TRIP_STARTED')])
/** A march through b, c and d, a result on the way at c. */
const marched = (notable = false) =>
  session(
    [
      line(1, 'TRIP_STARTED'),
      line(2, 'ACTION_TAKEN'),
      line(3, 'PLACE_ENTERED', { place: 'b' }),
      line(4, 'PLACE_ENTERED', { place: 'c' }),
      line(5, 'ORACLE_RESULT', { value: notable ? { notable: true } : {} }),
      line(6, 'PLACE_ENTERED', { place: 'd' }),
      line(7, 'CHECK_PAUSED'),
    ],
    'd',
    {
      lastStep: 2,
      travel: {
        location: 'd',
        time: 70,
        progress: 30,
        pendingChecks: [{ id: 'c1', event: 'X', context: {} }],
      },
    } as Partial<SessionState>,
  )

describe('a march told a place at a time', () => {
  afterEach(() => {
    pacing.finish()
    vi.useRealTimers()
  })

  it('stops before each place entered after the first, and at the end', () => {
    expect(stopsOf(marched().journal, 1)).toEqual([3, 5, 7])
  })

  it('is told only when it went through two places or more', () => {
    const one = session([line(1, 'TRIP_STARTED'), line(2, 'PLACE_ENTERED', { place: 'b' })], 'b')
    expect(startTelling(before, one)).toBeNull()
    expect(startTelling(before, marched())).toMatchObject({ from: 1, shown: 3, stops: [5, 7] })
  })

  it('shows the journal, the place and the time as told, and what waits at the end', () => {
    const after = marched()
    let telling = startTelling(before, after)!
    let view = tellingView(after, telling)
    expect(view.journal.map((e) => e.id)).toEqual(['j1', 'j2', 'j3'])
    expect(view.travel).toMatchObject({ location: 'b', time: 30, progress: 0 })
    // The pause the march ended on waits until it's all told.
    expect(view.travel.pendingChecks).toEqual([])
    expect(view.lastStep).toBe(2)
    telling = tellOn(telling, after.journal)!
    view = tellingView(after, telling)
    expect(view.travel.location).toBe('c')
    expect(view.journal).toHaveLength(5)
    // Told to its end, the session is shown as it is.
    expect(tellOn(telling, after.journal)).toBeNull()
    // Another trip's session isn't touched.
    const other = session([{ ...line(1, 'TRIP_STARTED'), at: 'other' }])
    expect(tellingView(other, telling)).toBe(other)
  })

  it('holds on an important moment on the way, until Continue', () => {
    const after = marched(true)
    const telling = startTelling(before, after)!
    expect(telling.holding).toBe(false)
    const atC = tellOn(telling, after.journal)!
    expect(atC.holding).toBe(true)
  })

  it('goes on by itself at the pace chosen, holds, and is told at once when asked', () => {
    vi.useFakeTimers()
    pacing.setPace('quick')
    const after = marched(true)
    pacing.tell(before, after)
    const seen: string[] = []
    const stop = pacing.listen(() => seen.push(pacing.view(after).travel.location))
    expect(pacing.view(after).travel.location).toBe('b')
    expect(pacing.tells(after)).toBe(true)
    vi.advanceTimersByTime(500)
    // At c an important result: it waits.
    expect(pacing.view(after).travel.location).toBe('c')
    expect(pacing.holds(after)).toBe(true)
    vi.advanceTimersByTime(5000)
    expect(pacing.view(after).travel.location).toBe('c')
    pacing.resume()
    vi.advanceTimersByTime(500)
    expect(pacing.view(after)).toBe(after)
    expect(pacing.tells(after)).toBe(false)
    expect(seen).toEqual(['c', 'c', 'd'])
    // Told again, Tell it all shows the rest at once.
    pacing.tell(before, after)
    pacing.finish()
    expect(pacing.view(after)).toBe(after)
    stop()
  })

  it('tells nothing a place at a time when the player chose at once', () => {
    pacing.setPace('instant')
    pacing.tell(before, marched())
    expect(pacing.tells(marched())).toBe(false)
    pacing.setPace('quick')
  })
})
