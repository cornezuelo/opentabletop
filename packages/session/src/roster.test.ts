import { describe, expect, it } from 'vitest'
import type { CharacterState } from '@open-tabletop/character-engine'
import {
  characterId,
  deleteFromRoster,
  duplicateInRoster,
  editInRoster,
  emptyRoster,
  isLinked,
  keepInRoster,
  leavePlace,
  pullFromRoster,
  readRoster,
  renameMember,
  rosterFromOtd,
  rosterToOtd,
  syncToRoster,
  takeFromRoster,
  type RosterPlace,
} from './roster'

const character = (id: string, health = 5): CharacterState => ({
  id,
  sheet: 'grey-marches/companion',
  name: id[0].toUpperCase() + id.slice(1),
  values: { health },
  conditions: {},
  tags: [],
  cards: [],
  relations: [],
})

const map: RosterPlace = { app: 'hexmapper', id: 'm1', name: 'The Marches' }
const trip: RosterPlace = { app: 'travel', id: 't1', name: 'To the Vale' }
const token: RosterPlace = { app: 'hexmapper', id: 'm1', token: 'tok1', name: 'The Marches' }

describe('the roster', () => {
  it('gives ids from names, never one taken', () => {
    expect(characterId('Old Tóbin', [])).toBe('old-tobin')
    expect(characterId('Old Tobin', ['old-tobin', 'old-tobin-2'])).toBe('old-tobin-3')
    expect(characterId('¡!', [])).toBe('character')
  })

  it('keeps a character, with a new id when the roster has its id', () => {
    const one = keepInRoster(emptyRoster(), character('kael'), 'T1', map)
    expect(one.id).toBe('kael')
    expect(isLinked(one.roster, 'kael', map)).toBe(true)
    // Another Kael (someone else's map): kept as another character.
    const two = keepInRoster(one.roster, character('kael', 2), 'T2')
    expect(two.id).toBe('kael-2')
    expect(two.roster.characters.map((e) => [e.character.id, e.character.values.health])).toEqual([
      ['kael', 5],
      ['kael-2', 2],
    ])
    expect(isLinked(two.roster, 'kael-2', map)).toBe(false)
  })

  it('plays a character in one place at a time', () => {
    const { roster } = keepInRoster(emptyRoster(), character('kael'), 'T1', map)
    const taken = takeFromRoster(roster, 'kael', trip, 'T2')!
    // It played on the map: the host asked first, and the map's copy is no longer linked.
    expect(taken.from).toEqual(map)
    expect(isLinked(taken.roster, 'kael', trip)).toBe(true)
    expect(isLinked(taken.roster, 'kael', map)).toBe(false)
    // The map's stale copy doesn't write over it.
    const stale = syncToRoster(taken.roster, [character('kael', 1)], map, 'T3')
    expect(stale).toBe(taken.roster)
    // A token on the same map is another place.
    expect(takeFromRoster(taken.roster, 'kael', token, 'T4')!.from).toEqual(trip)
    expect(takeFromRoster(taken.roster, 'nobody', trip, 'T4')).toBeUndefined()
  })

  it('keeps the place’s copies and the roster in step', () => {
    let { roster } = keepInRoster(emptyRoster(), character('kael'), 'T1', trip)
    roster = keepInRoster(roster, character('mara'), 'T1').roster
    // A step wounds Kael (linked) and Mara (the trip's own copy, not linked).
    const wounded = [character('kael', 3), character('mara', 1)]
    const synced = syncToRoster(roster, wounded, trip, 'T2')
    expect(synced.characters[0]).toMatchObject({
      character: { values: { health: 3 } },
      modified: 'T2',
    })
    expect(synced.characters[1]).toMatchObject({
      character: { values: { health: 5 } },
      modified: 'T1',
    })
    expect(syncToRoster(synced, wounded, trip, 'T3')).toBe(synced)
    // The Characters app heals Kael; the trip catches up when it opens.
    const healed = editInRoster(
      synced,
      'kael',
      (e) => ({ ...e, character: { ...e.character, values: { health: 5 } } }),
      'T4',
    )
    const pulled = pullFromRoster(healed, wounded, trip)
    expect(pulled.updated).toEqual(['kael'])
    expect(pulled.characters.map((c) => c.values.health)).toEqual([5, 1])
    expect(pullFromRoster(healed, pulled.characters, trip).updated).toEqual([])
    // Elsewhere, nothing of it.
    expect(pullFromRoster(healed, wounded, map).updated).toEqual([])
  })

  it('lets characters leave a place, and stay in the roster', () => {
    let { roster } = keepInRoster(emptyRoster(), character('kael'), 'T1', trip)
    roster = keepInRoster(roster, character('mara'), 'T1', trip).roster
    const left = leavePlace(roster, trip, ['mara'])
    expect(isLinked(left, 'kael', trip)).toBe(true)
    expect(left.characters[1].playing).toBeUndefined()
    expect(leavePlace(left, trip).characters.every((e) => !e.playing)).toBe(true)
    expect(leavePlace(left, map)).toBe(left)
  })

  it('duplicates and deletes', () => {
    let { roster } = keepInRoster(emptyRoster(), character('kael'), 'T1', trip)
    roster = editInRoster(roster, 'kael', (e) => ({ ...e, noteRef: 'People/Kael' }), 'T2')
    const copy = duplicateInRoster(roster, 'kael', 'Kael the Younger', 'T3')
    expect(copy.id).toBe('kael-the-younger')
    const entry = copy.roster.characters[1]
    expect(entry).toMatchObject({ noteRef: 'People/Kael', character: { name: 'Kael the Younger' } })
    expect(entry.playing).toBeUndefined()
    expect(deleteFromRoster(copy.roster, 'kael').characters.map((e) => e.character.id)).toEqual([
      'kael-the-younger',
    ])
  })

  it('reads what is stored, leaving out what isn’t a character', () => {
    const read = readRoster({
      characters: [
        { character: { id: 'kael', sheet: 's' }, modified: 'T', playing: trip },
        { character: { id: 'kael', sheet: 's' } },
        { character: { name: 'no id' } },
        null,
      ],
    })
    expect(read.characters).toEqual([
      {
        character: {
          id: 'kael',
          sheet: 's',
          values: {},
          conditions: {},
          tags: [],
          cards: [],
          relations: [],
        },
        modified: 'T',
        playing: trip,
      },
    ])
    expect(readRoster('broken')).toEqual(emptyRoster())
  })

  it('renames a member everywhere the trip names it', () => {
    const s = {
      members: [
        character('kael'),
        { ...character('mara'), relations: [{ to: 'character:kael', kind: 'friend' }] },
      ],
      acting: 'kael',
      rolls: 'kael',
      roles: { guide: 'kael', scout: 'mara' },
    }
    renameMember(s, 'kael', 'kael-2')
    expect(s.members.map((m) => m.id)).toEqual(['kael-2', 'mara'])
    expect(s).toMatchObject({
      acting: 'kael-2',
      rolls: 'kael-2',
      roles: { guide: 'kael-2', scout: 'mara' },
    })
    expect(s.members[1].relations[0].to).toBe('character:kael-2')
  })

  it('writes and reads its characters as OTD, with their notes', () => {
    let { roster } = keepInRoster(emptyRoster(), character('kael'), 'T1', trip)
    roster = editInRoster(roster, 'kael', (e) => ({ ...e, noteRef: 'People/Kael' }), 'T2')
    const file = JSON.parse(JSON.stringify(rosterToOtd(roster.characters)))
    expect(file.otd).toMatch(/^\d+\.\d+\.\d+$/)
    expect(file.characters[0]).toMatchObject({
      id: 'kael',
      type: 'character',
      noteRef: 'People/Kael',
    })
    expect(rosterFromOtd(file)).toEqual([{ character: character('kael'), noteRef: 'People/Kael' }])
    // What isn't a character of a sheet is left out.
    expect(rosterFromOtd({ characters: [{ id: 'x', type: 'character' }, 3] })).toEqual([])
    expect(rosterFromOtd(null)).toEqual([])
  })
})
