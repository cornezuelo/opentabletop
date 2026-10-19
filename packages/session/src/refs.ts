import { parseRef } from '@open-tabletop/oracle-engine'

/**
 * The full id (`pack/id`) a pack's reference names from inside `pack`: `table.encounter` is
 * `pack/encounter`, `core/table.twists` is `core/twists`. One that doesn't say its kind is
 * kept as written (where packs are checked, it's reported with what it meant).
 */
export function definitionId(ref: string, pack?: string): string {
  const parsed = parseRef(ref)
  if (!parsed) return ref
  const owner = parsed.pack ?? pack
  return owner ? `${owner}/${parsed.id}` : parsed.id
}
