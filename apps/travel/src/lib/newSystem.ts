import { genericTravelRules } from '@open-tabletop/travel-engine'
import { stringify } from 'yaml'
import { getLocale } from './i18n'
import { library } from './packs.svelte'

/** "My Rules!" → "my-rules" (a pack id). */
export const slugify = (text: string): string =>
  text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'my-system'

/**
 * A new pack of the user's that is a travel system: the generic rules to start from and
 * empty bindings. Returns its id (also its folder), or null if that id is taken.
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
  const rules = stringify({ kind: 'travel-rules', ...genericTravelRules, id: 'default' })
  const bindings = stringify({ kind: 'bindings', id: 'default', on: {}, stats: {} })
  library.addPack({
    root: id,
    origin: 'user',
    files: [
      { path: 'pack.yaml', content: manifest },
      { path: 'travel.yaml', content: `${rules}---\n${bindings}` },
    ],
  })
  return id
}

/** The pack file holding a system's travel rules (and usually its bindings). */
export function rulesFile(packId: string): { root: string; path: string } | null {
  const root = library.rootOf(packId)
  const extra = library.registry.extras.get(packId)?.find((e) => e.kind === 'travel-rules')
  if (!root || !extra) return null
  return { root, path: extra.file.slice(root.length + 1) }
}
