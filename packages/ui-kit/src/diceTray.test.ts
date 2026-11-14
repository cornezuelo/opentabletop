import { roll } from '@open-tabletop/dice'
import { seeded } from '@open-tabletop/random'
import { render } from 'svelte/server'
import { describe, expect, it } from 'vitest'
import DiceTray from './DiceTray.svelte'
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
    expect(hand).toContain('tirada a mano')
    expect(hand).toContain('= 5')
  })
})

describe('rollingFace', () => {
  it('shows a face the die could land on while it rolls', () => {
    expect(rollingFace(6, 0)).toBe('1')
    expect(rollingFace(6, 0.99)).toBe('6')
    expect(rollingFace(20, 0.5)).toBe('11')
    expect(rollingFace('fudge', 0.99)).toBe('+')
    expect(rollingFace('percent', 0.99)).toBe('00')
  })
})
