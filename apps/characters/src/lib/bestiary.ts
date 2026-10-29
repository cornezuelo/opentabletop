import type { Sheet, TemplateDef } from '@open-tabletop/character-engine'
import { sheetText, idName, roster } from '@open-tabletop/character-ui'
import { readDefinition, setIn } from '@open-tabletop/pack-ui/yaml'
import {
  characterId,
  keepInRoster,
  partyOf,
  templateCopy,
  type TravelSystem,
} from '@open-tabletop/session'
import { library } from './packs.svelte'

/** A template of a system's bestiary, with where it is written and the sheet it is made with. */
export interface TemplateEntry {
  /** The bestiary's full id (`pack/id`) and the template's id in it. */
  bestiary: string
  id: string
  def: TemplateDef
  name: string
  sheet?: Sheet
  /** The other templates of its bestiary, for **Variant of**. */
  others: string[]
}

/** The templates of a system's bestiaries, in the order it lists them. */
export function templatesOf(system: TravelSystem, locale: string): TemplateEntry[] {
  return (system.bestiary ?? []).flatMap((b) =>
    Object.entries(b.def.templates).map(([id, def]) => ({
      bestiary: b.id,
      id,
      def,
      name: sheetText(def.name, locale) ?? idName(id),
      sheet: system.templateSheets?.[b.sheets[id] ?? ''],
      others: Object.keys(b.def.templates).filter((x) => x !== id),
    })),
  )
}

/** The pack folder and file a bestiary (`pack/id`) is written in, if it is a file of a pack. */
export function bestiarySource(
  bestiary: string,
): { root: string; path: string; id: string } | null {
  const [pack, id] = bestiary.split('/', 2)
  const root = library.rootOf(pack)
  const extra = (library.registry.extras.get(pack) ?? []).find(
    (e) => e.kind === 'bestiary' && (e.id ?? 'default') === id,
  )
  if (!root || !extra || !extra.file.startsWith(`${root}/`)) return null
  return { root, path: extra.file.slice(root.length + 1), id }
}

/** Whether the pack a bestiary is written in is the user's, so its templates can change. */
export function canEdit(bestiary: string): boolean {
  const source = bestiarySource(bestiary)
  return !!source && library.isEditable(source.root)
}

/** Writes a template (a new one or a changed one) into its bestiary's file; false if it can't. */
export function saveTemplate(bestiary: string, id: string, def: TemplateDef): boolean {
  const source = bestiarySource(bestiary)
  if (!source || !library.isEditable(source.root)) return false
  const text = library.readFile(source.root, source.path) ?? ''
  library.writeFile(
    source.root,
    source.path,
    setIn(text, `@bestiary/${source.id}`, ['templates', id], def),
    true,
  )
  return true
}

/** Takes a template out of its bestiary's file. */
export function deleteTemplate(bestiary: string, id: string): boolean {
  const source = bestiarySource(bestiary)
  if (!source || !library.isEditable(source.root)) return false
  const text = library.readFile(source.root, source.path) ?? ''
  const current = readDefinition(text, `@bestiary/${source.id}`)
  if (!current) return false
  library.writeFile(
    source.root,
    source.path,
    setIn(text, `@bestiary/${source.id}`, ['templates', id], undefined),
  )
  return true
}

/** The first id of `base` the bestiary's templates don't have. */
export function freeTemplateId(taken: readonly string[], base: string): string {
  if (!taken.includes(base)) return base
  let n = 2
  while (taken.includes(`${base}-${n}`)) n++
  return `${base}-${n}`
}

/**
 * Makes `count` copies of a template as characters of the roster, each with the rolls of its
 * own, named after the template and numbered; their ids.
 */
export function makeCopies(
  system: TravelSystem,
  template: string,
  name: string,
  count: number,
): string[] {
  const rules = partyOf(system)
  const ids: string[] = []
  const stamp = crypto.randomUUID()
  for (let n = 1; n <= count; n++) {
    const label = count > 1 ? `${name} ${n}` : name
    const id = characterId(label, [...roster.roster.characters.map((e) => e.character.id), ...ids])
    const copy = templateCopy(rules, template, { id, name: label }, `${stamp}|${n}`)
    if (!copy) continue
    roster.set(keepInRoster(roster.roster, copy, new Date().toISOString()).roster)
    ids.push(id)
  }
  return ids
}
