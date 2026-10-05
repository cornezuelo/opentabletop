import type { HexMap, MapPath } from '../model/types'
import type { Command, MapChange } from './command'

/**
 * Adds, replaces or removes one path: `before = null` adds, `after = null` removes.
 * Paths keep their position in the list so undo restores draw order.
 */
export class ReplacePathCommand implements Command {
  private index = -1

  constructor(
    private before: MapPath | null,
    private after: MapPath | null,
  ) {}

  apply(map: HexMap): MapChange {
    this.swap(map, this.before, this.after)
    return { kind: 'paths' }
  }

  revert(map: HexMap): MapChange {
    this.swap(map, this.after, this.before)
    return { kind: 'paths' }
  }

  private swap(map: HexMap, from: MapPath | null, to: MapPath | null): void {
    const current = from ? map.paths.findIndex((p) => p.id === from.id) : -1
    if (current >= 0) this.index = current
    if (current >= 0) map.paths.splice(current, 1)
    if (to) {
      const at = this.index >= 0 ? Math.min(this.index, map.paths.length) : map.paths.length
      map.paths.splice(at, 0, structuredClone(to))
    }
  }
}

/** Removes consecutive duplicates (clicking the same hex twice). */
export function dedupeConsecutive<T>(items: T[]): T[] {
  return items.filter((item, i) => i === 0 || item !== items[i - 1])
}
