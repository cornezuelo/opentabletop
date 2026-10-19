import { beforeEach, describe, expect, it, vi } from 'vitest'
import { roster } from '@open-tabletop/character-ui'
import {
  editInRoster,
  emptyRoster,
  isLinked,
  keepInRoster,
  playingAt,
  rosterEntry,
} from '@open-tabletop/session'
import { exampleMaps } from '../io/examples'
import { parseMapFile } from '../io/otd'
import { deserializeMap, serializeMap } from '../model/serialize'
import { editor } from '../store/editor.svelte'
import { clickHex, editSession, sessionOf, step } from './play'
import { mapPlace, pullMap, tokenPlace } from './roster'

/**
 * The example map and the roster (the Characters app): the Company's members and Brenna's
 * token kept in it, written back as the map plays, and brought up to date from it.
 */
const grey = () =>
  editor.load(parseMapFile(exampleMaps().find((m) => m.id === 'greymarches1')!.json))
const trip = () => sessionOf(editor.map.play!)!
const kaelHere = () => trip().members!.find((m) => m.id === 'kael')!

describe('the map and the roster', () => {
  beforeEach(() => {
    localStorage.clear()
    roster.set(emptyRoster())
    let seed = 42
    vi.spyOn(Math, 'random').mockImplementation(() => {
      seed = (seed * 16807) % 2147483647
      return seed / 2147483647
    })
  })

  it('keeps a member of the Company in step while the trip plays', () => {
    grey()
    clickHex('7,7')
    const place = mapPlace()
    expect(place).toMatchObject({ app: 'hexmapper', id: 'greymarches1' })
    // Keep in the roster (the party's Characters).
    roster.set(keepInRoster(roster.roster, kaelHere(), 'T0', place).roster)
    // Hurt by hand, then a march: the roster follows.
    editSession((s) => ({
      ...s,
      members: s.members!.map((m) =>
        m.id === 'kael' ? { ...m, values: { ...m.values, health: 1 } } : m,
      ),
    }))
    expect(rosterEntry(roster.roster, 'kael')!.character.values.health).toBe(1)
    step({ type: 'action', id: 'march' })
    expect(rosterEntry(roster.roster, 'kael')!.character).toEqual(kaelHere())
    // Mara, never kept, isn't in it.
    expect(rosterEntry(roster.roster, 'mara')).toBeUndefined()

    // Healed in the Characters app: the map catches up, and the journal says so.
    roster.set(
      editInRoster(
        roster.roster,
        'kael',
        (e) => ({
          ...e,
          character: { ...e.character, values: { ...e.character.values, health: 5 } },
        }),
        'T1',
      ),
    )
    pullMap()
    expect(kaelHere().values.health).toBe(5)
    expect(trip().journal.at(-1)).toMatchObject({
      code: 'ROSTER_UPDATED',
      data: { names: ['Kael'] },
    })

    // Saved and opened again: still linked, and nothing to catch up with.
    const entries = trip().journal.length
    editor.load(deserializeMap(serializeMap(editor.map)))
    expect(isLinked(roster.roster, 'kael', mapPlace())).toBe(true)
    expect(trip().journal.length).toBe(entries)

    // Taken out of the party: it stays in the roster, playing nowhere.
    editSession((s) => ({ ...s, members: s.members!.filter((m) => m.id !== 'kael') }))
    expect(rosterEntry(roster.roster, 'kael')!.playing).toBeUndefined()
  })

  it('keeps a token’s sheet in step: Brenna, the ferrywoman', () => {
    grey()
    const brenna = editor.map.tokens.find((t) => t.id === 'brenna')!
    expect(brenna.character?.sheet).toBe('grey-marches/companion')
    const place = tokenPlace('brenna')
    roster.set(
      keepInRoster(
        roster.roster,
        { ...brenna.character!, id: 'brenna', name: 'Brenna' },
        'T0',
        place,
      ).roster,
    )
    // Changed on the map (the token's sheet): written back.
    editor.updateToken('brenna', (t) => ({
      ...t,
      character: { ...t.character!, values: { ...t.character!.values, dread: 2 } },
    }))
    expect(rosterEntry(roster.roster, 'brenna')!.character.values.dread).toBe(2)
    // Changed in the Characters app: the token catches up.
    roster.set(
      editInRoster(
        roster.roster,
        'brenna',
        (e) => ({ ...e, character: { ...e.character, tags: ['ferrywoman', 'owed'] } }),
        'T1',
      ),
    )
    pullMap()
    expect(editor.map.tokens.find((t) => t.id === 'brenna')!.character!.tags).toEqual([
      'ferrywoman',
      'owed',
    ])
    // The token deleted: it stays in the roster, playing nowhere.
    editor.setTokensQuietly(editor.map.tokens.filter((t) => t.id !== 'brenna'))
    expect(playingAt(roster.roster, place)).toEqual([])
    expect(rosterEntry(roster.roster, 'brenna')).toBeDefined()
  })
})
