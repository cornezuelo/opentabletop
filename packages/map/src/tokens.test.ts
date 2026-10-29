import { describe, expect, it } from 'vitest'
import { migrate } from './migrations'
import { deserializeMap, serializeMap } from './serialize'
import { createMap } from './defaults'
import { layoutTokens, nextTokenName, partyToken, tokenColor, TOKEN_PALETTES } from './tokens'
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

  it('past six on a hex, draws a group as one (×N), and the rest as a chip (+N)', () => {
    const wolf = (n: number) => ({ ...token(`w${n}`, 'enemy', '0,0'), group: 'wolf' })
    const six = [token('p', 'party', '0,0'), wolf(1), wolf(2), wolf(3), wolf(4), wolf(5)]
    // Six fit apart.
    expect(layoutTokens(six).map((p) => p.token.name)).toEqual(['p', 'w1', 'w2', 'w3', 'w4', 'w5'])
    // A seventh: the wolves are one token, the first of them, for all five.
    const seven = [...six, token('npc', 'npc', '0,0')]
    let placed = layoutTokens(seven)
    expect(placed.map((p) => p.token.name)).toEqual(['p', 'w1', 'npc'])
    expect(placed[1].group?.map((t) => t.name)).toEqual(['w1', 'w2', 'w3', 'w4', 'w5'])
    expect(placed[0].group).toBeUndefined()
    // Drawn apart when asked, whatever the number.
    expect(layoutTokens(seven, { group: false })).toHaveLength(7)
    // Many of their own (no group): five fit, a chip holds the rest.
    const crowd = Array.from({ length: 9 }, (_, i) => token(`c${i}`, 'npc', '1,1'))
    placed = layoutTokens(crowd)
    expect(placed).toHaveLength(6)
    expect(placed[5].more?.map((t) => t.name)).toEqual(['c5', 'c6', 'c7', 'c8'])
    expect(placed[5].token.name).toBe('c5')
  })

  it('names new tokens', () => {
    expect(nextTokenName([token('Enemy 1', 'enemy')], 'enemy', 'Enemy')).toBe('Enemy 2')
  })

  it('gives each token of a kind its own automatic color', () => {
    const tokens = [
      token('a', 'pc'),
      token('b', 'enemy'),
      token('c', 'pc'),
      { ...token('d', 'pc'), color: '#123456' },
    ]
    expect(tokenColor(tokens[0], tokens)).toBe(TOKEN_PALETTES.pc[0])
    expect(tokenColor(tokens[2], tokens)).toBe(TOKEN_PALETTES.pc[1])
    expect(tokenColor(tokens[1], tokens)).toBe(TOKEN_PALETTES.enemy[0])
    expect(tokenColor(tokens[3], tokens)).toBe('#123456')
  })
})
