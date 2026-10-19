import { createOracleEngine, emptyState, loadPacks } from '@open-tabletop/oracle-engine'
import { seeded } from '@open-tabletop/random'
import { describe, expect, it } from 'vitest'
import { clockFull, startClocks } from './clocks'
import { travelSystems } from './trip'

/** A system with two clocks: one that rolls a table when full and starts over, one plain. */
const PACK = [
  { path: 'marks/pack.yaml', content: 'id: marks\nversion: 0.1.0\nlocale: en\nformat: 5\n' },
  {
    path: 'marks/system.yaml',
    content: 'kind: system\nname: Marks\nclocks: default\n',
  },
  {
    path: 'marks/clocks.yaml',
    content: `
kind: clocks
id: default
clocks:
  raids:
    name: Raids on the Vale
    segments: 4
    filled: 1
    onFull:
      description: The clans come down from the hills.
      resolve: raid
      effects: { world.clocks.the-siege: 1, factions.vale.values.strength: -1 }
      then: reset
  the-siege:
    name: { en: The siege, es: El asedio }
    segments: 8
---
kind: table
id: raid
roll: 1d1
entries:
  - range: 1
    result: 'Farms burn ({{world.clocks.the-siege}} of the siege)'
    effects: { world.clocks.the-siege: '{{1d1}}', factions.vale.values.strength: -1 }
`,
  },
  {
    path: 'marks/locales/es/clocks.yaml',
    content:
      'clocks/default:\n  clocks:\n    raids:\n      onFull:\n        description: Los clanes bajan de las colinas.\n',
  },
]

const { registry } = loadPacks(PACK)
const marks = travelSystems(registry).systems.find((s) => s.id === 'marks')!

describe('progress clocks a system declares', () => {
  it('reads the clocks a system names, and starts them', () => {
    expect(marks.clocks?.id).toBe('marks/default')
    expect(startClocks(marks.clocks!, 'es', 'en')).toEqual([
      { ref: 'raids', name: 'Raids on the Vale', segments: 4, filled: 1 },
      { ref: 'the-siege', name: 'El asedio', segments: 8, filled: 0 },
    ])
  })

  it('reports broken clocks and unknown tables', () => {
    const broken = [
      ...PACK.slice(0, 2),
      {
        path: 'marks/clocks.yaml',
        content: 'kind: clocks\nid: default\nclocks:\n  a: { segments: 2, filled: 3 }\n',
      },
    ]
    const { problems } = travelSystems(loadPacks(broken).registry)
    expect(problems.map((p) => p.message)).toEqual(['more than its 2 segments'])
    const unknown = [
      ...PACK.slice(0, 2),
      {
        path: 'marks/clocks.yaml',
        content:
          'kind: clocks\nid: default\nclocks:\n  b: { segments: 2, onFull: { resolve: nowhere } }\n',
      },
    ]
    expect(travelSystems(loadPacks(unknown).registry).problems.map((p) => p.message)).toEqual([
      'Unknown table or generator "nowhere"',
    ])
  })

  it('says what a full clock does: its words, its roll, the effects of both, then', () => {
    const oracle = createOracleEngine({ registry, random: seeded(1) })
    const done = clockFull(
      {
        system: marks.clocks!,
        oracle,
        random: seeded(1),
        facts: { clocks: { 'the-siege': 3 } },
        locale: 'es',
        fallback: 'en',
      },
      emptyState(),
      'raids',
    )!
    expect(done.full).toEqual({
      ref: 'raids',
      description: 'Los clanes bajan de las colinas.',
      table: 'marks/raid',
      text: 'Farms burn (3 of the siege)',
      // Its own and the result's, added up; the roll read.
      effects: { 'world.clocks.the-siege': 2, 'factions.vale.values.strength': -2 },
      then: 'reset',
    })
    // A plain clock: nothing but staying full.
    expect(
      clockFull({ system: marks.clocks!, oracle, random: seeded(1) }, emptyState(), 'the-siege')!
        .full,
    ).toEqual({ ref: 'the-siege', effects: {}, then: 'keep' })
    expect(
      clockFull({ system: marks.clocks!, oracle, random: seeded(1) }, emptyState(), 'nope'),
    ).toBeUndefined()
  })
})
