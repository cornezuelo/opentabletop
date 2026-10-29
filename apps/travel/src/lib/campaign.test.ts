import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { LibraryChange, LibraryEntry } from '@open-tabletop/storage'

/**
 * Travel's trips in campaigns: a trip joins a map's campaign, its days are the campaign's
 * world clock (events coming due go to its journal), its checks roll on the campaign's
 * Oracle, and one trip goes on at a time (the map's trip that played last is paused, and the
 * party waits until the campaign's clock).
 */

// Where campaigns and maps are kept: in memory here (IndexedDB in a browser).
const kept = new Map<string, LibraryEntry>()
const maps: LibraryEntry[] = []
let hear: ((change: LibraryChange) => void) | undefined
vi.mock('@open-tabletop/storage', async (original) => ({
  ...(await original<typeof import('@open-tabletop/storage')>()),
  getCampaign: async (id: string) => kept.get(id) ?? null,
  deleteCampaign: async (id: string) => void kept.delete(id),
  allLibraryMaps: async () => maps,
  getLibraryMap: async (id: string) => maps.find((m) => m.id === id) ?? null,
  putCampaign: async (entry: LibraryEntry) => void kept.set(entry.id, entry),
  listCampaigns: async () =>
    [...kept.values()].map(({ id, name, modified }) => ({ id, name, modified })),
  onCampaignChange: (listener: (change: LibraryChange) => void) => {
    hear = listener
    return () => {}
  },
}))

async function openTravel() {
  vi.resetModules()
  const campaign = await import('@open-tabletop/campaign')
  const world = await import('@open-tabletop/world-engine')
  const { dialog, toasts } = await import('@open-tabletop/ui-kit')
  const { trip } = await import('./trip.svelte')
  const { systems } = await import('./packs.svelte')
  return { campaign, world, dialog, toasts, trip, systems }
}

/** Waits for the campaign store's reads and writes to settle. */
const settle = () => new Promise((resolve) => setTimeout(resolve, 0))

