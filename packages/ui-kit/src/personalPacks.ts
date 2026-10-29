/**
 * The packs this build brings whose licence allows only personal use (their folders), as
 * the app's pack library says when it starts: exporting a copy of one warns that the file
 * isn't to be shared.
 */
const roots = new Set<string>()

export function markPersonalPacks(list: Iterable<string>): void {
  for (const root of list) roots.add(root)
}

export const personalPacks = (): ReadonlySet<string> => roots
