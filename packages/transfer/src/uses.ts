import { characterIdOf, isRecord, type Kept } from './kept'
import type { ItemKind } from './items'

/**
 * One place that uses an image of the library (docs/character-pictures.md §8, **Used by**):
 * - a kept thing (a map, a campaign, a trip, a roster character or party) whose data names it,
 *   `part` being what inside it does (a member of a trip, an item a character holds, a token's
 *   sheet on a map) when that isn't the thing itself; a map also by carrying it among its
 *   images (its icons and terrain symbols);
 * - `definition`: a pack's definition you gave it to (an item of a catalogue, a bestiary's
 *   template), `definition` being its kind as referred to (`items`, `templates`), `name` its id
 *   and `part` where it is (`core/gear`).
 */
export interface ImageUse {
  kind: ItemKind | 'definition'
  name: string
  part?: string
  definition?: string
}

const parse = (text: string): unknown => {
  try {
    return JSON.parse(text)
  } catch {
    return undefined
  }
}

/**
 * Where each image of the library is used, by image id, among what this browser keeps and the
 * pictures chosen for definitions (`opentabletop.definitionPictures`, by reference). An image
 * nothing uses has no entry.
 */
export function imageUses(
  kept: Kept,
  definitionPictures: Record<string, string> = {},
): Record<string, ImageUse[]> {
  const uses: Record<string, ImageUse[]> = {}
  const add = (id: string, use: ImageUse) => {
    const list = (uses[id] ??= [])
    if (!list.some((u) => u.kind === use.kind && u.name === use.name && u.part === use.part))
      list.push(use)
  }
  /**
   * Every `picture` under `value`, each said of the nearest record with a name that holds it
   * (a character, a party, an item); a map's own images (`{ id, dataUrl }`) are the map's.
   */
  const walk = (value: unknown, kind: ItemKind, name: string, part?: string): void => {
    if (Array.isArray(value)) {
      for (const v of value) walk(v, kind, name, part)
      return
    }
    if (!isRecord(value)) return
    const named = typeof value.name === 'string' && value.name ? value.name : part
    if (kind === 'map' && typeof value.id === 'string' && typeof value.dataUrl === 'string')
      add(value.id, { kind, name })
    for (const [key, v] of Object.entries(value))
      if (key === 'picture' && typeof v === 'string' && v)
        add(v, { kind, name, ...(named && named !== name && { part: named }) })
      else walk(v, kind, name, named)
  }
  for (const m of kept.maps) walk(parse(m.json), 'map', m.name)
  for (const c of kept.campaigns) walk(parse(c.json), 'campaign', c.name)
  for (const t of kept.trips) walk(t, 'trip', typeof t.name === 'string' ? t.name : '')
  for (const e of kept.characters) {
    const character = e.character as Record<string, unknown>
    walk(e, 'character', typeof character.name === 'string' ? character.name : characterIdOf(e)!)
  }
  for (const [ref, id] of Object.entries(definitionPictures)) {
    // `items:core/gear#rope`
    const match = /^([^:]+):(.*)#(.+)$/.exec(ref)
    if (match) add(id, { kind: 'definition', definition: match[1], name: match[3], part: match[2] })
  }
  return uses
}
