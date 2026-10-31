import { describe, expect, it } from 'vitest'
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
