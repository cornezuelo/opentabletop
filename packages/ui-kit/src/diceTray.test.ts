import { roll } from '@open-tabletop/dice'
import { seeded } from '@open-tabletop/random'
import { render } from 'svelte/server'
import { describe, expect, it } from 'vitest'
import DiceTray from './DiceTray.svelte'
import DieFace from './DieFace.svelte'
import { drawRoll, rollingFace } from './diceTray'

describe('the dice tray', () => {
  it('draws each die by its shape and face, what’s added, and the total', () => {
    const drawn = drawRoll(roll('2d6+1', seeded(1)))
    const dice = drawn.parts[0]!
    expect(dice).toMatchObject({ kind: 'dice', sign: 1 })
    expect(dice.kind === 'dice' && dice.dice.map((d) => d.shape)).toEqual([6, 6])
    expect(drawn.parts[1]).toEqual({ kind: 'mod', text: '+1' })
    const faces = dice.kind === 'dice' ? dice.dice.map((d) => d.value) : []
    expect(drawn.total).toBe(faces[0]! + faces[1]! + 1)
  })

  it('draws every die as a real solid: a d3 as a d6, a d5 as a d10, a d2 as a coin', () => {
    const solid = (expression: string) => {
      const part = drawRoll(roll(expression, seeded(1))).parts[0]!
      return part.kind === 'dice' ? [part.dice[0]!.shape, part.dice[0]!.sides] : []
    }
    expect(solid('1d3')).toEqual([6, '3'])
    expect(solid('1d5')).toEqual([10, '5'])
    expect(solid('1d2')).toEqual(['coin', '2'])
    expect(solid('1d1')).toEqual([6, '1'])
    expect(solid('1d7')).toEqual([8, '7'])
    expect(solid('1d30')).toEqual([20, '30'])
    expect(solid('d%')).toEqual(['percent', '%'])
    expect(solid('4dF')).toEqual(['fudge', 'F'])
    // What it is, said by its name (the tray's expression, _1d3 → 2_), not on the die.
    expect(render(DiceTray, { props: { rolls: [roll('1d3', seeded(1))] } }).body).toContain('1d3 →')
  })

  it('a keep fades what it leaves out; a roll mode keeps the other totals apart', () => {
    const kept = drawRoll(roll('4d6kh3', seeded(2)))
    const dice = kept.parts[0]!.kind === 'dice' ? kept.parts[0]!.dice : []
    expect(dice.filter((d) => d.dropped)).toHaveLength(1)
    const twice = drawRoll(roll('1d20', seeded(3), { repeat: 2, keep: 'highest' }))
    expect(twice.others).toHaveLength(1)
    expect(twice.others[0]!.total).toBeLessThanOrEqual(twice.total)
  })

  it('d%, Fudge, d66 and exploding dice as they show', () => {
    const percent = drawRoll({
      expression: 'd%',
      total: 100,
      terms: [{ kind: 'dice', sign: 1, sides: 100, rolls: [100], kept: [0], subtotal: 100 }],
    })
    expect(percent.parts[0]).toMatchObject({ dice: [{ shape: 'percent', face: '00' }] })
    const fudge = drawRoll({
      expression: '2dF',
      total: 0,
      terms: [{ kind: 'dice', sign: 1, sides: 'F', rolls: [1, -1], kept: [0, 1], subtotal: 0 }],
    })
    expect(fudge.parts[0]).toMatchObject({ dice: [{ face: '+' }, { face: '−' }] })
    const d66 = drawRoll({
      expression: 'd66',
      total: 35,
      terms: [{ kind: 'dice', sign: 1, sides: 'd66', rolls: [35], kept: [0], subtotal: 35 }],
    })
    expect(d66.parts[0]).toMatchObject({
      dice: [
        { shape: 6, face: '3' },
        { shape: 6, face: '5' },
      ],
    })
    const exploded = drawRoll({
      expression: '1d6!',
      total: 14,
      terms: [
        {
          kind: 'dice',
          sign: 1,
          sides: 6,
          rolls: [14],
          kept: [0],
          subtotal: 14,
          chains: [[6, 6, 2]],
        },
      ],
    })
    expect(exploded.parts[0]).toMatchObject({ dice: [{ face: '6', more: ['6', '2'] }] })
  })

  it('renders the dice in words for screen readers, and a roll by hand as its total', () => {
    const html = render(DiceTray, { props: { rolls: [roll('1d20', seeded(4))] } }).body
    expect(html).toMatch(/aria-label="d20: \d+"/)
    const hand = render(DiceTray, {
      props: { rolls: [{ expression: '1d6', terms: [], total: 5, byHand: true }], locale: 'es' },
    }).body
    expect(hand).toContain('tu tirada')
    expect(hand).toContain('= 5')
    // One die and nothing else: drawn as that die showing the total; anything else, the total.
    expect(hand).toMatch(/aria-label="d6: 5"/)
    expect(drawRoll({ expression: '1d6', terms: [], total: 5, byHand: true }).parts).toEqual([
      {
        kind: 'dice',
        sign: 1,
        dice: [{ shape: 6, sides: '6', face: '5', dropped: false, more: [], value: 5 }],
      },
    ])
    expect(drawRoll({ expression: '2d6+1', terms: [], total: 9, byHand: true }).parts).toEqual([])
    expect(drawRoll({ expression: '1d6', terms: [], total: 9, byHand: true }).parts).toEqual([])
  })

  it('draws what a row rolled inside its result after the roll asked for, said so', () => {
    const html = render(DiceTray, {
      props: {
        rolls: [{ ...roll('1d3', seeded(5)), inside: true }, roll('1d6', seeded(6))],
        locale: 'es',
      },
    }).body
    // The 1d6 first, then the row's 1d3 under its words.
    expect(html.indexOf('d6:')).toBeLessThan(html.indexOf('en el resultado'))
    expect(html.indexOf('en el resultado')).toBeLessThan(html.indexOf('aria-label="d3: '))
    const alone = render(DiceTray, { props: { rolls: [roll('1d6', seeded(6))] } }).body
    expect(alone).not.toContain('in the result')
  })
})

describe('rollingFace', () => {
  it('shows a face the die could land on while it rolls', () => {
    expect(rollingFace({ sides: '6' }, 0)).toBe('1')
    expect(rollingFace({ sides: '6' }, 0.99)).toBe('6')
    expect(rollingFace({ sides: '20' }, 0.5)).toBe('11')
    expect(rollingFace({ sides: 'F' }, 0.99)).toBe('+')
    expect(rollingFace({ sides: '%' }, 0.99)).toBe('00')
    // A d3 drawn as a d6 turns through its own faces only, never a 4 or an 8.
    const d3 = drawRoll(roll('1d3', seeded(1))).parts[0]!
    const die = d3.kind === 'dice' ? d3.dice[0]! : undefined
    expect(die).toMatchObject({ shape: 6, sides: '3' })
    for (let n = 0; n < 1; n += 0.01) expect(['1', '2', '3']).toContain(rollingFace(die!, n))
  })

  it('a die says what it is in its face’s place until it has a face, then only the face', () => {
    const die = (face: string) =>
      render(DieFace, { props: { shape: 6, sides: '3', face, label: 'd3' } }).body
    expect(die('')).toMatch(/<text[^>]*class="[^"]*sides[^"]*"[^>]*>d3<\/text>/)
    expect(die('2')).toMatch(/>2<\/text>/)
    expect(die('2')).not.toContain('d3</text>')
  })
})
