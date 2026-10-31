import { lookupTemplates, type CharacterState } from '@open-tabletop/character-engine'
import type { HexKey } from '@open-tabletop/hex'
import {
  cellOfPlace,
  DEFAULT_TOKEN_ICONS,
  layoutTokens,
  placeOfCell,
  newId,
  type HexMap,
  type LaidToken,
  type MapToken,
  type TokenPlacement,
} from '@open-tabletop/map'
import {
  addHandEntries,
  movePresent,
  partyOf,
  templateCopy,
  type Present,
  type TravelSystem,
} from '@open-tabletop/session'
import { showToast } from '@open-tabletop/ui-kit'
import { t } from '../i18n/index.svelte'
import { editor } from '../store/editor.svelte'
import { editSession, sessionOf } from './play'
import { activeSystem, getSystem } from './systems'

/**
 * Those present on the map (docs/bestiary.md §4): the copies the trip made, drawn as tokens
 * on the hexes where they were made, from the play state; never written into the map's
 * tokens (definitions ≠ state). Their ids start with `present:`; in Play a click on one
 * shows its sheet, and a drag moves it in the trip.
 */

/** A drawn token that stands for a copy of a template (its id: `present:<copy>`). */
export type CopyToken = LaidToken & { copy: Present }

export const PRESENT_ID = 'present:'

/** A copy being dragged in Play: drawn on that cell until it's let go. */
let dragged: { id: string; hex: HexKey } | null = null

/** Draws a copy on a cell while it's dragged (null: where the trip has it). */
export function dragCopy(drag: { id: string; hex: HexKey } | null): void {
  dragged = drag
  editor.notify({ kind: 'tokens' })
}

/** The copy a drawn token's id stands for (`present:<copy>`), if any. */
export const copyOf = (id: string): string | undefined =>
  id.startsWith(PRESENT_ID) ? id.slice(PRESENT_ID.length) : undefined

/**
 * Moves a copy in the trip to the place of a cell (a room's cell: the room), by hand, with
 * its line in the journal; not while the trip goes on in another map.
 */
export function moveCopy(id: string, hex: HexKey): void {
  if (editor.play?.away) return void showToast(t('submap.awayHere'), 'info', 6000)
  const place = placeOfCell(editor.map, hex)
  editSession((s) => addHandEntries(s, movePresent(s, id, place)))
}

/** The copies the map's trip keeps, each where it was made. */
export function presentOf(map: HexMap = editor.map): Present[] {
  const session = map.play && sessionOf(map.play)
  return session?.present ?? []
}

/** The system the trip plays (its templates' looks). */
const tripSystem = (map: HexMap): TravelSystem | undefined =>
  map.play?.rules ? getSystem(map.play.rules.system) : undefined

/** Each copy as a token: its template's look (`token:`), else an enemy's. */
export function copyTokens(map: HexMap = editor.map): CopyToken[] {
  const present = presentOf(map)
  if (!present.length) return []
  const system = tripSystem(map)
  const lookup = system?.bestiary && lookupTemplates(system.bestiary)
  const session = map.play && sessionOf(map.play)
  const party = map.tokens.find((t) => t.kind === 'party')?.hex
  // Where each is drawn: with the party at its place (a room's cell where the party stands),
  // else the place's cell; none when it's in another map.
  const cellOf = (at: string) =>
    at === session?.travel.location && party ? party : cellOfPlace(map, at)
  return present.flatMap((copy) => {
    const c = copy.character
    const hex = dragged?.id === c.id ? dragged.hex : cellOf(copy.at)
    if (!hex) return []
    const look = (c.template && lookup?.(c.template.id)?.template.token) ?? {}
    const kind = look.kind ?? 'enemy'
    return {
      id: `${PRESENT_ID}${c.id}`,
      name: c.name ?? c.id,
      kind,
      hex,
      iconId: look.icon ?? DEFAULT_TOKEN_ICONS[kind],
      ...(look.color && { color: look.color }),
      group: c.template?.id ?? c.id,
      copy,
    }
  })
}

/**
 * A token of the map made from a template of the system's bestiary (Edit's **Place from
 * the bestiary**): its look, and a sheet that's a copy with its own rolls; the map's, as
 * any token placed by hand. Undefined when the system lacks the template.
 */
export function tokenFromBestiary(
  template: string,
  hex: HexKey,
  name: string,
  id = newId(),
): MapToken | undefined {
  const system = activeSystem()
  const rules = partyOf(system)
  const found = rules.bestiary?.(template)
  const taken = new Set(editor.map.tokens.map((t) => t.name))
  let named = name
  for (let n = 2; taken.has(named); n++) named = `${name} ${n}`
  const copy = found && templateCopy(rules, template, { id, name: named }, `${id}|${template}`)
  if (!found || !copy) return undefined
  const look = found.template.token ?? {}
  const kind = look.kind ?? 'enemy'
  const character: Partial<CharacterState> = { ...copy }
  delete character.id
  delete character.name
  return {
    id,
    name: named,
    kind,
    hex,
    iconId: look.icon ?? DEFAULT_TOKEN_ICONS[kind],
    ...(look.color && { color: look.color }),
    character: character as MapToken['character'],
  }
}

/** Whether a drawn token is a copy (not one of the map's: only Play picks or drags it). */
export const isCopy = (token: LaidToken): token is CopyToken => token.id.startsWith(PRESENT_ID)

/**
 * Where every token is drawn: the map's, and in Play those present; copies of a template
 * grouped past what fits on a hex, unless the play settings draw them apart.
 */
export function drawnTokens(map: HexMap = editor.map): TokenPlacement<MapToken | CopyToken>[] {
  return layoutTokens<MapToken | CopyToken>([...map.tokens, ...copyTokens(map)], {
    group: !map.play?.copiesApart,
  })
}
