import { createOracleEngine, loadPacks } from '@open-tabletop/oracle-engine'
import { seeded } from '@open-tabletop/random'
import type { CharacterState } from '@open-tabletop/character-engine'
import type { TravelWorld } from '@open-tabletop/travel-engine'
import { describe, expect, it } from 'vitest'
import { applyResult, placeCharacters, pullMembers } from './index'
import { editInRoster, emptyRoster, keepInRoster, settlePlace, takeFromRoster } from './roster'
import {
  partyOf,
  startTrip,
  stepTrip,
  tagsInUse,
  travelSystems,
  tripFacts,
  withAddedPacks,
} from './trip'
import { addPresent, removePresent, templateCopy } from './present'

/**
 * A made-up system played as a whole: a check at dawn whose table brings wolves (as many as
 * its `set` rolls, said in its text), wolves that go once left behind, bandits that stay,
 * named by a generator; actions that fight them and read who's here.
 */
const PACK = [
  { path: 'wilds/pack.yaml', content: 'id: wilds\nversion: 0.1.0\nlocale: en\nformat: 12\n' },
  {
    path: 'wilds/system.yaml',
    content:
      'kind: system\nname: Wilds\ntravel: travel-rules.default\nbindings: bindings.default\nbestiary: [bestiary.beasts]\n',
  },
  {
    path: 'wilds/rules.yaml',
    content: `
kind: sheet
id: beast
values: { health: { default: 3, min: 0 } }
conditions:
  down: { when: { self.values.health: { lte: 0 } }, leaves: true }
  fled: { leaves: true }
  angry: {}
---
kind: bestiary
id: beasts
sheet: sheet.beast
templates:
  wolf: { name: Wolf, tags: [pack], values: { health: '{{1d6+2}}' }, behind: leave }
  leader: { like: wolf, name: Pack leader, tags: [leader], conditions: [angry] }
  bandit: { name: Bandit, names: generator.outlaw, values: { health: 5 } }
  ghost: { name: Ghost, sheet: sheet.nobody }
---
kind: travel-rules
travel:
  hoursPerDay: 8
  start: '07:00'
  onward: { do: actions.march, with: { until: destination } }
  halt: { at: '19:00', do: actions.camp }
terrains: { plains: { multiplier: 1 } }
modes: { walk: { kmPerDay: 24 } }
checks: [{ event: PROWL, at: '07:00' }]
actions:
  march:
    params: { until: { choices: [destination, place] } }
    do: [{ travel.move: '{{params.until}}' }]
  camp: { do: [{ time: '07:00' }] }
  ambush: { do: [{ effects: { present.bandit: 2 } }] }
  strike: { do: [{ effects: { present.wolf.values.health: -20 } }] }
  scare:
    when: { present.count: { gte: 1 } }
    do: [{ effects: { present.all.conditions.fled: true } }]
  howl: { do: [{ effects: { present.nobody: 1 } }] }
---
kind: bindings
on: { PROWL: { resolve: table.prowl } }
---
kind: table
id: prowl
roll: 1d1
entries:
  - range: 1
    set: { wolves: '{{1d3+1}}' }
    result: '{{wolves}} wolves and their leader'
    effects: { present.wolf: '{{wolves}}', present.leader: 1 }
---
kind: generator
id: outlaw
fields: { name: { table: table.outlaw-names } }
template: '{{name}}'
---
kind: table
id: outlaw-names
roll: 1d1
entries: [{ range: 1, result: Hrolf }]
`,
  },
]

const { registry, diagnostics } = loadPacks(PACK)
const { systems, problems } = travelSystems(registry)
const wilds = systems.find((s) => s.id === 'wilds')!
const world: TravelWorld = {
  km: () => 24,
  place: () => ({ terrain: 'plains' }),
  neighbors: (h) => (h === 'a' ? ['b'] : ['a']),
  distance: (x, y) => (x === y ? 0 : 1),
  connections: () => [],
}
const oracle = () => createOracleEngine({ registry, random: seeded(3) })

