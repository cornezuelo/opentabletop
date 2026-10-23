import { seeded, sequence } from '@open-tabletop/random'
import { describe, expect, it } from 'vitest'
import {
  evaluate,
  hasVariables,
  isRoll,
  lookupIn,
  namesIn,
  rollsIn,
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

describe('arithmetic', () => {
  const sheet = {
    self: { values: { might: 3, maxHealth: 5, health: 2, half: '1.5' } },
    'night-march': 2,
    actions: { 'night-march': { cost: 4 } },
    word: 'nine',
  }
  const read = (expression: string, roller?: (e: string) => number) =>
    evaluate(`{{${expression}}}`, lookupIn(sheet, roller))

  it('adds, takes, multiplies and divides in the usual order, with brackets', () => {
    expect(read('self.values.might * 2 + 4')).toBe(10)
    expect(read('(self.values.might + 1) * 2')).toBe(8)
    expect(read('self.values.maxHealth - self.values.health')).toBe(3)
    expect(read('-self.values.might + 10 / 4')).toBe(-0.5)
    expect(read('self.values.half * 2')).toBe(3)
    expect(read('7')).toBe(7)
  })

  it('calls floor, ceil, round, abs, min and max', () => {
    expect(read('floor(self.values.might / 2)')).toBe(1)
    expect(read('ceil(self.values.might / 2)')).toBe(2)
    expect(read('round(2.5)')).toBe(3)
    expect(read('abs(self.values.health - self.values.maxHealth)')).toBe(3)
    expect(read('max(self.values.might, self.values.health, 4)')).toBe(4)
    expect(read('min(self.values.might, self.values.health)')).toBe(2)
  })

  it('keeps hyphens in ids: a minus between names has spaces', () => {
    expect(read('night-march')).toBe(2)
    expect(read('actions.night-march.cost * 2')).toBe(8)
    expect(read('actions.night-march.cost - night-march')).toBe(2)
  })

  it('rolls dice inside, with the roller', () => {
    expect(read('1d6 + self.values.might', () => 4)).toBe(7)
    expect(read('2d6 * 2', () => 5)).toBe(10)
    expect(read('1d6 + self.values.might')).toBeUndefined()
  })

  it('reads nothing when a name is not a number, or it divides by 0', () => {
    expect(read('word + 1')).toBeUndefined()
    expect(read('nothing * 2')).toBeUndefined()
    expect(read('self.values.might / 0')).toBeUndefined()
  })

  it('leaves what does not parse as a name, read as before', () => {
    expect(read('self.values.might +')).toBeUndefined()
    expect(read('unknownFn(2)')).toBeUndefined()
    expect(lookupIn({ 'a b': 1 })('a b')).toBe(1)
  })

  it('names what an expression reads and whether it rolls', () => {
    expect(namesIn('self.values.might * 2 + max(a, b)')).toEqual(['self.values.might', 'a', 'b'])
    expect(namesIn('party.stats.mouths')).toEqual(['party.stats.mouths'])
    expect(namesIn('2d6')).toEqual([])
    expect(rollsIn('a + 1d4')).toBe(true)
    expect(rollsIn('a * 2')).toBe(false)
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
