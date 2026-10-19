import { describe, expect, it } from 'vitest'
import { deserializeMap, serializeMap } from '@open-tabletop/map'
import { EditHexesCommand } from '../commands/hexes'
import { exampleMaps } from '../io/examples'
import { parseMapFile } from '../io/otd'
import { bringFactions } from '../play/factions'
import { worldTurnNow } from '../play/world.svelte'
import { editor } from './editor.svelte'

/**
 * The open map as another window or app saved it (a world turn played elsewhere, the same
 * map edited in another tab): play is taken keeping Undo; an edited map is loaded whole.
 */
const grey = () =>
  editor.load(parseMapFile(exampleMaps().find((m) => m.id === 'greymarches1')!.json))
/** The open map as another window reads it from the library. */
const elsewhere = () => deserializeMap(serializeMap(editor.map))
const paint = (key: '2,2', terrain: string) =>
  editor.execute(new EditHexesCommand([{ key, before: editor.map.hexes[key], after: { terrain } }]))

describe('the open map saved elsewhere', () => {
  it('takes a world turn played in another app, keeping Undo', () => {
    grey()
    bringFactions()
    paint('2,2', editor.map.terrains[0].id)
    const other = elsewhere()
    // The other app plays a world turn on its copy (here, with the editor standing in for it).
    const mine = editor.map
    editor.map = other
    worldTurnNow()
    const played = editor.map
    editor.map = mine
    expect(editor.takeFromElsewhere(played)).toBe(true)
    expect(editor.map.world!.timeline.length).toBe(played.world!.timeline.length)
    expect(editor.map.world!.timeline.length).toBeGreaterThan(0)
    expect(editor.map.factions).toEqual(played.factions)
    expect(editor.canUndo).toBe(true)
  })

  it('loads a map edited in another tab whole, and Undo starts again', () => {
    grey()
    paint('2,2', editor.map.terrains[0].id)
    editor.selected = '2,2'
    const other = elsewhere()
    other.hexes['2,2'] = { terrain: other.terrains[1].id }
    expect(editor.takeFromElsewhere(other)).toBe(false)
    expect(editor.map.hexes['2,2']?.terrain).toBe(other.terrains[1].id)
    expect(editor.canUndo).toBe(false)
    expect(editor.selected).toBe('2,2')
  })

  it('changes nothing for the same map read back', () => {
    grey()
    paint('2,2', editor.map.terrains[0].id)
    expect(editor.takeFromElsewhere(elsewhere())).toBe(true)
    expect(editor.canUndo).toBe(true)
  })
})
