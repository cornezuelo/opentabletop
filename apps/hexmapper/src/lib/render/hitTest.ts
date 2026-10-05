import type { Point } from '@open-tabletop/hex'

/**
 * Hit tests that need rendered geometry (e.g. text bounds). The renderer registers
 * them; tools query without depending on Pixi.
 */
let labelAt: (world: Point) => string | null = () => null

export function setLabelHitTest(fn: (world: Point) => string | null): void {
  labelAt = fn
}

export function hitTestLabel(world: Point): string | null {
  return labelAt(world)
}
