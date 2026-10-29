import {
  resolveTemplate,
  type Sheet,
  type SheetText,
  type TemplateDef,
} from '@open-tabletop/character-engine'
import { sheetText, idName, roster } from '@open-tabletop/character-ui'
import { overlayTexts } from '@open-tabletop/pack-ui'
import { manifestOf } from '@open-tabletop/pack-ui/packs'
import { readDefinition, setIn, type Path } from '@open-tabletop/pack-ui/yaml'
import { OracleError } from '@open-tabletop/oracle-engine'
import {
  characterId,
  deleteFromRoster,
  keepInRoster,
  partyOf,
  templateCopy,
  type RosterEntry,
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
  /** Its tags, with those of the template it's a variant of. */
  tags: string[]
  /** The sheet it's made with (`pack/id`, absent when not found) and that sheet. */
  sheetId?: string
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
      tags: resolveTemplate(b.def, id)?.tags ?? def.tags ?? [],
      sheetId: b.sheets[id],
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

/** A template's texts players read, edited in the UI's language (`TemplateEditor` gives them as one string). */
const TEXTS = ['name', 'description'] as const

/**
 * Writes a template into its bestiary's file; false if it can't. A new one (no `before`) is
 * written whole; a changed one only where it changed, its texts in the language being edited
 * (the definition for the pack's base language, else its translation file), as Systems does.
 */
export function saveTemplate(
  bestiary: string,
  id: string,
  def: TemplateDef,
  before?: TemplateDef,
  locale = 'en',
): boolean {
  const source = bestiarySource(bestiary)
  if (!source || !library.isEditable(source.root)) return false
  const selector = `@bestiary/${source.id}`
  const read = () => library.readFile(source.root, source.path) ?? ''
  const write = (at: Path, value: unknown) =>
    library.writeFile(source.root, source.path, setIn(read(), selector, at, value), true)
  if (!before) {
    write(['templates', id], def)
    return true
  }
  const pack = library.pack(source.root)
  const texts = overlayTexts({
    library,
    locale: () => locale,
    root: () => source.root,
    base: () => (pack && manifestOf(pack).locale) ?? 'en',
    file: () => source.path,
    key: () => selector.slice(1),
    edit: (_kind, at, value) => write(at, value),
  })
  const next = def as Record<string, unknown>
  const prev = before as Record<string, unknown>
  for (const key of new Set([...Object.keys(next), ...Object.keys(prev)])) {
    const at = ['templates', id, key]
    if (JSON.stringify(next[key]) === JSON.stringify(prev[key])) continue
    if ((TEXTS as readonly string[]).includes(key)) {
      const typed = typeof next[key] === 'string' ? next[key] : ''
      if (typed === (sheetText(prev[key] as SheetText | undefined, locale) ?? '')) continue
      const raw = (readDefinition(read(), selector)?.templates as Record<string, TemplateDef>)?.[
        id
      ]?.[key as (typeof TEXTS)[number]]
      texts.setText('', at, raw, at, typed)
    } else write(at, next[key])
  }
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
 * Makes `count` copies of a template as characters of the roster, each with rolls of its
 * own: named by the template's `names` when it has some, else after the template (numbered
 * when several); their ids.
 */
export function makeCopies(
  system: TravelSystem,
  entry: Pick<TemplateEntry, 'bestiary' | 'id' | 'name'>,
  count: number,
  locale = 'en',
): string[] {
  const rules = partyOf(system)
  const ids: string[] = []
  const stamp = crypto.randomUUID()
  for (let n = 1; n <= count; n++) {
    const label =
      rolledName(system, entry, locale) ?? (count > 1 ? `${entry.name} ${n}` : entry.name)
    const id = characterId(label, [...roster.roster.characters.map((e) => e.character.id), ...ids])
    const copy = templateCopy(rules, entry.id, { id, name: label }, `${stamp}|${n}`)
    if (!copy) continue
    roster.set(keepInRoster(roster.roster, copy, new Date().toISOString()).roster)
    ids.push(id)
  }
  return ids
}

/**
 * A name rolled on what a template's `names` says (a table or a generator); undefined when
 * it says nothing, or what it names can't be rolled.
 */
function rolledName(
  system: TravelSystem,
  entry: Pick<TemplateEntry, 'bestiary' | 'id'>,
  locale: string,
): string | undefined {
  const ref = system.bestiary?.find((b) => b.id === entry.bestiary)?.names[entry.id]
  if (!ref) return undefined
  try {
    return library.engine.resolve(ref, {}, undefined, { locale }).resolution.text || undefined
  } catch (error) {
    if (error instanceof OracleError) return undefined
    throw error
  }
}

/** The roster's characters made from a template. */
export function copiesOf(entry: Pick<TemplateEntry, 'bestiary' | 'id'>): RosterEntry[] {
  return roster.roster.characters.filter(
    (e) => e.character.template?.id === entry.id && e.character.template.from === entry.bestiary,
  )
}

/** Deletes from the roster every character made from a template (trips keep their copies, unlinked). */
export function deleteCopies(entry: Pick<TemplateEntry, 'bestiary' | 'id'>): number {
  const gone = copiesOf(entry)
  let next = roster.roster
  for (const e of gone) next = deleteFromRoster(next, e.character.id)
  roster.set(next)
  return gone.length
}

/** The bestiaries of a system in packs of the user's, where new templates can go. */
export function ownBestiaries(system: TravelSystem): string[] {
  return (system.bestiary ?? []).map((b) => b.id).filter(canEdit)
}

/** Adds a template named `name` to a bestiary of the user's; its id, or undefined if it can't. */
export function addTemplate(
  system: TravelSystem,
  bestiary: string,
  name: string,
): string | undefined {
  const b = system.bestiary?.find((x) => x.id === bestiary)
  if (!b) return undefined
  const id = freeTemplateId(Object.keys(b.def.templates), characterId(name, []) || 'creature')
  return saveTemplate(bestiary, id, { name }) ? id : undefined
}
