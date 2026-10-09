// Writes this version's library maps of the example with trips going on, for old-maps.test.ts
// to keep opening in later versions (`make old-maps` before a release; see docs/RELEASING.md).
// Written against whatever this version's play API is: older tags ran a copy of it.
import { it, vi } from 'vitest'
import * as examples from '../io/examples'
import { parseMapFile } from '../io/otd'
import { serializeMap } from '../model/serialize'
import { editor } from '../store/editor.svelte'
import { clickHex, sessionOf, step } from './play'
import * as world from './world.svelte'

const OUT: string | undefined = import.meta.env.OTT_OLD_MAPS_OUT
// Versions before factions had no ./factions.
const factions = import.meta.glob('./factions.ts', { eager: true })['./factions.ts'] ?? {}

it.skipIf(!OUT)('writes the old maps of this version', { timeout: 120_000 }, async () => {
  // Node's, untyped: the app is typed for the browser.
  const fs = 'node:fs'
  const { writeFileSync } = (await import(/* @vite-ignore */ fs)) as {
    writeFileSync: (path: string, data: string) => void
  }
  const ex = examples as Record<string, unknown>
  const maps = (
    typeof ex.exampleMaps === 'function' ? (ex.exampleMaps as () => unknown)() : ex.EXAMPLE_MAPS
  ) as { id: string; json: string }[]
  const fresh = () => editor.load(parseMapFile(maps.find((m) => m.id === 'greymarches1')!.json))
  const dump = (name: string) => writeFileSync(`${OUT}-${name}.json`, serializeMap(editor.map))
  const trip = () => sessionOf(editor.map.play!)!
  const resolve = () => {
    for (const c of trip().travel.pendingChecks) step({ type: 'resolveCheck', id: c.id })
  }
  vi.spyOn(Math, 'random').mockReturnValue(0.42)

  // Marching to the Grey Stones until a check waits to be resolved.
  fresh()
  clickHex('4,2')
  for (let i = 0; i < 200 && !trip().travel.pendingChecks.length; i++) {
    const before = trip().travel.time
    step({ type: 'travel', until: 'hex' })
    // The day's march is done: wait for the next day, as the player would.
    if (trip().travel.time === before && !trip().travel.pendingChecks.length)
      step({ type: 'wait', until: before + 18 * 60 })
  }
  dump('pending')

  // Checks resolved, marched on and camped, with the factions brought and a world turn taken.
  resolve()
  for (let i = 0; i < 4; i++) {
    step({ type: 'travel', until: 'hex' })
    resolve()
  }
  step({ type: 'action', id: 'camp' })
  resolve()
  const f = factions as Record<string, unknown>
  const w = world as Record<string, unknown>
  if (typeof f.bringFactions === 'function') (f.bringFactions as () => void)()
  if (typeof w.worldTurnNow === 'function') (w.worldTurnNow as () => void)()
  dump('camped')
})
