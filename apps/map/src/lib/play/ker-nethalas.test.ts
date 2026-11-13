import { beforeEach, describe, expect, it, vi } from 'vitest'
import { bundledPacks } from '@open-tabletop/pack-ui/bundled'
import { createMap, type HexKey } from '@open-tabletop/map'
import { newMember, partyOf, presentHere } from '@open-tabletop/session'
import { editor } from '../store/editor.svelte'
import * as play from './play'
import { activeSystem } from './systems'

/** A personal-use pack: only on machines with packs-private/. It plays the rules. */
const here = bundledPacks.some((p) => p.personal && p.root === 'ker-nethalas')

describe.skipIf(!here)('Ker Nethalas', () => {
  // The Oracle rolls with Math.random: a fixed sequence makes every run the same. (A Domain
  // may close on itself, its last rooms with no exit: this sequence's keeps growing.)
  beforeEach(() => {
    let seed = 11
    vi.spyOn(Math, 'random').mockImplementation(() => {
      seed = (seed * 1103515245 + 12345) % 2147483648
      return seed / 2147483648
    })
  })

  /** A blank Domain played with rules, laid piece by piece from a cell in the middle. */
  function domain() {
    const map = createMap('A Domain')
    map.grid = { ...map.grid, kind: 'square', width: 80, height: 80 }
    map.terrains = [{ id: 'stone-floor', name: 'Floor', color: '#999999', floor: true }]
    editor.load(map)
    editor.campaign = { ...editor.campaign, system: 'ker-nethalas' }
    editor.notify({ kind: 'campaign' })
    editor.mode = 'play'
    editor.tool = 'play'
    play.updatePlay((p) => ({ ...p, discover: { on: true, reveal: 'pieces' } }))
    play.setMode('rules')
    play.clickHex('40,40' as HexKey)
  }
  const session = () => play.sessionOf(editor.map.play!)!
  /** Walks to an exit not yet laid (the i-th), and answers what the walk rolled. */
  function walkOn(i: number): boolean {
    const waiting = editor.map.connections.flatMap((c) =>
      c.between.filter((cell) => !editor.map.hexes[cell as HexKey]?.terrain),
    )
    if (!waiting.length) return false
    play.walkTo(waiting[i % waiting.length])
    for (let j = 0; j < 8; j++) {
      const [check] = session().travel.pendingChecks
      if (!check) break
      play.resolvePending(check.id)
    }
    return true
  }

  it('a Domain grows room by room, with the book’s dice running down', async () => {
    domain()
    expect(editor.map.pieces?.[0]?.id).toBe('s026')
    for (let i = 0; i < 80 && editor.map.pieces!.length < 20; i++) {
      // A fight met on the way is called off: this walks the Domain.
      if (session().encounter) play.step({ type: 'encounter', what: 'end' })
      if (!walkOn(i)) break
      if (session().travel.waiting) play.step({ type: 'resume' })
    }
    const log = session().journal.map((e) => e.code)
    const count = (c: string) => log.filter((x) => x === c).length
    expect(count('ROLLED')).toBeGreaterThan(20)
    expect(editor.map.pieces!.length).toBeGreaterThan(8)
  })

  it('a creature met as its room is laid is in that room: the fight goes on until it ends', () => {
    domain()
    const rules = partyOf(activeSystem())
    const pc = newMember(rules, {
      id: 'erthos',
      name: 'Erthos',
      values: { bladed: 73, dodge: 40, parry: 73, perception: 50 },
    })
    play.editSession((s) => ({ ...s, members: [pc] }))
    // Walked on until an encounter pauses the trip (the room laid as the party enters it).
    for (let i = 0; i < 80 && !session().present?.length; i++) {
      if (!walkOn(i)) break
      if (session().travel.waiting && !session().present?.length) play.step({ type: 'resume' })
    }
    expect(session().present?.length).toBeGreaterThan(0)
    expect(presentHere(session()).length).toBeGreaterThan(0)
    // Continue: the fight starts with the creature here, and doesn't end as it starts.
    play.step({ type: 'resume' })
    expect(session().encounter).toBeDefined()
    expect(session().journal.some((e) => e.code === 'ENCOUNTER_ROUND')).toBe(true)
    // Erthos attacks the first one here on each of his turns, until the fight is over.
    for (let turn = 0; turn < 120 && session().encounter; turn++) {
      const s = session()
      if (s.travel.waiting) {
        play.step({ type: 'resume', choice: presentHere(s)[0]?.character.id })
        continue
      }
      const foe = presentHere(s)[0]?.character.id
      play.step({ type: 'action', id: 'attack', with: { foe, skill: 'bladed' } })
    }
    expect(session().encounter).toBeUndefined()
    const log = session().journal.map((e) => e.code)
    expect(log.filter((c) => c === 'ENCOUNTER_TURN').length).toBeGreaterThan(1)
    expect(log).toContain('ENCOUNTER_ENDED')
  })
})
