import type { HexKey } from '@open-tabletop/hex'
import type { HexMap, MapRegion } from './types'

/**
 * Regions inside regions: a region may lie inside another (`parent`), and a cell painted into
 * it is in every region up the tree. A cell keeps only its innermost region (`hex.region`);
 * everything else is read from there.
 */

/** A region and those it lies inside, innermost first (a loop stops where it comes back). */
export function regionChain(regions: readonly MapRegion[], id: string | undefined): MapRegion[] {
  const chain: MapRegion[] = []
  const seen = new Set<string>()
  for (let at = id; at && !seen.has(at);) {
    seen.add(at)
    const region = regions.find((r) => r.id === at)
    if (!region) break
    chain.push(region)
    at = region.parent
  }
  return chain
}

/** The regions a cell is in, innermost first. */
export function cellRegions(map: Pick<HexMap, 'regions' | 'hexes'>, key: string): MapRegion[] {
  return regionChain(map.regions, map.hexes[key as HexKey]?.region)
}

/** Whether region `id` is `outer` or lies inside it, however deep. */
export function isInside(regions: readonly MapRegion[], id: string | undefined, outer: string) {
  return regionChain(regions, id).some((r) => r.id === outer)
}

/** The room a cell is in: its nearest region up the tree played as one place. */
export function roomOfCell(
  map: Pick<HexMap, 'regions' | 'hexes'>,
  key: string,
): string | undefined {
  return cellRegions(map, key).find((r) => r.onePlace)?.id
}

/** The cells of a region, with those of every region inside it. */
export function regionCells(map: Pick<HexMap, 'regions' | 'hexes'>, id: string): HexKey[] {
  return (Object.keys(map.hexes) as HexKey[]).filter((k) =>
    isInside(map.regions, map.hexes[k]?.region, id),
  )
}

/** How deep a region lies: 0 outermost, 1 inside one, and so on. */
export function regionDepth(regions: readonly MapRegion[], id: string): number {
  return Math.max(0, regionChain(regions, id).length - 1)
}

/**
 * The regions in tree order, each after the one it lies inside, with its depth; regions whose
 * `parent` is missing are outermost.
 */
export function regionTree(regions: readonly MapRegion[]): { region: MapRegion; depth: number }[] {
  const known = new Set(regions.map((r) => r.id))
  const out: { region: MapRegion; depth: number }[] = []
  const placed = new Set<string>()
  const visit = (region: MapRegion, depth: number) => {
    if (placed.has(region.id)) return
    placed.add(region.id)
    out.push({ region, depth })
    for (const child of regions) if (child.parent === region.id) visit(child, depth + 1)
  }
  for (const r of regions) if (!r.parent || !known.has(r.parent)) visit(r, 0)
  // Regions caught in a loop of parents: outermost, so none is lost.
  for (const r of regions) visit(r, 0)
  return out
}

/** The regions that may hold `id`: any but itself and those inside it (no loops). */
export function possibleParents(regions: readonly MapRegion[], id: string): MapRegion[] {
  return regions.filter((r) => !isInside(regions, r.id, id))
}

/** The values a cell gets from its regions: the outermost first, the innermost winning. */
export function regionFields(regions: readonly MapRegion[]): NonNullable<MapRegion['fields']> {
  return [...regions].reverse().flatMap((r) => r.fields ?? [])
}
