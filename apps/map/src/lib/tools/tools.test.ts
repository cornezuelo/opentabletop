import { describe, expect, it } from 'vitest'
import { cellCenter } from '@open-tabletop/hex'
import { createMap, mapWalls, mapWorld } from '@open-tabletop/map'
import { createTravelEngine, initialTravelState } from '@open-tabletop/travel-engine'
import { coreSystem } from '../../../../../packages/session/src/core.testing'
import { editor } from '../store/editor.svelte'
import { currentTool, type PointerInfo } from './tools'

const press = (more: Partial<PointerInfo> = {}): PointerInfo => ({
  button: 0,
  alt: false,
  ctrl: false,
  shift: false,
  world: { x: 0, y: 0 },
  pickRadius: 1,
  ...more,
})

describe('painting a dungeon', () => {
  it('Shift+drag paints a rectangle of floor, one step of the history', () => {
    const map = createMap()
    map.grid = { ...map.grid, kind: 'square' }
    map.terrains = [{ id: 'stone', color: '#888888', floor: true }]
    editor.load(map)
    editor.tool = 'terrain'
    editor.terrainMode = 'brush'
    editor.terrainId = 'stone'
    const tool = currentTool()
    tool.down({ col: 1, row: 1 }, press({ shift: true }))
    tool.move({ col: 3, row: 2 }, press({ shift: true }))
    tool.up()
    const painted = Object.keys(editor.map.hexes).filter(
      (k) => editor.map.hexes[k as `${number},${number}`].terrain,
    )
    expect(painted.sort()).toEqual(['1,1', '1,2', '2,1', '2,2', '3,1', '3,2'])
    expect(editor.paintFrom).toBeNull()
    editor.undo()
    expect(Object.values(editor.map.hexes).some((h) => h.terrain)).toBe(false)
  })

  it('walls stand round the floor and between rooms; a door opens one', () => {
    const map = createMap()
    map.grid = { ...map.grid, kind: 'square' }
    map.terrains = [
      { id: 'stone', color: '#888888', floor: true },
      { id: 'grass', color: '#33aa33' },
    ]
    map.regions = [
      { id: 'hallroom01', name: 'Hall', color: '#000000', onePlace: true },
      { id: 'cellroom01', name: 'Cell', color: '#000000', onePlace: true },
    ]
    for (const key of ['1,1', '2,1'] as const)
      map.hexes[key] = { terrain: 'stone', region: 'hallroom01' }
    map.hexes['3,1'] = { terrain: 'stone', region: 'cellroom01' }
    map.hexes['1,2'] = { terrain: 'stone' }
    map.hexes['0,1'] = { terrain: 'grass' }
    const walls = mapWalls(map)
    expect(walls.between('1,1', '0,1')).toBe(true) // floor and the ground outside
    expect(walls.between('1,1', '2,1')).toBe(false) // one room
    expect(walls.between('2,1', '3,1')).toBe(true) // two rooms
    expect(walls.between('1,1', '1,2')).toBe(false) // a corridor joins a room openly
    expect(mapWorld(map).neighbors('area:hallroom01')).not.toContain('area:cellroom01')
    map.connections = [{ id: 'door000001', between: ['2,1', '3,1'], kind: 'door' }]
    expect(mapWalls(map).between('2,1', '3,1')).toBe(false)
    const world = mapWorld(map)
    expect(world.neighbors('area:hallroom01')).toEqual(
      expect.arrayContaining(['area:cellroom01', '1,2']),
    )
    expect(world.connections('area:hallroom01', 'area:cellroom01')).toEqual(['door'])
    expect(world.place('2,1')).toMatchObject({ name: 'Hall', floor: true })
  })

  it('a new dungeon is squares of floors and rock, walked with the Generic rules round its walls', () => {
    const map = createMap('Crypt', 'dungeon')
    expect(map.grid.kind).toBe('square')
    expect(map.scale.cellKm).toBe(0.003)
    expect(map.terrains.filter((t) => t.floor).map((t) => t.id)).toEqual([
      'stone-floor',
      'cave-floor',
      'rubble',
      'pool',
    ])
    // Two rooms joined by a corridor that bends: row 1 and row 3, the corridor down column 4.
    for (const key of ['1,1', '2,1', '3,1', '4,1', '4,2', '4,3', '3,3', '2,3', '1,3'] as const)
      map.hexes[key] = { terrain: 'stone-floor' }
    const { rules, calendar } = coreSystem()
    const world = mapWorld(map, rules.travel.cellKm)
    const engine = createTravelEngine({ world, rules, calendar })
    const at = initialTravelState({ location: '1,1', mode: 'foot', time: calendar!.at(1, '06:00') })
    // Rock between the rows: the way goes round by the corridor, never across the wall.
    expect(engine.plan(at, '1,3')).toEqual([
      '1,1',
      '2,1',
      '3,1',
      '4,1',
      '4,2',
      '4,3',
      '3,3',
      '2,3',
      '1,3',
    ])
  })
})

