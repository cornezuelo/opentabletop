import { inBounds, toOffset, type GridShape, type Offset } from '@open-tabletop/hex'
import { isValidId } from '@open-tabletop/map'

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

/** An example map a system brings: `#/example/<pack>/<path in the pack>`. */
export interface ExampleLink {
  pack: string
  path: string
}

/**
 * Parses `#/example/<pack>/<path>` (the path has a folder and ends in `.otd.json`, so it
 * never reads as a map id and a hex). Returns null for anything else.
 */
export function parseExampleLink(hash: string): ExampleLink | null {
  const match = /^#\/example\/([^/]+)\/(.+\.otd\.json)$/.exec(hash)
  if (!match) return null
  try {
    return {
      pack: decodeURIComponent(match[1]),
      path: match[2].split('/').map(decodeURIComponent).join('/'),
    }
  } catch {
    return null
  }
}

export function formatExampleLink(pack: string, path: string): string {
  return `#/example/${encodeURIComponent(pack)}/${path.split('/').map(encodeURIComponent).join('/')}`
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
    const [x, y] = [Number(axial[1]), Number(axial[2])]
    // Squares' "axial" coordinates are their column and row (`formatCoord`).
    const cell =
      shape.kind === 'square' ? { col: x, row: y } : toOffset({ q: x, r: y }, shape.orientation)
    return inBounds(cell, shape) ? cell : null
  }
  return null
}
