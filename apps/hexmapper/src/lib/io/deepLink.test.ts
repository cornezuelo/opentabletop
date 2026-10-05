import { describe, expect, it } from 'vitest'
import { formatCoord, toAxial, type GridShape } from '@open-tabletop/hex'
import { formatDeepLink, parseDeepLink, resolveHexLabel } from './deepLink'

const shape: GridShape = { orientation: 'flat', width: 30, height: 20 }

describe('deep links', () => {
  it('parses map and hex links', () => {
    expect(parseDeepLink('#/baaxk4h7qdfl')).toEqual({ mapId: 'baaxk4h7qdfl' })
    expect(parseDeepLink('#/baaxk4h7qdfl/0304')).toEqual({ mapId: 'baaxk4h7qdfl', hex: '0304' })
    expect(parseDeepLink('#/baaxk4h7qdfl/3%2C-1')).toEqual({ mapId: 'baaxk4h7qdfl', hex: '3,-1' })
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
