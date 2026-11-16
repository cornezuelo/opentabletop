import { matches, type Condition } from '@open-tabletop/conditions'

/**
 * The rows of a table that can't come up with what the host knows (the place, the party,
 * the time…): those whose condition reads that context and doesn't hold. A condition that
 * rolls dice (`'{{1d20}}'`) may hold or not, so it's kept; with no context at all (the
 * Oracle with nothing typed) nothing is ruled out, as nothing is known. The rest are what
 * the roll can give here.
 */
export function ruledOut<E extends { key: string; when?: unknown }>(
  entries: readonly E[],
  context: Record<string, unknown>,
): Set<string> {
  const out = new Set<string>()
  if (!Object.keys(context).length) return out
  for (const entry of entries) {
    if (entry.when === undefined || JSON.stringify(entry.when).includes('{{')) continue
    if (!matches(entry.when as Condition, context)) out.add(entry.key)
  }
  return out
}
