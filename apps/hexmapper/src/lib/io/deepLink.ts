import { inBounds, toOffset, type GridShape, type Offset } from '@open-tabletop/hex'
import { isValidId } from '../model/id'

export interface DeepLink {
  mapId: string
  /** Hex label as written in the link (CCRR like "0304", or axial "q,r"). */
  hex?: string
}

/** Parses `#/<mapId>` or `#/<mapId>/<hex>`. Returns null for anything else. */
export function parseDeepLink(hash: string): DeepLink | null {
  const match = /^#\/([a-z0-9]+)(?:\/([^/]+))?\/?$/.exec(hash)
  if (!match || !isValidId(match[1])) return null
  const hex = match[2] ? decodeURIComponent(match[2]) : undefined
  return hex ? { mapId: match[1], hex } : { mapId: match[1] }
}

export function formatDeepLink(mapId: string, hex?: string): string {
  return hex ? `#/${mapId}/${encodeURIComponent(hex)}` : `#/${mapId}`
}

/**
 * Resolves a hex label to a cell. Accepts CCRR ("0304", "012005": column digits then
 * row digits, 1-based) and axial ("q,r"), whatever the map's display format.
 */
export function resolveHexLabel(label: string, shape: GridShape): Offset | null {
  const ccrr = /^(\d+)$/.exec(label)
  if (ccrr && label.length % 2 === 0) {
    const half = label.length / 2
    const cell = { col: Number(label.slice(0, half)) - 1, row: Number(label.slice(half)) - 1 }
    return inBounds(cell, shape) ? cell : null
  }
  const axial = /^(-?\d+),(-?\d+)$/.exec(label)
  if (axial) {
    const cell = toOffset({ q: Number(axial[1]), r: Number(axial[2]) }, shape.orientation)
    return inBounds(cell, shape) ? cell : null
  }
  return null
}
