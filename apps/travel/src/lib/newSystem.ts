import type { TravelSystem } from '@open-tabletop/session'
import { genericTravelRules } from '@open-tabletop/travel-engine'
import { stringify } from 'yaml'
import { getLocale } from './i18n'
import { library } from './packs.svelte'
import type { DocSource } from './systemDoc.svelte'

/** "My Rules!" → "my-rules" (a pack id). */
export const slugify = (text: string): string =>
  text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'my-system'

/**
 * A new pack of the user's that is a travel system: a `kind: system` naming the generic
 * rules to start from and empty bindings. Returns its id (also its folder), or null if
 * that id is taken.
 */
export function createSystem(name: string): string | null {
  const id = slugify(name)
  if (library.pack(id) || library.rootOf(id)) return null
  const manifest = stringify({
    id,
    name: name.trim() || id,
    version: '0.1.0',
    locale: getLocale(),
    license: 'CC-BY-4.0',
  })
  const system = stringify({
    kind: 'system',
    id: 'default',
    travel: 'default',
    bindings: 'default',
  })
  const rules = stringify({ kind: 'travel-rules', ...genericTravelRules, id: 'default' })
  const bindings = stringify({ kind: 'bindings', id: 'default', on: {}, stats: {} })
  library.addPack({
    root: id,
    origin: 'user',
    files: [
      { path: 'pack.yaml', content: manifest },
      { path: 'system.yaml', content: system },
      { path: 'travel.yaml', content: `${rules}---\n${bindings}` },
    ],
  })
  return id
}

/**
 * Where a system's travel rules (and its bindings, when they're in the same pack) are
 * written, to edit them; null for a system without travel rules of its own (the generic ones).
 */
export function rulesFile(system: TravelSystem): DocSource | null {
  const rules = system.sources?.rules
  const root = rules && library.rootOf(rules.pack)
  if (!rules || !root) return null
  const local = (file: string) => file.slice(root.length + 1)
  const bindings = system.sources?.bindings
  const declared = system.sources?.system
  return {
    root,
    path: local(rules.file),
    rulesId: rules.id,
    ...(bindings &&
      bindings.pack === rules.pack && {
        bindings: { path: local(bindings.file), id: bindings.id },
      }),
    ...(declared &&
      declared.pack === rules.pack && { system: { path: local(declared.file), id: declared.id } }),
  }
}
