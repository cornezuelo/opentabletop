import { describe, expect, it } from 'vitest'
import { createMap } from '../model/defaults'
import { deserializeMap, serializeMap } from '../model/serialize'
import type { MapPath } from '../model/types'
import { History } from './history'
import { normalizePath } from '../model/hex'
import { dedupeConsecutive, ReplacePathCommand } from './paths'

const road: MapPath = { id: 'road00000001', kind: 'road', hexes: ['0,0', '1,0', '2,0'] }
const river: MapPath = { id: 'river0000001', kind: 'river', hexes: ['0,1', '0,2'] }

describe('ReplacePathCommand', () => {
  it('adds, edits and removes paths with undo restoring order', () => {
    const map = createMap()
    const history = new History()
    history.execute(new ReplacePathCommand(null, road), map)
    history.execute(new ReplacePathCommand(null, river), map)
    expect(map.paths.map((p) => p.id)).toEqual([road.id, river.id])

    const longer = { ...road, hexes: [...road.hexes, '3,0' as const] }
    history.execute(new ReplacePathCommand(road, longer), map)
    expect(map.paths[0].hexes).toHaveLength(4)

    history.execute(new ReplacePathCommand(longer, null), map)
    expect(map.paths.map((p) => p.id)).toEqual([river.id])

    history.undo(map)
    expect(map.paths.map((p) => p.id)).toEqual([road.id, river.id])
    history.undo(map)
    expect(map.paths[0].hexes).toHaveLength(3)
    history.undo(map)
    history.undo(map)
    expect(map.paths).toEqual([])
  })

  it('does not alias the stored path', () => {
    const map = createMap()
    const path = structuredClone(road)
    new ReplacePathCommand(null, path).apply(map)
    path.hexes.push('9,9')
    expect(map.paths[0].hexes).toHaveLength(3)
  })
})

describe('paths serialization', () => {
  it('round-trips and drops invalid paths', () => {
    const map = createMap()
    map.paths = [road, river]
    expect(deserializeMap(serializeMap(map)).paths).toEqual([road, river])

    const raw = JSON.parse(serializeMap(map))
    raw.paths.push({ id: 'x', kind: 'lava', hexes: ['1,1', '1,2', 'bad'] }, { hexes: ['1,1'] })
    const loaded = deserializeMap(JSON.stringify(raw)).paths
    expect(loaded).toHaveLength(3)
    expect(loaded[2]).toMatchObject({ kind: 'road', hexes: ['1,1', '1,2'] })
  })
})

describe('dedupeConsecutive', () => {
  it('removes only consecutive repeats', () => {
    expect(dedupeConsecutive(['a', 'a', 'b', 'a', 'a'])).toEqual(['a', 'b', 'a'])
  })
})

describe('path offsets', () => {
  it('normalizes, round-trips offsets and drops bogus ones', () => {
    const map = createMap()
    map.paths = [
      {
        id: 'river0000002',
        kind: 'river',
        hexes: ['0,0', '1,0', '2,0'],
        offsets: [null, [0.43333333, -0.25], [0, 0]],
        straight: true,
      },
    ]
    const raw = JSON.parse(serializeMap(map))
    const loaded = deserializeMap(JSON.stringify(raw)).paths[0]
    expect(loaded.offsets).toEqual([null, [0.433, -0.25], null])
    expect(loaded.straight).toBe(true)

    raw.paths[0].offsets = [[5, 5], null, null]
    expect(deserializeMap(JSON.stringify(raw)).paths[0].offsets).toBeUndefined()
  })

  it('normalizePath rounds and omits all-centered offsets', () => {
    expect(
      normalizePath({ id: 'a', kind: 'road', hexes: ['0,0', '1,0'], offsets: [null, [0, 0]] }),
    ).toEqual({ id: 'a', kind: 'road', hexes: ['0,0', '1,0'] })
    expect(
      normalizePath({ id: 'a', kind: 'road', hexes: ['0,0', '1,0'], offsets: [[0.12345, 0], null] })
        .offsets,
    ).toEqual([[0.123, 0], null])
  })

  it('marks lakes and seas as water by default', () => {
    const water = createMap()
      .terrains.filter((t) => t.water)
      .map((t) => t.id)
    expect(water).toEqual(['lake', 'sea'])
  })
})
