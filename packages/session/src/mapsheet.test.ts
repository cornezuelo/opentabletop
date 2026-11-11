import { loadPacks } from '@open-tabletop/oracle-engine'
import type { TravelWorld } from '@open-tabletop/travel-engine'
import { describe, expect, it } from 'vitest'
import { newMapSheet } from './party'
import {
  partyOf,
  startTrip,
  stepTrip,
  travelSystems,
  tripAvailability,
  tripFacts,
  withMapSheet,
} from './trip'

/** A system whose maps keep their own values: an alarm raised by searching, read by a check. */
const PACK = [
  { path: 'vault/pack.yaml', content: 'id: vault\nversion: 0.1.0\nlocale: en\nformat: 15\n' },
  {
    path: 'vault/system.yaml',
    content:
      'kind: system\nname: Vault\ntravel: travel-rules.default\nbindings: bindings.default\nmapSheet: sheet.dungeon\n',
  },
  {
    path: 'vault/sheets.yaml',
    content: `
kind: sheet
id: dungeon
values:
  alarm: { default: 0, min: 0, max: 3 }
  depth: { default: '{{1d6}}' }
conditions:
  roused: { when: { self.values.alarm: { gte: 3 } } }
`,
  },
  {
    path: 'vault/travel.yaml',
    content: `
kind: travel-rules
travel: { hoursPerDay: 8, start: '07:00' }
terrains: { plains: { multiplier: 1 } }
modes: { walk: { kmPerDay: 24 } }
actions:
  search:
    when: { map.values.alarm: { lt: 3 } }
    do: [{ time: 10 }, { effects: { map.values.alarm: 2 } }, { effects: { map.values.alarm: 2 } }]
---
kind: bindings
on: {}
---
kind: table
id: noise
roll: 1d1
entries:
  - { range: 1, result: Noise, effects: { map.values.alarm: 1 } }
`,
  },
]

const { registry, diagnostics } = loadPacks(PACK)
const { systems, problems } = travelSystems(registry)
const vault = systems.find((s) => s.id === 'vault')!
const world: TravelWorld = {
  km: () => 1,
  place: () => ({ terrain: 'plains' }),
  neighbors: () => [],
  distance: () => 0,
  connections: () => [],
}

describe("a map's own sheet: values kept per map", () => {
  it('reads the map sheet a system names; every trip has one, read as map.values', () => {
    expect(diagnostics.filter((d) => d.severity === 'error')).toEqual([])
    expect(problems).toEqual([])
    expect(vault.mapSheet?.id).toBe('vault/dungeon')
    // An effect on a value the map sheet doesn't have is a warning.
    const typo = travelSystems(
      loadPacks([
        ...PACK.slice(0, 3),
        {
          ...PACK[3],
          content: PACK[3].content.replace('map.values.alarm: 1', 'map.values.alram: 1'),
        },
      ]).registry,
    )
    expect(typo.problems.map((p) => p.message)).toContain(
      'Effect on "map.values.alram", which the map sheet doesn\'t declare (mapSheet: in kind: system)',
    )
    const { session } = startTrip({ system: vault, location: 'a' })
    expect(session.map).toMatchObject({ id: 'map', sheet: 'vault/dungeon', values: { alarm: 0 } })
    expect(tripFacts({ system: vault, world }, session)).toMatchObject({
      map: { values: { alarm: 0 }, conditions: [] },
    })
  })

  it("effects change it within its bounds, an action's later steps see it, conditions follow", () => {
    const { session } = startTrip({ system: vault, location: 'a', time: 8 * 60 })
    const searched = stepTrip({ system: vault, world }, session, {
      type: 'action',
      id: 'search',
    }).state
    expect(searched.map?.values.alarm).toBe(3)
    expect(searched.map?.conditions).toHaveProperty('roused')
    // At its maximum, noted as what hit a bound today; the action's `when` now says no.
    expect(searched.travel.reached?.above).toContain('map.values.alarm')
    expect(tripAvailability({ system: vault, world }, searched).search).toBeDefined()
  })

  it('each map its own: the host hands the trip the one it keeps for the map it is on', () => {
    const { session } = startTrip({ system: vault, location: 'a', time: 8 * 60 })
    const first = stepTrip({ system: vault, world }, withMapSheet(session, vault, 'crypt'), {
      type: 'action',
      id: 'search',
    }).state
    const crypt = first.map!
    expect(crypt).toMatchObject({ id: 'crypt', values: { alarm: 3 } })
    // Another map starts fresh, its rolled values rolled for it, the same each time.
    const cellar = withMapSheet(first, vault, 'cellar')
    expect(cellar.map).toMatchObject({ id: 'cellar', values: { alarm: 0 } })
    expect(cellar.map?.values.depth).toBe(newMapSheet(partyOf(vault), 'cellar')!.values.depth)
    // Back in the crypt, it remembers.
    expect(withMapSheet(cellar, vault, 'crypt', crypt).map?.values.alarm).toBe(3)
  })
})
