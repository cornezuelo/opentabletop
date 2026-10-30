import type { CharacterState } from '@open-tabletop/character-engine'
import { loadPacks } from '@open-tabletop/oracle-engine'
import { describe, expect, it } from 'vitest'
import {
  bringParty,
  keepParty,
  partyTaking,
  placeCharacters,
  pullMembers,
  settleSession,
} from './index'
import { newMember } from './party'
import {
  deleteFromRoster,
  duplicateInRoster,
  editInRoster,
  emptyRoster,
  isLinked,
  keepInRoster,
  keepPartyInRoster,
  partyWith,
  readRoster,
  rosterEntry,
  setMembers,
  splitParty,
  type Roster,
  type RosterPlace,
} from './roster'
import { partyOf, startTrip, travelSystems } from './trip'

/** A system with a party sheet (morale, rations as items) beside its characters'. */
const PACK = [
  { path: 'band/pack.yaml', content: 'id: band\nversion: 0.1.0\nlocale: en\nformat: 11\n' },
  {
    path: 'band/system.yaml',
    content:
      'kind: system\nname: Band\ntravel: travel-rules.default\nbindings: bindings.default\nsheet: sheet.companion\npartySheet: sheet.company\n',
  },
  {
    path: 'band/sheets.yaml',
    content: `
kind: sheet
id: companion
values: { survival: { default: 1 } }
---
kind: sheet
id: company
values:
  morale: { default: 3, min: 0, max: 5 }
  silver: { default: 0 }
`,
  },
  {
    path: 'band/travel.yaml',
    content: `
kind: travel-rules
travel: { hoursPerDay: 8 }
terrains: { plains: { multiplier: 1 } }
modes: { walk: { kmPerDay: 24 } }
---
kind: bindings
on: {}
stats:
  morale: { name: Morale, from: { party: morale } }
`,
  },
]

const { registry } = loadPacks(PACK)
const band = travelSystems(registry).systems.find((s) => s.id === 'band')!
const rules = partyOf(band)

const trip: RosterPlace = { app: 'travel', id: 't1', name: 'To the Vale' }
const other: RosterPlace = { app: 'travel', id: 't2', name: 'The Fens' }
const T = '2026-10-29T00:00:00Z'

const member = (id: string): CharacterState => newMember(rules, { id, name: id })

/** A roster with Kael and Mara, and the Company with both in it, playing nowhere. */
function company(): Roster {
  let r = keepInRoster(emptyRoster(), member('kael'), T).roster
  r = keepInRoster(r, member('mara'), T).roster
  const party = startTrip({ system: band, location: 'a' }).session.party!
  return keepPartyInRoster(
    r,
    { ...party, values: { morale: 4, silver: 10 } },
    'The Company',
    ['kael', 'mara'],
    T,
  ).roster
}

