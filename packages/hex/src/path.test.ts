import { describe, expect, it } from 'vitest'
import { distance } from './axial'
import { keyOf, neighborCells, parseKey, type GridShape, type HexKey } from './grid'
import { toAxial } from './offset'
import { findPath } from './path'

const shape: GridShape = { orientation: 'flat', width: 10, height: 10 }
const hexDistance = (a: HexKey, b: HexKey) =>
  distance(toAxial(parseKey(a), 'flat'), toAxial(parseKey(b), 'flat'))
const neighbors = (k: HexKey) => neighborCells(parseKey(k), shape).map(keyOf)

describe('findPath', () => {
  it('finds a shortest path on an open grid', () => {
    const result = findPath<HexKey>('0,0', '5,3', {
      neighbors,
      cost: () => 1,
      heuristic: hexDistance,
    })!
    expect(result.cost).toBe(hexDistance('0,0', '5,3'))
    expect(result.path[0]).toBe('0,0')
    expect(result.path.at(-1)).toBe('5,3')
    for (let i = 1; i < result.path.length; i++)
      expect(hexDistance(result.path[i - 1], result.path[i])).toBe(1)
  })

  it('routes around impassable hexes and prefers cheaper ones', () => {
    const wall = new Set<HexKey>(['2,0', '2,1', '2,2', '2,3', '2,4', '2,5', '2,6', '2,7', '2,8'])
    const result = findPath<HexKey>('0,0', '4,0', {
      neighbors,
      cost: (_, b) => (wall.has(b) ? Infinity : 1),
      heuristic: hexDistance,
    })!
    expect(result.path).toContain('2,9')
    expect(result.path.some((k) => wall.has(k))).toBe(false)

    const road = new Set<HexKey>(['1,0', '2,0', '3,0'])
    const cheap = findPath<HexKey>('0,1', '4,1', {
      neighbors,
      cost: (_, b) => (road.has(b) ? 0.5 : 2),
      heuristic: (a, b) => hexDistance(a, b) * 0.5,
    })!
    expect(cheap.path.filter((k) => road.has(k)).length).toBeGreaterThanOrEqual(2)
  })

  it('returns null when the goal is unreachable', () => {
    const blocked = (b: HexKey) => (['1,0', '0,1', '1,1'].includes(b) ? Infinity : 1)
    expect(
      findPath<HexKey>('0,0', '5,5', {
        neighbors,
        cost: (_, b) => blocked(b),
        heuristic: hexDistance,
      }),
    ).toBeNull()
  })

  it('handles start = goal', () => {
    expect(
      findPath<HexKey>('3,3', '3,3', { neighbors, cost: () => 1, heuristic: hexDistance }),
    ).toEqual({ path: ['3,3'], cost: 0 })
  })
})
