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

/** A name drawn on the map: a cell's or a region's. */
export type NameTarget = { kind: 'cell'; key: string } | { kind: 'region'; id: string }

export interface NameHit {
  target: NameTarget
  /** Where its middle stands now. */
  at: Point
  /** What its `nameOffset` counts from: its cell's centre, or the middle of its region's cells. */
  from: Point
}

let nameAt: (world: Point) => NameHit | null = () => null
let nameMover: (target: NameTarget, at: Point) => void = () => {}

export function setNameHitTest(
  find: (world: Point) => NameHit | null,
  move: (target: NameTarget, at: Point) => void,
): void {
  nameAt = find
  nameMover = move
}

/** The name under a world point (the topmost: a cell's before a region's). */
export function hitTestName(world: Point): NameHit | null {
  return nameAt(world)
}

/** Shows a name with its middle at a point while it's dragged, before the map keeps it there. */
export function moveNameTo(target: NameTarget, at: Point): void {
  nameMover(target, at)
}
