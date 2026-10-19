import type { HexKey } from '@open-tabletop/hex'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { dialog, toasts } from '@open-tabletop/ui-kit'
import { exampleMaps } from '../io/examples'
import { parseMapFile } from '../io/otd'
import { createMap, deserializeMap, serializeMap } from '@open-tabletop/map'
import { editor } from '../store/editor.svelte'
import { SetMetaCommand } from '../commands/settings'
import { bundleToMap, mapToBundle } from '../io/otd'
import { factionsOn } from '@open-tabletop/campaign'
import {
  applyResult,
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
  bringClocks,
  missingClocks,
  stopWorld,
} from './world.svelte'
import { bringFactions, paintTerritory, removeFactions } from './factions'
import { currentTool } from '../tools/tools'
import { oracleUi, rollContext } from './oracle'
import { activeSystem, mapPacks, mapSystemId, playSystems } from './systems'
import { library } from './packs'

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
    editor.open(parseMapFile(EXAMPLE_MAPS.find((m) => m.id === 'greymarches1')!.json))
    expect(partyLocation()).toBe('5,7')
    clickHex('7,7')
    const session = sessionOf(editor.map.play!)
    expect(session?.travel.location).toBe('5,7')
    expect(session?.travel.destination).toBe('7,7')
    expect(editor.map.play?.rules?.system).toBe('grey-marches')
  })

  it('a map that chooses no system plays Core’s Generic rules, its day named by parts', () => {
    editor.load(createMap())
    setMode('rules')
    clickHex('1,1')
    clickHex('4,1')
    expect(mapSystemId()).toBe('core')
    const session = sessionOf(editor.map.play!)!
    expect(editor.map.play?.rules?.system).toBe('core')
    const calendar = activeSystem().calendar!
    expect(calendar.describe(session.travel.time)).toMatchObject({
      hour: 6,
      divisions: { part: 'morning' },
    })
    step({ type: 'action', id: 'march', with: { until: 'destination' } })
    const after = sessionOf(editor.map.play!)!
    expect(after.travel.location).not.toBe('1,1')
    expect(after.journal.some((e) => e.code === 'ACTION_TAKEN' && e.data?.action === 'march')).toBe(
      true,
    )
    // Its characters are Core's sheets, named by its pack.
    expect(activeSystem().sheet?.def.values.health.name).toMatchObject({
      en: 'Health',
      es: 'Salud',
    })
  })

  it('a system without travel rules plays no trips on the map', () => {
    library.addPack({
      root: 'still',
      origin: 'user',
      files: [
        {
          path: 'pack.yaml',
          content: 'id: still\nname: Still\nversion: 0.1.0\nlocale: en\nformat: 4\n',
        },
        { path: 'system.yaml', content: 'kind: system\nname: Still\n' },
      ],
    })
    editor.load(createMap())
    editor.execute(new SetMetaCommand({ system: 'still' }))
    setMode('rules')
    clickHex('1,1')
    clickHex('3,1')
    expect(sessionOf(editor.map.play!)).toBeNull()
    library.removePack('still')
  })

  it('a map chooses its system and the packs it adds (the example: the Grey Marches alone)', () => {
    editor.open(parseMapFile(EXAMPLE_MAPS.find((m) => m.id === 'greymarches1')!.json))
    expect(editor.meta.system).toBe('grey-marches')
    expect(editor.meta.packs).toEqual([])
    // The system brings its own pack and Core; nothing else is shown.
    expect(mapPacks()).toEqual(['grey-marches', 'core'])
    expect(oracleUi.showsPack('grey-marches')).toBe(true)
    expect(oracleUi.showsPack('core')).toBe(true)
    expect(oracleUi.showsPack('kal-arath')).toBe(false)
    // Every system can be chosen, whatever the packs.
    expect(playSystems().map((s) => s.id)).toEqual(expect.arrayContaining(['core', 'grey-marches']))
    // Back to every pack: undoable, and saved in the file.
    editor.execute(new SetMetaCommand({ packs: undefined }))
    expect(oracleUi.showsPack('kal-arath')).toBe(true)
    expect(mapToBundle(editor.map, editor.campaign).maps[0].ext).not.toHaveProperty([
      'hexmapper',
      'packs',
    ])
    editor.undo()
    expect(editor.meta.packs).toEqual([])
    // The Generic rules (Core's, the default: no key in the map) bring Core.
    editor.execute(new SetMetaCommand({ system: 'generic', packs: ['core'] }))
    expect(editor.meta).not.toHaveProperty('system')
    expect(mapPacks()).toEqual(['core'])
    expect(oracleUi.showsPack('grey-marches')).toBe(false)
    expect(mapToBundle(editor.map, editor.campaign).maps[0].ext).not.toHaveProperty([
      'hexmapper',
      'system',
    ])
    editor.undo()
    expect(editor.meta.system).toBe('grey-marches')
    // Saved in the file and read back.
    const back = bundleToMap(mapToBundle(editor.map, editor.campaign)).map
    expect(back.meta).toMatchObject({ system: 'grey-marches', packs: [] })
  })

  it("new trips play the map's system; a trip going on keeps its own until a new one", () => {
    editor.open(parseMapFile(EXAMPLE_MAPS.find((m) => m.id === 'greymarches1')!.json))
    clickHex('7,7')
    expect(editor.map.play?.rules?.system).toBe('grey-marches')
    startWorld()
    const marches = worldCalendar().describe(editor.campaign.world!.time)
    // The map changes system: the trip and the world's calendar stay the trip's.
    editor.execute(new SetMetaCommand({ system: 'generic' }))
    expect(activeSystem().id).toBe('grey-marches')
    expect(worldCalendar().describe(editor.campaign.world!.time)).toEqual(marches)
    // A new trip (Play → New trip) plays the map's system, and so does the world.
    restartRules(mapSystemId(), 'spring')
    expect(editor.map.play?.rules?.system).toBe('core')
    expect(activeSystem().id).toBe('core')
    expect(worldCalendar().describe(editor.campaign.world!.time)).not.toEqual(marches)
    // Choosing a system in Play is choosing the map's: undoable like Map settings.
    restartRules('grey-marches', 'spring')
    expect(editor.meta.system).toBe('grey-marches')
    expect(editor.map.play?.rules?.system).toBe('grey-marches')
  })

  it('the world clock reaches the trip: hand rolls and checks read its clocks and events', () => {
    editor.open(parseMapFile(EXAMPLE_MAPS.find((m) => m.id === 'greymarches1')!.json))
    clickHex('7,7')
    startWorld()
    const start = editor.campaign.world!.time
    worldAct({ type: 'addClock', clock: { name: 'The Wyrm wakes', segments: 6, filled: 2 } })
    worldAct({ type: 'schedule', event: { name: 'Market day', at: start + 60 } })
    // A roll by hand sees what the trip's checks would: the moment, the trip, the world.
    expect(rollContext()).toMatchObject({
      tripDay: 1,
      visits: 1,
      clocks: { 'the-wyrm-wakes': 2 },
      events: ['market-day'],
      party: { mode: 'foot' },
    })
    expect(typeof rollContext().hour).toBe('number')
  })

  it('one trip at a time in a campaign: another that played last is paused first', async () => {
    editor.open(parseMapFile(EXAMPLE_MAPS.find((m) => m.id === 'greymarches1')!.json))
    clickHex('7,7')
    startWorld()
    const session = () => sessionOf(editor.map.play!)!
    step({ type: 'wait', until: session().travel.time + 30 })
    // The map's trip is the one going on…
    expect(editor.campaign.playing).toMatchObject({ app: 'hexmapper', id: editor.map.meta.id })
    // …until a trip of Travel plays in the campaign, and moves its clock on a day.
    const travel = { app: 'travel', id: 't1', name: 'To Keld' }
    editor.setPlaying(travel)
    worldAct({ type: 'advance', minutes: 1440 })
    const world = editor.campaign.world!.time
    const before = session().travel.time
    // Playing here asks; no: nothing happens.
    step({ type: 'wait', until: before + 60 })
    expect(dialog.current?.message).toMatch(/“To Keld”/)
    dialog.current!.resolve('cancel')
    await Promise.resolve()
    expect(session().travel.time).toBe(before)
    expect(editor.campaign.playing).toEqual(travel)
    // Yes: the party waits until the campaign's clock, then does what was asked.
    step({ type: 'wait', until: world + 60 })
    dialog.current!.resolve('ok')
    await vi.waitFor(() => expect(session().travel.time).toBeGreaterThanOrEqual(world + 60))
    expect(editor.campaign.playing).toMatchObject({ app: 'hexmapper' })
    expect(toasts.map((x) => x.message).join(' ')).toMatch(/waited until then/)
  })

  it('the world clock is saved in the file and follows a trip, telling what came due', () => {
    editor.open(parseMapFile(EXAMPLE_MAPS.find((m) => m.id === 'greymarches1')!.json))
    startWorld()
    const start = editor.campaign.world!.time
    worldAct({ type: 'schedule', event: { name: 'The Iron Clans attack', at: start + 60 } })
    worldAct({ type: 'addClock', clock: { name: 'The Wyrm wakes', segments: 6, filled: 1 } })
    // In the file: clocks as OTD clocks, the rest as engine state; and back.
    const bundle = mapToBundle(editor.map, editor.campaign)
    // The system's own clocks come with the world clock (`ref`: their declared ids).
    expect(bundle.clocks).toEqual([
      expect.objectContaining({ ref: 'the-greywood-wyrm-wakes', segments: 6, filled: 1 }),
      expect.objectContaining({ ref: 'the-iron-clans-march', segments: 6, filled: 1 }),
      expect.objectContaining({ ref: 'fort-keld-mutinies', segments: 8, filled: 3 }),
      expect.objectContaining({ type: 'clock', name: 'The Wyrm wakes', segments: 6, filled: 1 }),
    ])
    expect(bundle.state.world).toMatchObject({
      time: start,
      events: [{ name: 'The Iron Clans attack' }],
    })
    const back = bundleToMap(JSON.parse(JSON.stringify(bundle)))
    expect(back.campaign.world).toEqual(editor.campaign.world)
    // A trip starts at the world's time, and its time passing brings the attack (not
    // `travel`: a storm could keep the party in, and rolls here aren't seeded).
    clickHex('7,7')
    const session = sessionOf(editor.map.play!)!
    expect(session.travel.time).toBe(start)
    step({ type: 'advanceTime', minutes: 120 })
    expect(editor.campaign.world!.time).toBe(sessionOf(editor.map.play!)!.travel.time)
    expect(sessionOf(editor.map.play!)!.journal.some((e) => e.code === 'WORLD_EVENT')).toBe(true)
  })

  describe('playing with the world clock', () => {
    const grey = () =>
      editor.open(parseMapFile(EXAMPLE_MAPS.find((m) => m.id === 'greymarches1')!.json))
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

    it('the Grey Marches’ calendar divides the day: the clock waits until a part of it', async () => {
      grey()
      startWorld()
      const calendar = worldCalendar()
      expect(calendar.divisions?.map((d) => d.id)).toEqual(['part', 'watch'])
      const at = (time: number) => calendar.describe(time)
      const day = at(editor.campaign.world!.time).day
      // Without a trip, the world alone: to the evening, then to the next watch.
      await advance({ until: { part: 'part.evening' } })
      expect(editor.campaign.world!.time).toBe(calendar.at(day, '18:00'))
      expect(at(editor.campaign.world!.time)).toMatchObject({
        divisions: { part: 'evening' },
        tags: [],
      })
      // No watch by day: the Marches keep them only at night.
      expect(at(editor.campaign.world!.time).watch).toBeUndefined()
      await advance({ until: { part: 'watch' } })
      expect(at(editor.campaign.world!.time)).toMatchObject({
        hour: 20,
        watch: 'first',
        divisions: { part: 'night', watch: 'first' },
        tags: ['dark'],
      })
      // During a trip, hand rolls see the part of the day, its tags and when parts start.
      clickHex('5,7')
      expect(rollContext()).toMatchObject({
        part: 'night',
        watch: 'first',
        time: { part: 'night', watch: 'first', tags: ['dark'] },
        system: { part: { morning: 6, night: 20 }, watch: { middle: 23 } },
      })
      // A part the calendar doesn't have: nothing moves.
      const now = editor.campaign.world!.time
      await advance({ until: { part: 'part.supper' } })
      expect(editor.campaign.world!.time).toBe(now)
    })

    it('moving the world on a day with a route planned asks, then travels along it', async () => {
      grey()
      startWorld()
      clickHex('7,7')
      const start = editor.campaign.world!.time
      const asked = await advance({ until: 'next-day' })
      expect(asked).toContain('0808')
      expect(asked).toMatch(/travel on/i)
      const after = trip()
      expect(after.journal.some((e) => e.code === 'HEX_ENTERED')).toBe(true)
      expect(partyLocation()).not.toBe('5,7')
      expect(after.travel.time).toBeGreaterThan(start)
      expect(editor.campaign.world!.time).toBe(after.travel.time)
    })

    it('day after day, the party reaches its destination; one time for both all along', async () => {
      grey()
      startWorld()
      clickHex('7,7')
      for (let day = 0; day < 10 && partyLocation() !== '7,7'; day++) {
        await advance({ until: 'next-day' })
        // Whatever stopped it (a check waiting for the player), the player goes on.
        for (const c of trip().travel.pendingChecks) step({ type: 'resolveCheck', id: c.id })
        expect(editor.campaign.world!.time).toBe(trip().travel.time)
      }
      expect(partyLocation()).toBe('7,7')
      expect(trip().journal.some((e) => e.code === 'DESTINATION_REACHED')).toBe(true)
      // Said at the bottom too.
      expect(toasts.some((x) => /reached its destination/.test(x.message))).toBe(true)
      // Once there, moving on waits there.
      await advance({ until: 'next-day' })
      expect(partyLocation()).toBe('7,7')
      expect(editor.campaign.world!.time).toBe(trip().travel.time)
    })

    it('saying no to the question leaves the trip and the world as they were', async () => {
      grey()
      startWorld()
      clickHex('7,7')
      const before = structuredClone(trip())
      const time = editor.campaign.world!.time
      expect(await advance({ until: 'next-day' }, 'cancel')).toBeTruthy()
      expect(trip()).toEqual(before)
      expect(editor.campaign.world!.time).toBe(time)
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
      const start = editor.campaign.world!.time
      const asked = await advance({ minutes: 60 })
      expect(asked).toBeUndefined()
      expect(trip().travel.time).toBe(start + 60)
      expect(editor.campaign.world!.time).toBe(start + 60)
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
      expect(editor.campaign.world!.time).toBe(after.travel.time)
    })

    it('an hour waited is an hour for both; without a trip only the world moves', async () => {
      grey()
      startWorld()
      const start = editor.campaign.world!.time
      await advance({ minutes: 60 })
      expect(editor.campaign.world!.time).toBe(start + 60)
      clickHex('7,7')
      noRoute()
      expect(trip().travel.time).toBe(start + 60)
      await advance({ minutes: 60 })
      expect(trip().travel.time).toBe(start + 120)
      expect(editor.campaign.world!.time).toBe(start + 120)
    })

    it('a clock started during a trip starts at the trip’s time', () => {
      grey()
      clickHex('7,7')
      step({ type: 'advanceTime', minutes: 90 })
      startWorld()
      expect(editor.campaign.world!.time).toBe(trip().travel.time)
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
    editor.open(parseMapFile(EXAMPLE_MAPS.find((m) => m.id === 'greymarches1')!.json))
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
    const parts = calendar().describe(editor.campaign.world!.time)
    expect(parts).toMatchObject({ year: 412, month: { id: 'highsun', day: 15 }, hour: 6 })
    expect(parts.holidays.map((h) => h.id)).toEqual(['midsummer'])
  })

  it('goes forward like moving time on, and back only after asking, without a trip', async () => {
    grey()
    editor.map.play = undefined
    startWorld(calendar().at(1, '06:00'))
    const start = editor.campaign.world!.time
    worldAct({ type: 'schedule', event: { id: 'fair', name: 'The fair', at: start + 1440 } })
    await setDate(start + 3 * 1440)
    expect(editor.campaign.world!.time).toBe(start + 3 * 1440)
    expect(editor.campaign.world!.timeline.some((e) => e.code === 'EVENT')).toBe(true)
    // Back: asked first; saying no changes nothing.
    expect(await setDate(start, 'cancel')).toMatch(/back/i)
    expect(editor.campaign.world!.time).toBe(start + 3 * 1440)
    await setDate(start)
    expect(editor.campaign.world!.time).toBe(start)
    expect(editor.campaign.world!.timeline.at(-1)?.code).toBe('REWOUND')
  })

  it('the example map’s market day (an event by its id) lets the party trade in Ashford', async () => {
    // The example map comes with its world clock running, and its events.
    grey()
    clickHex('5,7')
    const fair = editor.campaign.world!.events.find((e) => e.id === 'market-day')!
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
    expect(calendar().describe(editor.campaign.world!.time).weekday?.id).not.toBe('marketday')
    step({ type: 'action', id: 'market' })
    expect(traded()).toBe(true)
  })

  it('never goes back while a trip is going on', async () => {
    grey()
    startWorld()
    clickHex('5,7')
    const now = editor.campaign.world!.time
    toasts.length = 0
    await setDate(now - 60)
    expect(editor.campaign.world!.time).toBe(now)
    expect(toasts.at(-1)?.kind).toBe('error')
  })
})

