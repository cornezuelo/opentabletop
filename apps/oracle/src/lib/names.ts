import type { Compiled, CompiledEntry } from '@open-tabletop/oracle-engine'
import { getLocale } from './i18n'
import { workspace } from './packs/workspace.svelte'

/** Overlay texts for the UI language, when the pack has them. */
const overlay = (id: string) => workspace.registry.overlays.get(getLocale())?.get(id)

export function displayName(def: Compiled | undefined, fallback = ''): string {
  if (!def) return fallback
  return overlay(def.id)?.name ?? def.name ?? def.localId
}

export function displayDescription(def: Compiled): string | undefined {
  return overlay(def.id)?.description ?? def.description
}

export function entryText(def: Compiled, entry: CompiledEntry): string | undefined {
  return overlay(def.id)?.entries?.[entry.key] ?? entry.result
}

export const KIND_ORDER: Compiled['kind'][] = ['table', 'oracle', 'generator', 'deck']
