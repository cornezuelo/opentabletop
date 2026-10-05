import { cellLine, keyOf, parseKey, type Offset, type Orientation } from '@open-tabletop/hex'
import { nodeFlags } from '../model/hex'
import type { HexKey, HexMap, MapLabel, MapPath } from '../model/types'
import type { Command, MapChange } from './command'

type Collections = { paths: MapPath; labels: MapLabel }

/**
 * Adds, replaces or removes one item of an id-keyed map collection:
 * `before = null` adds, `after = null` removes. Items keep their position in the
 * list so undo restores draw order.
 */
export class ReplaceItemCommand<K extends keyof Collections> implements Command {
  private index = -1

  constructor(
    private collection: K,
    private before: Collections[K] | null,
    private after: Collections[K] | null,
  ) {}

  apply(map: HexMap): MapChange {
    this.swap(map, this.before, this.after)
    return { kind: this.collection }
  }

  revert(map: HexMap): MapChange {
    this.swap(map, this.after, this.before)
    return { kind: this.collection }
  }

  private swap(map: HexMap, from: Collections[K] | null, to: Collections[K] | null): void {
    const list = map[this.collection] as Collections[K][]
    const current = from ? list.findIndex((item) => item.id === from.id) : -1
    if (current >= 0) {
      this.index = current
      list.splice(current, 1)
    }
    if (to) {
      const at = this.index >= 0 ? Math.min(this.index, list.length) : list.length
      list.splice(at, 0, structuredClone(to))
    }
  }
}

export class ReplacePathCommand extends ReplaceItemCommand<'paths'> {
  constructor(before: MapPath | null, after: MapPath | null) {
    super('paths', before, after)
  }
}

export class ReplaceLabelCommand extends ReplaceItemCommand<'labels'> {
  constructor(before: MapLabel | null, after: MapLabel | null) {
    super('labels', before, after)
  }
}

/** Removes consecutive duplicates (clicking the same hex twice). */
export function dedupeConsecutive<T>(items: T[]): T[] {
  return items.filter((item, i) => i === 0 || item !== items[i - 1])
}

/**
 * Moves vertex `index` of a path to `target`, re-filling the hexes between it and its
 * neighbors with straight hex lines so the path stays contiguous. Returns the new
 * hex/offset lists and the vertex's new index (it may merge into a neighbor).
 */
export function rerouteVertex(
  path: Pick<MapPath, 'hexes' | 'offsets' | 'nodes'>,
  index: number,
  target: Offset,
  orientation: Orientation,
): { hexes: HexKey[]; offsets: ([number, number] | null)[]; nodes: number[]; index: number } {
  const cells = path.hexes.map(parseKey)
  const offsets = path.hexes.map((_, i) => path.offsets?.[i] ?? null)
  const flags = nodeFlags(path)
  const before = cells.slice(0, index)
  const after = cells.slice(index + 1)
  const prev = before.at(-1)
  const next = after[0]
  const toTarget = prev ? cellLine(prev, target, orientation).slice(1) : [target]
  const toNext = next ? cellLine(target, next, orientation).slice(1, -1) : []
  const middle = [...toTarget, ...toNext]
  const allHexes = [...before, ...middle, ...after].map(keyOf)
  const allOffsets = [
    ...offsets.slice(0, index),
    ...middle.map(() => null),
    ...offsets.slice(index + 1),
  ]
  const moved = Math.max(0, before.length + toTarget.length - 1)
  const allFlags = [...flags.slice(0, index), ...middle.map(() => false), ...flags.slice(index + 1)]
  allFlags[moved] = true
  // Dropping onto the next hex duplicates it; collapse repeats and track the vertex.
  const hexes: HexKey[] = []
  const newOffsets: ([number, number] | null)[] = []
  const newFlags: boolean[] = []
  let newIndex = 0
  allHexes.forEach((key, i) => {
    if (hexes.at(-1) !== key) {
      hexes.push(key)
      newOffsets.push(allOffsets[i])
      newFlags.push(allFlags[i])
    } else if (allFlags[i]) newFlags[newFlags.length - 1] = true
    if (i === moved) newIndex = hexes.length - 1
  })
  const nodes = newFlags.flatMap((f, i) => (f ? [i] : []))
  return { hexes, offsets: newOffsets, nodes, index: newIndex }
}
