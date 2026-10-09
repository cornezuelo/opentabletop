import type { HexKey } from '@open-tabletop/hex'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { dialog, toasts } from '@open-tabletop/ui-kit'
import { exampleMaps } from '../io/examples'
import { parseMapFile } from '../io/otd'
import { createMap } from '../model/defaults'
import { editor } from '../store/editor.svelte'
import { SetMetaCommand } from '../commands/settings'
import { bundleToMap, mapToBundle } from '../io/otd'
import {
  partyOf,
  refreshParty,
  tripAvailability,
  tripFacts,
  type SessionState,
} from '@open-tabletop/session'
import { mapWorld } from './world'
import {
  clickHex,
  editSession,
  partyLocation,
  restartRules,
  sessionOf,
  setMode,
  step,
  updatePlay,
} from './play'
import {
  advanceWorld,
  setWorldDate,
  startWorld,
  stopMessage,
  worldAct,
  worldCalendar,
  worldTurnNow,
  applyWorldEffects,
} from './world.svelte'
import { bringFactions, removeFactions } from './factions'
import { oracleUi, rollContext } from './oracle'
import { activeSystem, mapPacks, mapSystemId, playSystems } from './systems'

/** The maps the bundled systems bring (`maps:` in their `kind: system`). */
const EXAMPLE_MAPS = exampleMaps()

