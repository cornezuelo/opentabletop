import { describe, expect, it } from 'vitest'
import { migrate } from './migrations'

describe('trip migrations', () => {
  it('moves fatigue to the stats and being lost to the day values (v10 → v14)', () => {
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
    expect(data.version).toBe(14)
    expect(data.play.rules.session).toEqual({
      travel: { location: '1,1', today: { lost: true }, yesterday: { lost: false } },
      stats: { fatigue: 2 },
    })
  })

  it("the system a trip plays becomes the map's (v13 → v14); its packs stay as they were", () => {
    const play = { mode: 'rules', trail: [], rules: { system: 'grey-marches', startDay: 1 } }
    const data = migrate({ version: 13, meta: { packs: ['core', 'grey-marches'] }, play })
    expect(data.meta).toEqual({ system: 'grey-marches', packs: ['core', 'grey-marches'] })
    expect(data.play).toEqual(play)
    // The generic system is no choice; a map without a trip has none.
    const generic = { ...play, rules: { ...play.rules, system: 'generic' } }
    expect(migrate({ version: 13, meta: {}, play: generic }).meta).toEqual({})
    expect(migrate({ version: 13, meta: {} }).meta).toEqual({})
  })
})
