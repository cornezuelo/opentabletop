import { cornerOffsets, type Orientation, type Point } from '@open-tabletop/hex'

export interface PathVertex {
  /** Hex center in world units. */
  center: Point
  /** Where the path actually passes (center plus offset). */
  point: Point
  /** Water hexes (lake, sea…): paths stop at their shore instead of entering. */
  water: boolean
  /** Drawn vertex (user-placed point). False for hexes the path merely crosses. */
  node?: boolean
}

/**
 * Splits a path into drawable runs. A water vertex is never drawn: the run ends at the
 * shared edge with the previous land hex and a new run starts at the edge towards the
 * next one, so rivers flow into lakes and roads stop at the coast.
 */
export function pathRuns(vertices: PathVertex[]): Point[][] {
  const runs: Point[][] = []
  let current: Point[] = []
  const edge = (a: PathVertex, b: PathVertex) => ({
    x: (a.center.x + b.center.x) / 2,
    y: (a.center.y + b.center.y) / 2,
  })
  vertices.forEach((v, i) => {
    const prev = vertices[i - 1]
    const next = vertices[i + 1]
    if (!v.water) {
      // Crossed-only hexes aren't drawn, so straight lines between nodes stay straight.
      if (v.node !== false || current.length === 0 || !next) current.push(v.point)
      return
    }
    if (prev && !prev.water) current.push(edge(prev, v))
    if (current.length > 1) runs.push(current)
    current = next && !next.water ? [edge(v, next)] : []
  })
  if (current.length > 1) runs.push(current)
  return runs
}

/**
 * Snap targets inside a hex, relative to its center: the center, the six edge
 * midpoints and the six corners (pulled slightly inwards so they stay in this hex).
 */
export function snapTargets(orientation: Orientation, size: number): Point[] {
  const corners = cornerOffsets(orientation, size * 0.92)
  const targets: Point[] = [{ x: 0, y: 0 }]
  for (let i = 0; i < 6; i++) {
    const a = { x: corners[i * 2], y: corners[i * 2 + 1] }
    const j = (i + 1) % 6
    const b = { x: corners[j * 2], y: corners[j * 2 + 1] }
    targets.push(a, { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 })
  }
  return targets
}

/** Nearest snap target to `offset`, or `offset` clamped inside the hex when not snapping. */
export function placeInHex(
  offset: Point,
  orientation: Orientation,
  size: number,
  snap: boolean,
): Point {
  if (snap) {
    let best = { x: 0, y: 0 }
    let bestDistance = Infinity
    for (const target of snapTargets(orientation, size)) {
      const d = Math.hypot(target.x - offset.x, target.y - offset.y)
      if (d < bestDistance) {
        best = target
        bestDistance = d
      }
    }
    return best
  }
  // Keep free placement within the inscribed circle so the point can't leave the hex.
  const max = ((size * Math.sqrt(3)) / 2) * 0.95
  const length = Math.hypot(offset.x, offset.y)
  return length <= max ? offset : { x: (offset.x / length) * max, y: (offset.y / length) * max }
}

/** A map path a route may follow: its hexes and, for each, where it's drawn. */
export interface FollowedPath {
  hexes: readonly string[]
  /** Where the path passes in its `i`-th hex (center plus offset). */
  point: (i: number) => Point
  /** Whether its `i`-th hex is a drawn vertex (crossed-only hexes aren't). */
  node: (i: number) => boolean
}

/**
 * The points a route through `route` (hex keys, in order) is drawn on: along a stretch
 * that follows a map path (consecutive hexes of the path, either way), the path's own
 * points, skipping the hexes it merely crosses, so the route bends where the road bends
 * and runs straight where it runs straight; elsewhere the hexes' centres. `paths` go in
 * order of preference (roads before rivers).
 */
export function routePoints(
  route: readonly string[],
  center: (key: string) => Point,
  paths: readonly FollowedPath[],
): Point[] {
  /** The path and index that join `route[a]` → `route[b]`, if any. */
  const along = (a: number, b: number) => {
    if (a < 0 || b >= route.length) return null
    for (const path of paths)
      for (let j = 0; j < path.hexes.length; j++) {
        if (path.hexes[j] !== route[a]) continue
        if (path.hexes[j + 1] === route[b]) return { path, from: j, to: j + 1 }
        if (path.hexes[j - 1] === route[b]) return { path, from: j, to: j - 1 }
      }
    return null
  }
  const points: Point[] = []
  route.forEach((key, i) => {
    const before = along(i - 1, i)
    const after = along(i, i + 1)
    const on = after
      ? { path: after.path, at: after.from }
      : before && { path: before.path, at: before.to }
    if (!on) return points.push(center(key))
    // A hex in the middle of one path, which the path only crosses, isn't drawn.
    const through = before && after && before.path === after.path
    if (through && i > 0 && i < route.length - 1 && !on.path.node(on.at)) return
    points.push(on.path.point(on.at))
  })
  return points
}
