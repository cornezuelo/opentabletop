import { beforeEach, describe, expect, it, vi } from 'vitest'
import { bundledPacks } from '@open-tabletop/pack-ui/bundled'
import { createMap, type HexKey } from '@open-tabletop/map'
import { editor } from '../store/editor.svelte'
import * as play from './play'

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

  it('a Domain grows room by room, with the book’s dice running down', async () => {
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
    const session = () => play.sessionOf(editor.map.play!)!
    expect(editor.map.pieces?.[0]?.id).toBe('s026')
    for (let i = 0; i < 80 && editor.map.pieces!.length < 20; i++) {
      const waiting = editor.map.connections.flatMap((c) =>
        c.between.filter((cell) => !editor.map.hexes[cell as HexKey]?.terrain),
      )
      if (!waiting.length) break
      // A fight met on the way is called off: this walks the Domain.
      if (session().encounter) play.step({ type: 'encounter', what: 'end' })
      play.walkTo(waiting[i % waiting.length])
      for (let j = 0; j < 8; j++) {
        const [check] = session().travel.pendingChecks
        if (!check) break
        play.resolvePending(check.id)
      }
      if (session().travel.waiting) play.step({ type: 'resume' })
    }
    const log = session().journal.map((e) => e.code)
    const count = (c: string) => log.filter((x) => x === c).length
    expect(count('ROLLED')).toBeGreaterThan(20)
    expect(editor.map.pieces!.length).toBeGreaterThan(8)
  })
})
