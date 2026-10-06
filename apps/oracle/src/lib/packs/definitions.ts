import type { Compiled } from '@open-tabletop/oracle-engine'
import {
  appendDefinition,
  definitionIds,
  freeId,
  readDefinition,
  removeDefinition,
} from '@open-tabletop/pack-ui/yaml'
import { Document, parseDocument } from 'yaml'
import { TEMPLATES } from './templates'
import { manifestOf, overlayLocales, overlayPath, type PackSource } from './workspace'
import { workspace } from './workspace.svelte'

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
  root: string,
  kind: Compiled['kind'],
  name: string,
  file?: string,
): string | null {
  const pack = workspace.pack(root)
  const packId = pack && manifestOf(pack).id
  if (!pack || !packId) return null
  const id = freeId(slugify(name), idsOf(pack))
  const target = file || dataFiles(pack)[0] || 'tables.yaml'
  const definition = { ...TEMPLATES[kind](id), name: name.trim() || id }
  workspace.writeFile(
    root,
    target,
    appendDefinition(workspace.readFile(root, target) ?? '', definition),
  )
  return `${packId}/${id}`
}

const REF_KEYS = ['table', 'generator'] as const

/**
 * References written as local ids ("weather") made absolute ("kal-arath/weather"), so a
 * definition copied into another pack keeps pointing at the same tables.
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
        !value.includes('/')
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
export function copyDefinition(def: Compiled, toRoot: string): string | null {
  const fromRoot = def.file.split('/')[0]
  const file = def.file.slice(fromRoot.length + 1)
  const source = workspace.pack(fromRoot)
  const target = workspace.pack(toRoot)
  const targetId = target && manifestOf(target).id
  const raw = readDefinition(workspace.readFile(fromRoot, file) ?? '', def.localId)
  if (!source || !target || !targetId || !raw) return null
  const samePack = fromRoot === toRoot
  const id = freeId(samePack ? `${def.localId}-copy` : def.localId, idsOf(target))
  const copy = samePack ? { ...raw } : qualifyRefs(raw, def.pack)
  copy.id = id
  if (samePack) copy.name = `${String(raw.name ?? def.localId)} (copy)`
  workspace.writeFile(toRoot, file, appendDefinition(workspace.readFile(toRoot, file) ?? '', copy))
  // Translations travel with it, under the new id.
  for (const locale of overlayLocales(source)) {
    const texts = readOverlay(workspace.readFile(fromRoot, overlayPath(locale, file)), def.localId)
    if (!texts) continue
    const path = overlayPath(locale, file)
    const existing = workspace.readFile(toRoot, path) ?? ''
    const doc = existing.trim() ? parseDocument(existing) : new Document({})
    doc.setIn([id], texts)
    workspace.writeFile(toRoot, path, doc.toString())
  }
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
export function deleteDefinition(def: Compiled): void {
  const root = def.file.split('/')[0]
  const file = def.file.slice(root.length + 1)
  const pack = workspace.pack(root)
  if (!pack) return
  workspace.writeFile(
    root,
    file,
    removeDefinition(workspace.readFile(root, file) ?? '', def.localId),
  )
  for (const locale of overlayLocales(pack)) {
    const path = overlayPath(locale, file)
    const content = workspace.readFile(root, path)
    if (!content?.trim()) continue
    const doc = parseDocument(content)
    if (!doc.has(def.localId)) continue
    doc.delete(def.localId)
    workspace.writeFile(root, path, doc.toString())
  }
}
