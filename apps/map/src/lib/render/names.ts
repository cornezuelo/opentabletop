import type { Point } from '@open-tabletop/hex'

/** A box on the map: its top-left corner and its size. */
export interface Box {
  x: number
  y: number
  w: number
  h: number
}

/** A name that places itself. */
export interface NameToPlace {
  w: number
  h: number
  /** Where its middle may stand, the best first. */
  spots: Point[]
  /** What standing at a point costs besides overlapping (off its own region, say). */
  off?: (at: Point) => number
}

/** The box of a name of that size whose middle stands at a point. */
export const boxAt = (at: Point, w: number, h: number): Box => ({
  x: at.x - w / 2,
  y: at.y - h / 2,
  w,
  h,
})

/** The area two boxes share. */
export const overlap = (a: Box, b: Box): number =>
  Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)) *
  Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y))

/** A middle moved inside `from`…`from + size`, so a name of half that size isn't cut off. */
const within = (v: number, half: number, from: number, size: number) =>
  size <= 2 * half ? from + size / 2 : Math.min(Math.max(v, from + half), from + size - half)

/**
 * Places names one after the other, in the order given: each on the first of its spots (moved
 * inside `bounds`) where it overlaps nothing in `taken` nor any name placed before and costs
 * nothing else; where none is, on the one that costs least, overlapping costing most. Returns
 * each name's middle, in order, and adds their boxes to `taken`.
 */
export function placeNames(names: NameToPlace[], taken: Box[], bounds?: Box): Point[] {
  return names.map(({ w, h, spots, off }) => {
    let best: { at: Point; cost: number } | null = null
    for (const spot of spots) {
      const at =
        bounds && bounds.w > 0
          ? {
              x: within(spot.x, w / 2, bounds.x, bounds.w),
              y: within(spot.y, h / 2, bounds.y, bounds.h),
            }
          : spot
      const box = boxAt(at, w, h)
      const cost = taken.reduce((sum, t) => sum + overlap(box, t), 0) + (off?.(at) ?? 0)
      if (!best || cost < best.cost) best = { at, cost }
      if (cost === 0) break
    }
    const at = best?.at ?? spots[0] ?? { x: 0, y: 0 }
    taken.push(boxAt(at, w, h))
    return at
  })
}
