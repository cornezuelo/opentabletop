import { createOracleEngine, loadPacks } from '@open-tabletop/oracle-engine'
import { seeded, sequence } from '@open-tabletop/random'
import type { TravelWorld } from '@open-tabletop/travel-engine'
import { describe, expect, it } from 'vitest'
import { corePack, greyMarchesPack } from './core.testing'
import { applyResult, type SessionState } from './index'
import { newPlaceSheet, placeSheetOf } from './party'
import {
  partyOf,
  startTrip,
  stepTrip,
  travelSystems,
  tripAvailability,
  tripFacts,
  withMapSheet,
  type TravelSystem,
} from './trip'

/**
 * A system whose places remember: a ruin delved once, a crypt woken that stays restless and
 * rolls its dead again on coming back, a value rolled for each place.
 */
const PACK = [
  { path: 'barrow/pack.yaml', content: 'id: barrow\nversion: 0.1.0\nlocale: en\nformat: 15\n' },
  {
    path: 'barrow/system.yaml',
    content:
      'kind: system\nname: Barrow\ntravel: travel-rules.default\nbindings: bindings.default\nplaceSheet: sheet.place\n',
  },
  {
    path: 'barrow/sheets.yaml',
    content: `
kind: sheet
id: place
values:
  delved: { default: 0, min: 0, max: 1 }
  echoes: { default: '{{1d6}}' }
conditions:
  restless: {}
  plundered: { when: { self.values.delved: { gte: 1 } } }
`,
  },
  {
    path: 'barrow/travel.yaml',
    content: `
kind: travel-rules
travel:
  hoursPerDay: 8
  start: '07:00'
  onward: { do: actions.march, with: { until: destination } }
terrains: { plains: { multiplier: 1 } }
modes: { walk: { kmPerDay: 24 } }
actions:
  march:
    params: { until: { choices: [destination, place] } }
    do: [{ travel.move: '{{params.until}}' }]
  delve:
    unless: { place.values.delved: { gte: 1 } }
    do:
      - { time: 10 }
      - { effects: { place.values.delved: 5 } }
      - { when: { place.values.delved: 1 }, effects: { place.conditions.restless: true } }
checks:
  - { event: DEAD, at: trip.place-enter, when: { place.conditions: restless } }
---
kind: bindings
on: { DEAD: { resolve: table.dead } }
---
kind: table
id: dead
roll: 1d1
entries:
  - { range: 1, result: 'The dead walk', effects: { place.values.echoes: 1 } }
`,
  },
]

const { registry, diagnostics } = loadPacks(PACK)
const { systems, problems } = travelSystems(registry)
const barrow = systems.find((s) => s.id === 'barrow')!
// a — b, one place a step.
const world: TravelWorld = {
  km: () => 1,
  place: () => ({ terrain: 'plains' }),
  neighbors: (h) => (h === 'a' ? ['b'] : ['a']),
  distance: (x, y) => (x === y ? 0 : 1),
  connections: () => [],
}
const oracle = () => createOracleEngine({ registry, random: sequence([0]) })
const to = (s: ReturnType<typeof startTrip>['session'], place: string) => {
  s = stepTrip({ system: barrow, world }, s, { type: 'setDestination', place }).state
  return stepTrip({ system: barrow, world, oracle: oracle() }, s, {
    type: 'travel',
    until: 'place',
  })
}

