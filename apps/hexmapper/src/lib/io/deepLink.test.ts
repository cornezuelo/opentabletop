import { describe, expect, it } from 'vitest'
import { formatCoord, toAxial, type GridShape } from '@open-tabletop/hex'
import {
  formatDeepLink,
  formatExampleLink,
  parseDeepLink,
  parseExampleLink,
  resolveHexLabel,
} from './deepLink'

const shape: GridShape = { orientation: 'flat', width: 30, height: 20 }

describe('deep links', () => {
  it('parses map and hex links', () => {
    expect(parseDeepLink('#/baaxk4h7qdfl')).toEqual({ mapId: 'baaxk4h7qdfl' })
    expect(parseDeepLink('#/baaxk4h7qdfl/0304')).toEqual({ mapId: 'baaxk4h7qdfl', hex: '0304' })
    expect(parseDeepLink('#/baaxk4h7qdfl/3%2C-1')).toEqual({ mapId: 'baaxk4h7qdfl', hex: '3,-1' })
  })

  it("links to a system's example map, never read as a map and a hex", () => {
    const hash = formatExampleLink('grey-marches', 'maps/grey marches.otd.json')
    expect(hash).toBe('#/example/grey-marches/maps/grey%20marches.otd.json')
    expect(parseExampleLink(hash)).toEqual({
      pack: 'grey-marches',
      path: 'maps/grey marches.otd.json',
    })
    expect(parseDeepLink(hash)).toBeNull()
    // A map called "example" and one of its hexes is still a map link.
    expect(parseExampleLink('#/example/0304')).toBeNull()
    expect(parseExampleLink('#/example/p/notes.yaml')).toBeNull()
  })

  it('rejects malformed links', () => {
    expect(parseDeepLink('')).toBeNull()
    expect(parseDeepLink('#/UPPER')).toBeNull()
    expect(parseDeepLink('#/ab/0101')).toBeNull() // id too short
    expect(parseDeepLink('#/baaxk4h7qdfl/a/b')).toBeNull()
  })

  it('round-trips formatting', () => {
    expect(parseDeepLink(formatDeepLink('baaxk4h7qdfl', '3,-1'))).toEqual({
      mapId: 'baaxk4h7qdfl',
      hex: '3,-1',
    })
  })

  it('resolves CCRR and axial labels to cells', () => {
    expect(resolveHexLabel('0304', shape)).toEqual({ col: 2, row: 3 })
    const cell = { col: 5, row: 7 }
    const { q, r } = toAxial(cell, 'flat')
    expect(resolveHexLabel(`${q},${r}`, shape)).toEqual(cell)
    expect(resolveHexLabel(formatCoord(cell, 'CCRR', shape), shape)).toEqual(cell)
  })

  it('rejects labels outside the map or malformed', () => {
    expect(resolveHexLabel('9999', shape)).toBeNull()
    expect(resolveHexLabel('030', shape)).toBeNull()
    expect(resolveHexLabel('x', shape)).toBeNull()
  })
})
