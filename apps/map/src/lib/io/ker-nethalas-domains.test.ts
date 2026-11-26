import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { HexKey } from '@open-tabletop/map'
import type { LibraryEntry } from '@open-tabletop/storage'
import { bundledPacks } from '@open-tabletop/pack-ui/bundled'

/**
 * Ker Nethalas' Domains one after another (a personal-use pack: only on machines with
 * packs-private/): the Domain's exit found, a new Domain made under it and entered, with its
 * own Overseer and dice, and back again (the book's p. 98: you're free to move between the
 * Domains you've found).
 */

const maps = new Map<string, LibraryEntry>()
const kept = new Map<string, LibraryEntry>()
const list = (store: Map<string, LibraryEntry>) => async () =>
  [...store.values()].map(({ id, name, modified, parent }) => ({
    id,
    name,
    modified,
    ...(parent && { parent }),
  }))
vi.mock('@open-tabletop/storage', async (original) => ({
  ...(await original<typeof import('@open-tabletop/storage')>()),
  getLibraryMap: async (id: string) => maps.get(id) ?? null,
  putLibraryMap: async (entry: LibraryEntry) => void maps.set(entry.id, entry),
  deleteLibraryMap: async (id: string) => void maps.delete(id),
  allLibraryMaps: async () => [...maps.values()],
  listLibrary: list(maps),
  getCampaign: async (id: string) => kept.get(id) ?? null,
  putCampaign: async (entry: LibraryEntry) => void kept.set(entry.id, entry),
  deleteCampaign: async (id: string) => void kept.delete(id),
  listCampaigns: list(kept),
  allCampaigns: async () => [...kept.values()],
}))

const settle = async () => {
  for (let i = 0; i < 5; i++) await new Promise((resolve) => setTimeout(resolve, 0))
}

const here = bundledPacks.some((p) => p.personal && p.root === 'ker-nethalas')

