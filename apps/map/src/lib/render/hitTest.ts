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

let tokenAt: (world: Point) => string | null = () => null

export function setTokenHitTest(fn: (world: Point) => string | null): void {
  tokenAt = fn
}

/** Id of the topmost token under a world point. */
export function hitTestToken(world: Point): string | null {
  return tokenAt(world)
}
