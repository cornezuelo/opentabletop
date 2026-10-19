// Writes this version's saved trips with trips going on, for old-trips.test.ts to keep
// opening in later versions (`make old-maps` before a release; see docs/RELEASING.md).
// Written against whatever this version's Travel API is: older tags ran a copy of it.
import { it, vi } from 'vitest'
import { systems } from './packs.svelte'
import { trip } from './trip.svelte'

const OUT: string | undefined = import.meta.env.OTT_OLD_TRIPS_OUT
const KEY = 'opentabletop.travel.trips'

it.skipIf(!OUT)('writes the old trips of this version', { timeout: 120_000 }, async () => {
  // Node's, untyped: the app is typed for the browser.
  const fs = 'node:fs'
  const { writeFileSync } = (await import(/* @vite-ignore */ fs)) as {
    writeFileSync: (path: string, data: string) => void
  }
  vi.spyOn(Math, 'random').mockReturnValue(0.42)
  const session = () => trip.saved.session!
  const resolve = async () => {
    for (const c of session().travel.pendingChecks)
      await trip.step({ type: 'resolveCheck', id: c.id })
  }
  /** Marches on, waiting for the next day when this one's march is done. */
  const march = async () => {
    const before = session().travel.time
    await trip.step({ type: 'travel', until: 'hex' })
    if (session().travel.time === before && !session().travel.pendingChecks.length)
      await trip.step({ type: 'wait', until: before + 18 * 60 })
  }
  // A road for a while, then a landmark in the forest (the Grey Marches pause there).
  const way = [
    { terrain: 'plains', tags: [], edges: ['road'] },
    { terrain: 'plains', tags: [], edges: ['road'] },
    { terrain: 'forest', tags: [], edges: [] },
    { terrain: 'forest', tags: ['landmark'], edges: [] },
    { terrain: 'hills', tags: [], edges: [] },
    { terrain: 'hills', tags: [], edges: [] },
    { terrain: 'plains', tags: [], edges: [] },
  ]
  const newTrip = async (system: string) => {
    await trip.create(system, 'autumn')
    for (const hex of way) trip.addHex(hex)
  }
  const arrived = () => trip.location === trip.saved.way.length - 1
  const greyMarches = systems.list.find((s) => s.id.startsWith('grey-marches'))!.id

  // The Grey Marches, marching until a check waits to be resolved.
  await newTrip(greyMarches)
  trip.rename('Pending')
  for (let i = 0; i < 50 && !session().travel.pendingChecks.length && !arrived(); i++) await march()

  // The Grey Marches again, checks resolved, marched on and camped.
  await newTrip(greyMarches)
  trip.rename('Camped')
  for (let i = 0; i < 6 && !arrived(); i++) {
    await march()
    await resolve()
  }
  await trip.step({ type: 'action', id: 'camp' })
  await resolve()

  // The Generic rules, marched on.
  await newTrip('generic')
  trip.rename('Generic')
  for (let i = 0; i < 3 && !arrived(); i++) await march()

  writeFileSync(`${OUT}.json`, localStorage.getItem(KEY)!)
})
