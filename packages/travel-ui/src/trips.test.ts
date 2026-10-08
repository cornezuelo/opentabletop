import { GENERIC_SYSTEM, type TravelSystem } from '@open-tabletop/session'
import { describe, expect, it, vi } from 'vitest'
import { readTrips, TripStore } from './trips.svelte'

const KEY = 'opentabletop.travel.trips'
const OLD_KEY = 'opentabletop.travel.trip'
const way = [{ terrain: 'plains', tags: [], edges: [] }]
const storage = (data: Record<string, unknown>) => ({
  getItem: (k: string) => (k in data ? JSON.stringify(data[k]) : null),
})

describe('saved trips', () => {
  it('migrates the single trip of older versions', () => {
    const old = {
      system: 'grey-marches',
      season: 'autumn',
      hexKm: 10,
      way,
      startDay: 181,
      session: null,
    }
    const { trips, current } = readTrips(KEY, OLD_KEY, storage({ 'opentabletop.travel.trip': old }))
    expect(trips).toHaveLength(1)
    expect(trips[0]).toMatchObject({ ...old, name: '' })
    expect(current).toBe(trips[0].id)
  })

  it('keeps every trip and which one is open, dropping broken ones', () => {
    const a = {
      id: 'a',
      name: 'North',
      system: 'generic',
      season: 'spring',
      hexKm: 10,
      way,
      startDay: 1,
      session: null,
    }
    const b = { ...a, id: 'b', name: 'South' }
    const stored = { version: 1, current: 'b', trips: [a, { id: 'x' }, b] }
    const read = readTrips(KEY, OLD_KEY, storage({ 'opentabletop.travel.trips': stored }))
    expect(read.trips.map((t) => t.id)).toEqual(['a', 'b'])
    expect(read.current).toBe('b')
    expect(
      readTrips(
        KEY,
        OLD_KEY,
        storage({ 'opentabletop.travel.trips': { ...stored, current: 'gone' } }),
      ).current,
    ).toBe('a')
  })

  it('starts with one empty trip', () => {
    const { trips } = readTrips(KEY, OLD_KEY, storage({}))
    expect(trips).toHaveLength(1)
    expect(trips[0].session).toBeNull()
  })
})

describe('a trip store', () => {
  const memory = new Map<string, string>()
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => memory.get(k) ?? null,
    setItem: (k: string, v: string) => memory.set(k, v),
    removeItem: (k: string) => memory.delete(k),
  })

  it('plays the rules as they are at every step, and keeps its trips under its own key', () => {
    let system: TravelSystem = GENERIC_SYSTEM
    const store = new TripStore({
      key: 'opentabletop.test.trips',
      systems: () => [system],
      oracle: () => undefined,
      locale: () => 'en',
    })
    for (let i = 0; i < 7; i++) store.addHex()
    store.start('generic', 'spring')
    expect(store.saved.session?.travel.destination).toBe('7')
    store.step({ type: 'travel' })
    expect(store.location).toBeGreaterThan(0)
    const reached = store.location

    // The rules change while the trip goes on (as in the Systems app's Try it tab): plains
    // can't be crossed any more, so the next step doesn't move the party.
    const rules = GENERIC_SYSTEM.rules
    system = {
      ...GENERIC_SYSTEM,
      rules: {
        ...rules,
        terrains: { ...rules.terrains, plains: { ...rules.terrains.plains, passable: false } },
      },
    }
    const time = store.saved.session!.travel.time
    store.step({ type: 'wait', until: time + 24 * 60 })
    store.step({ type: 'travel' })
    expect(store.location).toBe(reached)
    expect(store.saved.session!.journal.map((e) => e.code)).toContain('ROUTE_BLOCKED')
    expect(JSON.parse(memory.get('opentabletop.test.trips')!).trips).toHaveLength(1)
    expect(memory.has('opentabletop.travel.trips')).toBe(false)
  })

  it('plays at the system’s scale when it sets one, else at the way’s', () => {
    const rules = GENERIC_SYSTEM.rules
    let system: TravelSystem = {
      ...GENERIC_SYSTEM,
      rules: { ...rules, travel: { hoursPerDay: 8 } },
    }
    const store = new TripStore({
      key: 'opentabletop.test.scale',
      systems: () => [system],
      oracle: () => undefined,
      locale: () => 'en',
    })
    store.setHexKm(25)
    expect(store.hexKm).toBe(25)
    system = { ...system, rules: { ...rules, travel: { hoursPerDay: 8, hexKm: 30 } } }
    expect(store.hexKm).toBe(30)
    // A day on foot (30 km in the generic rules) crosses at most one 30 km hex.
    for (let i = 0; i < 5; i++) store.addHex()
    store.start('generic', 'spring')
    store.step({ type: 'travel' })
    expect(store.location).toBeLessThanOrEqual(1)
  })
})
