import type { Compiled } from '@open-tabletop/oracle-engine'
import { appendDefinition, definitionIds, freeId, readDefinition, removeDefinition } from './yaml'
import { Document, parseDocument } from 'yaml'
import type { PackLibrary } from './library.svelte'
import { overlayLocales, overlayPath } from './packFiles'
import { manifestOf, type PackSource } from './packs'
import { SYSTEM_TEMPLATES, type SystemKind } from './systemTemplates'
import { TEMPLATES } from './templates'

/** "Night encounters!" → "night-encounters" (a valid definition id). */
export function slugify(text: string): string {
  return (
    text
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'new'
  )
}

/** Data files of a pack (not the manifest or translations). */
export const dataFiles = (pack: PackSource): string[] =>
  pack.files
    .map((f) => f.path)
    .filter((p) => p !== 'pack.yaml' && !p.startsWith('locales/') && /\.ya?ml$/.test(p))

/** Local ids already used in a pack. */
function idsOf(pack: PackSource): string[] {
  return pack.files.flatMap((f) => definitionIds(f.content))
}

/** Creates a definition from its template; returns its full id (`pack/id`). */
export function createDefinition(
  library: PackLibrary,
  root: string,
  kind: Compiled['kind'],
  name: string,
  file?: string,
  /** What it holds instead of the template's (a table made from pasted text). */
  body?: Record<string, unknown>,
): string | null {
  const pack = library.pack(root)
  const packId = pack && manifestOf(pack).id
  if (!pack || !packId) return null
  const id = freeId(slugify(name), idsOf(pack))
  const target = file || dataFiles(pack)[0] || 'tables.yaml'
  const definition = body
    ? { kind, id, name: name.trim() || id, ...body }
    : { ...TEMPLATES[kind](id), name: name.trim() || id }
  library.writeFile(
    root,
    target,
    appendDefinition(library.readFile(root, target) ?? '', definition),
  )
  return `${packId}/${id}`
}

/**
 * Adds travel rules or bindings to a pack (a pack is one travel system at most);
 * returns the file they went to, to open it in the YAML editor.
 */
export function createSystemDefinition(
  library: PackLibrary,
  root: string,
  kind: SystemKind,
  file?: string,
): string | null {
  const pack = library.pack(root)
  if (!pack) return null
  const target = file || dataFiles(pack)[0] || 'travel.yaml'
  // One travel system per pack: rules and bindings both use `default` (ids are per kind).
  const id = 'default'
  library.writeFile(
    root,
    target,
    appendDefinition(library.readFile(root, target) ?? '', SYSTEM_TEMPLATES[kind](id)),
  )
  return target
}

/** Whether a pack already has a definition of that kind (only one travel system per pack). */
export function hasKind(pack: PackSource, kind: string): boolean {
  return pack.files.some((f) => new RegExp(`^kind:\\s*${kind}\\s*$`, 'm').test(f.content))
}

const REF_KEYS = ['table', 'generator'] as const

/**
 * References to the pack's own definitions ("table.weather") made to name the pack
 * ("kal-arath/table.weather"), so a definition copied into another pack keeps pointing at
 * the same tables.
 */
export function qualifyRefs(raw: Record<string, unknown>, packId: string): Record<string, unknown> {
  const fix = (node: unknown): unknown => {
    if (Array.isArray(node)) return node.map(fix)
    if (typeof node !== 'object' || node === null) return node
    const out: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(node as Record<string, unknown>))
      out[key] =
        (REF_KEYS as readonly string[]).includes(key) &&
        typeof value === 'string' &&
        !value.includes('/') &&
        !value.startsWith('{{')
          ? `${packId}/${value}`
          : fix(value)
    return out
  }
  return fix(raw) as Record<string, unknown>
}

/**
 * Copies a definition, with its translations, into a user pack (the same one for a
 * duplicate). The copy gets a free id and, in the same pack, "(copy)" in its name.
 * Returns the new full id.
 */
export function copyDefinition(library: PackLibrary, def: Compiled, toRoot: string): string | null {
  const fromRoot = def.file.split('/')[0]
  const file = def.file.slice(fromRoot.length + 1)
  const source = library.pack(fromRoot)
  const target = library.pack(toRoot)
  const targetId = target && manifestOf(target).id
  const raw = readDefinition(library.readFile(fromRoot, file) ?? '', def.localId)
  if (!source || !target || !targetId || !raw) return null
  const samePack = fromRoot === toRoot
  const id = freeId(samePack ? `${def.localId}-copy` : def.localId, idsOf(target))
  const copy = samePack ? { ...raw } : qualifyRefs(raw, def.pack)
  copy.id = id
  if (samePack) copy.name = `${String(raw.name ?? def.localId)} (copy)`
  library.batch(() => {
    library.writeFile(toRoot, file, appendDefinition(library.readFile(toRoot, file) ?? '', copy))
    // Translations travel with it, under the new id.
    for (const locale of overlayLocales(source)) {
      const texts = readOverlay(library.readFile(fromRoot, overlayPath(locale, file)), def.localId)
      if (!texts) continue
      const path = overlayPath(locale, file)
      const existing = library.readFile(toRoot, path) ?? ''
      const doc = existing.trim() ? parseDocument(existing) : new Document({})
      doc.setIn([id], texts)
      library.writeFile(toRoot, path, doc.toString())
    }
  })
  return `${targetId}/${id}`
}

function readOverlay(content: string | undefined, localId: string): unknown {
  if (!content?.trim()) return undefined
  try {
    return (parseDocument(content).toJSON() as Record<string, unknown> | null)?.[localId]
  } catch {
    return undefined
  }
}

/** Deletes a definition and its translations. */
export function deleteDefinition(library: PackLibrary, def: Compiled): void {
  const root = def.file.split('/')[0]
  const file = def.file.slice(root.length + 1)
  const pack = library.pack(root)
  if (!pack) return
  library.batch(() => {
    library.writeFile(root, file, removeDefinition(library.readFile(root, file) ?? '', def.localId))
    for (const locale of overlayLocales(pack)) {
      const path = overlayPath(locale, file)
      const content = library.readFile(root, path)
      if (!content?.trim()) continue
      const doc = parseDocument(content)
      if (!doc.has(def.localId)) continue
      doc.delete(def.localId)
      library.writeFile(root, path, doc.toString())
    }
  })
}
