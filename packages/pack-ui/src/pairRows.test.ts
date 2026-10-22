import { describe, expect, it } from 'vitest'
import { addPair, pairRows, rowsPairs, setPair } from './pairRows'

describe('pairRows', () => {
  it('reads a map of plain values as rows, in order', () => {
    expect(pairRows({ 'party.stats.fatigue': 1, 'world.clocks.siege': '=0', lost: true })).toEqual([
      ['party.stats.fatigue', 1],
      ['world.clocks.siege', '=0'],
      ['lost', true],
    ])
    expect(pairRows(undefined)).toEqual([])
  })

  it('has no rows for values it cannot show', () => {
    expect(pairRows({ danger: { gte: 2 } })).toBeNull()
    expect(pairRows({ terrain: ['forest', 'hills'] })).toBeNull()
    expect(pairRows([1, 2])).toBeNull()
  })

  it('writes the rows back as the same map, none as no map', () => {
    const map = { 'party.resources.food': -1, timeOfDay: 'night' }
    expect(rowsPairs(pairRows(map)!)).toEqual(map)
    expect(rowsPairs([])).toBeUndefined()
  })

  it('renames a row in its place, refuses a key already there, removes on an empty key', () => {
    const rows = pairRows({ a: 1, b: 2, c: 3 })!
    expect(setPair(rows, 1, 'z', 5)).toEqual([
      ['a', 1],
      ['z', 5],
      ['c', 3],
    ])
    expect(setPair(rows, 1, 'c', 2)).toBeNull()
    expect(setPair(rows, 1, '', 2)).toEqual([
      ['a', 1],
      ['c', 3],
    ])
  })

  it('adds a row with the first suggested key not used yet', () => {
    expect(addPair([['a', 1]], ['a', 'b'], 1)).toEqual([
      ['a', 1],
      ['b', 1],
    ])
    expect(addPair([['new', 1]], ['new'], true)).toEqual([
      ['new', 1],
      ['new2', true],
    ])
  })
})