describe("a place's own sheet: what each place remembers", () => {
  it('reads the place sheet a system names; a place read as place.values', () => {
    expect(diagnostics.filter((d) => d.severity === 'error')).toEqual([])
    expect(problems).toEqual([])
    expect(barrow.placeSheet?.id).toBe('barrow/place')
    // An effect on a value the place sheet doesn't have is a warning.
    const typo = travelSystems(
      loadPacks([
        ...PACK.slice(0, 3),
        {
          ...PACK[3],
          content: PACK[3].content.replace('place.values.echoes', 'place.values.echos'),
        },
      ]).registry,
    )
    expect(typo.problems.map((p) => p.message)).toContain(
      'Effect on "place.values.echos", which the place sheet doesn\'t declare (placeSheet: in kind: system)',
    )
    const { session } = startTrip({ system: barrow, location: 'a', time: 8 * 60 })
    // Nothing kept until something changes; read with its defaults.
    expect(session.placeSheets).toBeUndefined()
    expect(tripFacts({ system: barrow, world }, session)).toMatchObject({
      place: { id: 'a', terrain: 'plains', values: { delved: 0 }, conditions: [] },
    })
  })

  it('a check reads what the checks before it in the same moment set on the place', () => {
    // The barrow with two checks more: MARK marks a place as it's entered; SEEN, after it at
    // the same moment, is there only once it's marked.
    const marking = PACK.map((f) =>
      f.path.endsWith('sheets.yaml')
        ? {
            ...f,
            content: f.content.replace(
              'conditions:',
              '  marked: { default: 0, min: 0, max: 1 }\n  seen: { default: 0, min: 0, max: 1 }\nconditions:',
            ),
          }
        : f.path.endsWith('travel.yaml')
          ? {
              ...f,
              content: f.content
                .replace(
                  'checks:\n',
                  'checks:\n  - { event: MARK, at: trip.place-enter, when: { place.values.marked: 0 } }\n  - { event: SEEN, at: trip.place-enter, when: { place.values.marked: 1 }, effects: { place.values.seen: 1 } }\n',
                )
                .replace(
                  'on: { DEAD: { resolve: table.dead } }',
                  'on: { DEAD: { resolve: table.dead }, MARK: { resolve: table.mark } }',
                )
                .concat(
                  "---\nkind: table\nid: mark\nentries:\n  - { result: 'A mark on the wall', effects: { place.values.marked: '=1' } }\n",
                ),
            }
          : f,
    )
    const loaded = loadPacks(marking)
    expect(loaded.diagnostics.filter((d) => d.severity === 'error')).toEqual([])
    const system = travelSystems(loaded.registry).systems.find((x) => x.id === 'barrow')!
    let { session: s } = startTrip({ system, location: 'a', time: 8 * 60 })
    s = stepTrip({ system, world }, s, { type: 'setDestination', place: 'b' }).state
    s = stepTrip(
      {
        system,
        world,
        oracle: createOracleEngine({ registry: loaded.registry, random: seeded('mark') }),
      },
      s,
      { type: 'travel', until: 'place' },
    ).state
    expect(s.placeSheets?.sheets.b).toMatchObject({ values: { marked: 1, seen: 1 } })
  })

  it("an action changes the place it's taken in, once; another place has its own", () => {
    const { session } = startTrip({ system: barrow, location: 'a', time: 8 * 60 })
    const delved = stepTrip({ system: barrow, world }, session, { type: 'action', id: 'delve' })
    let s = delved.state
    // Within its bounds; the action's later step saw it (restless), the condition that
    // holds by itself follows.
    expect(s.placeSheets?.sheets.a).toMatchObject({ id: 'a', values: { delved: 1 } })
    expect(s.placeSheets?.sheets.a.conditions).toHaveProperty('restless')
    expect(s.placeSheets?.sheets.a.conditions).toHaveProperty('plundered')
    expect(s.travel.reached?.above).toContain('place.values.delved')
    expect(tripAvailability({ system: barrow, world }, s).delve).toBeDefined()
    // In b, delving is free again; b isn't kept until it changes.
    s = to(s, 'b').state
    expect(s.travel.location).toBe('b')
    expect(tripAvailability({ system: barrow, world }, s).delve).toBeUndefined()
    expect(s.placeSheets?.sheets.b).toBeUndefined()
    // Back in a: a check reads the place entered, and its table changes it.
    const back = to(s, 'a')
    expect(back.entries.some((e) => e.text === 'The dead walk')).toBe(true)
    const echoes = newPlaceSheet(partyOf(barrow), 'a')!.values.echoes
    expect(back.state.placeSheets?.sheets.a.values.echoes).toBe(echoes + 1)
    expect(tripAvailability({ system: barrow, world }, back.state).delve).toBeDefined()
    // Saved and read back as plain data.
    expect(JSON.parse(JSON.stringify(back.state)).placeSheets.sheets.a.values.delved).toBe(1)
  })

  it('each map its own places, their rolls rolled for each map and the same each time', () => {
    const { session } = startTrip({ system: barrow, location: 'a', time: 8 * 60 })
    const crypt = stepTrip({ system: barrow, world }, withMapSheet(session, barrow, 'crypt'), {
      type: 'action',
      id: 'delve',
    }).state
    expect(crypt.placeSheets).toMatchObject({
      map: 'crypt',
      sheets: { a: { values: { delved: 1 } } },
    })
    const cellar = withMapSheet(crypt, barrow, 'cellar')
    expect(cellar.placeSheets).toEqual({ map: 'cellar', sheets: {} })
    expect(tripAvailability({ system: barrow, world }, cellar).delve).toBeUndefined()
    expect(placeSheetOf(cellar, partyOf(barrow), 'a')?.values.echoes).toBe(
      newPlaceSheet(partyOf(barrow), 'a', 'cellar')!.values.echoes,
    )
    // Back in the crypt, it remembers.
    const back = withMapSheet(cellar, barrow, 'crypt', undefined, crypt.placeSheets!.sheets)
    expect(tripAvailability({ system: barrow, world }, back).delve).toBeDefined()
  })
})

