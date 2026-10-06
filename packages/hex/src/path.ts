export interface PathOptions<N> {
  neighbors(node: N): N[]
  /** Cost of stepping from `a` to its neighbor `b`; Infinity (or < 0) means impassable. */
  cost(a: N, b: N): number
  /** Admissible estimate of the remaining cost (never overestimate, or paths may be suboptimal). */
  heuristic(node: N, goal: N): number
  /** Stable identity for nodes (defaults to String(node)). */
  key?(node: N): string
  /** Give up after expanding this many nodes. */
  maxExpansions?: number
}

export interface PathResult<N> {
  path: N[]
  cost: number
}

/** A* search. Returns null when the goal is unreachable. */
export function findPath<N>(start: N, goal: N, options: PathOptions<N>): PathResult<N> | null {
  const key = options.key ?? ((n: N) => String(n))
  const goalKey = key(goal)
  const max = options.maxExpansions ?? 100_000
  const open = new MinHeap<{ node: N; f: number }>((a, b) => a.f - b.f)
  const g = new Map<string, number>([[key(start), 0]])
  const parent = new Map<string, N>()
  const closed = new Set<string>()
  open.push({ node: start, f: options.heuristic(start, goal) })
  let expansions = 0
  while (open.size > 0) {
    const { node } = open.pop()!
    const k = key(node)
    if (closed.has(k)) continue
    if (k === goalKey) {
      const path = [node]
      let cursor = k
      while (parent.has(cursor)) {
        const prev = parent.get(cursor)!
        path.unshift(prev)
        cursor = key(prev)
      }
      return { path, cost: g.get(k)! }
    }
    closed.add(k)
    if (++expansions > max) return null
    for (const next of options.neighbors(node)) {
      const nk = key(next)
      if (closed.has(nk)) continue
      const step = options.cost(node, next)
      if (!Number.isFinite(step) || step < 0) continue
      const tentative = g.get(k)! + step
      if (tentative < (g.get(nk) ?? Infinity)) {
        g.set(nk, tentative)
        parent.set(nk, node)
        open.push({ node: next, f: tentative + options.heuristic(next, goal) })
      }
    }
  }
  return null
}

class MinHeap<T> {
  private items: T[] = []
  constructor(private compare: (a: T, b: T) => number) {}

  get size(): number {
    return this.items.length
  }

  push(item: T): void {
    const items = this.items
    items.push(item)
    let i = items.length - 1
    while (i > 0) {
      const p = (i - 1) >> 1
      if (this.compare(items[i], items[p]) >= 0) break
      ;[items[i], items[p]] = [items[p], items[i]]
      i = p
    }
  }

  pop(): T | undefined {
    const items = this.items
    const top = items[0]
    const last = items.pop()
    if (items.length > 0 && last !== undefined) {
      items[0] = last
      let i = 0
      for (;;) {
        const l = i * 2 + 1
        const r = l + 1
        let m = i
        if (l < items.length && this.compare(items[l], items[m]) < 0) m = l
        if (r < items.length && this.compare(items[r], items[m]) < 0) m = r
        if (m === i) break
        ;[items[i], items[m]] = [items[m], items[i]]
        i = m
      }
    }
    return top
  }
}
