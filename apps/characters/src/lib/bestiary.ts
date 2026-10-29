import { resolveTemplate, type Sheet, type TemplateDef } from '@open-tabletop/character-engine'
import { sheetText, idName, roster } from '@open-tabletop/character-ui'
import { appUrl } from '@open-tabletop/ui-kit'
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

/**
 * Where a template is edited: Systems' **Bestiary** tab of its system, unfolded at it (or the
 * tab alone). Templates are definitions of the system, edited there only.
 */
export function templateUrl(system: Pick<TravelSystem, 'id'>, template?: string): string {
  const tab = `${appUrl('systems')}#/system/${encodeURIComponent(system.id)}/bestiary`
  return template ? `${tab}/${encodeURIComponent(template)}` : tab
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