describe('parties in the roster', () => {
  it('keeps a party with its members, one party per character', () => {
    const r = company()
    expect(rosterEntry(r, 'the-company')?.members).toEqual(['kael', 'mara'])
    expect(partyWith(r, 'mara')?.character.id).toBe('the-company')
    // Mara joins another party: she leaves the Company.
    const scouts = keepPartyInRoster(
      r,
      rosterEntry(r, 'the-company')!.character,
      'Scouts',
      ['mara'],
      T,
    )
    expect(rosterEntry(scouts.roster, 'scouts')?.members).toEqual(['mara'])
    expect(rosterEntry(scouts.roster, 'the-company')?.members).toEqual(['kael'])
    expect(
      setMembers(scouts.roster, 'the-company', ['kael', 'mara'], T).characters.find(
        (e) => e.character.id === 'scouts',
      )?.members,
    ).toEqual([])
    // Read back as stored; a deleted member leaves its party.
    expect(readRoster(JSON.parse(JSON.stringify(r)))).toEqual(r)
    expect(rosterEntry(deleteFromRoster(r, 'kael'), 'the-company')?.members).toEqual(['mara'])
    // A copy of a party has none of its members.
    const copy = duplicateInRoster(r, 'the-company', 'Copy', T)
    expect(rosterEntry(copy.roster, copy.id)?.members).toEqual([])
  })

  it('takes a party to a trip with its members, and keeps them in step', () => {
    const r = company()
    const start = startTrip({ system: band, location: 'a' }).session
    expect(partyTaking(r, 'the-company', trip)).toEqual([])
    const brought = bringParty(r, start, 'the-company', trip, rules, T)
    const s = brought.session
    expect(s.partyRef).toBe('the-company')
    expect(s.party).toMatchObject({ id: 'party', values: { morale: 4, silver: 10 } })
    // The stats made of its values follow it.
    expect(s.stats.morale).toBe(4)
    expect(s.members?.map((m) => m.id)).toEqual(['kael', 'mara'])
    for (const id of ['the-company', 'kael', 'mara'])
      expect(isLinked(brought.roster, id, trip)).toBe(true)

    // The trip changes the party: written back by its roster id.
    const played = { ...s, party: { ...s.party!, values: { morale: 1, silver: 7 } } }
    let r2 = settleSession(brought.roster, played, trip, T)
    expect(rosterEntry(r2, 'the-company')?.character).toMatchObject({
      id: 'the-company',
      values: { morale: 1, silver: 7 },
    })
    // Mara leaves the trip: she leaves the party too, and plays nowhere.
    r2 = settleSession(r2, { ...played, members: played.members!.slice(0, 1) }, trip, T)
    expect(rosterEntry(r2, 'the-company')?.members).toEqual(['kael'])
    expect(rosterEntry(r2, 'mara')?.playing).toBeUndefined()

    // Another trip asks first: it takes the party and Kael from this one.
    expect(partyTaking(r2, 'the-company', other)).toEqual([
      { name: 'The Company', place: 'To the Vale' },
      { name: 'kael', place: 'To the Vale' },
    ])
  })

  it('follows what the Characters app changed', () => {
    const brought = bringParty(
      company(),
      startTrip({ system: band, location: 'a' }).session,
      'the-company',
      trip,
      rules,
      T,
    )
    const r = editInRoster(
      brought.roster,
      'the-company',
      (e) => ({
        ...e,
        character: { ...e.character, values: { ...e.character.values, morale: 2 } },
      }),
      T,
    )
    const pulled = pullMembers(brought.session, r, trip, rules, T)
    expect(pulled.party?.values.morale).toBe(2)
    expect(pulled.party?.id).toBe('party')
    expect(pulled.stats.morale).toBe(2)
    expect(pulled.journal.at(-1)).toMatchObject({
      code: 'ROSTER_UPDATED',
      data: { names: ['The Company'] },
    })
    // Nothing changed: the same state.
    expect(pullMembers(pulled, r, trip, rules, T)).toBe(pulled)
  })

  it("keeps a trip's party in the roster, and goes on with it to the next trip", () => {
    let r = keepInRoster(emptyRoster(), member('kael'), T, trip).roster
    const start = startTrip({
      system: band,
      location: 'a',
      members: [member('kael'), member('tobin')],
    }).session
    const kept = keepParty(r, start, 'Wolves', trip, T)
    r = kept.roster
    expect(kept.session.partyRef).toBe('wolves')
    // Only its linked members (Tobin is the trip's own).
    expect(rosterEntry(r, 'wolves')?.members).toEqual(['kael'])
    expect(placeCharacters(kept.session).map((c) => c.id)).toEqual(['kael', 'tobin', 'wolves'])
    // The next trip of the same system starts with it as it was.
    const next = startTrip({
      system: band,
      location: 'a',
      party: { ...kept.session.party!, values: { morale: 1, silver: 3 } },
      partyRef: 'wolves',
    }).session
    expect(next.partyRef).toBe('wolves')
    expect(next.party?.values).toEqual({ morale: 1, silver: 3 })
    expect(next.stats.morale).toBe(1)
  })

  it('splits a party: nothing made out of nothing', () => {
    let r = company()
    r = editInRoster(
      r,
      'the-company',
      (e) => ({
        ...e,
        character: {
          ...e.character,
          items: [
            { key: 'ration', id: 'ration', count: 6, fields: {} },
            { key: 'sack', id: 'sack', count: 1, fields: {} },
            { key: 'rope', id: 'rope', count: 1, place: 'sack', fields: {} },
            { key: 'tent', id: 'tent', count: 1, fields: {} },
          ],
        },
      }),
      T,
    )
    const start = startTrip({ system: band, location: 'a' }).session.party!
    const split = splitParty(
      r,
      'the-company',
      {
        name: 'Scouts',
        members: ['mara'],
        start,
        values: { silver: { stays: 6, goes: 4 } },
        items: { ration: 3, sack: 1 },
      },
      T,
    )
    const old = rosterEntry(split.roster, 'the-company')!
    const scouts = rosterEntry(split.roster, split.id)!
    expect(split.id).toBe('scouts')
    expect(old.members).toEqual(['kael'])
    expect(scouts.members).toEqual(['mara'])
    // Values: those split as said; the rest the old one keeps, the new one starts at its own.
    expect(old.character.values).toEqual({ morale: 4, silver: 6 })
    expect(scouts.character.values).toEqual({ morale: 3, silver: 4 })
    // Items: counts split, a sack going whole takes its rope.
    expect(old.character.items?.map((i) => [i.key, i.count])).toEqual([
      ['ration', 3],
      ['tent', 1],
    ])
    expect(scouts.character.items?.map((i) => [i.key, i.count])).toEqual([
      ['ration', 3],
      ['sack', 1],
      ['rope', 1],
    ])
    expect(scouts.playing).toBeUndefined()
  })

  it('puts a party in a campaign without a trip, with its members', async () => {
    const { campaignPlace, putInCampaign, partyInCampaign, takenFromPlay } =
      await import('./roster')
    const quick = campaignPlace('c1', 'A quick game')
    let r = company()
    r = {
      characters: r.characters.map((e) =>
        e.character.id === 'mara' ? { ...e, playing: trip } : e,
      ),
    }
    // Mara plays in a trip: putting the party in the campaign takes her from it (asked first).
    expect(takenFromPlay(r, 'the-company').map((e) => e.character.id)).toEqual(['mara'])
    r = putInCampaign(r, 'the-company', quick, T)
    for (const id of ['the-company', 'kael', 'mara'])
      expect(rosterEntry(r, id)?.playing).toEqual(quick)
    expect(partyInCampaign(r, 'c1', 'band/company')?.character.id).toBe('the-company')
    expect(partyInCampaign(r, 'c2', 'band/company')).toBeUndefined()
    // Out of it: in the roster only.
    r = putInCampaign(r, 'the-company', undefined, T)
    expect(rosterEntry(r, 'kael')?.playing).toBeUndefined()
    expect(partyInCampaign(r, 'c1', 'band/company')).toBeUndefined()
  })
})
