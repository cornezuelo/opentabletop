import type { HexKey, HexMap, MapToken, TokenKind } from './types'

/**
 * Automatic colors per kind: a family of hues each, so tokens of one kind look alike
 * (PCs cool, enemies warm, NPCs earthy) but each token of the kind gets its own color.
 */
export const TOKEN_PALETTES: Record<TokenKind, string[]> = {
  party: ['#8b1e1e'],
  pc: ['#2f6db0', '#2e8b6e', '#6b4fa8', '#1f8aa6', '#3f9d3a', '#8a4f9e'],
  npc: ['#6b7a3a', '#8a6a3a', '#5e6b6b', '#7a5a4a', '#4f7a5a', '#8a7a4a'],
  enemy: ['#a3322a', '#c2611f', '#8a1f4a', '#b5452f', '#9a3a12', '#c23a5a'],
}

export const DEFAULT_TOKEN_ICONS: Record<TokenKind, string> = {
  party: 'game:meeple',
  pc: 'game:swordman',
  npc: 'game:hooded-figure',
  enemy: 'game:orc-head',
}

/**
 * A token's color: its own, or the automatic one, the next color of its kind's palette
 * by its order among the tokens of that kind (pass the map's tokens).
 */
export function tokenColor(
  token: Pick<MapToken, 'id' | 'kind' | 'color'>,
  tokens: readonly Pick<MapToken, 'id' | 'kind'>[] = [],
): string {
  if (token.color) return token.color
  const palette = TOKEN_PALETTES[token.kind]
  const index = tokens.filter((t) => t.kind === token.kind).findIndex((t) => t.id === token.id)
  return palette[Math.max(0, index) % palette.length]
}

/** The party token, if the map has one. */
export function partyToken(map: Pick<HexMap, 'tokens'>): MapToken | undefined {
  return map.tokens.find((t) => t.kind === 'party')
}

/** Tokens standing on a hex, in list order. */
export function tokensAt(map: Pick<HexMap, 'tokens'>, hex: HexKey): MapToken[] {
  return map.tokens.filter((t) => t.hex === hex)
}

/** A token to lay out: a map's, or one drawn from play state, maybe one of a group. */
export type LaidToken = MapToken & {
  /**
   * What it's a copy of (a template's id): past what fits on a hex, the tokens of one group
   * are drawn as one, with how many (×N).
   */
  group?: string
}

export interface TokenPlacement<T extends LaidToken = MapToken> {
  token: T
  hex: HexKey
  /** Offset from the hex center and radius, in hex-size units. */
  dx: number
  dy: number
  radius: number
  /** Drawn for several of its group (×N): every one of them, the token first. */
  group?: T[]
  /** A chip for the tokens that didn't fit (+N): them, in order (`token` is the first). */
  more?: T[]
}

/** How many tokens a hex draws apart before grouping them (about 6, so each is clickable). */
export const TOKENS_APART = 6

/**
 * Where each token is drawn: alone, centered and large; several on a hex, around the
 * center (the party first) and smaller, so all stay visible and clickable. Past `apart`
 * on a hex (unless `group` is false), the tokens of one group are one (×N); if that still
 * doesn't fit, the last place is a chip for the rest (+N).
 */
export function layoutTokens<T extends LaidToken = MapToken>(
  tokens: readonly T[],
  { apart = TOKENS_APART, group = true }: { apart?: number; group?: boolean } = {},
): TokenPlacement<T>[] {
  const byHex = new Map<HexKey, T[]>()
  for (const token of tokens) {
    if (!token.hex) continue
    const list = byHex.get(token.hex) ?? []
    list.push(token)
    byHex.set(token.hex, list)
  }
  const out: TokenPlacement<T>[] = []
  for (const [hex, list] of byHex) {
    const sorted = [...list].sort((a, b) => Number(b.kind === 'party') - Number(a.kind === 'party'))
    let shown: { token: T; group?: T[]; more?: T[] }[] = sorted.map((token) => ({ token }))
    if (group && shown.length > apart) {
      const groups = new Map<string, T[]>()
      shown = []
      for (const token of sorted) {
        const kept = token.group !== undefined ? groups.get(token.group) : undefined
        if (kept) {
          kept.push(token)
          continue
        }
        const entry: { token: T; group?: T[] } = { token }
        if (token.group !== undefined) groups.set(token.group, (entry.group = [token]))
        shown.push(entry)
      }
      for (const entry of shown) if (entry.group?.length === 1) delete entry.group
      if (shown.length > apart) {
        const more = shown.splice(apart - 1).flatMap((e) => e.group ?? [e.token])
        shown.push({ token: more[0], more })
      }
    }
    if (shown.length === 1) {
      out.push({ ...shown[0], hex, dx: 0, dy: 0, radius: 0.6 })
      continue
    }
    const n = shown.length
    const ring = n <= 4 ? 0.4 : 0.5
    const radius = n <= 4 ? 0.36 : Math.max(0.2, 0.36 - (n - 4) * 0.03)
    shown.forEach((entry, i) => {
      // Start at the top and go clockwise.
      const angle = -Math.PI / 2 + (i * 2 * Math.PI) / n
      out.push({ ...entry, hex, dx: Math.cos(angle) * ring, dy: Math.sin(angle) * ring, radius })
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
