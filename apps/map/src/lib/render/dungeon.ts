import type { Point } from '@open-tabletop/hex'
import { generator } from './painters'

/**
 * What a style draws outside a dungeon's walls (`walls.outside`, docs/map-styles.md §3): the
 * band of rock beyond each wall, hatched as Dungeon Scrawl draws it, shaded, or stippled as a
 * cave's rock. Pure geometry, from a wall's side and which way is out; the renderer strokes it.
 */

/** A wall's side: from `a` to `b`, `out` the unit vector away from the floor. */
export interface WallSide {
  a: Point
  b: Point
  out: Point
  /** The same side, the same strokes. */
  seed: number
}

/** A stroke of hatching: from one point to another. */
export type Stroke = [Point, Point]

/** A dot of stipple, `alpha` fading away from the wall. */
export interface Dot {
  x: number
  y: number
  r: number
  alpha: number
}

/** A strip of shadow: a polygon (x, y, x, y…) and how dark. */
export interface Strip {
  points: number[]
  alpha: number
}

const along = (side: WallSide, t: number, d: number): Point => ({
  x: side.a.x + (side.b.x - side.a.x) * t + side.out.x * d,
  y: side.a.y + (side.b.y - side.a.y) * t + side.out.y * d,
})

/**
 * Hatching outside a wall: clusters of three short parallel strokes, each cluster at its own
 * angle, packed over a band `band` world units deep. A stroke ending on floor (`onFloor`) is
 * left out, so a room's hatching never crosses into the next room.
 */
export function hatchStrokes(
  side: WallSide,
  band: number,
  onFloor: (p: Point) => boolean,
): Stroke[] {
  if (band <= 0) return []
  const random = generator(side.seed)
  const length = Math.hypot(side.b.x - side.a.x, side.b.y - side.a.y)
  const cluster = band * 0.55
  const across = Math.max(1, Math.round(band / cluster))
  const steps = Math.max(1, Math.round(length / cluster))
  const strokes: Stroke[] = []
  for (let i = 0; i < steps; i++)
    for (let j = 0; j < across; j++) {
      const t = (i + 0.5 + (random() - 0.5) * 0.5) / steps
      const d = ((j + 0.5 + (random() - 0.5) * 0.4) / across) * band
      const c = along(side, t, d)
      const angle = random() * Math.PI
      const dx = Math.cos(angle)
      const dy = Math.sin(angle)
      const half = cluster * (0.42 + random() * 0.12)
      const gap = cluster * 0.28
      for (let k = -1; k <= 1; k++) {
        const mx = c.x - dy * gap * k
        const my = c.y + dx * gap * k
        // The outer strokes of a cluster are a little shorter, as a pen's quick marks.
        const h = half * (k === 0 ? 1 : 0.8)
        const p: Point = { x: mx - dx * h, y: my - dy * h }
        const q: Point = { x: mx + dx * h, y: my + dy * h }
        if (onFloor(p) || onFloor(q)) continue
        strokes.push([p, q])
      }
    }
  return strokes
}

/** Stipple outside a wall: dots thick by it and thinning out across the band, none on floor. */
export function stippleDots(
  side: WallSide,
  band: number,
  dot: number,
  onFloor: (p: Point) => boolean,
): Dot[] {
  if (band <= 0) return []
  const random = generator(side.seed)
  const length = Math.hypot(side.b.x - side.a.x, side.b.y - side.a.y)
  const count = Math.round(((length * band) / (dot * dot)) * 0.09)
  const dots: Dot[] = []
  for (let i = 0; i < count; i++) {
    // Squared: more dots near the wall.
    const depth = random() ** 2
    const p = along(side, random(), depth * band)
    if (onFloor(p)) continue
    dots.push({ x: p.x, y: p.y, r: dot * (0.6 + random() * 0.6), alpha: 1 - depth * 0.85 })
  }
  return dots
}

/** A shadow cast outside a wall: strips across the band, darkest by the wall. */
export function shadowStrips(side: WallSide, band: number, steps = 4): Strip[] {
  if (band <= 0) return []
  const strips: Strip[] = []
  for (let i = 0; i < steps; i++) {
    const near = (band * i) / steps
    const far = (band * (i + 1)) / steps
    const p = [along(side, 0, near), along(side, 1, near), along(side, 1, far), along(side, 0, far)]
    strips.push({ points: p.flatMap(({ x, y }) => [x, y]), alpha: 0.32 * (1 - i / steps) })
  }
  return strips
}
