import { describe, expect, it } from 'vitest'
import { migrate } from './migrations'
import { deserializeMap, serializeMap } from './serialize'
import { createMap } from './defaults'
import { layoutTokens, nextTokenName, partyToken } from './tokens'
import type { MapToken } from './types'

const token = (id: string, kind: MapToken['kind'], hex?: string): MapToken => ({
  id: `${id}xxxxxx`,
  name: id,
  kind,
  iconId: 'game:meeple',
  ...(hex && { hex: hex as MapToken['hex'] }),
})

describe('tokens', () => {
  it('turns the old party icon and location into a party token (v1 → v2)', () => {
    const data = migrate({
      version: 1,
      play: {
        mode: 'simple',
        token: { iconId: 'game:camel', color: '#112233' },
        location: '3,4',
        trail: [],
      },
    })
    expect(data.play).toEqual({ mode: 'simple', trail: [] })
    expect(data.tokens).toEqual([
      expect.objectContaining({
        kind: 'party',
        hex: '3,4',
        iconId: 'game:camel',
        color: '#112233',
      }),
    ])
    expect(migrate({ version: 1 }).tokens).toEqual([])
  })

  it('round-trips tokens and keeps a single party', () => {
    const map = createMap()
    map.tokens = [token('a', 'party', '1,1'), token('b', 'party'), token('c', 'enemy', '1,1')]
    const back = deserializeMap(serializeMap(map))
    expect(back.tokens.map((t) => [t.kind, t.hex])).toEqual([
      ['party', '1,1'],
      ['pc', undefined],
      ['enemy', '1,1'],
    ])
    expect(partyToken(back)?.name).toBe('a')
  })

  it('lays tokens out: alone centered, together around the center with the party first', () => {
    const placed = layoutTokens([
      token('e', 'enemy', '0,0'),
      token('p', 'party', '0,0'),
      token('x', 'npc', '2,2'),
      token('off', 'pc'),
    ])
    const at = (name: string) => placed.find((p) => p.token.name === name)!
    expect(at('x')).toMatchObject({ dx: 0, dy: 0, radius: 0.6 })
    expect(at('p').dy).toBeLessThan(0) // top
    expect(Math.hypot(at('e').dx, at('e').dy)).toBeCloseTo(0.4)
    expect(placed.some((p) => p.token.name === 'off')).toBe(false)
  })

  it('names new tokens', () => {
    expect(nextTokenName([token('Enemy 1', 'enemy')], 'enemy', 'Enemy')).toBe('Enemy 2')
  })
})
