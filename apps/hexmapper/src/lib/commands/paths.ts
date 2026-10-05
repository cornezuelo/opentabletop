import type { HexMap, MapLabel, MapPath } from '../model/types'
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