describe('those present: copies of templates in a trip', () => {
  it("a system names its bestiaries; a template whose sheet isn't found is a problem", () => {
    expect(diagnostics.filter((d) => d.severity === 'error')).toEqual([])
    expect(wilds.bestiary?.map((b) => b.id)).toEqual(['wilds/beasts'])
    expect(Object.keys(wilds.templateSheets ?? {})).toEqual(['wilds/beast'])
    expect(problems.map((p) => [p.at, p.message])).toEqual([
      ['@bestiary/beasts.templates.ghost.sheet', 'Unknown sheet "sheet.nobody"'],
    ])
  })

  it('a result makes the copies its text counts, each rolling its own', () => {
    const { session } = startTrip({ system: wilds, location: 'a', time: 6 * 60, seed: 's' })
    const done = stepTrip({ system: wilds, world, oracle: oracle() }, session, {
      type: 'wait',
      until: 8 * 60,
    })
    const text = done.entries.find((e) => e.code === 'ORACLE_RESULT')?.text ?? ''
    const wolves = Number(text.split(' ')[0])
    expect(text).toMatch(/^\d wolves and their leader$/)
    const present = done.state.present!
    expect(present.filter((p) => p.character.template?.id === 'wolf')).toHaveLength(wolves)
    expect(present.map((p) => p.character.id)).toEqual([
      'wolf',
      ...Array.from({ length: wolves - 1 }, (_, i) => `wolf-${i + 2}`),
      'leader',
    ])
    expect(present[0].character).toMatchObject({
      name: 'Wolf',
      sheet: 'wilds/beast',
      tags: ['pack'],
    })
    expect(present[1].character.name).toBe('Wolf 2')
    expect(present.at(-1)!.character).toMatchObject({
      name: 'Pack leader',
      tags: ['pack', 'leader'],
      conditions: { angry: {} },
    })
    expect(present.every((p) => p.at === 'a' && p.behind === 'leave')).toBe(true)
    for (const p of present) {
      expect(p.character.values.health).toBeGreaterThanOrEqual(3)
      expect(p.character.values.health).toBeLessThanOrEqual(8)
    }
    expect(done.entries.filter((e) => e.code === 'PRESENT_CAME').map((e) => e.data)).toEqual([
      expect.objectContaining({
        template: 'wolf',
        ids: present.slice(0, wolves).map((p) => p.character.id),
      }),
      expect.objectContaining({ template: 'leader', ids: ['leader'], names: ['Pack leader'] }),
    ])
    // What tables and conditions read of them.
    const facts = tripFacts({ system: wilds, world }, done.state)
    expect(facts.present).toMatchObject({
      count: wolves + 1,
      tags: ['pack', 'leader'],
      wolf: { count: wolves },
      leader: { count: 1, ids: ['leader'] },
      bandit: { count: 0, ids: [] },
    })
    expect(facts).toMatchObject({
      characters: { leader: { values: { health: present.at(-1)!.character.values.health } } },
    })
  })

  it('copies leave by a condition, and those left behind go when their template says', () => {
    const { session } = startTrip({ system: wilds, location: 'a', time: 6 * 60, seed: 's' })
    const options = { system: wilds, world, oracle: oracle() }
    let done = stepTrip(options, session, { type: 'wait', until: 8 * 60 })
    const leader = done.state.present!.find((p) => p.character.id === 'leader')!
    done = stepTrip(options, done.state, { type: 'action', id: 'ambush' })
    // Named by the generator: the first one plain, the second too.
    expect(done.state.present!.filter((p) => p.character.template?.id === 'bandit')).toEqual([
      expect.objectContaining({
        character: expect.objectContaining({ id: 'bandit', name: 'Hrolf' }),
      }),
      expect.objectContaining({
        character: expect.objectContaining({ id: 'bandit-2', name: 'Hrolf' }),
      }),
    ])
    // Every wolf struck down: the leader too (a variant is its template's copy, not a wolf).
    done = stepTrip(options, done.state, { type: 'action', id: 'strike' })
    expect(done.state.present!.map((p) => p.character.id)).toEqual(['leader', 'bandit', 'bandit-2'])
    expect(done.entries.filter((e) => e.code === 'PRESENT_LEFT').map((e) => e.data)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'wolf', because: 'condition', condition: 'down' }),
      ]),
    )
    expect(leader.character.values.health).toBeGreaterThan(0)
    // Marching on: the leader goes (left behind, `behind: leave`), the bandits stay there.
    done = stepTrip(options, done.state, { type: 'setDestination', place: 'b' })
    done = stepTrip(options, done.state, { type: 'travel' })
    expect(done.state.travel.location).toBe('b')
    expect(done.state.present!.map((p) => [p.character.id, p.at])).toEqual([
      ['bandit', 'a'],
      ['bandit-2', 'a'],
    ])
    expect(done.entries.find((e) => e.code === 'PRESENT_LEFT')?.data).toMatchObject({
      id: 'leader',
      because: 'behind',
    })
    // Not here: nobody is present, and the action that needs someone isn't open.
    expect(tripFacts({ system: wilds, world }, done.state).present).toMatchObject({ count: 0 })
    // Back at a: the bandits are there again; scared off, they leave.
    done = stepTrip(options, done.state, { type: 'setDestination', place: 'a' })
    done = stepTrip(options, done.state, { type: 'travel' })
    expect(tripFacts({ system: wilds, world }, done.state).present).toMatchObject({ count: 2 })
    done = stepTrip(options, done.state, { type: 'action', id: 'scare' })
    expect(done.state.present).toEqual([])
    expect(
      done.entries.filter((e) => e.code === 'PRESENT_LEFT').map((e) => e.data?.condition),
    ).toEqual(['fled', 'fled'])
  })

  it('an unknown template makes nothing, and the journal says so', () => {
    const { session } = startTrip({ system: wilds, location: 'a', time: 8 * 60 })
    const done = stepTrip({ system: wilds, world }, session, { type: 'action', id: 'howl' })
    expect(done.state.present ?? []).toEqual([])
    expect(done.entries.find((e) => e.code === 'UNKNOWN_TEMPLATE')?.data).toEqual({
      template: 'nobody',
    })
  })

  it('a roll by hand makes and takes away copies; the player takes one off', () => {
    const { session } = startTrip({ system: wilds, location: 'a', time: 8 * 60 })
    const rules = partyOf(wilds)
    let s = applyResult(session, { effects: { 'present.wolf': 3 } }, {}, rules)
    expect(s.present).toHaveLength(3)
    s = applyResult(s, { effects: { 'present.wolf': -1 } }, {}, rules)
    expect(s.present!.map((p) => p.character.id)).toEqual(['wolf', 'wolf-2'])
    s = applyResult(s, { effects: { 'characters.wolf-2.values.health': '=1' } }, {}, rules)
    expect(s.present![1].character.values.health).toBe(1)
    expect(removePresent(s, 'wolf')).toEqual([
      { type: 'PRESENT_LEFT', id: 'wolf', name: 'Wolf', template: 'wolf', because: 'hand' },
    ])
    expect(s.present!.map((p) => p.character.id)).toEqual(['wolf-2'])
    s = applyResult(s, { effects: { 'present.wolf': '=0' } }, {}, rules)
    expect(s.present).toEqual([])
  })

  it("a pack a map adds brings its bestiary to a system that hasn't it", () => {
    const extra = loadPacks([
      ...PACK,
      {
        path: 'mine/pack.yaml',
        content:
          'id: mine\nversion: 0.1.0\nlocale: en\nformat: 12\ndependencies: { wilds: ^0.1.0 }\n',
      },
      {
        path: 'mine/bestiary.yaml',
        content:
          'kind: bestiary\nid: mine\nsheet: wilds/sheet.beast\ntemplates: { boar: { name: Boar } }\n',
      },
    ]).registry
    const base = travelSystems(extra).systems.find((s) => s.id === 'wilds')!
    const { system, problems } = withAddedPacks(base, extra, ['mine'])
    expect(problems).toEqual([])
    expect(system.bestiary?.map((b) => b.id)).toEqual(['wilds/beasts', 'mine/mine'])
    const { session } = startTrip({ system, location: 'a', time: 8 * 60 })
    const s = applyResult(session, { effects: { 'present.boar': 1 } }, {}, partyOf(system))
    expect(s.present![0].character).toMatchObject({
      id: 'boar',
      name: 'Boar',
      sheet: 'wilds/beast',
      template: { id: 'boar', from: 'mine/mine' },
    })
  })

  it('a copy kept in the roster plays in the trip, in step with it, until it leaves', () => {
    const { session } = startTrip({ system: wilds, location: 'a', time: 8 * 60 })
    const rules = partyOf(wilds)
    let s = applyResult(session, { effects: { 'present.bandit': 1 } }, {}, rules)
    const place = { app: 'travel', id: 't1', name: 'The trip' }
    const bandit = s.present![0].character
    let roster = keepInRoster({ characters: [] }, bandit, 'now', place).roster
    // The trip's characters, for the roster, are its members and those present.
    expect(placeCharacters(s).map((c) => c.id)).toEqual(['bandit'])
    roster = settlePlace(roster, placeCharacters(s), place, 'now')
    expect(roster.characters[0].playing).toEqual(place)

    // Changed in the Characters app: the trip's copy follows, said in the journal.
    roster = editInRoster(
      roster,
      'bandit',
      (e) => ({ ...e, character: { ...e.character, values: { health: 9 } } }),
      'later',
    )
    s = pullMembers(s, roster, place, rules)
    expect(s.present![0].character.values.health).toBe(9)
    expect(s.journal.at(-1)).toMatchObject({ code: 'ROSTER_UPDATED', data: { names: ['Bandit'] } })
    expect(s.members).toBeUndefined()

    // Gone from the trip: it stays in the roster, playing nowhere.
    removePresent(s, 'bandit')
    roster = settlePlace(roster, placeCharacters(s), place, 'now')
    expect(roster.characters[0].playing).toBeUndefined()
  })

  it('a roster character made in the Characters app is brought here, read and kept in step', () => {
    const rules = partyOf(wilds)
    const place = { app: 'travel', id: 't1', name: 'The trip' }
    // A wolf made from the template in the Characters app, in no trip yet.
    const wolf = templateCopy(rules, 'wolf', { id: 'wolf', name: 'Old Grey' }, 'made')!
    let roster = keepInRoster(emptyRoster(), wolf, 'now').roster
    const { session } = startTrip({ system: wilds, location: 'a', time: 8 * 60 })
    // The trip's own wolf has its id: it makes room.
    let s = applyResult(session, { effects: { 'present.wolf': 1 } }, {}, rules)
    const taken = takeFromRoster(roster, 'wolf', place, 'now')!
    roster = taken.roster
    const events = addPresent(s, taken.character)
    expect(events).toEqual([
      { type: 'PRESENT_CAME', template: 'wolf', ids: ['wolf'], names: ['Old Grey'] },
    ])
    expect(s.present!.map((p) => p.character.id)).toEqual(['wolf-2', 'wolf'])
    // Tables read it with the template's copies.
    expect(tripFacts({ system: wilds, world }, s).present).toMatchObject({ wolf: { count: 2 } })
    // Changed in the Characters app, the trip's copy follows.
    roster = editInRoster(
      roster,
      'wolf',
      (e) => ({ ...e, character: { ...e.character, values: { health: 1 } } }),
      'later',
    )
    s = pullMembers(s, roster, place, rules)
    expect(s.present!.find((p) => p.character.id === 'wolf')!.character.values.health).toBe(1)
    expect(s.present!.find((p) => p.character.id === 'wolf-2')!.character.values.health).not.toBe(1)
  })
})

describe('the tags in use', () => {
  it('gathers the tags of the system’s roster characters, its templates and those given', () => {
    const character = (id: string, sheet: string, tags: string[]): CharacterState => ({
      id,
      sheet,
      values: {},
      conditions: {},
      tags,
      cards: [],
      relations: [],
    })
    let roster = keepInRoster(emptyRoster(), character('rolf', 'wilds/beast', ['npc']), 't').roster
    roster = keepInRoster(roster, character('else', 'other/sheet', ['elsewhere']), 't').roster
    expect(tagsInUse(wilds, roster, [character('kael', 'wilds/beast', ['hired', 'npc'])])).toEqual([
      'hired',
      'leader',
      'npc',
      'pack',
    ])
  })
})