describe('playing on the map', () => {
  it('simple: the party jumps to the hex clicked, leaving a trail', () => {
    editor.load(createMap())
    setMode('simple')
    clickHex('1,1')
    clickHex('2,2')
    expect(partyLocation()).toBe('2,2')
    expect(editor.map.play?.trail).toEqual(['1,1', '2,2'])
  })

  it('with rules: a placed party starts its trip where it stands, heading for the hex', () => {
    editor.load(parseMapFile(EXAMPLE_MAPS.find((m) => m.id === 'greymarches1')!.json))
    expect(partyLocation()).toBe('5,7')
    clickHex('7,7')
    const session = sessionOf(editor.map.play!)
    expect(session?.travel.location).toBe('5,7')
    expect(session?.travel.destination).toBe('7,7')
    expect(editor.map.play?.rules?.system).toBe('grey-marches')
  })

  it('a map chooses its system and the packs it adds (the example: the Grey Marches alone)', () => {
    editor.load(parseMapFile(EXAMPLE_MAPS.find((m) => m.id === 'greymarches1')!.json))
    expect(editor.meta.system).toBe('grey-marches')
    expect(editor.meta.packs).toEqual([])
    // The system brings its own pack and Core; nothing else is shown.
    expect(mapPacks()).toEqual(['grey-marches', 'core'])
    expect(oracleUi.showsPack('grey-marches')).toBe(true)
    expect(oracleUi.showsPack('core')).toBe(true)
    expect(oracleUi.showsPack('kal-arath')).toBe(false)
    // Every system can be chosen, whatever the packs.
    expect(playSystems().map((s) => s.id)).toEqual(
      expect.arrayContaining(['generic', 'grey-marches']),
    )
    // Back to every pack: undoable, and saved in the file.
    editor.execute(new SetMetaCommand({ packs: undefined }))
    expect(oracleUi.showsPack('kal-arath')).toBe(true)
    expect(mapToBundle(editor.map).maps[0].ext).not.toHaveProperty(['hexmapper', 'packs'])
    editor.undo()
    expect(editor.meta.packs).toEqual([])
    // The generic system brings no packs: only the ones the map adds.
    editor.execute(new SetMetaCommand({ system: 'generic', packs: ['core'] }))
    expect(editor.meta).not.toHaveProperty('system')
    expect(mapPacks()).toEqual(['core'])
    expect(oracleUi.showsPack('grey-marches')).toBe(false)
    expect(mapToBundle(editor.map).maps[0].ext).not.toHaveProperty(['hexmapper', 'system'])
    editor.undo()
    expect(editor.meta.system).toBe('grey-marches')
    // Saved in the file and read back.
    const back = bundleToMap(mapToBundle(editor.map))
    expect(back.meta).toMatchObject({ system: 'grey-marches', packs: [] })
  })

  it("new trips play the map's system; a trip going on keeps its own until a new one", () => {
    editor.load(parseMapFile(EXAMPLE_MAPS.find((m) => m.id === 'greymarches1')!.json))
    clickHex('7,7')
    expect(editor.map.play?.rules?.system).toBe('grey-marches')
    startWorld()
    const marches = worldCalendar().describe(editor.map.world!.time)
    // The map changes system: the trip and the world's calendar stay the trip's.
    editor.execute(new SetMetaCommand({ system: 'generic' }))
    expect(activeSystem().id).toBe('grey-marches')
    expect(worldCalendar().describe(editor.map.world!.time)).toEqual(marches)
    // A new trip (Play → New trip) plays the map's system, and so does the world.
    restartRules(mapSystemId(), 'spring')
    expect(editor.map.play?.rules?.system).toBe('generic')
    expect(activeSystem().id).toBe('generic')
    expect(worldCalendar().describe(editor.map.world!.time)).not.toEqual(marches)
    // Choosing a system in Play is choosing the map's: undoable like Map settings.
    restartRules('grey-marches', 'spring')
    expect(editor.meta.system).toBe('grey-marches')
    expect(editor.map.play?.rules?.system).toBe('grey-marches')
  })

  it('the world clock reaches the trip: hand rolls and checks read its clocks and events', () => {
    editor.load(parseMapFile(EXAMPLE_MAPS.find((m) => m.id === 'greymarches1')!.json))
    clickHex('7,7')
    startWorld()
    const start = editor.map.world!.time
    worldAct({ type: 'addClock', clock: { name: 'The Wyrm wakes', segments: 6, filled: 2 } })
    worldAct({ type: 'schedule', event: { name: 'Market day', at: start + 60 } })
    // A roll by hand sees what the trip's checks would: the moment, the trip, the world.
    expect(rollContext()).toMatchObject({
      daylight: true,
      dawn: 6,
      nightfall: 20,
      tripDay: 1,
      visits: 1,
      clocks: { 'the-wyrm-wakes': 2 },
      events: ['market-day'],
      party: { mode: 'foot' },
    })
    expect(typeof rollContext().hour).toBe('number')
  })

  it('the world clock is saved in the file and follows a trip, telling what came due', () => {
    editor.load(parseMapFile(EXAMPLE_MAPS.find((m) => m.id === 'greymarches1')!.json))
    startWorld()
    const start = editor.map.world!.time
    worldAct({ type: 'schedule', event: { name: 'The Iron Clans attack', at: start + 60 } })
    worldAct({ type: 'addClock', clock: { name: 'The Wyrm wakes', segments: 6, filled: 1 } })
    // In the file: clocks as OTD clocks, the rest as engine state; and back.
    const bundle = mapToBundle(editor.map)
    expect(bundle.clocks).toEqual([
      expect.objectContaining({ type: 'clock', name: 'The Wyrm wakes', segments: 6, filled: 1 }),
    ])
    expect(bundle.state.world).toMatchObject({
      time: start,
      events: [{ name: 'The Iron Clans attack' }],
    })
    const back = bundleToMap(JSON.parse(JSON.stringify(bundle)))
    expect(back.world).toEqual(editor.map.world)
    // A trip starts at the world's time, and its time passing brings the attack (not
    // `travel`: a storm could keep the party in, and rolls here aren't seeded).
    clickHex('7,7')
    const session = sessionOf(editor.map.play!)!
    expect(session.travel.time).toBe(start)
    step({ type: 'advanceTime', minutes: 120 })
    expect(editor.map.world!.time).toBe(sessionOf(editor.map.play!)!.travel.time)
    expect(sessionOf(editor.map.play!)!.journal.some((e) => e.code === 'WORLD_EVENT')).toBe(true)
  })

  describe('playing with the world clock', () => {
    const grey = () =>
      editor.load(parseMapFile(EXAMPLE_MAPS.find((m) => m.id === 'greymarches1')!.json))
    const trip = () => sessionOf(editor.map.play!)!
    // The Oracle rolls with Math.random: a fixed sequence makes every run the same.
    beforeEach(() => {
      let seed = 42
      vi.spyOn(Math, 'random').mockImplementation(() => {
        seed = (seed * 1103515245 + 12345) % 2147483648
        return seed / 2147483648
      })
      toasts.length = 0
    })
    afterEach(() => {
      vi.restoreAllMocks()
      dialog.current?.resolve(null)
    })
    /** Moves the world on, answering the question it asks (if any); returns the question. */
    async function advance(
      how: Parameters<typeof advanceWorld>[0],
      answer: 'ok' | 'cancel' = 'ok',
    ) {
      const done = advanceWorld(how)
      const asked = dialog.current?.message
      dialog.current?.resolve(answer)
      await done
      return asked
    }
    /** Without a route: clicking the party's own hex makes it the destination. */
    const noRoute = () => {
      clickHex(partyLocation() as HexKey)
      expect(trip().travel.route?.length ?? 0).toBeLessThan(2)
    }

    it('moving the world on a day with a route planned asks, then travels along it', async () => {
      grey()
      startWorld()
      clickHex('7,7')
      const start = editor.map.world!.time
      const asked = await advance({ until: 'next-day' })
      expect(asked).toContain('0808')
      expect(asked).toMatch(/travel on/i)
      const after = trip()
      expect(after.journal.some((e) => e.code === 'HEX_ENTERED')).toBe(true)
      expect(partyLocation()).not.toBe('5,7')
      expect(after.travel.time).toBeGreaterThan(start)
      expect(editor.map.world!.time).toBe(after.travel.time)
    })

    it('day after day, the party reaches its destination; one time for both all along', async () => {
      grey()
      startWorld()
      clickHex('7,7')
      for (let day = 0; day < 10 && partyLocation() !== '7,7'; day++) {
        await advance({ until: 'next-day' })
        // Whatever stopped it (a check waiting for the player), the player goes on.
        for (const c of trip().travel.pendingChecks) step({ type: 'resolveCheck', id: c.id })
        expect(editor.map.world!.time).toBe(trip().travel.time)
      }
      expect(partyLocation()).toBe('7,7')
      expect(trip().journal.some((e) => e.code === 'DESTINATION_REACHED')).toBe(true)
      // Said at the bottom too.
      expect(toasts.some((x) => /reached its destination/.test(x.message))).toBe(true)
      // Once there, moving on waits there.
      await advance({ until: 'next-day' })
      expect(partyLocation()).toBe('7,7')
      expect(editor.map.world!.time).toBe(trip().travel.time)
    })

    it('saying no to the question leaves the trip and the world as they were', async () => {
      grey()
      startWorld()
      clickHex('7,7')
      const before = structuredClone(trip())
      const time = editor.map.world!.time
      expect(await advance({ until: 'next-day' }, 'cancel')).toBeTruthy()
      expect(trip()).toEqual(before)
      expect(editor.map.world!.time).toBe(time)
    })

    it('paused on a check, nothing moves the trip on until Continue', { timeout: 120000 }, () => {
      grey()
      clickHex('4,2')
      // March on (hex by hex, past whatever else comes up) until the Grey Stones' landmark pauses it.
      for (let i = 0; i < 200 && !landmark(); i++) {
        for (const c of trip().travel.pendingChecks) step({ type: 'resolveCheck', id: c.id })
        const before = trip().travel.time
        step({ type: 'travel', until: 'hex' })
        // The day's march is done: wait for the next day, as the player would.
        if (trip().travel.time === before && !trip().travel.pendingChecks.length)
          step({ type: 'wait', until: before + 18 * 60 })
      }
      expect(landmark()).toBeTruthy()
      const paused = structuredClone(trip().travel)
      const why = tripAvailability({ system: activeSystem(), world: mapWorld(editor.map) }, trip())
      expect(why.travel).toEqual({ pending: 'LANDMARK_CHECK_REQUIRED' })
      expect(why.rest).toEqual({ pending: 'LANDMARK_CHECK_REQUIRED' })
      for (const order of [
        { type: 'action', id: 'rest' },
        { type: 'travel' },
        { type: 'wait', until: paused.time + 600 },
      ] as const)
        step(order)
      expect(trip().travel).toEqual(paused)
      // Continue: the trip moves again.
      step({ type: 'resolveCheck', id: landmark()!.id })
      expect(trip().travel.pendingChecks.some((c) => c.id === landmark()?.id)).toBe(false)
      step({ type: 'action', id: 'rest' })
      expect(trip().travel.time).toBeGreaterThan(paused.time)
    })
    const landmark = () =>
      trip().travel.pendingChecks.find((c) => c.event === 'LANDMARK_CHECK_REQUIRED')

    it('an hour with a route is an hour of marching, without asking', async () => {
      grey()
      startWorld()
      clickHex('7,7')
      const start = editor.map.world!.time
      const asked = await advance({ minutes: 60 })
      expect(asked).toBeUndefined()
      expect(trip().travel.time).toBe(start + 60)
      expect(editor.map.world!.time).toBe(start + 60)
      // It marched (an hour into its first hex, or on to it) unless something stopped it.
      const moved = trip().travel.progress > 0 || partyLocation() !== '5,7'
      const stopped = trip().travel.pendingChecks.length > 0
      expect(moved || stopped).toBe(true)
    })

    it('without a route, the party waits where it is, eating, and asks before a day passes', async () => {
      grey()
      startWorld()
      clickHex('7,7')
      noRoute()
      const food = trip().travel.resources.food
      const asked = await advance({ until: 'next-day' })
      expect(asked).toMatch(/wait here/i)
      const after = trip()
      expect(partyLocation()).toBe('5,7')
      expect(after.journal.some((e) => e.code === 'WAIT')).toBe(true)
      expect(after.journal.some((e) => e.code === 'HEX_ENTERED')).toBe(false)
      expect(after.travel.resources.food).toBeLessThan(food)
      expect(editor.map.world!.time).toBe(after.travel.time)
    })

    it('an hour waited is an hour for both; without a trip only the world moves', async () => {
      grey()
      startWorld()
      const start = editor.map.world!.time
      await advance({ minutes: 60 })
      expect(editor.map.world!.time).toBe(start + 60)
      clickHex('7,7')
      noRoute()
      expect(trip().travel.time).toBe(start + 60)
      await advance({ minutes: 60 })
      expect(trip().travel.time).toBe(start + 120)
      expect(editor.map.world!.time).toBe(start + 120)
    })

    it('a clock started during a trip starts at the trip’s time', () => {
      grey()
      clickHex('7,7')
      step({ type: 'advanceTime', minutes: 90 })
      startWorld()
      expect(editor.map.world!.time).toBe(trip().travel.time)
    })

    it('says at the bottom why the trip stopped early, and when it arrived', () => {
      grey()
      clickHex('7,7')
      const base = trip()
      const at = (extra: Partial<typeof base.travel>, journal = base.journal) =>
        ({ ...base, travel: { ...base.travel, time: 0, ...extra }, journal }) as typeof base
      const check = { id: 'c1', event: 'ENCOUNTER_CHECK_REQUIRED', context: {} }
      expect(stopMessage(at({ pendingChecks: [check] }), 0, 100)?.text).toMatch(/needs you/)
      const blocked = [
        ...base.journal,
        { id: 'x', at: '', time: 0, source: 'travel', code: 'ROUTE_BLOCKED', data: {} },
      ] as typeof base.journal
      expect(stopMessage(at({}, blocked), base.journal.length, 100)?.text).toMatch(/blocked/)
      const arrived = [
        ...base.journal,
        { id: 'y', at: '', time: 0, source: 'travel', code: 'DESTINATION_REACHED', data: {} },
      ] as typeof base.journal
      expect(stopMessage(at({ time: 100 }, arrived), base.journal.length, 100)?.text).toMatch(
        /reached/,
      )
      // Reaching the moment with nothing to say says nothing.
      expect(stopMessage(at({ time: 100 }), base.journal.length, 100)).toBeUndefined()
    })
  })
})

