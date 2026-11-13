import type { SessionState } from '@open-tabletop/session'
import { describe, expect, it } from 'vitest'
import { translator } from './i18n'
import { tripWaits } from './waits'

describe('what the trip waits for', () => {
  const t = translator(() => 'en')
  const context = {
    t,
    startDay: 1,
    hexLabel: (h: string) => h,
    nameOf: (id: string) => id,
    checkName: (event: string) => (event === 'OMEN' ? 'Omens' : undefined),
  }
  const check = { id: 'c1', event: 'OMEN', context: {} }
  const session = (more: Partial<SessionState>) =>
    ({ travel: { pendingChecks: [check], time: 0 }, ...more }) as unknown as SessionState

  it("a roll of the player's: what to roll, with nothing to press over the map", () => {
    const yours = session({ yours: [{ id: 'c1', table: 'p/omens', dice: '1d6' }] })
    expect(tripWaits(yours, context, t)).toEqual({ text: 'Omens: your roll (1d6)' })
    // A plain pending check goes on with Continue.
    expect(tripWaits(session({}), context, t)?.go).toEqual({ type: 'resolveCheck', id: 'c1' })
  })
})
