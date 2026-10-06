import { CURRENT_VERSION, DEFAULT_GLYPH_OPACITY, DEFAULT_GLYPHS } from './defaults'
import { newId } from './id'

/**
 * `migrations[n]` upgrades raw data from version n to n + 1. Every format change
 * bumps CURRENT_VERSION and adds an entry here.
 */
const migrations: Record<number, (data: Record<string, unknown>) => Record<string, unknown>> = {
  /** v2: tokens. The party's own icon (play.token) and location become a `party` token. */
  1(data) {
    const play = data.play as Record<string, unknown> | undefined
    const tokens: Record<string, unknown>[] = []
    if (play && typeof play === 'object') {
      const { token, location, ...rest } = play as {
        token?: { iconId?: string; color?: string; halo?: boolean }
        location?: string
      } & Record<string, unknown>
      if (location || token)
        tokens.push({
          id: newId(),
          name: '',
          kind: 'party',
          hex: location,
          iconId: token?.iconId ?? 'game:meeple',
          ...(token?.color && { color: token.color }),
          ...(token?.halo === false && { halo: false }),
        })
      data = { ...data, play: rest }
    }
    return { ...data, tokens }
  },
  /** v3: terrain glyphs. Built-in terrains get their default symbol; custom ones none. */
  2(data) {
    const terrains = Array.isArray(data.terrains) ? data.terrains : []
    const grid = (typeof data.grid === 'object' && data.grid) || {}
    return {
      ...data,
      grid: { ...grid, glyphs: DEFAULT_GLYPH_OPACITY },
      terrains: terrains.map((t: Record<string, unknown>) =>
        typeof t?.id === 'string' && DEFAULT_GLYPHS[t.id]
          ? { ...t, glyph: DEFAULT_GLYPHS[t.id] }
          : t,
      ),
    }
  },
  /** v4: regions. */
  3(data) {
    return { ...data, regions: [] }
  },
}

export function migrate(data: Record<string, unknown>): Record<string, unknown> {
  let version = typeof data.version === 'number' ? data.version : 0
  if (version > CURRENT_VERSION) throw new MapFormatError('newerVersion')
  while (version < CURRENT_VERSION) {
    const step = migrations[version]
    if (!step) throw new MapFormatError('invalid')
    data = { ...step(data), version: version + 1 }
    version++
  }
  return data
}

export type MapFormatErrorCode = 'invalid' | 'newerVersion'

export class MapFormatError extends Error {
  constructor(public code: MapFormatErrorCode) {
    super(`Map format error: ${code}`)
  }
}
