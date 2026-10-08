import { describe, expect, it } from 'vitest'
import { matches, resolvePath, validateCondition, type Condition } from './index'

const ctx = {
  terrain: 'forest',
  danger: 4,
  season: 'autumn',
  lost: false,
  tags: ['ruins', 'haunted'],
  party: { stats: { pre: 2 } },
}

describe('matches', () => {
  it('handles equality, membership and missing conditions', () => {
    expect(matches(undefined, ctx)).toBe(true)
    expect(matches({ terrain: 'forest' }, ctx)).toBe(true)
    expect(matches({ terrain: 'desert' }, ctx)).toBe(false)
    expect(matches({ terrain: ['swamp', 'forest'] }, ctx)).toBe(true)
    expect(matches({ lost: false, danger: 4 }, ctx)).toBe(true)
  })

  it('handles comparisons', () => {
    expect(matches({ danger: { gte: 4 } }, ctx)).toBe(true)
    expect(matches({ danger: { gt: 4 } }, ctx)).toBe(false)
    expect(matches({ danger: { gte: 2, lte: 5 } }, ctx)).toBe(true)
    expect(matches({ season: { not: 'winter' } }, ctx)).toBe(true)
    expect(matches({ season: { not: ['autumn', 'winter'] } }, ctx)).toBe(false)
    expect(matches({ season: { in: ['spring', 'autumn'] } }, ctx)).toBe(true)
    expect(matches({ weather: { exists: false } }, ctx)).toBe(true)
    expect(matches({ terrain: { gt: 1 } }, ctx)).toBe(false) // non-numbers never compare
  })

  it('matches array values by containment (tags)', () => {
    expect(matches({ tags: 'haunted' }, ctx)).toBe(true)
    expect(matches({ tags: ['camp', 'ruins'] }, ctx)).toBe(true)
    expect(matches({ tags: 'camp' }, ctx)).toBe(false)
  })

  it('combines with all / any / not and reads dotted paths', () => {
    const c: Condition = {
      all: [
        { any: [{ terrain: 'desert' }, { 'party.stats.pre': { gte: 2 } }] },
        { not: { lost: true } },
      ],
    }
    expect(matches(c, ctx)).toBe(true)
    expect(matches({ not: { terrain: 'forest' } }, ctx)).toBe(false)
  })

  it('never reads prototype properties', () => {
    expect(resolvePath(ctx, 'constructor')).toBeUndefined()
    expect(matches({ 'terrain.length': { gt: 0 } }, ctx)).toBe(false)
  })
})

describe('validateCondition', () => {
  it('accepts valid conditions', () => {
    expect(validateCondition({ danger: { gte: 4 }, any: [{ terrain: 'x' }] })).toEqual([])
  })

  it('explains invalid ones', () => {
    expect(validateCondition('forest')).toEqual(['when: must be an object'])
    expect(validateCondition({ danger: { between: [1, 2] } })).toEqual([
      'when.danger: unknown operator "between"',
    ])
    expect(validateCondition({ danger: { gte: 'four' } })).toEqual([
      "when.danger.gte: must be a number, or $ and another value's name",
    ])
    expect(validateCondition({ any: [] })).toEqual(['when.any: must be a non-empty list'])
    expect(validateCondition({ all: [{ x: { in: [{}] } }] })).toEqual([
      'when.all[0].x.in: must be a list of plain values',
    ])
  })
})

describe('values that name another value ($)', () => {
  const context = {
    danger: 3,
    hour: 21,
    nightfall: 20,
    faction: 'clans',
    rival: 'clans',
    tags: ['ford', 'shrine'],
    wanted: ['shrine', 'ruin'],
    note: '$5',
    party: { stats: { stealth: 2, endurance: 5, fatigue: 5 } },
  }

  it('compare with another value of the context', () => {
    expect(matches({ danger: { gt: '$party.stats.stealth' } }, context)).toBe(true)
    expect(matches({ hour: { gte: '$nightfall' } }, context)).toBe(true)
    expect(matches({ 'party.stats.fatigue': { lt: '$party.stats.endurance' } }, context)).toBe(
      false,
    )
    expect(matches({ faction: '$rival' }, context)).toBe(true)
    expect(matches({ faction: { not: '$rival' } }, context)).toBe(false)
    expect(matches({ faction: ['$nobody', '$rival'] }, context)).toBe(true)
    // A reference to a list: any of its values.
    expect(matches({ tags: '$wanted' }, context)).toBe(true)
  })

  it('never compare with what isn’t there or isn’t a number; $$ is a plain $', () => {
    expect(matches({ danger: { gt: '$nothing' } }, context)).toBe(false)
    expect(matches({ danger: { gt: '$faction' } }, context)).toBe(false)
    expect(matches({ faction: '$nothing' }, context)).toBe(false)
    expect(matches({ note: '$$5' }, context)).toBe(true)
  })

  it('are valid where a number goes', () => {
    expect(validateCondition({ danger: { gte: '$party.stats.stealth' } })).toEqual([])
    expect(validateCondition({ danger: { gte: '$$5' } })).toEqual([
      "when.danger.gte: must be a number, or $ and another value's name",
    ])
  })
})