describe('the world clock’s dates', () => {
  // The Oracle rolls with Math.random: a fixed sequence makes every run the same.
  beforeEach(() => {
    let seed = 7
    vi.spyOn(Math, 'random').mockImplementation(() => {
      seed = (seed * 1103515245 + 12345) % 2147483648
      return seed / 2147483648
    })
  })
  afterEach(() => {
    vi.restoreAllMocks()
    dialog.current?.resolve(null)
  })
  const grey = () =>
    editor.load(parseMapFile(EXAMPLE_MAPS.find((m) => m.id === 'greymarches1')!.json))
  const calendar = () => worldCalendar() as import('@open-tabletop/time').DataCalendar
  /** Sets the date, answering the question it asks (if any). */
  async function setDate(time: number, answer: 'ok' | 'cancel' = 'ok') {
    const done = setWorldDate(time)
    const asked = dialog.current?.message
    dialog.current?.resolve(answer)
    await done
    return asked
  }

  it('starts on the date chosen, in the system’s calendar', () => {
    grey()
    editor.setWorld(undefined)
    editor.map.play = undefined
    const midsummer = calendar().at(
      calendar().dayOf({ year: 412, month: 'highsun', day: 15 })!,
      '06:00',
    )
    startWorld(midsummer)
    const parts = calendar().describe(editor.map.world!.time)
    expect(parts).toMatchObject({ year: 412, month: { id: 'highsun', day: 15 }, hour: 6 })
    expect(parts.holidays.map((h) => h.id)).toEqual(['midsummer'])
  })

  it('goes forward like moving time on, and back only after asking, without a trip', async () => {
    grey()
    editor.map.play = undefined
    startWorld(calendar().at(1, '06:00'))
    const start = editor.map.world!.time
    worldAct({ type: 'schedule', event: { id: 'fair', name: 'The fair', at: start + 1440 } })
    await setDate(start + 3 * 1440)
    expect(editor.map.world!.time).toBe(start + 3 * 1440)
    expect(editor.map.world!.timeline.some((e) => e.code === 'EVENT')).toBe(true)
    // Back: asked first; saying no changes nothing.
    expect(await setDate(start, 'cancel')).toMatch(/back/i)
    expect(editor.map.world!.time).toBe(start + 3 * 1440)
    await setDate(start)
    expect(editor.map.world!.time).toBe(start)
    expect(editor.map.world!.timeline.at(-1)?.code).toBe('REWOUND')
  })

  it('the example map’s market day (an event by its id) lets the party trade in Ashford', async () => {
    // The example map comes with its world clock running, and its events.
    grey()
    clickHex('5,7')
    const fair = editor.map.world!.events.find((e) => e.id === 'market-day')!
    expect(fair.description).toBeTruthy()
    const traded = () =>
      sessionOf(editor.map.play!)!.journal.some(
        (e) => e.code === 'ACTION_TAKEN' && e.data?.action === 'market',
      )
    // Day 1 is no market day: nothing to trade.
    step({ type: 'action', id: 'market' })
    expect(traded()).toBe(false)
    // On the event's day (not a Marketday of the calendar), the party trades.
    await setDate(fair.at + 60)
    expect(calendar().describe(editor.map.world!.time).weekday?.id).not.toBe('marketday')
    step({ type: 'action', id: 'market' })
    expect(traded()).toBe(true)
  })

  it('never goes back while a trip is going on', async () => {
    grey()
    startWorld()
    clickHex('5,7')
    const now = editor.map.world!.time
    toasts.length = 0
    await setDate(now - 60)
    expect(editor.map.world!.time).toBe(now)
    expect(toasts.at(-1)?.kind).toBe('error')
  })
})

