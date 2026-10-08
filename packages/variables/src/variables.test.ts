import { seeded, sequence } from '@open-tabletop/random'
import { describe, expect, it } from 'vitest'
import {
  evaluate,
  hasVariables,
  isRoll,
  lookupIn,
  momentRoller,
  onceRoller,
  render,
  variableOf,
} from './index'

const context = { name: 'Ashford', party: { stats: { mouths: 3 } }, list: ['a', 'b'] }

describe('variables', () => {
  it('tell a whole {{…}} from a text with them inside', () => {
    expect(variableOf('{{party.stats.mouths}}')).toBe('party.stats.mouths')
    expect(variableOf(' {{ 2d6 }} ')).toBe('2d6')
    expect(variableOf('-{{x}}')).toBeUndefined()
    expect(variableOf(5)).toBeUndefined()
    expect(hasVariables('Found {{1d6}} coins')).toBe(true)
    expect(hasVariables('plain')).toBe(false)
  })

  it('tell dice from names', () => {
    for (const dice of ['2d6', 'd20', '1d6 + 2', '4d6kh3', 'dF', 'd%', 'd66'])
      expect(isRoll(dice)).toBe(true)
    for (const name of ['party.stats.d20', 'dawn', 'd20x']) expect(isRoll(name)).toBe(false)
  })

  it('read names, keep raw values whole and render texts', () => {
    const lookup = lookupIn(context, () => 4)
    expect(evaluate('{{party.stats.mouths}}', lookup)).toBe(3)
    expect(evaluate('{{list}}', lookup)).toEqual(['a', 'b'])
    expect(evaluate('{{2d6}}', lookup)).toBe(4)
    expect(evaluate('{{name}} has {{2d6}} gates{{nothing}}', lookup)).toBe('Ashford has 4 gates')
    expect(render('{{r}}', () => ({ text: 'a result' }))).toBe('a result')
    expect(evaluate(7, lookup)).toBe(7)
  })

  it('read no roll without a roller', () => {
    expect(evaluate('{{1d6}}', lookupIn(context))).toBeUndefined()
  })
})

describe('rolls', () => {
  it('are fixed for a moment, whatever the spacing, and differ between moments', () => {
    const moment = momentRoller('trip|12|0304|hex-enter')
    const first = moment('1d1000')
    expect(moment(' 1D1000 ')).toBe(first)
    expect(momentRoller('trip|12|0304|hex-enter')('1d1000')).toBe(first)
    const others = ['trip|13|0304|hex-enter', 'trip|12|0305|hex-enter', 'other|12|0304|hex-enter']
    expect(others.map((key) => momentRoller(key)('1d1000')).some((n) => n !== first)).toBe(true)
    expect(moment('party.stats.x')).toBeUndefined()
  })

  it('stay within the dice', () => {
    for (let i = 0; i < 50; i++) {
      const n = momentRoller(`k${i}`)('2d6')!
      expect(n).toBeGreaterThanOrEqual(2)
      expect(n).toBeLessThanOrEqual(12)
    }
  })

  it('once per resolution: the same dice read again are the same roll', () => {
    const heard: number[] = []
    const roller = onceRoller(sequence([0.5, 0.0, 0.95]), (r) => heard.push(r.total))
    expect(roller('1d20')).toBe(11)
    expect(roller('1d20 ')).toBe(11)
    expect(roller('1d6')).toBe(1)
    expect(heard).toEqual([11, 1])
    expect(onceRoller(seeded(1))('dawn')).toBeUndefined()
  })
})
