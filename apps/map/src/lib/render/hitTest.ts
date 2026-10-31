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

type TokenAt = (world: Point, copies?: boolean) => string | null
let tokenAt: TokenAt = () => null

export function setTokenHitTest(fn: TokenAt): void {
  tokenAt = fn
}

/** Id of the topmost token under a world point; with `copies`, those present too. */
export function hitTestToken(world: Point, copies = false): string | null {
  return tokenAt(world, copies)
}