describe('the Company: a party made of characters', () => {
  const grey = () =>
    editor.load(parseMapFile(EXAMPLE_MAPS.find((m) => m.id === 'greymarches1')!.json))
  const trip = () => sessionOf(editor.map.play!)!
  const member = (id: string) => trip().members!.find((m) => m.id === id)!
  beforeEach(() => {
    let seed = 7
    vi.spyOn(Math, 'random').mockImplementation(() => {
      seed = (seed * 1103515245 + 12345) % 2147483648
      return seed / 2147483648
    })
  })
  afterEach(() => vi.restoreAllMocks())

  it('the example map brings it, and its trip starts with it', () => {
    grey()
    // Before the trip, the company waits on the map.
    expect(editor.map.play?.rules?.members?.map((m) => m.id)).toEqual(['kael', 'mara', 'tobin'])
    clickHex('7,7')
    expect(trip().members?.map((m) => m.name)).toEqual(['Kael', 'Mara', 'Old Tobin'])
    // The party's stats are theirs: the best, the worst, how many they are.
    expect(trip().stats).toMatchObject({
      survival: 3, // Kael's
      charisma: 2, // Mara's
      navigation: 2, // Kael's Pathfinding
      stealth: 0, // Old Tobin, the clumsiest
      mouths: 3,
      wounded: 0,
    })
    // The food is what they carry: 3 + 2 + 3 rations.
    expect(trip().travel.resources.food).toBe(8)
    // Saved in the file as OTD characters of the party, and read back.
    const bundle = mapToBundle(editor.map)
    expect(bundle.parties[0].members).toEqual(['kael', 'mara', 'tobin'])
    expect(bundle.characters.find((c) => c.id === 'tobin')).toMatchObject({
      kind: 'pc',
      stats: { survival: 2, maxHealth: 4 },
      ext: { character: { sheet: 'grey-marches/companion' } },
    })
    const back = sessionOf(bundleToMap(bundle).play!)!
    expect(back.members).toEqual(trip().members)
  })

  it('eats a ration per mouth from whoever carries most, and a fed night heals', () => {
    grey()
    clickHex('5,7')
    editSession((s) => {
      s.members![0].values.health = 1
      return s
    })
    step({ type: 'camp' })
    // Three mouths: Kael 3 → 2, Old Tobin 3 → 2, then Kael again (the first of equals).
    expect(trip().members!.map((m) => m.values.rations)).toEqual([1, 2, 2])
    expect(trip().travel.resources.food).toBe(5)
    // A fed night: everyone gets a point of health back, within each one's maximum.
    expect(member('kael').values.health).toBe(2)
    expect(member('tobin').values.health).toBe(4)
  })

  it('wounds keep someone back, and whoever acts tends them', () => {
    grey()
    clickHex('7,7')
    // Kael is wounded: the party's Survival is the best of the others, and he can't force a march.
    editSession((s) => {
      s.members![0].conditions = { wounded: {} }
      return refreshed(s)
    })
    expect(trip().stats).toMatchObject({ survival: 2, wounded: 1 })
    const why = tripAvailability({ system: activeSystem(), world: mapWorld(editor.map) }, trip())
    expect(why['forced-march']).toEqual({ value: 'wounded', who: 'kael' })
    // Tending with nobody acting does nothing; with Old Tobin (Survival 2) acting, it heals.
    step({ type: 'action', id: 'tend' })
    expect(member('kael').conditions).toHaveProperty('wounded')
    editSession((s) => ({ ...s, acting: 'tobin' }))
    step({ type: 'action', id: 'tend' })
    expect(member('kael').conditions).toEqual({})
    expect(trip().stats.survival).toBe(3)
  })

  it('keeps their roles and relations in the file; the map knows where they are tied', () => {
    grey()
    clickHex('7,7')
    editSession((s) => ({ ...s, roles: { guide: 'kael', lookout: 'mara' } }))
    const back = sessionOf(bundleToMap(mapToBundle(editor.map)).play!)!
    expect(back.roles).toEqual({ guide: 'kael', lookout: 'mara' })
    expect(back.members!.find((m) => m.id === 'mara')!.relations).toEqual([
      { to: 'region:Ashford Vale', kind: 'home' },
    ])
    // Ashford is in the Vale, Mara's home; Fort Keld holds Old Tobin's.
    const facts = (hex: string) =>
      tripFacts(
        { system: activeSystem(), world: mapWorld(editor.map) },
        { ...trip(), travel: { ...trip().travel, location: hex } },
      ).hex as Record<string, unknown>
    expect(facts('5,7')).toMatchObject({ related: ['mara'], relations: { home: ['mara'] } })
    expect(facts('15,9')).toMatchObject({ related: ['tobin'], relations: { home: ['tobin'] } })
    expect(facts('14,3').related).toBeUndefined()
    // The threads can be hidden, and stay hidden in the file.
    updatePlay((p) => ({ ...p, showRelations: false }))
    expect(bundleToMap(mapToBundle(editor.map)).play?.showRelations).toBe(false)
  })

  it('a token can have a sheet too: Brenna, read by hand rolls, kept in the file', () => {
    grey()
    const brenna = editor.tokens.find((t) => t.name === 'Brenna')!
    expect(brenna.character).toMatchObject({
      sheet: 'grey-marches/companion',
      values: { charisma: 1, survival: 3 },
      tags: ['ferrywoman'],
    })
    editor.selectedToken = brenna.id
    expect(rollContext()).toMatchObject({
      token: { name: 'Brenna', fare: 2, charisma: 1, values: { survival: 3 }, conditions: [] },
    })
    const back = bundleToMap(mapToBundle(editor.map)).tokens.find((t) => t.id === brenna.id)!
    expect(back.character).toEqual(brenna.character)
    // Her sheet's relation is no party member's: it draws no thread from the party.
    expect(sessionOf(editor.map.play!)?.members ?? editor.map.play?.rules?.members).toHaveLength(3)
    editor.selectedToken = null
  })

  it('a sprained ankle stops the party, and the stop says whose', () => {
    grey()
    clickHex('7,7')
    editSession((s) => {
      s.members![1].conditions = { sprained: {} }
      return s
    })
    const before = trip().journal.length
    step({ type: 'travel' })
    const stopped = trip()
      .journal.slice(before)
      .find((e) => e.code === 'TRAVEL_STOPPED')
    expect(stopped?.data).toMatchObject({ reason: 'value', value: 'sprained', who: 'mara' })
    expect(trip().travel.location).toBe('5,7')
    expect(stopMessage(trip(), before, trip().travel.time + 1)?.text).toContain(
      'Mara: Sprained ankle',
    )
  })
})

