import { describe, expect, it } from 'vitest'
import { CURRENT_VERSION } from './defaults'
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
    expect(data.version).toBe(CURRENT_VERSION)
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

describe('the map’s scale (v15)', () => {
  it('the old default, 10 km, becomes the system’s; a scale chosen stays', () => {
    expect(migrate({ version: 14, scale: { hexKm: 10 } }).scale).toEqual({})
    expect(migrate({ version: 14, scale: { hexKm: 30 } }).scale).toEqual({ hexKm: 30 })
  })
})

describe('the trip’s totals (v16)', () => {
  it('rebuilds hexes entered and actions taken from the journal; the rest counts from now', () => {
    const journal = [
      { code: 'HEX_ENTERED', data: { hex: '1,0' } },
      { code: 'HEX_ENTERED', data: { hex: '2,0' } },
      { code: 'ACTION_TAKEN', data: { action: 'camp' } },
      { code: 'ACTION_TAKEN', data: { action: 'eat', on: 'day-end' } },
      { code: 'ACTION_TAKEN', data: { action: 'camp' } },
    ]
    const play = { rules: { system: 'generic', session: { travel: { day: 3 }, journal } } }
    const data = migrate({ version: 15, play }) as { play: typeof play }
    expect((data.play.rules.session.travel as Record<string, unknown>).totals).toEqual({
      hexes: 2,
      marched: 0,
      taken: { camp: 2, eat: 1 },
      checks: 0,
      spent: {},
      gained: {},
    })
    expect(migrate({ version: 15, meta: {} })).toEqual({ version: 16, meta: {} })
  })
})
