import {
  characterId,
  deleteFromRoster,
  duplicateInRoster,
  keepInRoster,
  newMember,
  partyOf,
  rosterEntry,
  rosterFromOtd,
  rosterToOtd,
  type RosterEntry,
  type TravelSystem,
} from '@open-tabletop/session'
import { roster } from '@open-tabletop/character-ui'
import { validateBundle } from '@open-tabletop/schema'

const now = () => new Date().toISOString()

/** A new character of a system's characters' sheet, in the roster; its id. */
export function createCharacter(system: TravelSystem, name: string): string {
  const id = characterId(
    name,
    roster.roster.characters.map((e) => e.character.id),
  )
  const character = newMember(partyOf(system), { id, ...(name && { name }) })
  roster.set(keepInRoster(roster.roster, character, now()).roster)
  return id
}

/** A copy of a character, in the roster only; its id. */
export function duplicateCharacter(id: string, name: string): string {
  const copy = duplicateInRoster(roster.roster, id, name, now())
  roster.set(copy.roster)
  return copy.id
}

export function deleteCharacter(id: string): void {
  roster.set(deleteFromRoster(roster.roster, id))
}

/** The characters of an OTD file, added to the roster (new ids where taken); their names. */
export function importCharacters(text: string): { names: string[] } | { error: 'broken' } {
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    return { error: 'broken' }
  }
  if (validateBundle(raw).errors.length) return { error: 'broken' }
  let next = roster.roster
  const names: string[] = []
  for (const { character, noteRef } of rosterFromOtd(raw)) {
    const kept = keepInRoster(next, character, now())
    next = kept.roster
    if (noteRef)
      next = {
        characters: next.characters.map((e) =>
          e.character.id === kept.id ? { ...e, noteRef } : e,
        ),
      }
    names.push(character.name || kept.id)
  }
  roster.set(next)
  return { names }
}

/** Downloads characters as an .otd.json file. */
export function exportCharacters(entries: RosterEntry[], name: string): void {
  const json = JSON.stringify(rosterToOtd(entries), null, 2)
  const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }))
  const link = document.createElement('a')
  link.href = url
  link.download = `${name.replace(/[^\p{L}\p{N}]+/gu, '-').toLowerCase() || 'characters'}.otd.json`
  link.click()
  URL.revokeObjectURL(url)
}

export const entryOf = (id: string) => rosterEntry(roster.roster, id)
