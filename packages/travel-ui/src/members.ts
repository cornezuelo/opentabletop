import type { CharacterState } from '@open-tabletop/character-engine'
import { knownName, sheetText } from '@open-tabletop/character-ui'
import { localize, MEMBER_PATH, type TravelSystem } from '@open-tabletop/session'
import type { Translate } from './i18n'

/** A member's name: the one given, or its id. */
export const memberLabel = (member: CharacterState): string => member.name || member.id

/**
 * A member's value or condition in words, for the journal and tooltips:
 * `characters.kael.values.health` → "Kael: Health", `party.members.…` → "Everyone: …",
 * `acting.…` → "Whoever acts: …". Undefined for any other path, and for every path while
 * the party has no characters.
 */
export function memberNamer(
  system: TravelSystem,
  members: CharacterState[] | undefined,
  locale: string,
  t: Translate,
): (path: string) => string | undefined {
  return (path) => {
    // A party without characters: nothing happens to them, nothing is told.
    if (!members?.length) return undefined
    const [, who, part, id] = MEMBER_PATH.exec(path) ?? []
    if (!who) return undefined
    const sheet = system.sheet?.def
    const own = part === 'values' ? sheet?.values[id] : sheet?.conditions[id]
    const what = sheetText(own?.name, locale) ?? knownName(id, locale)
    const memberId = who.startsWith('characters.') ? who.slice('characters.'.length) : undefined
    const member = members?.find((m) => m.id === memberId)
    const name =
      who === 'party.members'
        ? t('members.everyone')
        : who === 'acting'
          ? t('members.whoActs')
          : who.startsWith('roles.')
            ? (localize(system.bindings?.roles?.[who.slice(6)]?.name, locale, system.locale) ??
              who.slice(6))
            : member
              ? memberLabel(member)
              : (memberId ?? who)
    return `${name}: ${what}`
  }
}

/** An id for a new member, from its name (`Old Mara` → `old-mara`), not taken yet. */
export function memberId(name: string, taken: string[]): string {
  const base =
    name
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'character'
  let id = base
  for (let n = 2; taken.includes(id); n++) id = `${base}-${n}`
  return id
}
