import type { Compiled } from '@open-tabletop/oracle-engine'
import { getOverlayText, readDefinition, setIn, setOverlayText } from '@open-tabletop/pack-ui/yaml'
import { manifestOf, overlayLocales, overlayPath } from './workspace'
import { workspace } from './workspace.svelte'

export type Path = (string | number)[]

/**
 * A definition being edited in a form: its raw YAML (as written), structured edits that
 * keep the rest of the file, and the translation overlay for the chosen language.
 */
export function definitionDoc(source: () => { def: Compiled; root: string }) {
  const def = $derived(source().def)
  const root = $derived(source().root)
  const file = $derived(def.file.slice(root.length + 1))
  const content = $derived(workspace.readFile(root, file) ?? '')
  const raw = $derived(readDefinition(content, def.localId) ?? {})
  const pack = $derived(workspace.pack(root))
  const baseLocale = $derived((pack && manifestOf(pack).locale) ?? 'en')
  const locales = $derived(pack ? overlayLocales(pack).filter((l) => l !== baseLocale) : [])
  let language = $state('')
  const translating = $derived(language !== '' && language !== baseLocale)
  const overlayFile = $derived(overlayPath(language, file))
  const overlay = $derived(translating ? workspace.readFile(root, overlayFile) : undefined)
  /** Tables and generators a reference can point at: this pack's first, by local id. */
  const targets = $derived(
    [...workspace.registry.definitions.values()]
      .filter((d) => d.kind === 'table' || d.kind === 'generator')
      .sort((a, b) => Number(a.pack !== def.pack) - Number(b.pack !== def.pack))
      .map((d) => ({ kind: d.kind, ref: d.pack === def.pack ? d.localId : d.id })),
  )

  const save = (text: string) => workspace.writeFile(root, file, text)

  return {
    get def() {
      return def
    },
    get root() {
      return root
    },
    get file() {
      return file
    },
    get content() {
      return content
    },
    get raw() {
      return raw
    },
    get baseLocale() {
      return baseLocale
    },
    /** Translation languages of the pack (besides the base one). */
    get locales() {
      return locales
    },
    get language() {
      return language
    },
    set language(value: string) {
      language = value
    },
    get translating() {
      return translating
    },
    get targets() {
      return targets
    },
    save,
    /** Sets (or, with undefined/'', deletes) a value inside the definition. */
    edit(path: Path, value: unknown) {
      save(setIn(content, def.localId, path, value))
    },
    /** A translated text (`name`, `entries.<id>`…) in the chosen language. */
    overlayText(path: string[]): string {
      return getOverlayText(overlay, [def.localId, ...path])
    },
    translate(path: string[], text: string) {
      workspace.writeFile(
        root,
        overlayFile,
        setOverlayText(overlay ?? '', [def.localId, ...path], text),
      )
    },
  }
}

export type DefinitionDoc = ReturnType<typeof definitionDoc>

/** Reads a nested value of a raw definition. */
export function getAt(raw: unknown, path: Path): unknown {
  let node = raw
  for (const part of path) node = (node as Record<string | number, unknown> | undefined)?.[part]
  return node
}

/** A free id like r1, r2… not in `used`. */
export function nextId(used: Iterable<string | undefined>, prefix = 'r', start = 1): string {
  const taken = [...used]
  let n = start
  while (taken.includes(`${prefix}${n}`)) n++
  return `${prefix}${n}`
}