describe('walls drawn by hand', () => {
  /** A map of squares 10 wide: a cell's centre and the middle of its east side. */
  const squares = () => {
    const map = createMap()
    map.grid = { ...map.grid, kind: 'square', hexSize: 10 }
    editor.load(map)
    editor.tool = 'wall'
  }
  const centre = (col: number, row: number) =>
    cellCenter({ col, row }, editor.map.grid, editor.map.grid.hexSize)

  it('a click walls the nearest side, a drag the sides it runs along, a right click takes one off', () => {
    squares()
    const tool = currentTool()
    const at = (col: number, row: number, dx: number, dy: number) =>
      press({ world: { x: centre(col, row).x + dx, y: centre(col, row).y + dy } })
    // Near the east side of 2,2: a wall between it and 3,2.
    tool.down({ col: 2, row: 2 }, at(2, 2, 8, 1))
    tool.up()
    expect(editor.map.walls).toEqual([['2,2', '3,2']])
    // Trips no longer step across it, on a map with no floor at all.
    const world = mapWorld(editor.map, 1)
    expect(world.neighbors('2,2')).not.toContain('3,2')
    expect(mapWalls(editor.map).drawn('3,2', '2,2')).toBe(true)
    // A drag along the south sides of 4,4 and 5,4: two walls, one undo step.
    tool.down({ col: 4, row: 4 }, at(4, 4, 0, 9))
    tool.move({ col: 5, row: 4 }, at(5, 4, 0, 9))
    // Through a cell's middle, far from any side: nothing.
    tool.move({ col: 6, row: 4 }, at(6, 4, 0, 0))
    tool.up()
    expect(editor.map.walls).toEqual([
      ['2,2', '3,2'],
      ['4,4', '4,5'],
      ['5,4', '5,5'],
    ])
    editor.undo()
    expect(editor.map.walls).toHaveLength(1)
    editor.redo()
    // A right click near the same side, from the other cell, takes it off.
    tool.down({ col: 3, row: 2 }, { ...at(3, 2, -8, 0), button: 2 })
    tool.up()
    expect(editor.map.walls).toHaveLength(2)
    // A side on the map's edge takes no wall; a locked layer, none at all.
    tool.down({ col: 0, row: 0 }, at(0, 0, -9, 0))
    tool.up()
    expect(editor.map.walls).toHaveLength(2)
    editor.setLayer('walls', { locked: true })
    tool.down({ col: 7, row: 7 }, at(7, 7, 9, 0))
    tool.up()
    expect(editor.map.walls).toHaveLength(2)
  })

  it('a connection drawn across a wall opens it', () => {
    squares()
    editor.map.walls = [['2,2', '3,2']]
    editor.map.connections = [{ id: 'd', between: ['2,2', '3,2'], kind: 'door' }]
    expect(mapWorld(editor.map, 1).neighbors('2,2')).toContain('3,2')
    expect(mapWalls(editor.map).between('2,2', '3,2')).toBe(false)
  })
})
