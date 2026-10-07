import { describe, expect, it } from 'vitest'
import { migrate } from './migrations'

describe('trip migrations', () => {
  it('moves fatigue to the stats and being lost to the day values (v10 → v12)', () => {
    const data = migrate({
      version: 10,
      play: {
        mode: 'rules',
        trail: [],
        rules: {
          system: 'generic',
          startDay: 1,
          session: {
            travel: { location: '1,1', fatigue: 2, lostToday: true, lostYesterday: false },
            stats: {},
          },
        },
      },
    }) as { version: number; play: { rules: { session: Record<string, unknown> } } }
    expect(data.version).toBe(12)
    expect(data.play.rules.session).toEqual({
      travel: { location: '1,1', today: { lost: true }, yesterday: { lost: false } },
      stats: { fatigue: 2 },
    })
  })
})