describe.skipIf(!here)('Ker Nethalas’ Domains', () => {
  beforeEach(() => {
    maps.clear()
    kept.clear()
    localStorage.clear()
    let seed = 7
    vi.spyOn(Math, 'random').mockImplementation(() => {
      seed = (seed * 1103515245 + 12345) % 2147483648
      return seed / 2147483648
    })
  })
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it(
    'the exit found, the next Domain made and entered with its own Overseer and dice, and back',
    { timeout: 120_000 },
    async () => {
      vi.resetModules()
      const { editor } = await import('../store/editor.svelte')
      const actions = await import('./actions.svelte')
      const { loadLinks, waysAt } = await import('./submaps')
      const play = await import('../play/play')
      const { activeSystem } = await import('../play/systems')
      const { createMap } = await import('@open-tabletop/map')
      const { newMember, partyOf } = await import('@open-tabletop/session')

      // The app keeps the map and its campaign as they change (no page here to hide).
      const page = { addEventListener: () => {}, removeEventListener: () => {} }
      vi.stubGlobal('document', { ...page, visibilityState: 'visible' })
      vi.stubGlobal('window', page)
      const stop = await actions.startPersistence()
      const map = createMap('The first Domain')
      map.grid = { ...map.grid, kind: 'square', width: 80, height: 80 }
      map.terrains = [{ id: 'stone-floor', name: 'Floor', color: '#999999', floor: true }]
      editor.load(map)
      editor.campaign = { ...editor.campaign, system: 'ker-nethalas' }
      editor.notify({ kind: 'campaign' })
      await actions.keepOpenMap()
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
      const session = () => play.sessionOf(editor.map.play!)!
      const first = editor.map.meta.id

      /** Settles what's waiting: checks, fights called off, pauses. */
      const clear = () => {
        for (let j = 0; j < 12; j++) {
          const [check] = session().travel.pendingChecks
          if (check) play.resolvePending(check.id)
          else if (session().encounter) play.step({ type: 'encounter', what: 'end' })
          else if (session().travel.waiting) play.step({ type: 'resume' })
          else break
        }
      }
      /** Walks through an exit not yet laid (the i-th), opening its door first. */
      const walkOn = (i: number) => {
        const ways = editor.map.connections.filter((c) =>
          c.between.some((cell) => !editor.map.hexes[cell as HexKey]?.terrain),
        )
        if (!ways.length) return false
        const way = ways[i % ways.length]
        const inside = way.between.find((cell) => editor.map.hexes[cell as HexKey]?.terrain)
        if (inside) play.walkTo(inside as HexKey)
        clear()
        for (let k = 0; k < 12 && session().travel.connections?.[way.id]?.state !== 'open'; k++) {
          if (!way.fields?.some((f) => f.key === 'door' && f.value === '1')) break
          const lock =
            session().travel.connections?.[way.id]?.lock ??
            Number(way.fields?.find((f) => f.key === 'lock')?.value)
          const locked = lock === 1
          play.editSession((s) => ({ ...s, acting: 'erthos' }))
          play.step({
            type: 'action',
            id: locked ? 'force-door' : 'open-door',
            with: { door: way.id },
          })
          clear()
        }
        play.walkTo(way.between.find((cell) => !editor.map.hexes[cell as HexKey]?.terrain)!)
        clear()
        return true
      }

      walkOn(0)
      const overseer = session().map!.values.overseer
      expect(overseer).toBeGreaterThanOrEqual(1)
      const xp = session().members?.[0]?.values.xp ?? 0
      // The lair found already, the Exit Die at its last stage: the next room may be the exit.
      play.editSession((x) => ({
        ...x,
        map: { ...x.map!, values: { ...x.map!.values, 'lair-found': 1, exit: 4, tension: 4 } },
      }))
      for (let i = 1; i < 40 && !session().map!.values['exit-found']; i++) if (!walkOn(i)) break
      expect(session().map!.values['exit-found']).toBe(1)
      expect(session().journal.some((e) => e.code === 'WAY_MADE')).toBe(true)
      await settle()
      const next = [...maps.values()].find((m) => m.parent === first)
      expect(next).toBeDefined()

      // Through it: the next Domain, its first room laid as the party comes in.
      await loadLinks()
      const exitCell = play.partyLocation() as HexKey
      const [way] = waysAt(exitCell).filter((w) => w.dir === 'in')
      expect(way).toMatchObject({ map: next!.id })
      play.step({ type: 'setDestination', place: way.there })
      for (let i = 0; i < 10 && editor.map.meta.id !== next!.id; i++) {
        clear()
        play.step({ type: 'action', id: 'march', with: { until: 'place' } })
        await settle()
      }
      expect(editor.map.meta.id).toBe(next!.id)
      clear()
      await settle()
      expect(editor.map.pieces?.length).toBeGreaterThanOrEqual(1)
      // Laid under its feet, the start is no room entered (as the first Domain's): nobody rules
      // yet, until the first room walked into.
      expect(session().map!.values.overseer).toBe(0)
      expect(session().map!.values.tension).toBe(8)
      walkOn(0)
      // Its own sheet: an Overseer rolled for it, its dice as the book starts them.
      const domain = session().map!.values
      expect(domain.overseer).toBeGreaterThanOrEqual(1)
      expect(domain['lair-found']).toBe(0)
      expect(domain['exit-found']).toBe(0)
      // +50 XP for a new Domain entered.
      expect(session().members?.[0]?.values.xp ?? 0).toBeGreaterThanOrEqual(xp + 50)

      // And back up to the first one, which kept its own.
      await loadLinks()
      const entrance = editor.map.meta.parent!.ways[0].entrance as HexKey
      const out = waysAt(entrance).find((w) => w.dir === 'out')
      expect(out).toMatchObject({ map: first })
      play.step({ type: 'setDestination', place: out!.there })
      for (let i = 0; i < 10 && editor.map.meta.id !== first; i++) {
        clear()
        play.step({ type: 'action', id: 'march', with: { until: 'place' } })
        await settle()
      }
      expect(editor.map.meta.id).toBe(first)
      expect(session().map!.values.overseer).toBe(overseer)
      expect(session().map!.values['exit-found']).toBe(1)
      stop()
    },
  )
})
