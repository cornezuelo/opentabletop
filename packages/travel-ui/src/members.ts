import { partySource, type CharacterState, type PartyFrom } from '@open-tabletop/character-engine'
import { idName, itemName, sheetText } from '@open-tabletop/character-ui'
import {
  characterId,
  factionName,
  localize,
  MEMBER_PATH,
  type TravelSystem,
} from '@open-tabletop/session'
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
  /** The host's facts: factions and clocks are named only where the host has them. */
  world?: Record<string, unknown>,
  /** The party's own character, for its items' names. */
  party?: CharacterState,
): (path: string) => string | undefined {
  return (path) => {
    // The world's: a faction's value ("The Vale: Reputation"), a clock of the world clock.
    const [, faction, facPart, facWhat] =
      /^factions\.([^.]+)\.(values|conditions|territory)\.?(.*)$/.exec(path) ?? []
    if (faction && !world?.factions) return undefined
    if (faction && system.factions) {
      const sheet = system.factions.sheet.def
      const own =
        facPart === 'values'
          ? sheet.values[facWhat]
          : facPart === 'conditions'
            ? sheet.conditions[facWhat]
            : undefined
      const name = factionName(system.factions, faction, locale, system.locale)
      return `${name}: ${facPart === 'territory' ? t('members.land') : (sheetText(own?.name, locale) ?? idName(facWhat))}`
    }
    const [, clock] = /^world\.clocks\.(.+)$/.exec(path) ?? []
    if (clock)
      return world?.clocks ? t('members.clock', { name: clock.replaceAll('-', ' ') }) : undefined
    const [, who, part, id] = MEMBER_PATH.exec(path) ?? []
    // The party's own sheet: its value or condition, by its name ("Renown").
    if (who === 'party') {
      // Its items, its own and its members' together ("Rations", "Torch · Uses").
      if (part === 'items') {
        const [item, field] = id.split('.', 2)
        const own = [
          ...(party?.items ?? []),
          ...(members ?? []).flatMap((m) => m.items ?? []),
        ].find((i) => i.id === item)
        const name = itemName(own ?? { id: item }, system.items ?? [], locale)
        const fields = system.sheet?.def.items?.fields ?? system.partySheet?.def.items?.fields
        return field === undefined
          ? name
          : `${name} · ${sheetText(fields?.[field]?.name, locale) ?? idName(field)}`
      }
      const sheet = system.partySheet?.def
      if (!sheet) return undefined
      const own = part === 'values' ? sheet.values[id] : sheet.conditions[id]
      return sheetText(own?.name, locale) ?? idName(id)
    }
    // A party without characters: nothing happens to them, nothing is told.
    if (!members?.length) return undefined
    if (!who) return undefined
    const sheet = system.sheet?.def
    const memberId = who.startsWith('characters.') ? who.slice('characters.'.length) : undefined
    const member = members?.find((m) => m.id === memberId)
    let what: string
    if (part === 'items') {
      // An item ("Kael: Torch"), or one of its fields ("Kael: Torch · Uses").
      const [item, field] = id.split('.', 2)
      const own = (member ? [member] : members)
        .flatMap((m) => m.items ?? [])
        .find((i) => i.id === item)
      const name = itemName(own ?? { id: item }, system.items ?? [], locale)
      what =
        field === undefined
          ? name
          : `${name} · ${sheetText(sheet?.items?.fields?.[field]?.name, locale) ?? idName(field)}`
    } else {
      const own = part === 'values' ? sheet?.values[id] : sheet?.conditions[id]
      what = sheetText(own?.name, locale) ?? idName(id)
    }
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
export const memberId = (name: string, taken: string[]): string => characterId(name, taken)

/**
 * Where a party stat made of the characters' values comes from, in words: "Kael's
 * Pathfinding, the highest", "Health added up: Kael, Mara". Undefined for a stat that isn't
 * made of them (a plain number, the party sheet's value) or while there are none.
 */
export function statSource(
  from: PartyFrom | undefined,
  system: TravelSystem,
  members: CharacterState[] | undefined,
  rolls: string | undefined,
  locale: string,
  t: Translate,
): string | undefined {
  if (!from || from.party !== undefined || !members?.length) return undefined
  const source = partySource(members, from, rolls)
  const names = source.members.map((id) => {
    const member = members.find((m) => m.id === id)
    return member ? memberLabel(member) : id
  })
  if (!names.length) return t('partySheet.nobody')
  const list = names.join(', ')
  if (from.count) return t('partySheet.count', { list })
  const id = from.max ?? from.min ?? from.sum ?? from.pick ?? ''
  const value = sheetText(system.sheet?.def.values[id]?.name, locale) ?? idName(id)
  if (from.sum !== undefined) return t('partySheet.sum', { value, list })
  const who = names[0]
  if (source.chosen) return t('partySheet.chosen', { value, who })
  return t(from.min !== undefined ? 'partySheet.lowest' : 'partySheet.highest', { value, who })
}
