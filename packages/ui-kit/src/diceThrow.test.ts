import { roll } from '@open-tabletop/dice'
import { seeded } from '@open-tabletop/random'
import { render } from 'svelte/server'
import { describe, expect, it } from 'vitest'
import DiceThrow from './DiceThrow.svelte'
import {
  frontFace,
  oppositeFace,
  playThrow,
  restingAngle,
  restOf,
  solidFaces,
  solidOf,
  settled,
  startThrow,
  stepThrow,
  type Table,
} from './diceThrow'

const table: Table = { width: 600, height: 360, size: 64 }
const random = () => {
  const r = seeded('throw')
  return () => r.next()
}

describe('a throw of dice', () => {
  it('leaves the hand upwards, each die apart, spinning, in the air', () => {
    const dice = startThrow(2, table, random())
    expect(dice).toHaveLength(2)
    for (const d of dice) {
      expect(d.vy).toBeLessThan(0)
      expect(d.z).toBeGreaterThan(0)
      expect(Math.abs(d.spin)).toBeGreaterThan(0)
      expect(d.still).toBe(false)
    }
    expect(dice[0]!.x).not.toBe(dice[1]!.x)
  })

  it('bounces off the edges, never leaving the table, and stops after a while', () => {
    const frames = playThrow(startThrow(3, table, random()), table)
    const seconds = frames.length / 60
    expect(seconds).toBeGreaterThan(0.8)
    expect(seconds).toBeLessThan(6.1)
    const half = table.size / 2
    for (const { dice } of frames)
      for (const d of dice) {
        expect(d.x).toBeGreaterThanOrEqual(half - 1e-6)
        expect(d.x).toBeLessThanOrEqual(table.width - half + 1e-6)
        expect(d.y).toBeGreaterThanOrEqual(half - 1e-6)
        expect(d.y).toBeLessThanOrEqual(table.height - half + 1e-6)
        expect(d.z).toBeGreaterThanOrEqual(0)
      }
    const last = frames.at(-1)!.dice
    expect(settled(last)).toBe(true)
    // It knocked somewhere, and turned over many times on the way.
    expect(frames.some((f) => f.knock > 0)).toBe(true)
    expect(Math.min(...last.map((d) => d.turns))).toBeGreaterThan(3)
  })

  it('a throw follows the hand: a drag to the right goes right', () => {
    const dice = startThrow(1, table, random(), { x: 1200, y: -200 }, { x: 100, y: 300 })
    let now = dice
    for (let i = 0; i < 10; i++) now = stepThrow(now, table, 1 / 60).dice
    expect(now[0]!.x).toBeGreaterThan(dice[0]!.x)
  })
})

describe('dice with body', () => {
  it('turn their face over now and then, not every frame', () => {
    const frames = playThrow(startThrow(2, table, random()), table)
    const last = frames.at(-1)!.dice
    // Many frames, far fewer faces: a few a second at most.
    for (const d of last) expect(d.turns).toBeLessThan((frames.length / 60) * 12)
  })

  it('roll over in 3D the way they move, faster in the air', () => {
    const dice = startThrow(1, table, random(), { x: 1400, y: 0 }, { x: 100, y: 200 })
    const later = stepThrow(dice, table, 1 / 60).dice[0]!
    expect(later.ry).toBeGreaterThan(dice[0]!.ry)
  })

  it('come to rest on a face: the one turned towards the eye', () => {
    expect(restingAngle(44)).toBe(0)
    expect(restingAngle(-134)).toBe(-90)
    expect(frontFace(0, 0)).toBe('front')
    expect(frontFace(0, 90)).toBe('left')
    expect(frontFace(0, -90)).toBe('right')
    expect(frontFace(0, 180)).toBe('back')
    expect(frontFace(90, 0)).toBe('bottom')
    expect(frontFace(-90, 0)).toBe('top')
    expect(frontFace(360 * 3 + 90, 720)).toBe('bottom')
    expect(oppositeFace('top')).toBe('bottom')
  })

  it('a cube or a coin lands showing what was rolled, a d6 as a real one', () => {
    expect(solidOf(6)).toBe('cube')
    expect(solidOf('fudge')).toBe('cube')
    expect(solidOf('coin')).toBe('coin')
    expect(solidOf(20)).toBeUndefined()
    const frames = playThrow(startThrow(1, table, random()), table)
    const rest = restOf('cube', frames.at(-1)!.dice[0]!)
    const faces = solidFaces('cube', { sides: '6', face: '5' }, rest, random())
    const up = frontFace(rest.rx, rest.ry)
    expect(faces[up]).toBe('5')
    expect(faces[oppositeFace(up)]).toBe('2')
    expect(Object.values(faces).sort()).toEqual(['1', '2', '3', '4', '5', '6'])
    // A coin rests flat, its face up the one rolled.
    const coin = restOf('coin', { rx: 530, ry: 40 })
    expect(coin).toEqual({ rx: 540, ry: 0 })
    expect(solidFaces('coin', { sides: '2', face: '2' }, coin, random())).toEqual({
      back: '2',
      front: '1',
    })
  })
})

describe('the throw on screen', () => {
  it('waits in hand with each die of the roll, saying how to throw them', () => {
    const result = roll('2d6+1', seeded('h'))
    const { body } = render(DiceThrow, {
      props: { rolls: [result], title: 'Kael: 2d6+1', onuse: () => {}, onclose: () => {} },
    })
    expect(body).toContain('Drag the dice and let go to throw them')
    expect(body.match(/class="thrown/g)).toHaveLength(2)
    expect(body).toContain('Kael: 2d6+1')
    // The total waits for the dice to stop.
    expect(body).not.toContain(`= <strong>${result.total}`)
  })

  it("throws every die of several rolls at once (an Oracle's result and the rolls within it)", () => {
    const rolls = [roll('1d6', seeded('a')), roll('2d8', seeded('b'))]
    const { body } = render(DiceThrow, {
      props: { rolls, use: 'See the result', onuse: () => {}, onclose: () => {} },
    })
    expect(body.match(/class="thrown/g)).toHaveLength(3)
  })

  it('says what it is for before it is thrown', () => {
    const { body } = render(DiceThrow, {
      props: {
        rolls: [roll('1d6', seeded('w'))],
        title: 'Kael: roll 1d6 for A blow',
        why: ['On the grey wolf'],
        tells: true,
        onuse: () => {},
        onclose: () => {},
      },
    })
    expect(body).toContain('On the grey wolf')
  })
})
