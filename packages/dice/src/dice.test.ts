import { describe, expect, it } from 'vitest'
import { seeded, sequence } from '@open-tabletop/random'
import {
  bounds,
  diceFacts,
  diceText,
  isDiceRoll,
  isDiceTerm,
  DiceSyntaxError,
  distribution,
  parseDice,
  possibleTotals,
  roll,
  rollWith,
  swapDigits,
  withExtraDice,
} from './index'

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

  it('rolls the whole expression several times and keeps the highest, lowest or middle', () => {
    const best = roll('1d6', faces(6, 2, 5), { repeat: 2, keep: 'highest' })
    expect(best.total).toBe(5)
    expect(best.discarded?.map((d) => d.total)).toEqual([2])
    expect(roll('1d6', faces(6, 2, 5), { repeat: 2, keep: 'lowest' }).total).toBe(2)
    expect(roll('1d6', faces(6, 6, 1, 4), { repeat: 3, keep: 'middle' }).total).toBe(4)
    // An even count keeps the lower middle one.
    expect(roll('1d6', faces(6, 1, 6, 3, 5), { repeat: 4, keep: 'middle' }).total).toBe(3)
    expect(roll('1d6', faces(6, 3), {}).discarded).toBeUndefined()
  })

  it('writes a roll as one line: dice, the ones not kept and the totals a mode left', () => {
    expect(diceText(roll('2d6+1', faces(6, 3, 4)))).toBe('2d6+1 → 8  [3, 4] +1')
    expect(diceText(roll('2d6kh1-1', faces(6, 2, 5)))).toBe('2d6kh1-1 → 4  [~2~, 5] −1')
    expect(diceText(roll('1d6', faces(6, 2, 5), { repeat: 2, keep: 'highest' }))).toBe(
      '1d6 → 5  [5]  (2)',
    )
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

describe('distribution', () => {
  const near = (a: number, b: number) => expect(a).toBeCloseTo(b, 10)
  const total = (d: Map<number, number>) => [...d.values()].reduce((s, p) => s + p, 0)

  it('says how likely each total is', () => {
    const d = distribution('2d6')!
    near(d.get(7)!, 6 / 36)
    near(d.get(2)!, 1 / 36)
    near(total(d), 1)
    expect([...d.keys()][0]).toBe(2)
    const plus = distribution('1d6 + 2 - 1d4')!
    expect(Math.min(...plus.keys())).toBe(-1)
    near(total(plus), 1)
    near(distribution('d66')!.get(11)!, 1 / 36)
    near(distribution('4dF')!.get(0)!, 19 / 81)
  })

  it('keeps some dice, and a roll mode keeps one of several totals', () => {
    const best = distribution('2d6kh1')!
    near(best.get(6)!, 11 / 36)
    const advantage = distribution('1d20', { repeat: 2, keep: 'highest' })!
    near(advantage.get(20)!, 39 / 400)
    near(advantage.get(1)!, 1 / 400)
    const careful = distribution('1d6', { repeat: 3, keep: 'middle' })!
    near(total(careful), 1)
    // The middle of three d6 is 1 only if two or three of them are 1: 16/216.
    near(careful.get(1)!, 16 / 216)
    near(distribution('1d6', { repeat: 2, keep: 'lowest' })!.get(6)!, 1 / 36)
  })

  it('gives up on too many combinations', () => {
    expect(distribution('20d6kh3', {}, 1000)).toBeNull()
    expect(distribution('20d6')).not.toBeNull()
  })
})

describe('rollWith', () => {
  it('rolls as a way of rolling says: repeated, with more dice, or either way, one total kept', () => {
    expect(rollWith('1d6', faces(6, 4)).total).toBe(4)
    expect(rollWith('1d6', faces(6, 2, 5), { repeat: 2, keep: 'lowest' }).total).toBe(2)
    expect(rollWith('2d6', faces(6, 1, 5, 6), { extra: 1, keep: 'highest' }).total).toBe(11)
    expect(rollWith('1d%', faces(100, 73), { swap: true, keep: 'lowest' }).total).toBe(37)
  })
})

describe('withExtraDice', () => {
  it('rolls more dice and keeps as many as before', () => {
    const more = withExtraDice(parseDice('2d6+1'), 1, 'highest')
    expect(more.terms[0]).toMatchObject({ count: 3, keep: { mode: 'highest', count: 2 } })
    const { total } = roll(more, seeded('extra'))
    expect(total).toBeGreaterThanOrEqual(3)
    expect(total).toBeLessThanOrEqual(13)
  })

  it('leaves dice that already keep some as they are', () => {
    const own = parseDice('4d6kh3')
    expect(withExtraDice(own, 1, 'highest')).toEqual(own)
  })
})

describe('exploding dice', () => {
  it('reads `!` and `!n`; only dice of 2 or more sides explode', () => {
    expect(parseDice('2d6!').terms[0]).toMatchObject({ count: 2, sides: 6, explode: 100 })
    expect(parseDice('1d6!1+2').terms[0]).toMatchObject({ explode: 1 })
    expect(parseDice('4d6!kh3').terms[0]).toMatchObject({ explode: 100, keep: { count: 3 } })
    for (const bad of ['1dF!', '1d66!', '1d1!', '1d6!0'])
      expect(() => parseDice(bad), bad).toThrow()
  })

  it('a die on its highest face is rolled again and added, as many times as it may', () => {
    const r = roll('1d6!', faces(6, 6, 6, 2))
    expect(r.total).toBe(14)
    expect(r.terms[0]).toMatchObject({ rolls: [14], chains: [[6, 6, 2]] })
    expect(diceText(r)).toBe('1d6! → 14  [6+6+2]')
    // Once at most: the second six stays.
    expect(roll('1d6!1', faces(6, 6, 6, 2)).total).toBe(12)
    // Kept after exploding: 6+3 is the highest.
    expect(roll('2d6!kh1', faces(6, 6, 3, 5)).total).toBe(9)
  })

  it('knows its bounds, its totals and their chances', () => {
    expect(bounds('1d6!1')).toEqual({ min: 1, max: 12 })
    expect(possibleTotals('1d6!1')).toEqual([1, 2, 3, 4, 5, 7, 8, 9, 10, 11, 12])
    const dist = distribution('1d6!1')!
    expect(dist.get(3)).toBeCloseTo(1 / 6)
    expect(dist.get(9)).toBeCloseTo(1 / 36)
    expect(dist.has(6)).toBe(false)
    expect([...dist.values()].reduce((a, b) => a + b, 0)).toBeCloseTo(1)
    // A plain `!`: the chances of the long chains are left out, the rest add up.
    expect([...distribution('2d6!')!.values()].reduce((a, b) => a + b, 0)).toBeCloseTo(1, 6)
  })
})

describe('telling dice from names', () => {
  it('a term of dice, or dice plus or minus a number', () => {
    for (const dice of ['2d6', 'd%', 'd66', '4dF', '4d6kh3', '1d6!', '2d6!1kh1'])
      expect(isDiceTerm(dice), dice).toBe(true)
    expect(isDiceTerm('1d6+2')).toBe(false)
    expect(isDiceRoll(' 1d6! + 2 ')).toBe(true)
    for (const name of ['danger', 'place.danger', 'd', '2x6'])
      expect(isDiceRoll(name), name).toBe(false)
  })
})

describe('what the dice show', () => {
  it('doubles: two kept dice alike, or a percentile die whose digits match', () => {
    expect(diceFacts(roll('2d6', faces(6, 4, 4)))).toEqual({ doubles: true, faces: [4, 4] })
    expect(diceFacts(roll('2d6', faces(6, 4, 5))).doubles).toBe(false)
    // Only the dice kept count.
    expect(diceFacts(roll('3d6kh2', faces(6, 2, 2, 5))).doubles).toBe(false)
    expect(diceFacts(roll('d%', faces(100, 33))).doubles).toBe(true)
    expect(diceFacts(roll('d%', faces(100, 100))).doubles).toBe(true)
    expect(diceFacts(roll('d%', faces(100, 30))).doubles).toBe(false)
    expect(diceFacts(roll('d66', faces(6, 5, 5))).doubles).toBe(true)
  })
})

describe('swapping a percentile die’s digits', () => {
  it('reads tens as units when it gives the total kept', () => {
    expect([73, 10, 100, 5].map(swapDigits)).toEqual([37, 1, 100, 50])
    const low = roll('d%', faces(100, 73), { swap: 'lowest' })
    expect(low.total).toBe(37)
    expect(low.discarded?.map((d) => d.total)).toEqual([73])
    expect(roll('d%', faces(100, 73), { swap: 'highest' }).total).toBe(73)
    expect(roll('d66', faces(6, 2, 5), { swap: 'highest' }).total).toBe(52)
    // With a modifier, the die alone is swapped.
    expect(roll('d% + 5', faces(100, 91), { swap: 'lowest' }).total).toBe(24)
    // No percentile die: nothing to swap.
    expect(roll('2d6', faces(6, 1, 2), { swap: 'highest' }).total).toBe(3)
  })
})
