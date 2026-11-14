import { roll } from '@open-tabletop/dice'
import { seeded } from '@open-tabletop/random'
import { render } from 'svelte/server'
import { describe, expect, it } from 'vitest'
import DiceThrow from './DiceThrow.svelte'
import { playThrow, settled, startThrow, stepThrow, type Table } from './diceThrow'

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

describe('the throw on screen', () => {
  it('waits in hand with each die of the roll, saying how to throw them', () => {
    const result = roll('2d6+1', seeded('h'))
    const { body } = render(DiceThrow, {
      props: { result, title: 'Kael: 2d6+1', onuse: () => {}, onclose: () => {} },
    })
    expect(body).toContain('Drag the dice and let go to throw them')
    expect(body.match(/class="thrown/g)).toHaveLength(2)
    expect(body).toContain('Kael: 2d6+1')
    // The total waits for the dice to stop.
    expect(body).not.toContain(`= <strong>${result.total}`)
  })
})
