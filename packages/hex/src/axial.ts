/** Axial hex coordinates (q, r); the implicit cube coordinate is s = -q - r. */
export interface Axial {
  q: number
  r: number
}

const DIRECTIONS: readonly Axial[] = [
  { q: 1, r: 0 },
  { q: 1, r: -1 },
  { q: 0, r: -1 },
  { q: -1, r: 0 },
  { q: -1, r: 1 },
  { q: 0, r: 1 },
]

export function add(a: Axial, b: Axial): Axial {
  return { q: a.q + b.q, r: a.r + b.r }
}

export function neighbors(h: Axial): Axial[] {
  return DIRECTIONS.map((d) => add(h, d))
}

export function distance(a: Axial, b: Axial): number {
  const dq = a.q - b.q
  const dr = a.r - b.r
  return (Math.abs(dq) + Math.abs(dr) + Math.abs(dq + dr)) / 2
}

/** Rounds fractional axial coordinates to the nearest hex. */
export function round(q: number, r: number): Axial {
  const s = -q - r
  let rq = Math.round(q)
  let rr = Math.round(r)
  const rs = Math.round(s)
  const dq = Math.abs(rq - q)
  const dr = Math.abs(rr - r)
  const ds = Math.abs(rs - s)
  if (dq > dr && dq > ds) rq = -rr - rs
  else if (dr > ds) rr = -rq - rs
  // Normalize -0 so keys and equality checks stay predictable.
  return { q: rq + 0, r: rr + 0 }
}

/** All hexes within `radius` steps of `center`, center included. */
export function spiral(center: Axial, radius: number): Axial[] {
  const result: Axial[] = []
  for (let q = -radius; q <= radius; q++) {
    const rMin = Math.max(-radius, -q - radius)
    const rMax = Math.min(radius, -q + radius)
    for (let r = rMin; r <= rMax; r++) result.push({ q: center.q + q, r: center.r + r })
  }
  return result
}

/** Hexes on the straight line from `a` to `b`, both included. */
export function line(a: Axial, b: Axial): Axial[] {
  const n = distance(a, b)
  if (n === 0) return [{ ...a }]
  const result: Axial[] = []
  // Nudge to break ties consistently when the line runs exactly along an edge.
  const eq = 1e-6
  const er = 2e-6
  for (let i = 0; i <= n; i++) {
    const t = i / n
    result.push(round(a.q + eq + (b.q - a.q) * t, a.r + er + (b.r - a.r) * t))
  }
  return result
}
