import type { CharacterState } from '@open-tabletop/character-engine'
import { roster } from '@open-tabletop/character-ui'
import {
  partyOf,
  playingAt,
  pullFromRoster,
  pullMembers,
  samePlace,
  settlePlace,
  type Roster,
  type RosterPlace,
} from '@open-tabletop/session'
import { t } from '../i18n/index.svelte'
import type { HexMap, MapToken } from '@open-tabletop/map'
import { editor } from '../store/editor.svelte'
import { sessionOf } from './play'
import { getSystem } from './systems'

/**
 * The map's characters and the roster (the Characters app): the party's members are the
 * map's place, and each token with a sheet one of its own. What the map does to a linked
 * character is written back to the roster after every change; what the roster changed (the
 * Characters app, another tab) reaches the map when it opens and while it's open.
 */

const now = () => new Date().toISOString()

/** The map as a place of the roster: its trip's party (or the company waiting for one). */
export const mapPlace = (map: HexMap = editor.map): RosterPlace => ({
  app: 'hexmapper',
  id: map.meta.id,
  name: map.meta.name || t('map.untitled'),
})

/** A token of the map as a place of the roster. */
export const tokenPlace = (token: string, map: HexMap = editor.map): RosterPlace => ({
  ...mapPlace(map),
  token,
})

/** The party's characters: the trip's, or the company waiting for one. */
const membersOf = (map: HexMap): CharacterState[] =>
  (map.play && sessionOf(map.play)?.members) ?? map.play?.rules?.members ?? []

/** A token's sheet as the roster character it is (the roster's id and name). */
const tokenCharacter = (token: MapToken, as: CharacterState): CharacterState | undefined =>
  token.character && { ...structuredClone(token.character), id: as.id, name: as.name }

/** The tokens of this map the roster has characters on, with them. */
function tokenLinks(r: Roster, map: HexMap) {
  const here = mapPlace(map)
  return r.characters.flatMap((e) =>
    e.playing?.token && samePlace({ ...e.playing, token: undefined }, here)
      ? [{ entry: e, token: e.playing.token }]
      : [],
  )
}

/** Writes the map's linked characters to the roster, and lets go of those it no longer has. */
export function settleMap(map: HexMap = editor.map): void {
  const at = now()
  let next = settlePlace(roster.roster, membersOf(map), mapPlace(map), at)
  for (const { entry, token } of tokenLinks(next, map)) {
    const found = map.tokens.find((x) => x.id === token)
    const character = found && tokenCharacter(found, entry.character)
    next = settlePlace(next, character ? [character] : [], tokenPlace(token, map), at)
  }
  roster.set(next)
}

/** Brings the map's linked characters up to date from the roster (outside the undo history). */
export function pullMap(map: HexMap = editor.map): void {
  const place = mapPlace(map)
  const play = map.play
  const session = play && sessionOf(play)
  if (play?.rules && session) {
    const next = pullMembers(session, roster.roster, place, partyOf(getSystem(play.rules.system)))
    if (next !== session) editor.setPlay({ ...play, rules: { ...play.rules, session: next } })
  } else if (play?.rules?.members?.length) {
    const pulled = pullFromRoster(roster.roster, play.rules.members, place)
    if (pulled.updated.length)
      editor.setPlay({ ...play, rules: { ...play.rules, members: pulled.characters } })
  }
  let changed = false
  const tokens = map.tokens.map((token) => {
    const [entry] = playingAt(roster.roster, tokenPlace(token.id, map))
    if (!entry || !token.character) return token
    const own = tokenCharacter(token, entry.character)
    if (JSON.stringify(own) === JSON.stringify(entry.character)) return token
    changed = true
    const character = structuredClone(entry.character) as Partial<CharacterState>
    delete character.id
    delete character.name
    return { ...token, character: character as MapToken['character'] }
  })
  if (changed) editor.setTokensQuietly(tokens)
}

// A map opened: it first catches up with the roster, then writes back. Any other change
// of its party or tokens is written back.
editor.onChange((change) => {
  if (change.kind === 'all') pullMap()
  if (['all', 'play', 'tokens', 'meta'].includes(change.kind)) settleMap()
})
