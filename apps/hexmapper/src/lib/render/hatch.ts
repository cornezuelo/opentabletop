/** A point on the map, in world units. */
export interface HatchPoint {
  x: number
  y: number
}

/**
 * Diagonal hatching across a convex polygon (`corners` as x, y pairs): the pieces of the
 * lines `x + y = k · spacing` inside it, rising to the right on screen. The lines are the
 * same for every polygon, so the hatching of neighbouring hexes meets across their edges.
 */
export function hatchSegments(corners: number[], spacing: number): [HatchPoint, HatchPoint][] {
  const points: HatchPoint[] = []
  for (let i = 0; i + 1 < corners.length; i += 2) points.push({ x: corners[i], y: corners[i + 1] })
  if (points.length < 3 || spacing <= 0) return []
  const along = points.map((p) => p.x + p.y)
  const out: [HatchPoint, HatchPoint][] = []
  for (let k = Math.ceil(Math.min(...along) / spacing); k * spacing <= Math.max(...along); k++) {
    const c = k * spacing
    const hits: HatchPoint[] = []
    for (let i = 0; i < points.length; i++) {
      const j = (i + 1) % points.length
      const [a, b] = [along[i], along[j]]
      // The edge crosses the line (counting its first end only, so a corner counts once).
      if ((a <= c && b > c) || (b <= c && a > c)) {
        const t = (c - a) / (b - a)
        const p = points[i]
        const q = points[j]
        hits.push({ x: p.x + (q.x - p.x) * t, y: p.y + (q.y - p.y) * t })
      }
    }
    // Two crossings, not a line that only touches a corner.
    if (hits.length === 2 && Math.hypot(hits[1].x - hits[0].x, hits[1].y - hits[0].y) > 1e-9)
      out.push([hits[0], hits[1]])
  }
  return out
}
