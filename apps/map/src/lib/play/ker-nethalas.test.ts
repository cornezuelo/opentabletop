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
  // The Oracle rolls with Math.random: a fixed sequence makes every run the same.
  beforeEach(() => {
    let seed = 3
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
    const pc = newMember(partyOf(activeSystem()), {
      id: 'erthos',
      name: 'Erthos',
      values: { bladed: 73, dodge: 40, parry: 73, perception: 50, athletics: 60 },
    })
    play.editSession((s) => ({ ...s, members: [pc], acting: 'erthos' }))
  }
  const session = () => play.sessionOf(editor.map.play!)!
  /**
   * A door (rolled so as its piece was laid) is crossed once opened: from the room it leaves,
   * Erthos opens it, or breaks it open while it's locked, as the player would.
   */
  function openDoor(way: { id: string; fields?: { key: string; value: string }[] }) {
    const field = (key: string) => way.fields?.find((f) => f.key === key)?.value
    if (field('door') !== '1') return
    const inside = (editor.map.connections.find((c) => c.id === way.id)?.between ?? []).find(
      (cell) => editor.map.hexes[cell as HexKey]?.terrain,
    )
    if (inside) play.walkTo(inside as HexKey)
    for (let i = 0; i < 12 && session().travel.connections?.[way.id]?.state !== 'open'; i++) {
      if (session().encounter) play.step({ type: 'encounter', what: 'end' })
      if (session().travel.waiting) {
        play.step({ type: 'resume', choice: way.id })
        continue
      }
      const locked = (session().travel.connections?.[way.id]?.lock ?? Number(field('lock'))) === 1
      play.editSession((s) => ({ ...s, acting: 'erthos' }))
      play.step({ type: 'action', id: locked ? 'force-door' : 'open-door', with: { door: way.id } })
    }
  }
  /** Walks to an exit not yet laid (the i-th), and answers what the walk rolled. */
  function walkOn(i: number): boolean {
    const ways = editor.map.connections.filter((c) =>
      c.between.some((cell) => !editor.map.hexes[cell as HexKey]?.terrain),
    )
    if (!ways.length) return false
    const way = ways[i % ways.length]
    openDoor(way)
    // What opening it brought (a Tension Die's pause, a fight called off) is seen to first.
    for (let j = 0; j < 8; j++) {
      const [check] = session().travel.pendingChecks
      if (check) play.resolvePending(check.id)
      else if (session().encounter) play.step({ type: 'encounter', what: 'end' })
      else if (session().travel.waiting) play.step({ type: 'resume' })
      else break
    }
    play.walkTo(way.between.find((cell) => !editor.map.hexes[cell as HexKey]?.terrain)!)
    for (let j = 0; j < 8; j++) {
      const [check] = session().travel.pendingChecks
      if (!check) break
      play.resolvePending(check.id)
    }
    return true
  }

  it(
    'a Domain grows room by room, with the book’s dice running down',
    { timeout: 90_000 },
    async () => {
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
      // It never closes on itself: a room that would leave nothing to explore is rolled again.
      const waiting = editor.map.connections.filter((c) =>
        c.between.some((cell) => !editor.map.hexes[cell as HexKey]?.terrain),
      )
      expect(waiting.length).toBeGreaterThan(0)
    },
  )

  it('a creature met as its room is laid is in that room: the fight goes on until it ends', () => {
    domain()
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
      // His turn read, before the creature's: Next.
      if (s.encounter?.stage === 'shown') {
        play.step({ type: 'encounter', what: 'next' })
        continue
      }
      if (s.travel.waiting) {
        play.step({ type: 'resume', choice: presentHere(s)[0]?.character.id })
        continue
      }
      const foe = presentHere(s)[0]?.character.id
      play.step({ type: 'action', id: 'attack', with: { foe } })
    }
    expect(session().encounter).toBeUndefined()
    const log = session().journal.map((e) => e.code)
    expect(log.filter((c) => c === 'ENCOUNTER_TURN').length).toBeGreaterThan(1)
    expect(log).toContain('ENCOUNTER_ENDED')
  })

  it(
    "a Domain's Overseer: rolled as it starts with its influence, met in its lair, where no encounter is rolled",
    { timeout: 90_000 },
    () => {
      domain()
      const values = () => session().map!.values
      // Nobody rules yet: the start is no room entered.
      expect(values().overseer).toBe(0)
      walkOn(0)
      // The first room entered: who rules here, and one influence at least on the Domain's sheet.
      expect(values().overseer).toBeGreaterThanOrEqual(1)
      expect(values().overseer).toBeLessThanOrEqual(10)
      const influences = ['tough', 'vital', 'frenzied', 'skilled', 'magebane', 'resistant']
        .concat(['corrupting', 'unstable', 'alert', 'piercing'])
        .filter((k) => values()[k] >= 1)
      expect(influences.length).toBeGreaterThanOrEqual(1)
      // Fifteen rooms walked without finding it: the next one is its lair (the book's optional
      // rule), however its Lair check rolls.
      play.editSession((x) => ({
        ...x,
        map: { ...x.map!, values: { ...x.map!.values, 'domain-rooms': 15 } },
      }))
      for (let i = 1; i < 12 && !values()['lair-found']; i++) {
        if (session().encounter) play.step({ type: 'encounter', what: 'end' })
        if (!walkOn(i)) break
      }
      expect(values()['lair-found']).toBe(1)
      expect(values()['domain-rooms']).toBe(16)
      // The Overseer is here, the one the Domain rolled (overseers.yaml, in the book's order).
      const order = ['carnage-devourer', 'dreadlord', 'glacial-burrower', 'gorehoof']
        .concat(['infernal-archon', 'infernal-tormentor', 'pyroclasmic-possessor'])
        .concat(['veilshifter', 'venomcloud-siren', 'zephyrous-shadow'])
      const here = presentHere(session()).map((p) => p.character.id)
      expect(here).toEqual([order[values().overseer - 1]])
      // In its lair, no Combat Encounter was rolled as the room was entered.
      const last = session().journal.map((e) => e.data?.event)
      const lairAt = last.lastIndexOf('LAIR_CHECK_REQUIRED')
      expect(last.slice(lairAt)).not.toContain('ROOM_ENCOUNTER_CHECK')
      expect(last.slice(lairAt)).not.toContain('CORRIDOR_ENCOUNTER_CHECK')
    },
  )
})
