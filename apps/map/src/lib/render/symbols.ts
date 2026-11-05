import type { Point } from '@open-tabletop/hex'
import type { ConnectionSymbol } from '@open-tabletop/map'

/**
 * The symbols a style draws connections and ways as (`connections.<kind>.symbol`,
 * docs/map-styles.md §3): a door in its wall, an arch, a bridge, a ford's stepping stones, a
 * stair, a ladder, a cave's mouth. Pure geometry, from where the symbol sits and which way it
 * faces; the renderer fills and strokes the shapes.
 */

/** Where a symbol sits: its centre, `along` the wall (unit), `across` it (unit), and its length. */
export interface Placement {
  at: Point
  along: Point
  across: Point
  length: number
}

/**
 * A shape of a symbol: a polygon (x, y, x, y…) or a circle, filled light (the floor or the
 * paper), in the symbol's colour (`ink`), or dark; and lines, stroked in its colour.
 */
export type Shape =
  | { poly: number[]; fill: 'light' | 'ink' | 'dark'; outline?: boolean }
  | { circle: Point; r: number; fill: 'light' | 'ink'; outline?: boolean }
  | { line: [Point, Point] }

/** Where a connection's symbol sits: on the side its two cells share, else midway between them. */
export function placeBetween(
  from: Point,
  to: Point,
  shared: { a: Point; b: Point } | undefined,
  size: number,
): Placement {
  if (shared) {
    const dx = shared.b.x - shared.a.x
    const dy = shared.b.y - shared.a.y
    const length = Math.hypot(dx, dy) || 1
    const along = { x: dx / length, y: dy / length }
    // Across points from one place to the other.
    const sign = along.x * (to.y - from.y) - along.y * (to.x - from.x) >= 0 ? 1 : -1
    return {
      at: { x: (shared.a.x + shared.b.x) / 2, y: (shared.a.y + shared.b.y) / 2 },
      along,
      across: { x: -along.y * sign, y: along.x * sign },
      length,
    }
  }
  const dx = to.x - from.x
  const dy = to.y - from.y
  const d = Math.hypot(dx, dy) || 1
  const across = { x: dx / d, y: dy / d }
  return {
    at: { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 },
    along: { x: -across.y, y: across.x },
    across,
    length: size * 0.7,
  }
}

/** A way's symbol: on its cell, upright, a little smaller than the cell. */
export const placeOnCell = (at: Point, size: number): Placement => ({
  at,
  along: { x: 1, y: 0 },
  across: { x: 0, y: 1 },
  length: size * 0.8,
})

/** The shapes of a symbol (none for `diamond`, `badge` and `none`, which the renderer draws). */
export function symbolShapes(symbol: ConnectionSymbol, p: Placement, size: number): Shape[] {
  const { at, along: u, across: n, length: L } = p
  /** A point `a` along and `b` across from the centre. */
  const pt = (a: number, b: number): Point => ({
    x: at.x + u.x * a + n.x * b,
    y: at.y + u.y * a + n.y * b,
  })
  /** A rectangle from `a0` to `a1` along, `b0` to `b1` across. */
  const rect = (a0: number, a1: number, b0: number, b1: number): number[] =>
    [pt(a0, b0), pt(a1, b0), pt(a1, b1), pt(a0, b1)].flatMap(({ x, y }) => [x, y])
  /** The wall from each corner of the side to `w` from the centre, as thick as a wall. */
  const jambs = (w: number): Shape[] => {
    const t = size * 0.07
    return [
      { poly: rect(-L / 2, -w, -t, t), fill: 'ink' },
      { poly: rect(w, L / 2, -t, t), fill: 'ink' },
    ]
  }
  switch (symbol) {
    case 'door': {
      // A leaf in the middle of the gap, the wall going on to it from either corner.
      const w = L * 0.26
      const t = size * 0.11
      return [...jambs(w), { poly: rect(-w, w, -t, t), fill: 'light', outline: true }]
    }
    case 'arch': {
      // The wall going on from either corner, ending in a jamb each side of the opening.
      const w = L * 0.3
      const j = size * 0.06
      const t = size * 0.11
      return [
        ...jambs(w),
        { poly: rect(-w - j, -w + j, -t, t), fill: 'ink' },
        { poly: rect(w - j, w + j, -t, t), fill: 'ink' },
      ]
    }
    case 'bridge': {
      // A deck across, its two parapets flaring at the ends.
      const w = L * 0.22
      const h = size * 0.45
      const flare = size * 0.08
      return [
        { poly: rect(-w, w, -h, h), fill: 'light' },
        { line: [pt(-w, -h + flare), pt(-w, h - flare)] },
        { line: [pt(w, -h + flare), pt(w, h - flare)] },
        { line: [pt(-w, -h + flare), pt(-w - flare, -h)] },
        { line: [pt(-w, h - flare), pt(-w - flare, h)] },
        { line: [pt(w, -h + flare), pt(w + flare, -h)] },
        { line: [pt(w, h - flare), pt(w + flare, h)] },
      ]
    }
    case 'ford': {
      // Stepping stones across, a little off line one way and the other.
      const stones = 4
      const h = size * 0.42
      return Array.from({ length: stones }, (_, i) => ({
        circle: pt((i % 2 ? 1 : -1) * L * 0.06, -h + (2 * h * i) / (stones - 1)),
        r: size * 0.1,
        fill: 'light' as const,
        outline: true,
      }))
    }
    case 'stair': {
      // Steps across, each narrower than the last: the way down.
      const steps = 5
      const h = size * 0.36
      const shapes: Shape[] = [
        { poly: rect(-L * 0.36, L * 0.36, -h, h), fill: 'light', outline: true },
      ]
      for (let i = 1; i < steps; i++) {
        const b = -h + (2 * h * i) / steps
        const w = L * 0.36 * (1 - (i / steps) * 0.35)
        shapes.push({ line: [pt(-w, b), pt(w, b)] })
      }
      return shapes
    }
    case 'ladder': {
      // Two rails and their rungs.
      const w = L * 0.16
      const h = size * 0.38
      const rungs = 5
      const shapes: Shape[] = [{ line: [pt(-w, -h), pt(-w, h)] }, { line: [pt(w, -h), pt(w, h)] }]
      for (let i = 0; i < rungs; i++) {
        const b = -h + (2 * h * (i + 0.5)) / rungs
        shapes.push({ line: [pt(-w, b), pt(w, b)] })
      }
      return shapes
    }
    case 'mouth': {
      // A dark opening under an arch of rock.
      const w = L * 0.36
      const h = size * 0.32
      const arc: Point[] = []
      const steps = 12
      for (let i = 0; i <= steps; i++) {
        const a = Math.PI * (i / steps)
        arc.push(pt(-Math.cos(a) * w, h * 0.4 - Math.sin(a) * h * 1.2))
      }
      return [{ poly: arc.flatMap(({ x, y }) => [x, y]), fill: 'dark', outline: true }]
    }
    default:
      return []
  }
}
