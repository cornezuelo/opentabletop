import type { Point } from '@open-tabletop/hex'

/**
 * Smooth polyline through `points` (uniform Catmull-Rom). The curve
 * passes through every control point, so paths still visit each hex center.
 */
export function catmullRom(points: Point[], samplesPerSegment = 8): Point[] {
  if (points.length < 3) return points.map((p) => ({ ...p }))
  const out: Point[] = [{ ...points[0] }]
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)]
    const p1 = points[i]
    const p2 = points[i + 1]
    const p3 = points[Math.min(points.length - 1, i + 2)]
    for (let s = 1; s <= samplesPerSegment; s++) {
      const t = s / samplesPerSegment
      const t2 = t * t
      const t3 = t2 * t
      const blend = (a: number, b: number, c: number, d: number) =>
        0.5 *
        (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3)
      out.push({ x: blend(p0.x, p1.x, p2.x, p3.x), y: blend(p0.y, p1.y, p2.y, p3.y) })
    }
  }
  return out
}

/** Smooth closed loop through `points`: like catmullRom, also joining the last to the first. */
export function catmullRomClosed(points: Point[], samplesPerSegment = 8): Point[] {
  const n = points.length
  if (n < 3) return [...points, points[0]].map((p) => ({ ...p }))
  const at = (i: number) => points[((i % n) + n) % n]
  const out: Point[] = [{ ...points[0] }]
  for (let i = 0; i < n; i++) {
    const [p0, p1, p2, p3] = [at(i - 1), at(i), at(i + 1), at(i + 2)]
    for (let s = 1; s <= samplesPerSegment; s++) {
      const t = s / samplesPerSegment
      const t2 = t * t
      const t3 = t2 * t
      const blend = (a: number, b: number, c: number, d: number) =>
        0.5 *
        (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3)
      out.push({ x: blend(p0.x, p1.x, p2.x, p3.x), y: blend(p0.y, p1.y, p2.y, p3.y) })
    }
  }
  return out
}

/** Splits a polyline into dash segments of `dash` length separated by `gap`. */
export function dashes(points: Point[], dash: number, gap: number): Point[][] {
  const segments: Point[][] = []
  let current: Point[] = []
  let drawing = true
  let remaining = dash
  for (let i = 0; i < points.length - 1; i++) {
    let a = points[i]
    const b = points[i + 1]
    let length = Math.hypot(b.x - a.x, b.y - a.y)
    if (drawing && current.length === 0) current.push(a)
    while (length > remaining) {
      const t = remaining / length
      const cut = { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }
      if (drawing) {
        current.push(cut)
        segments.push(current)
        current = []
      } else current = [cut]
      drawing = !drawing
      length -= remaining
      remaining = drawing ? dash : gap
      a = cut
    }
    remaining -= length
    if (drawing) current.push(b)
  }
  if (drawing && current.length > 1) segments.push(current)
  return segments
}

/**
 * The same line moved `distance` to one side (right of the way it goes, in screen
 * coordinates; negative: left), so it runs beside another drawn on the same points (a
 * road) instead of on top of it. Within `ramp` of each end it eases back onto the
 * points, so it still starts and ends where they do.
 */
export function offsetPolyline(points: Point[], distance: number, ramp = 0): Point[] {
  if (points.length < 2 || distance === 0) return points.map((p) => ({ ...p }))
  const along = [0]
  for (let i = 1; i < points.length; i++)
    along.push(
      along[i - 1] + Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y),
    )
  const total = along.at(-1)!
  return points.map((p, i) => {
    const a = points[Math.max(0, i - 1)]
    const b = points[Math.min(points.length - 1, i + 1)]
    const dx = b.x - a.x
    const dy = b.y - a.y
    const length = Math.hypot(dx, dy) || 1
    const ease = ramp > 0 ? Math.min(1, along[i] / ramp, (total - along[i]) / ramp) : 1
    const d = distance * Math.max(0, ease)
    // The right-hand normal of the direction of travel (y grows downwards on screen).
    return { x: p.x - (dy / length) * d, y: p.y + (dx / length) * d }
  })
}