describe('trips in campaigns', () => {
  beforeEach(() => {
    localStorage.clear()
    kept.clear()
    maps.length = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.42)
  })

  it('plays in a map’s campaign: its clock, its Oracle, one trip at a time', async () => {
    const { campaign: c, world: w, dialog, toasts, trip, systems } = await openTravel()
    const greyMarches = systems.list.find((s) => s.id.startsWith('grey-marches'))!

    // A map's campaign, its world clock at 08:00 of day 10, a fair at noon, its trip last.
    const calendar = (await import('@open-tabletop/session')).calendarOf(greyMarches)
    const start = calendar.at(10, '08:00')
    const fair = calendar.at(10, '12:00')
    const clock = w.createWorld({ calendar })
    const state = clock.apply(w.initialWorld(start), {
      type: 'schedule',
      event: { name: 'The Keld fair', at: fair },
    }).state
    const frontier = {
      ...c.createCampaign('m1', 'The Frontier'),
      world: state,
      playing: { app: 'hexmapper', id: 'm1', name: 'The Frontier' },
    }
    kept.set('m1', {
      id: 'm1',
      name: 'The Frontier',
      modified: frontier.modified,
      json: c.serializeCampaign(frontier),
    })
    const map = { meta: { id: 'm1', name: 'The Frontier', campaign: 'm1' } }
    maps.push({ id: 'm1', name: 'The Frontier', modified: '', json: JSON.stringify(map) })

    // A new trip in it starts at the campaign's time, and lists it among those to join.
    // The campaign is the map's too, and plays Core's system: playing the Grey Marches in it
    // asks first, since the system is the campaign's.
    const creating = trip.create(greyMarches.id, 'spring', 'm1')
    await settle()
    expect(dialog.current?.message).toMatch(/“The Frontier”/)
    dialog.current!.resolve('ok')
    await creating
    await settle()
    expect(c.deserializeCampaign(kept.get('m1')!.json).system).toBe(greyMarches.id)
    expect(trip.saved.campaign).toBe('m1')
    expect(trip.campaign?.name).toBe('The Frontier')
    expect(trip.saved.session!.travel.time).toBe(start)
    expect((await trip.campaigns()).map((x) => x.name)).toContain('The Frontier')
    // Where a roster character plays says the campaign (Characters' **Where it plays**).
    const { placeCampaign } = await import('@open-tabletop/travel-ui')
    expect(await placeCampaign({ app: 'travel', id: trip.saved.id })).toEqual({
      id: 'm1',
      name: 'The Frontier',
    })
    expect(await placeCampaign({ app: 'hexmapper', id: 'm1' })).toEqual({
      id: 'm1',
      name: 'The Frontier',
    })
    expect(await placeCampaign({ app: 'hexmapper', id: 'gone' })).toBeUndefined()
    for (let i = 0; i < 4; i++) trip.addHex({ terrain: 'plains', tags: [], edges: ['road'] })
    await settle()

    // The map's trip played there last: playing this one asks to pause it.
    const stepping = trip.step({ type: 'wait', until: fair + 60 })
    await settle()
    expect(dialog.current?.message).toMatch(/“The Frontier”/)
    dialog.current!.resolve('ok')
    await stepping
    await settle()

    // The world followed the trip: the fair came due on the way, in the journal.
    const after = c.deserializeCampaign(kept.get('m1')!.json)
    expect(after.playing).toMatchObject({ app: 'travel', id: trip.saved.id })
    expect(after.world!.time).toBe(trip.saved.session!.travel.time)
    expect(after.world!.time).toBeGreaterThanOrEqual(fair + 60)
    expect(trip.saved.session!.journal.some((e) => e.code === 'WORLD_EVENT')).toBe(true)
    // Its checks roll on the campaign's Oracle, kept with it.
    expect(after.oracle).toBeDefined()

    // The map played on meanwhile (the Hexmapper wrote the campaign): a day later, its trip.
    const moved = {
      ...after,
      world: clock.apply(after.world!, { type: 'advance', minutes: 1440 }).state,
      playing: { app: 'hexmapper', id: 'm1', name: 'The Frontier' },
    }
    kept.set('m1', { ...kept.get('m1')!, json: c.serializeCampaign(moved) })
    hear?.({ type: 'put', id: 'm1', modified: moved.modified })
    await settle()
    expect(trip.campaign?.playing?.app).toBe('hexmapper')

    // Going on asks again, and the party waits until the campaign's clock first.
    const shown = toasts.length
    const going = trip.step({ type: 'wait', until: moved.world.time + 30 })
    await settle()
    dialog.current!.resolve('ok')
    await going
    await settle()
    expect(trip.saved.session!.travel.time).toBeGreaterThanOrEqual(moved.world.time + 30)
    expect(
      toasts
        .slice(shown)
        .map((x) => x.message)
        .join(' '),
    ).toMatch(/waited until then/)

    // Saying no leaves the other trip going on and this one where it was.
    kept.set('m1', {
      ...kept.get('m1')!,
      json: c.serializeCampaign({
        ...c.deserializeCampaign(kept.get('m1')!.json),
        playing: { app: 'hexmapper', id: 'm1', name: 'The Frontier' },
      }),
    })
    hear?.({ type: 'put', id: 'm1', modified: 'later' })
    await settle()
    const time = trip.saved.session!.travel.time
    const refused = trip.step({ type: 'wait', until: time + 60 })
    await settle()
    dialog.current!.resolve('cancel')
    await refused
    expect(trip.saved.session!.travel.time).toBe(time)

    // Back to a campaign of its own: its world is the map's campaign's, so it asks whether
    // it comes along; left behind, the map's campaign keeps it, without this trip going on.
    const leaving = trip.joinCampaign(trip.saved.id)
    await settle()
    expect(dialog.current?.message).toMatch(/has no world yet/)
    dialog.current!.resolve('theirs')
    expect(await leaving).toBe(true)
    await settle()
    expect(trip.saved.campaign).toBe(trip.saved.id)
    expect(trip.campaign?.id).toBe(trip.saved.id)
    expect(trip.campaign?.world).toBeUndefined()
    expect(c.deserializeCampaign(kept.get('m1')!.json).playing?.app).toBe('hexmapper')
  })

  it('joining another campaign brings its world along, or leaves it behind', async () => {
    const { campaign: c, dialog, trip, systems } = await openTravel()
    const greyMarches = systems.list.find((s) => s.id.startsWith('grey-marches'))!
    const world = { time: 600, events: [], clocks: [], timeline: [], nextId: 1 }
    const other = { ...c.createCampaign('m2', 'The South'), world: { ...world, time: 9000 } }
    kept.set('m2', { id: 'm2', name: 'The South', modified: '', json: c.serializeCampaign(other) })
    // A trip in a campaign of its own, with a world clock.
    await trip.create(greyMarches.id, 'spring')
    await settle()
    const own = trip.saved.id
    expect(trip.campaign?.system).toBe(greyMarches.id)
    const mine = { ...trip.campaign!, world }
    kept.set(own, { id: own, name: '', modified: '', json: c.serializeCampaign(mine) })
    hear?.({ type: 'put', id: own, modified: 'later' })
    await settle()
    expect(trip.campaign?.world?.time).toBe(600)

    // Both have a world: cancelling stays where it was.
    let joining = trip.joinCampaign('m2')
    await settle()
    expect(dialog.current?.message).toMatch(/“The South” has a world of its own/)
    dialog.current!.resolve('cancel')
    expect(await joining).toBe(false)
    expect(trip.saved.campaign).toBe(own)

    // Bringing its own: The South's world is the trip's, system included; the campaign it
    // left is gone, since nothing else was in it.
    joining = trip.joinCampaign('m2')
    await settle()
    dialog.current!.resolve('mine')
    expect(await joining).toBe(true)
    await settle()
    const south = c.deserializeCampaign(kept.get('m2')!.json)
    expect(south).toMatchObject({ name: 'The South', system: greyMarches.id })
    expect(south.world?.time).toBe(600)
    expect(kept.has(own)).toBe(false)
    expect(trip.campaign?.id).toBe('m2')
  })

  it('a trip in the Grey Marches’ campaign plays the factions’ turns as they come due', async () => {
    const { campaign: c, world: w, trip, systems } = await openTravel()
    const greyMarches = systems.list.find((s) => s.id.startsWith('grey-marches'))!
    const calendar = (await import('@open-tabletop/session')).calendarOf(greyMarches)
    // The example campaign, as the Campaign app keeps it: the system's world clock and its
    // factions brought in without a map (their sheets only).
    const start = calendar.at(1, '06:00')
    const base = {
      ...c.createCampaign('grey-marches', 'The Grey Marches'),
      system: greyMarches.id,
      world: w.initialWorld(start),
    }
    const { factions } = c.splitFactions(
      c.bringFactions(base, undefined, greyMarches.factions!, greyMarches.id, start),
    )
    const marches = { ...base, factions }
    kept.set('grey-marches', {
      id: 'grey-marches',
      name: 'The Grey Marches',
      modified: marches.modified,
      json: c.serializeCampaign(marches),
    })

    // A trip in it waits eight days: the factions' weekly turn comes due on the way.
    await trip.create(greyMarches.id, 'spring', 'grey-marches')
    await settle()
    expect(trip.saved.campaign).toBe('grey-marches')
    await trip.step({ type: 'wait', until: calendar.at(9, '06:00') })
    await settle()
    const after = c.deserializeCampaign(kept.get('grey-marches')!.json)
    expect(after.world!.time).toBe(trip.saved.session!.travel.time)
    expect(after.factions!.lastTurn).toBe(calendar.at(8, '06:00'))
    // Every faction took its turn, in the campaign's timeline; the trip sees the campaign so.
    const turned = after.world!.timeline.flatMap((e) => (e.data?.faction ? [e.data.faction] : []))
    expect(turned.sort()).toEqual(['fort-keld', 'iron-clans', 'the-vale'])
    expect(trip.campaign?.factions?.lastTurn).toBe(after.factions!.lastTurn)
  })

  it('a trip makes copies from the bestiaries of the packs its campaign adds', async () => {
    const { campaign: c, trip, systems } = await openTravel()
    const greyMarches = systems.list.find((s) => s.id.startsWith('grey-marches'))!
    const { partyOf, applyResult } = await import('@open-tabletop/session')
    const { templateChoices } = await import('@open-tabletop/travel-ui')
    // The Grey Marches' system names only its own bestiary; its campaign adds Core's pack.
    expect(greyMarches.bestiary!.map((b) => b.id)).toEqual(['grey-marches/marches'])
    const own = {
      ...c.createCampaign('c1', 'Marches and more'),
      system: greyMarches.id,
      packs: ['core'],
    }
    kept.set('c1', {
      id: 'c1',
      name: 'Marches and more',
      modified: own.modified,
      json: c.serializeCampaign(own),
    })
    await trip.create(greyMarches.id, 'spring', 'c1')
    await settle()
    expect(trip.campaign?.packs).toEqual(['core'])
    expect(trip.system.bestiary!.map((b) => b.id)).toEqual(['grey-marches/marches', 'core/foes'])
    // The Here box offers Core's foe too, and an effect makes one, on Core's sheet.
    expect(templateChoices(trip.system, 'en').map((t) => t.id)).toContain('foe')
    trip.edit((s) => applyResult(s, { effects: { 'present.foe': 1 } }, {}, partyOf(trip.system)))
    expect(trip.saved.session!.present![0].character).toMatchObject({
      template: { id: 'foe', from: 'core/foes' },
      sheet: 'core/character',
    })
  })

  it('a trip hears a clock filled in another app on its next step', async () => {
    const { campaign: c, world: w, trip, systems } = await openTravel()
    const greyMarches = systems.list.find((s) => s.id.startsWith('grey-marches'))!
    const calendar = (await import('@open-tabletop/session')).calendarOf(greyMarches)
    const start = calendar.at(1, '06:00')
    const marches = {
      ...c.createCampaign('grey-marches', 'The Grey Marches'),
      system: greyMarches.id,
      world: w.initialWorld(start),
    }
    kept.set('grey-marches', {
      id: 'grey-marches',
      name: 'The Grey Marches',
      modified: marches.modified,
      json: c.serializeCampaign(marches),
    })
    await trip.create(greyMarches.id, 'spring', 'grey-marches')
    await settle()
    await trip.step({ type: 'wait', until: start + 30 })
    await settle()
    // The Campaign app fills the Greywood Wyrm's clock by hand: the moment waits for the trip.
    const now = c.deserializeCampaign(kept.get('grey-marches')!.json)
    expect(now.playing).toMatchObject({ app: 'travel', id: trip.saved.id })
    const waiting = {
      ...now,
      modified: 'later',
      moments: [
        { clock: 'The Greywood Wyrm wakes', at: ['world.clocks.the-greywood-wyrm-wakes.full'] },
      ],
    }
    kept.set('grey-marches', {
      id: 'grey-marches',
      name: 'The Grey Marches',
      modified: 'later',
      json: c.serializeCampaign(waiting),
    })
    hear?.({ type: 'put', id: 'grey-marches', modified: 'later' })
    await settle()
    // Its next step hears it first, told in its journal: the Wyrm wakes action, by itself.
    const before = trip.saved.session!.journal.length
    await trip.step({ type: 'wait', until: start + 60 })
    await settle()
    const lines = trip.saved
      .session!.journal.slice(before)
      .map((e) => `${e.code} ${e.text ?? e.data?.action ?? ''}`)
    expect(lines[0]).toBe('CLOCK_FILLED The Greywood Wyrm wakes')
    expect(lines).toContain('SAID wyrm-wakes')
    expect(c.deserializeCampaign(kept.get('grey-marches')!.json).moments).toBeUndefined()
  })
})
