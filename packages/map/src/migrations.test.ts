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
    // …which since v25 are its campaign's, handed over by `readMap`.
    expect(data.meta).toEqual({})
    expect(data).toMatchObject({ system: 'grey-marches', packs: ['core', 'grey-marches'] })
    expect(data.play).toEqual(play)
    // The generic system is no choice; a map without a trip has none.
    const generic = { ...play, rules: { ...play.rules, system: 'generic' } }
    expect(migrate({ version: 13, meta: {}, play: generic })).not.toHaveProperty('system')
    expect(migrate({ version: 13, meta: {} })).not.toHaveProperty('system')
  })
})

describe('a cell’s km (v32)', () => {
  it('the scale’s `hexKm` is `cellKm`', () => {
    expect(migrate({ version: 31, scale: { hexKm: 3 } }).scale).toEqual({ cellKm: 3 })
    expect(migrate({ version: 31, scale: {} }).scale).toEqual({})
  })
})

describe('a sub-map’s ways (v34)', () => {
  it('its one way in becomes a list of one', () => {
    const parent = { map: 'up', place: '3,3', entrance: '0,1', kind: 'way-in' }
    const meta = migrate({ version: 33, meta: { id: 'down', parent } }).meta
    expect(meta).toEqual({
      id: 'down',
      parent: { map: 'up', ways: [{ place: '3,3', entrance: '0,1', kind: 'way-in' }] },
    })
    expect(migrate({ version: 33, meta: { id: 'top' } }).meta).toEqual({ id: 'top' })
  })
})

describe('the map’s scale (v15)', () => {
  it('the old default, 10 km, becomes the system’s; a scale chosen stays', () => {
    expect(migrate({ version: 14, scale: { hexKm: 10 } }).scale).toEqual({})
    expect(migrate({ version: 14, scale: { hexKm: 30 } }).scale).toEqual({ cellKm: 30 })
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
      places: 2,
      km: 20,
      marched: 0,
      taken: { camp: 2, eat: 1 },
      checks: 0,
      spent: {},
      gained: {},
    })
    expect(migrate({ version: 15, meta: {} })).toEqual({ version: CURRENT_VERSION, meta: {} })
  })

  it('v17 reads older trips as a party without characters', () => {
    const data = { version: 16, play: { rules: { session: { travel: {} } } } }
    expect(migrate(data)).toEqual({ ...data, version: CURRENT_VERSION })
  })
  it('v21 drops Play’s Show relations: the relations are a layer, hidden until shown', () => {
    const data = { version: 20, play: { mode: 'rules', showRelations: false, trail: [] } }
    expect(migrate(data)).toEqual({ version: CURRENT_VERSION, play: { mode: 'rules', trail: [] } })
  })
  it('v22 reads the built-in Generic rules as Core’s system, their sheets as Core’s', () => {
    const hero = (sheet: string) => ({ id: 'a', sheet, values: {}, conditions: {}, tags: [] })
    const data = {
      version: 21,
      tokens: [{ id: 't', kind: 'pc', character: hero('generic/character') }, { id: 'u' }],
      play: {
        rules: {
          system: 'generic',
          members: [hero('generic/character')],
          session: { travel: {}, party: hero('generic/party'), members: [hero('game/hero')] },
        },
      },
    }
    const read = migrate(data) as typeof data
    expect(read.version).toBe(CURRENT_VERSION)
    expect(read.tokens[0].character?.sheet).toBe('core/character')
    expect(read.tokens[1]).toEqual({ id: 'u' })
    expect(read.play.rules.system).toBe('core')
    expect(read.play.rules.members[0].sheet).toBe('core/character')
    expect(read.play.rules.session.party.sheet).toBe('core/party')
    expect(read.play.rules.session.members[0].sheet).toBe('game/hero')
    // A trip with another system keeps it.
    const other = { version: 21, play: { rules: { system: 'grey-marches' } } }
    expect(migrate(other)).toEqual({ ...other, version: CURRENT_VERSION })
  })
  it('v26 drops the party token’s key-values, keeping the other tokens’', () => {
    const fare = [{ key: 'fare', value: '2' }]
    const data = {
      version: 25,
      tokens: [
        { id: 'p', kind: 'party', fields: [{ key: 'morale', value: '5' }] },
        { id: 'n', kind: 'npc', fields: fare },
      ],
    }
    expect(migrate(data)).toEqual({
      version: CURRENT_VERSION,
      tokens: [
        { id: 'p', kind: 'party' },
        { id: 'n', kind: 'npc', fields: fare },
      ],
    })
  })
  it('v28 says places where a trip said hexes: journal, actions, routes and totals', () => {
    const journal = [
      { code: 'HEX_ENTERED', data: { hex: '1,0', time: 5 } },
      { code: 'ACTION_TAKEN', data: { action: 'camp', hex: '1,0' } },
      { code: 'ROUTE_PLANNED', data: { to: '3,0', hexes: 2 } },
      { code: 'DESTINATION_REACHED', data: { hex: '3,0' } },
      { code: 'NOTE', text: 'by the hex' },
    ]
    const totals = { hexes: 3, marched: 60, taken: {}, checks: 0, spent: {}, gained: {} }
    const play = { rules: { session: { travel: { totals }, journal } } }
    const data = migrate({ version: 27, scale: { hexKm: 6 }, play }) as { play: typeof play }
    const session = data.play.rules.session
    expect(session.journal).toEqual([
      { code: 'PLACE_ENTERED', data: { place: '1,0', time: 5 } },
      { code: 'ACTION_TAKEN', data: { action: 'camp', place: '1,0' } },
      { code: 'ROUTE_PLANNED', data: { to: '3,0', places: 2 } },
      { code: 'DESTINATION_REACHED', data: { place: '3,0' } },
      { code: 'NOTE', text: 'by the hex' },
    ])
    expect(session.travel.totals).toEqual({ ...totals, hexes: undefined, places: 3, km: 18 })
  })
})
