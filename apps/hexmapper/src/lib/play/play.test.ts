import { describe, expect, it } from 'vitest'
import { EXAMPLE_MAPS } from '../io/examples'
import { parseMapFile } from '../io/otd'
import { createMap } from '../model/defaults'
import { editor } from '../store/editor.svelte'
import { SetMetaCommand } from '../commands/settings'
import { bundleToMap, mapToBundle } from '../io/otd'
import { clickHex, partyLocation, sessionOf, setMode, step } from './play'
import { advanceWorld, startWorld, worldAct } from './world.svelte'
import { oracleUi } from './oracle'
import { playSystems } from './systems'

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

  it('a map works with the packs it chooses (the example: Core and the Grey Marches)', () => {
    editor.load(parseMapFile(EXAMPLE_MAPS.find((m) => m.id === 'greymarches1')!.json))
    expect(editor.meta.packs).toEqual(['core', 'grey-marches'])
    expect(playSystems().map((s) => s.id)).toEqual(['generic', 'grey-marches'])
    expect(oracleUi.showsPack('grey-marches')).toBe(true)
    expect(oracleUi.showsPack('kal-arath')).toBe(false)
    // Back to every pack: undoable, and saved in the file.
    editor.execute(new SetMetaCommand({ packs: undefined }))
    expect(oracleUi.showsPack('kal-arath')).toBe(true)
    expect(mapToBundle(editor.map).maps[0].ext).not.toHaveProperty(['hexmapper', 'packs'])
    editor.undo()
    expect(editor.meta.packs).toEqual(['core', 'grey-marches'])
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

  it('with a trip on, moving the world on is waiting in the trip: one time for both', async () => {
    editor.load(parseMapFile(EXAMPLE_MAPS.find((m) => m.id === 'greymarches1')!.json))
    startWorld()
    clickHex('7,7')
    const start = editor.map.world!.time
    await advanceWorld({ until: 'next-day' })
    const trip = sessionOf(editor.map.play!)!
    // The wait is journaled and lived (dawn's checks rolled); the world is where the trip is.
    expect(trip.journal.some((e) => e.code === 'WAIT')).toBe(true)
    expect(trip.journal.some((e) => e.code === 'ORACLE_RESULT')).toBe(true)
    expect(trip.travel.time).toBeGreaterThan(start)
    expect(editor.map.world!.time).toBe(trip.travel.time)
  })
})