describe('the Company: a party made of characters', () => {
  const grey = () =>
    editor.open(parseMapFile(EXAMPLE_MAPS.find((m) => m.id === 'greymarches1')!.json))
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
    const bundle = mapToBundle(editor.map, editor.campaign)
    expect(bundle.parties[0].members).toEqual(['kael', 'mara', 'tobin'])
    expect(bundle.characters.find((c) => c.id === 'tobin')).toMatchObject({
      kind: 'pc',
      stats: { survival: 2, maxHealth: 4 },
      ext: { character: { sheet: 'grey-marches/companion' } },
    })
    const back = sessionOf(bundleToMap(bundle).map.play!)!
    expect(back.members).toEqual(trip().members)
  })

  it('the Company has a sheet of its own, whoever travels: shaken, it can’t force a march until it rests', () => {
    grey()
    clickHex('7,7')
    // Its morale, fatigue, hirelings and endurance are the party's stats.
    expect(trip().party).toMatchObject({
      sheet: 'grey-marches/company',
      values: { morale: 3, fatigue: 0, endurance: 10 },
    })
    expect(trip().stats).toMatchObject({ morale: 3, fatigue: 0, endurance: 10 })
    expect(tripAvailability({ system: activeSystem() }, trip())['forced-march']).toBeUndefined()
    // Lost in the dark (a table's effect on the party's own sheet): shaken.
    editSession((s) =>
      applyResult(
        s,
        { effects: { 'party.conditions.shaken': true, 'party.stats.morale': -1 } },
        activeSystem().bindings?.stats,
        {},
        partyOf(activeSystem()),
      ),
    )
    expect(trip().party!.conditions).toHaveProperty('shaken')
    expect(trip().party!.values.morale).toBe(2)
    expect(tripAvailability({ system: activeSystem() }, trip())['forced-march']).toMatchObject({
      value: 'shaken',
      who: 'party',
    })
    expect(rollContext()).toMatchObject({
      party: { values: { morale: 2 }, conditions: ['shaken'] },
    })
    // A rest clears it; the fatigue it eases is the sheet's, never below 0.
    step({ type: 'action', id: 'rest' })
    expect(trip().party!.conditions).not.toHaveProperty('shaken')
    expect(trip().party!.values.fatigue).toBe(0)
    // Characters leave and join: the Company stays.
    editSession((s) => ({ ...s, members: s.members!.slice(1) }))
    expect(trip().party!.values.morale).toBe(2)
    // Kept in the map file.
    const back = sessionOf(bundleToMap(mapToBundle(editor.map, editor.campaign)).map.play!)!
    expect(back.party).toEqual(trip().party)
  })

  it('who does the talking: the best, or whoever the player chooses; asked at every roll if wished', () => {
    grey()
    clickHex('7,7')
    expect(trip().stats.charisma).toBe(2) // Mara's, the best
    editSession((s) => ({ ...s, rolls: 'tobin' }))
    expect(rollContext()).toMatchObject({
      party: { stats: { charisma: member('tobin').values.charisma } },
    })
    // Asked at every roll: a check rolled on a table (foraging's) waits for the choice.
    editSession((s) => ({ ...s, askRolls: true }))
    step({ type: 'action', id: 'forage' })
    const asking = trip().asking ?? []
    expect(asking.length).toBeGreaterThan(0)
    expect(trip().journal.some((e) => e.code === 'CHECK_ASKS')).toBe(true)
    const results = trip().journal.filter((e) => e.code === 'ORACLE_RESULT').length
    step({ type: 'resolveCheck', id: asking[0] })
    expect(trip().journal.filter((e) => e.code === 'ORACLE_RESULT').length).toBe(results + 1)
    expect(trip().asking ?? []).not.toContain(asking[0])
    // Kept in the map file.
    const back = sessionOf(bundleToMap(mapToBundle(editor.map, editor.campaign)).map.play!)!
    expect(back).toMatchObject({ rolls: 'tobin', askRolls: true })
  })

  it('eats a ration per mouth from whoever carries most, and a fed night heals', () => {
    grey()
    clickHex('5,7')
    editSession((s) => {
      s.members![0].values.health = 1
      return s
    })
    step({ type: 'action', id: 'camp' })
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
    const back = sessionOf(bundleToMap(mapToBundle(editor.map, editor.campaign)).map.play!)!
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
    // The threads are a layer of their own, hidden until shown, and stay as left in the file.
    expect(editor.map.layers.relations.visible).toBe(false)
    expect(editor.map.layers.party.visible).toBe(true)
    editor.setLayer('relations', { visible: true })
    expect(bundleToMap(mapToBundle(editor.map, editor.campaign)).map.layers.relations.visible).toBe(
      true,
    )
    // A map saved before the layer, with Play's old Show relations, opens with it hidden.
    const old = JSON.parse(serializeMap(editor.map))
    old.version = 20
    old.play.showRelations = false
    delete old.layers.relations
    const opened = deserializeMap(JSON.stringify(old))
    expect(opened.layers.relations.visible).toBe(false)
    expect(opened.play).not.toHaveProperty('showRelations')
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
    const back = bundleToMap(mapToBundle(editor.map, editor.campaign)).map.tokens.find(
      (t) => t.id === brenna.id,
    )!
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
    editor.open(parseMapFile(EXAMPLE_MAPS.find((m) => m.id === 'greymarches1')!.json))
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
    const own = editor.factionsOnMap!
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
    const back = bundleToMap(mapToBundle(editor.map, editor.campaign))
    expect(factionsOn(back.campaign, back.map)).toEqual(own)
  })

  it('a world turn rolls each one’s table: values, territory, clocks and the timeline change', () => {
    grey()
    const before = structuredClone(editor.factionsOnMap!)
    const clock = () =>
      editor.campaign.world!.clocks.find((c) => c.name === 'The Iron Clans march')!.filled
    const filled = clock()
    worldTurnNow()
    const lines = editor.campaign.world!.timeline.filter((e) => e.code === 'LOG')
    expect(lines.map((l) => l.data?.faction)).toEqual(['iron-clans', 'the-vale', 'fort-keld'])
    expect(lines[0].text).toMatch(/^The Iron Clans: /)
    // Something changed: a value, the territory or the Clans' march.
    const after = editor.factionsOnMap!
    const changed =
      JSON.stringify(after.factions) !== JSON.stringify(before.factions) ||
      JSON.stringify(after.territories) !== JSON.stringify(before.territories) ||
      clock() !== filled
    expect(changed).toBe(true)
    expect(after.lastTurn).toBe(editor.campaign.world!.time)
  })

  it('turns come by themselves every 7 days of the world clock, unless asked not to', async () => {
    grey()
    const turns = () =>
      editor.campaign.world!.timeline.filter(
        (e) => e.code === 'LOG' && e.data?.faction === 'the-vale',
      ).length
    worldAct({ type: 'advance', minutes: 15 * 1440 })
    expect(turns()).toBe(2)
    editor.setFactions({ ...editor.factionsOnMap!, auto: false })
    worldAct({ type: 'advance', minutes: 15 * 1440 })
    expect(turns()).toBe(2)
  })

  it('a trip’s results reach the world: a clock ticks, a faction thinks better of you', () => {
    grey()
    const wyrm = () =>
      editor.campaign.world!.clocks.find((c) => c.name === 'The Greywood Wyrm wakes')!.filled
    const before = wyrm()
    applyWorldEffects({
      'world.clocks.the-greywood-wyrm-wakes': 1,
      'factions.fort-keld.values.reputation': 1,
      'factions.the-vale.territory': 1,
      'party.resources.food': -1,
    })
    expect(wyrm()).toBe(before + 1)
    const own = editor.factionsOnMap!
    expect(own.factions.find((f) => f.id === 'fort-keld')!.values.reputation).toBe(1)
    expect(own.territories['the-vale'].length).toBe(97)
  })

  it('without a trip, the world clock rolls its own weather each day', () => {
    grey()
    worldAct({ type: 'advance', minutes: 3 * 1440 })
    const weather = editor.campaign.worldWeather!
    expect(weather.day).toBe(worldCalendar().describe(editor.campaign.world!.time).day)
    expect(['clear', 'grey', 'rain', 'fog', 'storm', 'snow']).toContain(weather.weather)
    expect(rollContext()).toMatchObject({ weather: weather.weather })
    expect(bundleToMap(mapToBundle(editor.map, editor.campaign)).campaign.worldWeather).toEqual(
      weather,
    )
    // With a trip, the trip's weather is the world's: its own isn't rolled.
    clickHex('7,7')
    const day = editor.campaign.worldWeather!.day
    worldAct({ type: 'advance', minutes: 60 })
    expect(editor.campaign.worldWeather!.day).toBe(day)
  })

  it('their land is painted by hand from the World panel: claimed from others, or given up', () => {
    grey()
    const land = (id: string) => editor.factionsOnMap!.territories[id]
    expect(land('fort-keld')).toEqual(['15,9'])
    // With the brush on and the World panel open, the map's clicks paint.
    editor.panelView = 'world'
    editor.factionBrush = 'fort-keld'
    const tool = currentTool()
    const at = (key: string) => {
      const [col, row] = key.split(',').map(Number)
      return { col, row }
    }
    const info = {
      button: 0,
      alt: false,
      ctrl: false,
      shift: false,
      world: { x: 0, y: 0 },
      pickRadius: 1,
    }
    const vale = land('the-vale')[0]
    tool.down(at(vale), info)
    tool.up()
    expect(land('fort-keld')).toContain(vale)
    expect(land('the-vale')).not.toContain(vale)
    // A right click gives it up: nobody's.
    tool.down(at(vale), { ...info, button: 2 })
    tool.up()
    expect(Object.values(editor.factionsOnMap!.territories).flat()).not.toContain(vale)
    // Water stays nobody's.
    const water = new Set(editor.map.terrains.filter((t) => t.water).map((t) => t.id))
    const lake = Object.entries(editor.map.hexes).find(
      ([, h]) => h?.terrain && water.has(h.terrain),
    )![0]
    paintTerritory('fort-keld', [lake], true)
    expect(land('fort-keld')).not.toContain(lake)
    // Another panel, or no brush: the tool's own clicks again; a new map forgets the brush.
    editor.panelView = 'tool'
    expect(currentTool()).not.toBe(tool)
    editor.load(createMap())
    expect(editor.factionBrush).toBeNull()
  })

  it('a map without them can bring the system’s, and take them off', () => {
    grey()
    removeFactions()
    expect(editor.factionsOnMap).toBeUndefined()
    bringFactions()
    expect(editor.factionsOnMap!.territories['the-vale'].length).toBeGreaterThan(10)
    // Fort Keld's hex is on the example map (`map:` in the pack): it's given here…
    expect(editor.factionsOnMap!.territories['fort-keld']).toEqual(['15,9'])
    // …and not on another map with the same regions: its 15,9 is somewhere else.
    const { map } = parseMapFile(EXAMPLE_MAPS.find((m) => m.id === 'greymarches1')!.json)
    editor.load({ ...map, meta: { ...map.meta, id: 'othermap0001', campaign: 'othermap0001' } })
    bringFactions()
    expect(editor.factionsOnMap!.territories['the-vale'].length).toBeGreaterThan(10)
    expect(editor.factionsOnMap!.territories['fort-keld']).toBeUndefined()
  })
})

