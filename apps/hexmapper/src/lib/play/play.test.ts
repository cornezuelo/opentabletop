import { describe, expect, it } from 'vitest'
import { EXAMPLE_MAPS } from '../io/examples'
import { parseMapFile } from '../io/otd'
import { createMap } from '../model/defaults'
import { editor } from '../store/editor.svelte'
import { SetMetaCommand } from '../commands/settings'
import { mapToBundle } from '../io/otd'
import { clickHex, partyLocation, sessionOf, setMode } from './play'
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
})