/** A session brought up to date with its members, as the trip panel's edits do. */
function refreshed(s: SessionState): SessionState {
  refreshParty(s, partyOf(activeSystem()))
  return s
}

describe('the powers of the Marches: factions on the map', () => {
  const grey = () =>
    editor.load(parseMapFile(EXAMPLE_MAPS.find((m) => m.id === 'greymarches1')!.json))
  beforeEach(() => {
    let seed = 11
    vi.spyOn(Math, 'random').mockImplementation(() => {
      seed = (seed * 1103515245 + 12345) % 2147483648
      return seed / 2147483648
    })
  })
  afterEach(() => vi.restoreAllMocks())

  it('the example map brings them, holding their land; tables read them', () => {
    grey()
    const own = editor.map.factions!
    expect(own.system).toBe('grey-marches')
    expect(own.factions.map((f) => [f.id, f.values.strength])).toEqual([
      ['iron-clans', 4],
      ['the-vale', 3],
      ['fort-keld', 2],
    ])
    expect(own.territories['fort-keld']).toEqual(['15,9'])
    expect(own.territories['iron-clans']).not.toContain('15,9')
    // Who holds a hex, for trips and hand rolls; every faction by id.
    expect(mapWorld(editor.map).cell('15,9')).toMatchObject({ faction: 'fort-keld' })
    expect(rollContext()).toMatchObject({
      factions: {
        'the-vale': { name: 'The Vale of Ashford', values: { strength: 3 } },
        'fort-keld': { territory: 1 },
      },
    })
    // Kept in the file.
    const back = bundleToMap(mapToBundle(editor.map)).factions
    expect(back).toEqual(own)
  })

  it('a world turn rolls each one’s table: values, territory, clocks and the timeline change', () => {
    grey()
    const before = structuredClone(editor.map.factions!)
    const clock = () =>
      editor.map.world!.clocks.find((c) => c.name === 'The Iron Clans march')!.filled
    const filled = clock()
    worldTurnNow()
    const lines = editor.map.world!.timeline.filter((e) => e.code === 'LOG')
    expect(lines.map((l) => l.data?.faction)).toEqual(['iron-clans', 'the-vale', 'fort-keld'])
    expect(lines[0].text).toMatch(/^The Iron Clans: /)
    // Something changed: a value, the territory or the Clans' march.
    const after = editor.map.factions!
    const changed =
      JSON.stringify(after.factions) !== JSON.stringify(before.factions) ||
      JSON.stringify(after.territories) !== JSON.stringify(before.territories) ||
      clock() !== filled
    expect(changed).toBe(true)
    expect(after.lastTurn).toBe(editor.map.world!.time)
  })

  it('turns come by themselves every 7 days of the world clock, unless asked not to', async () => {
    grey()
    const turns = () =>
      editor.map.world!.timeline.filter((e) => e.code === 'LOG' && e.data?.faction === 'the-vale')
        .length
    worldAct({ type: 'advance', minutes: 15 * 1440 })
    expect(turns()).toBe(2)
    editor.setFactions({ ...editor.map.factions!, auto: false })
    worldAct({ type: 'advance', minutes: 15 * 1440 })
    expect(turns()).toBe(2)
  })

  it('a trip’s results reach the world: a clock ticks, a faction thinks better of you', () => {
    grey()
    const wyrm = () =>
      editor.map.world!.clocks.find((c) => c.name === 'The Greywood Wyrm wakes')!.filled
    const before = wyrm()
    applyWorldEffects({
      'world.clocks.the-greywood-wyrm-wakes': 1,
      'factions.fort-keld.values.reputation': 1,
      'factions.the-vale.territory': 1,
      'party.resources.food': -1,
    })
    expect(wyrm()).toBe(before + 1)
    const own = editor.map.factions!
    expect(own.factions.find((f) => f.id === 'fort-keld')!.values.reputation).toBe(1)
    expect(own.territories['the-vale'].length).toBe(97)
  })

  it('without a trip, the world clock rolls its own weather each day', () => {
    grey()
    worldAct({ type: 'advance', minutes: 3 * 1440 })
    const weather = editor.map.worldWeather!
    expect(weather.day).toBe(worldCalendar().describe(editor.map.world!.time).day)
    expect(['clear', 'grey', 'rain', 'fog', 'storm', 'snow']).toContain(weather.weather)
    expect(rollContext()).toMatchObject({ weather: weather.weather })
    expect(bundleToMap(mapToBundle(editor.map)).worldWeather).toEqual(weather)
    // With a trip, the trip's weather is the world's: its own isn't rolled.
    clickHex('7,7')
    const day = editor.map.worldWeather!.day
    worldAct({ type: 'advance', minutes: 60 })
    expect(editor.map.worldWeather!.day).toBe(day)
  })

  it('a map without them can bring the system’s, and take them off', () => {
    grey()
    removeFactions()
    expect(editor.map.factions).toBeUndefined()
    bringFactions()
    expect(editor.map.factions!.territories['the-vale'].length).toBeGreaterThan(10)
  })
})