describe('the threats of the Marches: progress clocks the system declares', () => {
  const grey = () =>
    editor.open(parseMapFile(EXAMPLE_MAPS.find((m) => m.id === 'greymarches1')!.json))
  const clock = (ref: string) => editor.campaign.world!.clocks.find((c) => c.ref === ref)
  const faction = (id: string) => editor.factionsOnMap!.factions.find((f) => f.id === id)!
  beforeEach(() => {
    let seed = 7
    vi.spyOn(Math, 'random').mockImplementation(() => {
      seed = (seed * 1103515245 + 12345) % 2147483648
      return seed / 2147483648
    })
  })
  afterEach(() => vi.restoreAllMocks())

  it('the example map has them, by their declared ids whatever they are called', () => {
    grey()
    expect(editor.campaign.world!.clocks.map((c) => [c.ref, c.filled, c.segments])).toEqual([
      ['the-greywood-wyrm-wakes', 1, 6],
      ['fort-keld-mutinies', 3, 8],
      ['the-iron-clans-march', 1, 6],
    ])
    const march = clock('the-iron-clans-march')!
    worldAct({ type: 'updateClock', id: march.id, patch: { name: 'Los Clanes marchan' } })
    applyWorldEffects({ 'world.clocks.the-iron-clans-march': 1 })
    expect(clock('the-iron-clans-march')!.filled).toBe(2)
    expect(rollContext()).toMatchObject({
      clocks: { 'the-iron-clans-march': 2, 'los-clanes-marchan': 2 },
    })
    // `'=N'` fills it up to N.
    applyWorldEffects({ 'world.clocks.fort-keld-mutinies': '=5' })
    expect(clock('fort-keld-mutinies')!.filled).toBe(5)
  })

  it('the Clans march when theirs fills: at war, the garrison weaker and closer to mutiny; it starts over', () => {
    grey()
    const strength = faction('fort-keld').values.strength
    applyWorldEffects({ 'world.clocks.the-iron-clans-march': 5 })
    expect(clock('the-iron-clans-march')!.filled).toBe(0)
    expect(faction('iron-clans').conditions).toHaveProperty('at-war')
    expect(faction('fort-keld').values.strength).toBe(strength - 1)
    expect(clock('fort-keld-mutinies')!.filled).toBe(5)
    const lines = editor.campaign.world!.timeline.map((e) => e.text ?? e.code)
    expect(lines).toContain('The Iron Clans march: The Clans march on Fort Keld. It starts over.')
    expect(toasts.at(-1)?.message).toMatch(/^The Iron Clans march: filled! The Clans march/)
    // It may fill again.
    applyWorldEffects({ 'world.clocks.the-iron-clans-march': 6 })
    expect(clock('fort-keld-mutinies')!.filled).toBe(7)
  })

  it('one full clock fills another: the march brings the mutiny, and the garrison is gone', () => {
    grey()
    applyWorldEffects({ 'world.clocks.fort-keld-mutinies': 4 })
    applyWorldEffects({ 'world.clocks.the-iron-clans-march': 5 })
    // Both filled: the march started over, the mutiny went away with the garrison's fort.
    expect(clock('the-iron-clans-march')!.filled).toBe(0)
    expect(clock('fort-keld-mutinies')).toBeUndefined()
    expect(faction('fort-keld').values.strength).toBe(0)
    expect(editor.factionsOnMap!.territories['fort-keld']).toEqual([])
    expect(
      editor.campaign.world!.timeline.some((e) =>
        /garrison mutinies and scatters/.test(e.text ?? ''),
      ),
    ).toBe(true)
    // Brought back by hand, as it starts.
    bringClocks()
    expect(clock('fort-keld-mutinies')!.filled).toBe(3)
  })

  it('the Wyrm wakes: its table rolled, read by the wood’s encounters; it stays full', () => {
    grey()
    const vale = faction('the-vale').values.strength
    const clans = faction('iron-clans').values.strength
    applyWorldEffects({ 'world.clocks.the-greywood-wyrm-wakes': 5 })
    expect(clock('the-greywood-wyrm-wakes')!.filled).toBe(6)
    const line = editor.campaign.world!.timeline.find((e) =>
      /^The Greywood Wyrm wakes: /.test(e.text ?? ''),
    )!
    expect(line.text).toMatch(
      /The Wyrm wakes, and the Greywood goes quiet\. (It falls on the Vale’s herds \(the Vale’s strength was 3\)|It scatters the Clans’ watch-fires in the hills|It lies in wait under the trees)$/,
    )
    const changes = [
      faction('the-vale').values.strength - vale,
      faction('iron-clans').values.strength - clans,
    ]
    expect([
      [-1, 0],
      [0, -1],
      [0, 0],
    ]).toContainEqual(changes)
    expect(rollContext()).toMatchObject({ clocks: { 'the-greywood-wyrm-wakes': 6 } })
    // Full, it stays so: more doesn't wake it again.
    const count = editor.campaign.world!.timeline.length
    applyWorldEffects({ 'world.clocks.the-greywood-wyrm-wakes': 1 })
    expect(editor.campaign.world!.timeline.length).toBe(count)
  })

  it('a new world clock starts with the system’s clocks; a map without them can bring them', () => {
    grey()
    stopWorld()
    startWorld()
    expect(editor.campaign.world!.clocks.map((c) => c.ref)).toEqual([
      'the-greywood-wyrm-wakes',
      'the-iron-clans-march',
      'fort-keld-mutinies',
    ])
    worldAct({ type: 'removeClock', id: clock('the-iron-clans-march')!.id })
    expect(missingClocks().map((c) => c.ref)).toEqual(['the-iron-clans-march'])
    bringClocks()
    expect(missingClocks()).toEqual([])
    // The generic system declares none.
    editor.load(createMap())
    startWorld()
    expect(editor.campaign.world!.clocks).toEqual([])
  })
})
