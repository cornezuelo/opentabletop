import { resolveTemplate, type CharacterState, type Sheet } from '@open-tabletop/character-engine'
import { sheetText } from '@open-tabletop/character-ui'
import { localize, type Present, type TravelSystem } from '@open-tabletop/session'

/** A template a trip can make copies of, with its name in the UI's language. */
export interface TemplateChoice {
  id: string
  name: string
  /** The bestiary's name, for grouping a long list. */
  bestiary: string
}

/** Every template of the system's bestiaries (and those its campaign adds), in their order. */
export function templateChoices(system: TravelSystem, locale: string): TemplateChoice[] {
  const seen = new Set<string>()
  return (system.bestiary ?? []).flatMap((b) => {
    const bestiary = localize(b.def.name, locale, system.locale) ?? b.id
    return Object.keys(b.def.templates).flatMap((id) => {
      // A template another bestiary already has is made from the first (as effects make it).
      if (seen.has(id) || !b.sheets[id]) return []
      seen.add(id)
      const template = resolveTemplate(b.def, id)
      const name = localize(template?.name, locale, system.locale) ?? id.replaceAll('-', ' ')
      return [{ id, name, bestiary }]
    })
  })
}

/** A template's name in words, its id made readable when the system has none. */
export const templateName = (choices: TemplateChoice[], id: string): string =>
  choices.find((c) => c.id === id)?.name ?? id.replaceAll('-', ' ')

/**
 * A copy in one line: the first values its sheet shows (`Health 5 · Harm 2 · Morale 7`),
 * then its conditions by name.
 */
export function copyLine(
  character: CharacterState,
  sheet: Sheet | undefined,
  locale: string,
  values = 3,
): string {
  if (!sheet) return ''
  const shown = Object.entries(sheet.values)
    .slice(0, values)
    .map(
      ([id, v]) =>
        `${sheetText(v.name, locale) ?? id.replaceAll('-', ' ')} ${character.values[id] ?? 0}`,
    )
  const conditions = Object.keys(character.conditions).map(
    (id) => sheetText(sheet.conditions[id]?.name, locale) ?? id.replaceAll('-', ' '),
  )
  return [...shown, ...conditions].join(' · ')
}

/** Copies grouped by template, in the order the first of each came. */
export function byTemplate(present: Present[]): { template: string; copies: Present[] }[] {
  const groups = new Map<string, Present[]>()
  for (const p of present) {
    const id = p.character.template?.id ?? p.character.id
    groups.set(id, [...(groups.get(id) ?? []), p])
  }
  return [...groups].map(([template, copies]) => ({ template, copies }))
}
