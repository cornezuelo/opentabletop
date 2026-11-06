/** Anything that hangs from another by its id: a region in a region, a map under a map. */
export interface Hanging {
  id: string
  parent?: string
}

/**
 * Items in tree order, each after the one it hangs from, with its depth; items whose `parent`
 * is missing stand at the top.
 */
export function treeOrder<T extends Hanging>(items: readonly T[]): { item: T; depth: number }[] {
  const known = new Set(items.map((i) => i.id))
  const out: { item: T; depth: number }[] = []
  const placed = new Set<string>()
  const visit = (item: T, depth: number) => {
    if (placed.has(item.id)) return
    placed.add(item.id)
    out.push({ item, depth })
    for (const child of items) if (child.parent === item.id) visit(child, depth + 1)
  }
  for (const i of items) if (!i.parent || !known.has(i.parent)) visit(i, 0)
  // Items caught in a loop of parents: at the top, so none is lost.
  for (const i of items) visit(i, 0)
  return out
}

/** The whole tree `id` is in, from its top, in tree order. */
export function treeAround<T extends Hanging>(
  items: readonly T[],
  id: string,
): { item: T; depth: number }[] {
  const order = treeOrder(items)
  const at = order.findIndex((o) => o.item.id === id)
  if (at < 0) return []
  let start = at
  while (order[start].depth > 0) start--
  let end = start + 1
  while (end < order.length && order[end].depth > 0) end++
  return order.slice(start, end)
}
