import { describe, expect, it } from 'vitest'
import { createMap } from '../model/defaults'
import { HexEditBatch } from './hexes'
import { History } from './history'
import { SetMetaCommand, SetSettingsCommand } from './settings'

describe('HexEditBatch', () => {
  it('applies live and undoes the whole stroke at once', () => {
    const map = createMap()
    map.hexes['0,0'] = { terrain: 'lake' }
    const history = new History()
    const batch = new HexEditBatch(map)
    batch.edit('0,0', (h) => ({ ...h, terrain: 'forest' }))
    batch.edit('1,0', (h) => ({ ...h, terrain: 'forest' }))
    batch.edit('0,0', (h) => ({ ...h, terrain: 'hills' }))
    expect(map.hexes['0,0']).toEqual({ terrain: 'hills' })

    history.record(batch.finish()!)
    history.undo(map)
    expect(map.hexes).toEqual({ '0,0': { terrain: 'lake' } })
    history.redo(map)
    expect(map.hexes).toEqual({ '0,0': { terrain: 'hills' }, '1,0': { terrain: 'forest' } })
  })

  it('reports no-op edits and yields no command', () => {
    const map = createMap()
    map.hexes['0,0'] = { terrain: 'lake' }
    const batch = new HexEditBatch(map)
    expect(batch.edit('0,0', (h) => ({ ...h, terrain: 'lake' }))).toBe(false)
    expect(batch.finish()).toBeNull()
  })

  it('removes hexes that become empty', () => {
    const map = createMap()
    map.hexes['0,0'] = { terrain: 'lake' }
    const batch = new HexEditBatch(map)
    batch.edit('0,0', (h) => ({ ...h, terrain: undefined }))
    expect(map.hexes).toEqual({})
  })

  it('drops edits that end where they started', () => {
    const map = createMap()
    const batch = new HexEditBatch(map)
    batch.edit('0,0', (h) => ({ ...h, terrain: 'lake' }))
    batch.edit('0,0', (h) => ({ ...h, terrain: undefined }))
    expect(batch.finish()).toBeNull()
  })
})

describe('History', () => {
  it('executes, undoes and redoes settings changes', () => {
    const map = createMap('A')
    const history = new History()
    history.execute(new SetSettingsCommand({ grid: { width: 10, orientation: 'pointy' } }), map)
    history.execute(new SetMetaCommand({ name: 'B' }), map)
    expect(map.grid).toMatchObject({ width: 10, orientation: 'pointy' })

    history.undo(map)
    history.undo(map)
    expect(map.meta.name).toBe('A')
    expect(map.grid).toMatchObject({ width: 30, orientation: 'flat' })
    expect(history.canUndo).toBe(false)

    history.redo(map)
    expect(map.grid.width).toBe(10)
  })

  it('changes grid and print together and reverts both', () => {
    const map = createMap()
    const history = new History()
    history.execute(
      new SetSettingsCommand({ grid: { width: 8, height: 10 }, print: { paper: 'A4' } }),
      map,
    )
    expect(map.print.paper).toBe('A4')
    history.undo(map)
    expect(map.print.paper).toBeNull()
    expect(map.grid).toMatchObject({ width: 30, height: 20 })
  })

  it('clears redo on new commands and honors the limit', () => {
    const map = createMap()
    const history = new History(2)
    history.execute(new SetSettingsCommand({ grid: { width: 5 } }), map)
    history.undo(map)
    history.execute(new SetSettingsCommand({ grid: { width: 6 } }), map)
    expect(history.canRedo).toBe(false)

    history.execute(new SetSettingsCommand({ grid: { width: 7 } }), map)
    history.execute(new SetSettingsCommand({ grid: { width: 8 } }), map)
    history.undo(map)
    history.undo(map)
    expect(history.undo(map)).toBeNull()
    expect(map.grid.width).toBe(6)
  })
})
