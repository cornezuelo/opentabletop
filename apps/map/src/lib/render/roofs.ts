import type { Point } from '@open-tabletop/hex'
import type { RoofKind } from '@open-tabletop/map'
import { generator } from './painters'

/**
 * A gabled roof over a rectangle of a building (docs/map-styles.md §6b): its ridge along the
 * longer side, the slope facing the light (up or left) and the one away from it, and the
 * lines of what it's made of (tiles' courses with their joints, slates', thatch's straws).
 */
export interface RoofPlan {
  /** The slope in the light, then the one in shade, as polygons. */
  slopes: [number[], number[]]
  ridge: [Point, Point]
  lines: [Point, Point][]
}

/**
 * The roof over `x, y, w, h` (in pixels), its lines `cell` apart at their scale; `seed` makes
 * a thatch's straws its own.
 */
export function roofPlan(
  x: number,
  y: number,
  w: number,
  h: number,
  kind: RoofKind,
  cell: number,
  seed = 1,
): RoofPlan {
  const across = w >= h
  // Work as if the ridge ran left to right, then turn the points for an upright one.
  const [len, depth] = across ? [w, h] : [h, w]
  const at = (u: number, v: number): Point =>
    across ? { x: x + u, y: y + v } : { x: x + v, y: y + u }
  const flat = (...ps: Point[]) => ps.flatMap((p) => [p.x, p.y])
  const half = depth / 2
  const slopes: [number[], number[]] = [
    flat(at(0, 0), at(len, 0), at(len, half), at(0, half)),
    flat(at(0, half), at(len, half), at(len, depth), at(0, depth)),
  ]
  const lines: [Point, Point][] = []
  const courses = (gap: number, joint: number) => {
    // Courses along the ridge, each slope from its eave up; joints across them, staggered.
    for (const side of [0, 1]) {
      let row = 0
      for (let d = gap; d < half - gap * 0.3; d += gap, row++) {
        const v = side ? depth - d : d
        lines.push([at(0, v), at(len, v)])
        const prev = side ? v + gap : v - gap
        for (let u = (row % 2 ? joint / 2 : 0) + joint; u < len - joint * 0.2; u += joint)
          lines.push([at(u, prev), at(u, v)])
      }
    }
  }
  if (kind === 'tiles') courses(cell * 0.14, cell * 0.2)
  else if (kind === 'slate') courses(cell * 0.2, cell * 0.32)
  else if (kind === 'thatch') {
    // Straws down each slope, from the ridge to the eave, in rows a little ragged.
    const next = generator(seed)
    const step = cell * 0.07
    for (const side of [0, 1])
      for (let u = step / 2; u < len; u += step) {
        const from = half + (side ? 1 : -1) * cell * 0.04
        const to = (side ? depth : 0) + (side ? -1 : 1) * cell * 0.03 * next()
        const lean = (next() - 0.5) * step
        lines.push([at(u, from), at(u + lean, to)])
      }
  }
  return { slopes, ridge: [at(0, half), at(len, half)], lines }
}
