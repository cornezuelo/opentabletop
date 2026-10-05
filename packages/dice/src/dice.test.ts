import { describe, expect, it } from 'vitest'
import { seeded, sequence } from '@open-tabletop/random'
import { bounds, DiceSyntaxError, parseDice, possibleTotals, roll } from './index'

/** Unit-interval values that make randomInt(1, n) return the given faces. */
const faces = (n: number, ...values: number[]) => sequence(values.map((v) => (v - 1 + 0.5) / n))

describe('parseDice', () => {
  it('parses common expressions', () => {
    expect(parseDice('2d6+1').terms).toEqual([
      { kind: 'dice', sign: 1, count: 2, sides: 6 },
      { kind: 'const', sign: 1, value: 1 },
    ])
    expect(parseDice('d100').terms[0]).toMatchObject({ count: 1, sides: 100 })
    expect(parseDice('d%').terms[0]).toMatchObject({ sides: 100 })
    expect(parseDice('D66').terms[0]).toMatchObject({ sides: 'd66' })
    expect(parseDice('4dF').terms[0]).toMatchObject({ count: 4, sides: 'F' })
    expect(parseDice('4d6kh3').terms[0]).toMatchObject({ keep: { mode: 'highest', count: 3 } })
    expect(parseDice('1d20 - 1').terms[1]).toEqual({ kind: 'const', sign: -1, value: 1 })
    expect(parseDice('-2 + d4').terms[0]).toEqual({ kind: 'const', sign: -1, value: 2 })
  })

  it('reports syntax errors with a position', () => {
    for (const bad of ['', '2d', 'd6+', '2x6', '3d6kh4', '0d6', 'd0', '2d6 3']) {
      expect(() => parseDice(bad), bad).toThrow(DiceSyntaxError)
    }
    try {
      parseDice('2d6 * 2')
    } catch (error) {
      expect((error as DiceSyntaxError).position).toBe(4)
    }
  })
})

describe('roll', () => {
  it('sums dice and constants with a breakdown', () => {
    const result = roll('2d6+1', faces(6, 4, 5))
    expect(result.total).toBe(10)
    expect(result.terms[0]).toMatchObject({ rolls: [4, 5], kept: [0, 1], subtotal: 9 })
  })

  it('rolls d66 as tens and units', () => {
    expect(roll('d66', faces(6, 3, 5)).total).toBe(35)
  })

  it('rolls Fudge dice between -1 and +1', () => {
    expect(roll('4dF', faces(3, 1, 2, 3, 3)).total).toBe(1)
  })

  it('keeps highest or lowest dice', () => {
    expect(roll('4d6kh3', faces(6, 1, 6, 3, 5)).total).toBe(14)
    const low = roll('2d20kl1', faces(20, 15, 4))
    expect(low.total).toBe(4)
    expect(low.terms[0]).toMatchObject({ kept: [1] })
  })

  it('handles subtraction', () => {
    expect(roll('1d6-2', faces(6, 1)).total).toBe(-1)
  })

  it('applies advantage and disadvantage to the whole expression', () => {
    const adv = roll('1d6', faces(6, 2, 5), { advantage: 1 })
    expect(adv.total).toBe(5)
    expect(adv.discarded?.total).toBe(2)
    expect(roll('1d6', faces(6, 2, 5), { advantage: -1 }).total).toBe(2)
  })

  it('is reproducible with a seed', () => {
    expect(roll('3d6', seeded(9))).toEqual(roll('3d6', seeded(9)))
  })
})

describe('outcome space', () => {
  it('computes bounds', () => {
    expect(bounds('2d6+1')).toEqual({ min: 3, max: 13 })
    expect(bounds('d66')).toEqual({ min: 11, max: 66 })
    expect(bounds('4dF')).toEqual({ min: -4, max: 4 })
    expect(bounds('1d6-1d4')).toEqual({ min: -3, max: 5 })
    expect(bounds('4d6kh3')).toEqual({ min: 3, max: 18 })
  })

  it('enumerates possible totals', () => {
    expect(possibleTotals('2d6')).toEqual([2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])
    const d66 = possibleTotals('d66')!
    expect(d66).toHaveLength(36)
    expect(d66).not.toContain(17)
    expect(possibleTotals('1d4+10')).toEqual([11, 12, 13, 14])
    expect(possibleTotals('4d6kh3')![0]).toBe(3)
  })

  it('falls back to contiguous ranges for large plain sums, and gives up otherwise', () => {
    expect(possibleTotals('20d6')).toHaveLength(101)
    expect(possibleTotals('20d6kh3', 1000)).toBeNull()
  })
})
