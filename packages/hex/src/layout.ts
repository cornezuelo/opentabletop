import { round, type Axial } from './axial'
import type { Orientation } from './offset'

export interface Point {
  x: number
  y: number
}

const SQRT3 = Math.sqrt(3)

/** Pixel position of a hex center; `size` is the center-to-corner radius. */
export function hexToPixel({ q, r }: Axial, orientation: Orientation, size: number): Point {
  if (orientation === 'flat') return { x: size * 1.5 * q, y: size * SQRT3 * (r + q / 2) }
  return { x: size * SQRT3 * (q + r / 2), y: size * 1.5 * r }
}

export function pixelToHex({ x, y }: Point, orientation: Orientation, size: number): Axial {
  if (orientation === 'flat') {
    const q = ((2 / 3) * x) / size
    return round(q, ((-1 / 3) * x + (SQRT3 / 3) * y) / size)
  }
  const r = ((2 / 3) * y) / size
  return round(((SQRT3 / 3) * x - (1 / 3) * y) / size, r)
}

/** Corner offsets relative to the hex center, as a flat [x0, y0, x1, y1, ...] array. */
export function cornerOffsets(orientation: Orientation, size: number): number[] {
  const startDeg = orientation === 'flat' ? 0 : 30
  const points: number[] = []
  for (let i = 0; i < 6; i++) {
    const angle = ((60 * i + startDeg) * Math.PI) / 180
    points.push(size * Math.cos(angle), size * Math.sin(angle))
  }
  return points
}

/** Horizontal and vertical distance between adjacent hex centers. */
export function spacing(orientation: Orientation, size: number): { x: number; y: number } {
  if (orientation === 'flat') return { x: size * 1.5, y: size * SQRT3 }
  return { x: size * SQRT3, y: size * 1.5 }
}
