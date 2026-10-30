import { describe, expect, it } from 'vitest'
import { matches, type Condition } from '@open-tabletop/conditions'
import {
  conditionFacts,
  conditionRows,
  readValue,
  rowsCondition,
  rowsWords,
  type ConditionRows,
} from './conditionRows'

const roundTrip = (condition: Record<string, unknown>) => rowsCondition(conditionRows(condition)!)

describe('conditions as rows', () => {
  it('reads pairs and every comparison as rows', () => {
    expect(
      conditionRows({
        'place.terrain': ['forest', 'hills'],
        'place.danger': { gte: 2, lte: 4 },
        'trip.mode': { not: ['boat', 'cart'] },
        'trip.weather': { not: 'storm' },
        'icon.id': { exists: true },
        'place.region': { exists: false },
        lost: true,
      }),
    ).toEqual({
      join: 'all',
      rows: [
        { fact: 'place.terrain', op: 'in', value: 'forest, hills' },
        { fact: 'place.danger', op: 'gte', value: '2' },
        { fact: 'place.danger', op: 'lte', value: '4' },
        { fact: 'trip.mode', op: 'notIn', value: 'boat, cart' },
        { fact: 'trip.weather', op: 'not', value: 'storm' },
        { fact: 'icon.id', op: 'exists', value: '' },
        { fact: 'place.region', op: 'missing', value: '' },
        { fact: 'lost', op: 'is', value: 'true' },
      ],
    })
  })

  it('writes back what it read, in the same syntax', () => {
    for (const c of [
      { 'place.terrain': 'forest', 'place.danger': { gte: 3 } },
      { 'place.danger': { gte: 2, lte: 4 } },
      { 'party.stats.fatigue': { lt: '{{party.stats.endurance}}' } },
      { any: [{ 'trip.edges': ['road', 'river'] }, { 'trip.mode': 'modes.boat' }] },
      { 'trip.mode': { not: ['boat', 'cart'] }, 'icon.id': { exists: true } },
    ])
      expect(roundTrip(c)).toEqual(c)
  })

  it('reads a list of single pairs, any or all', () => {
    expect(conditionRows({ all: [{ 'place.tags': 'ford' }, { 'place.tags': 'toll' }] })).toEqual({
      join: 'all',
      list: true,
      rows: [
        { fact: 'place.tags', op: 'is', value: 'ford' },
        { fact: 'place.tags', op: 'is', value: 'toll' },
      ],
    })
    // The same fact twice stays an `all`, which a map can't say.
    expect(roundTrip({ all: [{ 'place.tags': 'ford' }, { 'place.tags': 'toll' }] })).toEqual({
      all: [{ 'place.tags': 'ford' }, { 'place.tags': 'toll' }],
    })
    // Written as a list, it stays one; written as pairs, the same fact twice becomes one.
    expect(
      roundTrip({ all: [{ 'place.tags': 'shrine' }, { 'time.moons.ember': 'full' }] }),
    ).toEqual({
      all: [{ 'place.tags': 'shrine' }, { 'time.moons.ember': 'full' }],
    })
    expect(
      rowsCondition({
        join: 'all',
        rows: [
          { fact: 'place.tags', op: 'is', value: 'ford' },
          { fact: 'place.tags', op: 'is', value: 'toll' },
        ],
      }),
    ).toEqual({ all: [{ 'place.tags': 'ford' }, { 'place.tags': 'toll' }] })
  })

  it('has no rows for what they cannot say', () => {
    expect(conditionRows({ not: { 'time.part': 'night' } })).toBeNull()
    expect(conditionRows({ 'place.terrain': 'forest', any: [{ lost: true }] })).toBeNull()
    expect(
      conditionRows({ any: [{ 'trip.moment': 'trip.place-enter', 'place.danger': { gte: 1 } }] }),
    ).toBeNull()
    expect(conditionRows({ all: [{ any: [{ lost: true }] }] })).toBeNull()
    expect(conditionRows({ danger: { near: 3 } })).toBeNull()
    expect(conditionRows('forest')).toBeNull()
  })

  it('nothing is no rows, and no rows is nothing', () => {
    expect(conditionRows(undefined)).toEqual({ join: 'all', rows: [] })
    expect(rowsCondition({ join: 'any', rows: [{ fact: ' ', op: 'is', value: 'x' }] })).toBe(
      undefined,
    )
    // One row of an `any` is just that pair.
    expect(
      rowsCondition({ join: 'any', rows: [{ fact: 'lost', op: 'is', value: 'true' }] }),
    ).toEqual({ lost: true })
  })

  it('reads numbers, booleans and quoted text from the boxes', () => {
    expect(readValue(' 3 ')).toBe(3)
    expect(readValue('-1.5')).toBe(-1.5)
    expect(readValue('false')).toBe(false)
    expect(readValue("'{{1d6}}'")).toBe('{{1d6}}')
    expect(readValue('Ashford Vale')).toBe('Ashford Vale')
  })

  it('writes conditions the evaluator understands', () => {
    const rows: ConditionRows = {
      join: 'all',
      rows: [
        { fact: 'place.terrain', op: 'in', value: 'forest, hills' },
        { fact: 'place.danger', op: 'gt', value: "'{{party.stats.stealth}}'" },
      ],
    }
    const condition = rowsCondition(rows) as Condition
    const context = { place: { terrain: 'hills', danger: 3 }, party: { stats: { stealth: 2 } } }
    expect(matches(condition, context)).toBe(true)
    expect(matches(condition, { ...context, place: { terrain: 'lake', danger: 3 } })).toBe(false)
  })

  it('suggests facts by their full names, and says rows in words', () => {
    expect(conditionFacts({ terrain: [], 'place.terrain': [], 'party.stats.wits': [] })).toEqual([
      'party.stats.wits',
      'place.terrain',
    ])
    const ops = {
      is: 'is',
      in: 'is one of',
      not: 'is not',
      notIn: 'is none of',
      gt: 'is over',
      gte: 'is at least',
      lt: 'is under',
      lte: 'is at most',
      exists: 'is there',
      missing: 'is missing',
    }
    expect(
      rowsWords(
        conditionRows({ any: [{ 'trip.below': 'food' }, { 'icon.id': { exists: true } }] })!,
        {
          ops,
          and: 'and',
          or: 'or',
        },
      ),
    ).toBe('trip.below is food or icon.id is there')
    expect(rowsWords({ join: 'all', rows: [] }, { ops, and: 'and', or: 'or' })).toBeNull()
  })

  it('keeps a comparison written with its key (`eq`, `in`) as written', () => {
    for (const c of [
      { any: [{ 'place.region': { eq: 'Ashford Vale' } }, { 'place.faction': 'the-vale' }] },
      { 'place.terrain': { in: ['forest', 'hills'] } },
      { 'place.danger': { eq: 2 } },
    ])
      expect(rowsCondition(conditionRows(c)!)).toEqual(c)
  })
})
