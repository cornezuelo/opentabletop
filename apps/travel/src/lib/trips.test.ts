import { describe, expect, it } from 'vitest'
import { readTrips } from './trip.svelte'

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
    const { trips, current } = readTrips(storage({ 'opentabletop.travel.trip': old }))
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
    const read = readTrips(storage({ 'opentabletop.travel.trips': stored }))
    expect(read.trips.map((t) => t.id)).toEqual(['a', 'b'])
    expect(read.current).toBe('b')
    expect(
      readTrips(storage({ 'opentabletop.travel.trips': { ...stored, current: 'gone' } })).current,
    ).toBe('a')
  })

  it('starts with one empty trip', () => {
    const { trips } = readTrips(storage({}))
    expect(trips).toHaveLength(1)
    expect(trips[0].session).toBeNull()
  })
})
