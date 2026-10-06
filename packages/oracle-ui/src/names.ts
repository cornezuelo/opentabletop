import type { Compiled, CompiledEntry, Registry } from '@open-tabletop/oracle-engine'

/**
 * Pack texts in the UI language when the pack has a translation overlay for it,
 * otherwise in the pack's base locale.
 */
export function packTexts(registry: () => Registry, locale: () => string) {
  const overlay = (id: string) => registry().overlays.get(locale())?.get(id)
  const displayName = (def: Compiled | undefined, fallback = ''): string =>
    def ? (overlay(def.id)?.name ?? def.name ?? def.localId) : fallback
  return {
    displayName,
    displayDescription: (def: Compiled): string | undefined =>
      overlay(def.id)?.description ?? def.description,
    entryText: (def: Compiled, entry: CompiledEntry): string | undefined =>
      overlay(def.id)?.entries?.[entry.key] ?? entry.result,
    /** Display name of a definition by id (the id itself if it doesn't exist). */
    nameOf: (id: string): string => displayName(registry().definitions.get(id), id),
  }
}

export type PackTexts = ReturnType<typeof packTexts>

export const KIND_ORDER: Compiled['kind'][] = ['table', 'oracle', 'generator', 'deck']
