import type { HexKey, HexMap, MapToken, TokenKind } from './types'

/** Default ink/ring color per kind (party: dark red, as before tokens existed). */
export const TOKEN_COLORS: Record<TokenKind, string> = {
  party: '#8b1e1e',
  pc: '#2f6db0',
  npc: '#5b7a3a',
  enemy: '#a3322a',
}

export const DEFAULT_TOKEN_ICONS: Record<TokenKind, string> = {
  party: 'game:meeple',
  pc: 'game:swordman',
  npc: 'game:hooded-figure',
  enemy: 'game:orc-head',
}

export const tokenColor = (token: Pick<MapToken, 'kind' | 'color'>): string =>
  token.color ?? TOKEN_COLORS[token.kind]

/** The party token, if the map has one. */
export function partyToken(map: Pick<HexMap, 'tokens'>): MapToken | undefined {
  return map.tokens.find((t) => t.kind === 'party')
}

/** Tokens standing on a hex, in list order. */
export function tokensAt(map: Pick<HexMap, 'tokens'>, hex: HexKey): MapToken[] {
  return map.tokens.filter((t) => t.hex === hex)
}

export interface TokenPlacement {
  token: MapToken
  hex: HexKey
  /** Offset from the hex center and radius, in hex-size units. */
  dx: number
  dy: number
  radius: number
}

/**
 * Where each token is drawn: alone, centered and large; several on a hex, around the
 * center (the party first) and smaller, so all stay visible and clickable.
 */
export function layoutTokens(tokens: readonly MapToken[]): TokenPlacement[] {
  const byHex = new Map<HexKey, MapToken[]>()
  for (const token of tokens) {
    if (!token.hex) continue
    const list = byHex.get(token.hex) ?? []
    list.push(token)
    byHex.set(token.hex, list)
  }
  const out: TokenPlacement[] = []
  for (const [hex, list] of byHex) {
    const sorted = [...list].sort((a, b) => Number(b.kind === 'party') - Number(a.kind === 'party'))
    if (sorted.length === 1) {
      out.push({ token: sorted[0], hex, dx: 0, dy: 0, radius: 0.6 })
      continue
    }
    const n = sorted.length
    const ring = n <= 4 ? 0.4 : 0.5
    const radius = n <= 4 ? 0.36 : Math.max(0.2, 0.36 - (n - 4) * 0.03)
    sorted.forEach((token, i) => {
      // Start at the top and go clockwise.
      const angle = -Math.PI / 2 + (i * 2 * Math.PI) / n
      out.push({ token, hex, dx: Math.cos(angle) * ring, dy: Math.sin(angle) * ring, radius })
    })
  }
  return out
}

/** A name for a new token of a kind: "PC 3", "Enemy 2"… (the label comes from the UI). */
export function nextTokenName(tokens: readonly MapToken[], kind: TokenKind, label: string): string {
  const used = new Set(tokens.map((t) => t.name))
  let n = tokens.filter((t) => t.kind === kind).length + 1
  while (used.has(`${label} ${n}`)) n++
  return `${label} ${n}`
}
