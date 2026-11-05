import { PACK_FORMAT, type Registry } from '@open-tabletop/oracle-engine'
import { mapStyles } from '@open-tabletop/map'
import { localize } from '@open-tabletop/session'
import { stringify } from 'yaml'
import type { DefinitionSource } from './definitionDoc.svelte'
import { translator } from './i18n'
import { MANIFEST_FILE, manifestOf, type PackSource, type WorkspacePack } from './packs'
import { appendDefinition, definitionIds, freeId, readDefinition, setOverlayText } from './yaml'

/** What `copyStyle` and `styleSource` need of a `PackLibrary`. */
export interface StyleLibrary {
  registry: Pick<Registry, 'extras'>
  pack(root: string): WorkspacePack | undefined
  rootOf(packId: string): string | undefined
  readFile(root: string, path: string): string | undefined
  writeFile(root: string, path: string, content: string): void
  addPack(pack: PackSource): void
  isEditable(root: string): boolean
  batch(changes: () => void): void
}

/** The user's pack copies of styles are made in, made with the first one. */
export const MY_STYLES = 'my-styles'
/** The file of that pack the copies are written in. */
export const MY_STYLES_FILE = 'styles.yaml'

/** Where a style of the loaded packs (`core/parchment`) is written, if it's loaded. */
export function styleSource(library: StyleLibrary, ref: string): DefinitionSource | null {
  const cut = ref.indexOf('/')
  if (cut < 0) return null
  const pack = ref.slice(0, cut)
  const id = ref.slice(cut + 1)
  const root = library.rootOf(pack)
  const extra = library.registry.extras
    .get(pack)
    ?.find((e) => e.kind === 'style' && (e.id ?? 'default') === id)
  if (!root || !extra?.file.startsWith(`${root}/`)) return null
  return { root, path: extra.file.slice(root.length + 1), kind: 'style', id }
}

/**
 * A copy of a style as a new style of the user's, in their own styles' pack (`my-styles`,
 * made when missing, its texts in `locale`): every setting of the original, named after it
 * ("Parchment (copy)"), no description. Returns the copy's full id (`my-styles/parchment-copy`).
 */
export function copyStyle(library: StyleLibrary, ref: string, locale: string): string | null {
  const source = styleSource(library, ref)
  if (!source) return null
  const data = readDefinition(
    library.readFile(source.root, source.path) ?? '',
    `@style/${source.id}`,
  )
  if (!data) return null
  const t = translator(() => locale)
  const named = mapStyles(library.registry).styles.find((s) => s.ref === ref)?.style.name
  const o = {
    locale,
    name: t('style.copyName', { name: localize(named, locale, 'en') || source.id }),
    packName: t('style.packName'),
  }
  const root = library.rootOf(MY_STYLES)
  if (root && !library.isEditable(root)) return null
  const taken = new Set(
    (library.registry.extras.get(MY_STYLES) ?? [])
      .filter((e) => e.kind === 'style')
      .map((e) => e.id ?? 'default'),
  )
  const content = (root && library.readFile(root, MY_STYLES_FILE)) || ''
  const id = freeId(`${source.id}-copy`, [...taken, ...definitionIds(content)])
  // The copy's own id and name; the original's description is about the original.
  const settings = Object.fromEntries(
    Object.entries(data).filter(([key]) => !['kind', 'id', 'name', 'description'].includes(key)),
  )
  const copy = stringify({ kind: 'style', id, name: o.name, ...settings })
  if (!root) {
    // The pack is made with the copy in it: one step to undo.
    library.addPack({
      root: MY_STYLES,
      origin: 'user',
      files: [
        {
          path: MANIFEST_FILE,
          content: stringify({
            id: MY_STYLES,
            name: o.packName,
            version: '0.1.0',
            format: PACK_FORMAT,
            locale: o.locale,
            license: 'CC-BY-4.0',
          }),
        },
        { path: MY_STYLES_FILE, content: copy },
      ],
    })
    return `${MY_STYLES}/${id}`
  }
  library.batch(() => {
    library.writeFile(
      root,
      MY_STYLES_FILE,
      appendDefinition(content, { kind: 'style', id, name: o.name, ...settings }),
    )
    // Its name is in the pack's language; in another, it's a translation too.
    const pack = library.pack(root)
    if (pack && manifestOf(pack).locale !== o.locale) {
      const overlay = `locales/${o.locale}/${MY_STYLES_FILE}`
      library.writeFile(
        root,
        overlay,
        setOverlayText(library.readFile(root, overlay) ?? '', [`style/${id}`, 'name'], o.name),
      )
    }
  })
  return `${MY_STYLES}/${id}`
}