describe('the bundled packs: what each place remembers', () => {
  const bundled = travelSystems(loadPacks([...corePack(), ...greyMarchesPack()]).registry)
  const core = bundled.systems.find((s) => s.id === 'core')!
  const marches = bundled.systems.find((s) => s.id === 'grey-marches')!
  const reg = loadPacks([...corePack(), ...greyMarchesPack()]).registry
  // a — b, both ruins on the heath, quiet.
  const ruins: TravelWorld = {
    km: () => 3,
    place: () => ({ terrain: 'heath', tags: ['ruins'], fields: { danger: '0' } }),
    neighbors: (h) => (h === 'a' ? ['b'] : ['a']),
    distance: (x, y) => (x === y ? 0 : 1),
    connections: () => [],
  }
  const play = (system: TravelSystem, seed = 1) => ({
    system,
    world: ruins,
    oracle: createOracleEngine({ registry: reg, random: seeded(seed) }),
    random: seeded(seed),
  })
  const walk = (system: TravelSystem, s: SessionState, place: string) => {
    s = stepTrip(play(system), s, { type: 'setDestination', place }).state
    return stepTrip(play(system), s, {
      type: 'action',
      id: 'march',
      with: { until: 'destination' },
    })
  }

  it('load without problems, each naming its place sheet', () => {
    // (The example maps aren't loaded here.)
    expect(bundled.problems.filter((p) => !p.at?.includes('.maps.'))).toEqual([])
    expect(core.placeSheet?.id).toBe('core/place')
    expect(marches.placeSheet?.id).toBe('grey-marches/place')
  })

  it('Core: Explore once in each place', () => {
    const { session } = startTrip({ system: core, location: 'a', time: 8 * 60 })
    let s = stepTrip(play(core), session, { type: 'action', id: 'explore' }).state
    expect(s.placeSheets?.sheets.a.values.searched).toBe(1)
    expect(tripAvailability({ system: core, world: ruins }, s).explore).toBeDefined()
    s = walk(core, s, 'b').state
    expect(s.travel.location).toBe('b')
    expect(tripAvailability({ system: core, world: ruins }, s).explore).toBeUndefined()
  })

  it('the Grey Marches: a ruin delved stays delved, another is still to delve', () => {
    const { session } = startTrip({ system: marches, location: 'a', time: 8 * 60 })
    const delved = stepTrip(play(marches), session, { type: 'action', id: 'delve' })
    let s = delved.state
    expect(s.placeSheets?.sheets.a.values.delved).toBe(1)
    // Not tomorrow either: once in each ruin.
    s = { ...s, travel: { ...s.travel, actionsToday: [] } }
    expect(tripAvailability({ system: marches, world: ruins }, s).delve).toBeDefined()
    // (What it held told, whatever guarded it gone, and in the ruin next door.)
    s = { ...s, present: [], travel: { ...s.travel, pendingChecks: [], location: 'b' } }
    expect(tripAvailability({ system: marches, world: ruins }, s).delve).toBeUndefined()
  })

  it("the Grey Marches: a crypt's sleeper leaves it restless; coming back, the dead may rise", () => {
    const { session } = startTrip({ system: marches, location: 'a', time: 8 * 60 })
    let woke: ReturnType<typeof createOracleEngine>['resolve'] extends (...a: never[]) => infer R
      ? R
      : never
    let seed = 1
    for (; ; seed++) {
      woke = createOracleEngine({ registry: reg, random: seeded(seed) }).resolve(
        'grey-marches/crypt-contents',
        {},
      )
      if (woke.resolution.entry === 'sleeper') break
    }
    let s = applyResult(
      session,
      woke.resolution.value as Record<string, unknown>,
      marches.bindings?.stats,
      partyOf(marches),
    )
    expect(s.placeSheets?.sheets.a.conditions).toHaveProperty('restless')
    expect(tripFacts({ system: marches, world: ruins }, s)).toMatchObject({
      place: { conditions: ['restless'] },
    })
    // Its dead stay in their crypt; away and back again, more may rise.
    s = { ...s, present: [] }
    s = walk(marches, s, 'b').state
    const back = walk(marches, s, 'a')
    expect(back.state.travel.location).toBe('a')
    const told = back.entries.map((e) => e.text)
    expect(
      told.some((t) => ['The bones lie still, for now', 'The dead rise again'].includes(String(t))),
    ).toBe(true)
  })
})
