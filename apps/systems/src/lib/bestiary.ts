import type { TemplateDef } from '@open-tabletop/character-engine'
import type { SystemBestiary, TravelSystem } from '@open-tabletop/session'
import { library } from './packs.svelte'
import type { RowsDoc } from './partDoc.svelte'

/** A template's texts players read: edited in the language being edited, as one string. */
const TEXTS = ['name', 'description'] as const

/** The bestiary of a system that one definition of its Bestiary tab is (its pack's folder and id). */
export function bestiaryOf(
  system: TravelSystem,
  part: { root: string; id: string },
): SystemBestiary | undefined {
  return system.bestiary?.find((b) => {
    const [pack, id] = b.id.split('/', 2)
    return id === part.id && library.rootOf(pack) === part.root
  })
}

/**
 * A template as `TemplateEditor` edits it: as written, its texts in the language being
 * edited (a translation's, when translating).
 */
export function shownTemplate(doc: RowsDoc, id: string, raw: TemplateDef): TemplateDef {
  const out: Record<string, unknown> = { ...raw }
  for (const key of TEXTS) {
    const text = doc.text('', raw[key], ['templates', id, key])
    if (text) out[key] = text
    else delete out[key]
  }
  return out as TemplateDef
}

/**
 * Writes what changed between a template as it was shown and as `TemplateEditor` gives it
 * back: only the keys that changed, its texts where the language being edited keeps them
 * (the definition for the pack's base language, else its translation file).
 */
export function writeTemplate(
  doc: RowsDoc,
  id: string,
  raw: TemplateDef,
  before: TemplateDef,
  next: TemplateDef,
): void {
  const now = next as Record<string, unknown>
  const was = before as Record<string, unknown>
  for (const key of new Set([...Object.keys(now), ...Object.keys(was)])) {
    if (JSON.stringify(now[key]) === JSON.stringify(was[key])) continue
    const at = ['templates', id, key]
    if ((TEXTS as readonly string[]).includes(key))
      doc.setText('', at, raw[key as (typeof TEXTS)[number]], at, String(now[key] ?? ''))
    else doc.edit('', at, now[key])
  }
}
