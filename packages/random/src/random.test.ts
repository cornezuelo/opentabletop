import { describe, expect, it } from 'vitest'
import { fromState, randomInt, seeded, sequence, shuffled, weightedIndex } from './index'

describe('seeded', () => {
  it('is deterministic per seed and differs between seeds', () => {
    const a = seeded(42)
    const b = seeded(42)
    const c = seeded(43)
    const take = (r: { next(): number }) => Array.from({ length: 5 }, () => r.next())
    const first = take(a)
    expect(take(b)).toEqual(first)
    expect(take(c)).not.toEqual(first)
    expect(first.every((n) => n >= 0 && n < 1)).toBe(true)
  })

  it('accepts string seeds', () => {
    expect(seeded('kal-arath').next()).toBe(seeded('kal-arath').next())
    expect(seeded('kal-arath').next()).not.toBe(seeded('kal-arathi').next())
  })

  it('can be saved and resumed from its state', () => {
    const r = seeded(7)
    r.next()
    r.next()
    const resumed = fromState(r.state)
    expect(resumed.next()).toBe(r.next())
  })

  it('is roughly uniform', () => {
    const r = seeded(1)
    const counts = [0, 0, 0, 0, 0, 0]
    for (let i = 0; i < 60000; i++) counts[randomInt(r, 1, 6) - 1]++
    for (const count of counts) expect(Math.abs(count - 10000)).toBeLessThan(500)
  })
})

describe('helpers', () => {
  it('randomInt maps the unit interval onto inclusive bounds', () => {
    expect(randomInt(sequence([0]), 1, 6)).toBe(1)
    expect(randomInt(sequence([0.9999]), 1, 6)).toBe(6)
  })

  it('shuffled keeps every item and is deterministic', () => {
    const items = ['a', 'b', 'c', 'd', 'e']
    const out = shuffled(seeded(3), items)
    expect([...out].sort()).toEqual(items)
    expect(shuffled(seeded(3), items)).toEqual(out)
    expect(items).toEqual(['a', 'b', 'c', 'd', 'e'])
  })

  it('weightedIndex follows the weights', () => {
    expect(weightedIndex(sequence([0.1]), [1, 1])).toBe(0)
    expect(weightedIndex(sequence([0.6]), [1, 1])).toBe(1)
    expect(weightedIndex(sequence([0.99]), [5, 0, 1])).toBe(2)
    expect(weightedIndex(sequence([0.5]), [0, 0])).toBe(-1)
  })

  it('sequence throws when exhausted', () => {
    const r = sequence([0.5])
    r.next()
    expect(() => r.next()).toThrow()
  })
})
