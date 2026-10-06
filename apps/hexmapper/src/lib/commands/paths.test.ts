import { describe, expect, it } from 'vitest'
import { createMap } from '../model/defaults'
import { deserializeMap, serializeMap } from '../model/serialize'
import type { HexKey, MapPath } from '../model/types'
import { History } from './history'
import { distance, parseKey, toAxial } from '@open-tabletop/hex'
import { normalizePath } from '../model/hex'
import { dedupeConsecutive, ReplacePathCommand, rerouteVertex } from './paths'

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

  it('round-trips nodes and remaps them past dropped hexes', () => {
    const map = createMap()
    map.paths = [
      { id: 'road00000009', kind: 'road', hexes: ['0,0', '1,0', '2,0', '3,0'], nodes: [0, 2, 3] },
    ]
    expect(deserializeMap(serializeMap(map)).paths[0].nodes).toEqual([0, 2, 3])
    const raw = JSON.parse(serializeMap(map))
    raw.paths[0].hexes.splice(1, 0, 'bad')
    raw.paths[0].nodes = [0, 3, 4]
    expect(deserializeMap(JSON.stringify(raw)).paths[0].nodes).toEqual([0, 2, 3])
    expect(normalizePath({ ...map.paths[0], nodes: [0, 1, 2, 3] }).nodes).toBeUndefined()
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

  it('marks lakes, seas and the deep sea as water by default', () => {
    const water = createMap()
      .terrains.filter((t) => t.water)
      .map((t) => t.id)
    expect(water).toEqual(['lake', 'sea', 'deep-sea'])
  })
})

describe('rerouteVertex', () => {
  const path = {
    hexes: ['0,0', '1,0', '2,0', '3,0'] as HexKey[],
    offsets: [null, [0.2, 0], null, null] as ([number, number] | null)[],
  }

  it('moves a middle vertex and keeps the path contiguous', () => {
    const result = rerouteVertex(path, 1, { col: 1, row: 2 }, 'flat')
    expect(result.hexes[0]).toBe('0,0')
    expect(result.hexes.at(-1)).toBe('3,0')
    expect(result.hexes[result.index]).toBe('1,2')
    for (let i = 1; i < result.hexes.length; i++) {
      const a = toAxial(parseKey(result.hexes[i - 1]), 'flat')
      const b = toAxial(parseKey(result.hexes[i]), 'flat')
      expect(distance(a, b)).toBe(1)
    }
    expect(result.offsets).toHaveLength(result.hexes.length)
    // The moved vertex's old offset is dropped; the caller sets the new one.
    expect(result.offsets.every((o) => o === null)).toBe(true)
  })

  it('keeps user nodes and marks only the moved vertex as a new node', () => {
    const result = rerouteVertex({ ...path, nodes: [0, 3] }, 3, { col: 3, row: 3 }, 'flat')
    expect(result.nodes[0]).toBe(0)
    expect(result.nodes.at(-1)).toBe(result.index)
    expect(result.nodes).toHaveLength(2)
  })

  it('moves endpoints', () => {
    const start = rerouteVertex(path, 0, { col: 0, row: 2 }, 'flat')
    expect(start.hexes[0]).toBe('0,2')
    expect(start.index).toBe(0)
    const end = rerouteVertex(path, 3, { col: 5, row: 0 }, 'flat')
    expect(end.hexes.at(-1)).toBe('5,0')
    expect(end.index).toBe(end.hexes.length - 1)
  })

  it('merges into a neighbor when dropped on it, without duplicates', () => {
    const onPrev = rerouteVertex(path, 1, { col: 0, row: 0 }, 'flat')
    expect(onPrev.hexes[onPrev.index]).toBe('0,0')
    const onNext = rerouteVertex(path, 1, { col: 2, row: 0 }, 'flat')
    expect(onNext.hexes[onNext.index]).toBe('2,0')
    for (let i = 1; i < onNext.hexes.length; i++) {
      expect(onNext.hexes[i]).not.toBe(onNext.hexes[i - 1])
      const a = toAxial(parseKey(onNext.hexes[i - 1]), 'flat')
      const b = toAxial(parseKey(onNext.hexes[i]), 'flat')
      expect(distance(a, b)).toBe(1)
    }
    expect(onNext.offsets).toHaveLength(onNext.hexes.length)
  })
})
