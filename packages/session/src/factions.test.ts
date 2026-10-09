import { createOracleEngine, loadPacks } from '@open-tabletop/oracle-engine'
import { emptyState } from '@open-tabletop/oracle-engine'
import { seeded, sequence } from '@open-tabletop/random'
import type { TerritoryWorld } from '@open-tabletop/faction-engine'
import { describe, expect, it } from 'vitest'
import { factionFacts, startFactions, worldTurn } from './factions'
import { travelSystems } from './trip'

/** Two factions on a row of hexes: the clans in the hills, the vale in the vale. */
const PACK = [
  { path: 'marks/pack.yaml', content: 'id: marks\nversion: 0.1.0\nlocale: en\nformat: 2\n' },
  {
    path: 'marks/system.yaml',
    content: 'kind: system\nname: Marks\nfactions: default\n',
  },
  {
    path: 'marks/factions.yaml',
    content: `
kind: sheet
id: faction
values:
  strength: { default: 2, min: 0, max: 6 }
  reputation: { default: 0, min: -3, max: 3 }
conditions:
  at-war: {}
---
kind: factions
id: default
sheet: faction
turn: turn
every: 7
factions:
  clans:
    name: The Clans
    color: '#8b1e1e'
    values: { strength: 4 }
    territory: { regions: [Hills] }
  vale:
    name: { en: The Vale, es: El Valle }
    territory: { hexes: ['1', '99'] }
    turn: vale-turn
---
kind: table
id: turn
roll: 1d2
entries:
  - range: 1-2
    result: The clans raid the vale
    when: { faction.values.strength: { gte: 3 } }
    effects:
      faction.territory: 1
      factions.vale.values.strength: -1
      faction.conditions.at-war: true
      world.clocks.the-clans-march: 1
  - { range: 1-2, result: Quiet }
---
kind: table
id: vale-turn
roll: 1d1
entries:
  - { range: 1, result: 'The Vale musters ({{factions.clans.territory}} hexes held by the clans)', effects: { faction.values.reputation: '+{{1d2}}' } }
`,
  },
]

const { registry } = loadPacks(PACK)
const marks = travelSystems(registry).systems.find((s) => s.id === 'marks')!
const row: TerritoryWorld = {
  neighbors: (h) => [Number(h) - 1, Number(h) + 1].filter((i) => i >= 0 && i < 6).map(String),
}
const map = {
  regionHexes: (name: string) => (name === 'Hills' ? ['4', '5'] : []),
  exists: (h: string) => Number(h) < 6,
}

describe('factions in a world', () => {
  it('reads the factions a system names, with their sheet', () => {
    expect(marks.factions?.def.factions.clans.name).toBe('The Clans')
    expect(marks.factions?.sheet.id).toBe('marks/faction')
    const { problems } = travelSystems(
      loadPacks([
        ...PACK.slice(0, 2),
        {
          path: 'marks/factions.yaml',
          content: 'kind: factions\nid: default\nsheet: nope\nturn: gone\nfactions: { a: {} }\n',
        },
      ]).registry,
    )
    expect(problems.map((p) => p.message)).toEqual(
      expect.arrayContaining(['Unknown sheet "nope"', 'Unknown table or generator "gone"']),
    )
  })

  it('start with their values and their territory on the map', () => {
    const state = startFactions(marks.factions!, map, 0)
    expect(state.territories).toEqual({ clans: ['4', '5'], vale: ['1'] })
    expect(state.factions.map((f) => [f.id, f.values.strength])).toEqual([
      ['clans', 4],
      ['vale', 2],
    ])
    expect(factionFacts(state, marks.factions, 'es')).toMatchObject({
      factions: { vale: { name: 'El Valle', territory: 1, values: { strength: 2 } } },
    })
  })

  it('take their turns: each rolls its table and changes the world', () => {
    const start = startFactions(marks.factions!, map, 0)
    const oracle = createOracleEngine({ registry, random: seeded('turn') })
    const done = worldTurn(
      {
        system: marks.factions!,
        oracle,
        world: row,
        random: sequence([0, 0, 0.9]),
        time: 7 * 1440,
      },
      start,
      emptyState(),
    )
    const [clans, vale] = done.lines
    expect(clans).toMatchObject({ faction: 'clans', text: 'The clans raid the vale' })
    expect(clans.territory).toEqual([{ type: 'TERRITORY_GAINED', faction: 'clans', hex: '3' }])
    expect(done.state.territories.clans).toEqual(['4', '5', '3'])
    expect(done.ticks).toEqual({ 'the-clans-march': 1 })
    expect(done.state.factions[0].conditions).toHaveProperty('at-war')
    // The Vale sees what the clans did before it: three hexes, and its strength down.
    expect(vale.text).toBe('The Vale musters (3 hexes held by the clans)')
    expect(done.state.factions[1].values).toMatchObject({ strength: 1 })
    expect(done.state.factions[1].values.reputation).toBeGreaterThan(0)
    expect(done.state.lastTurn).toBe(7 * 1440)
  })
})
