import { createOracleEngine, emptyState, loadPacks } from '@open-tabletop/oracle-engine'
import { seeded } from '@open-tabletop/random'
import { describe, expect, it } from 'vitest'
import { clockThen, startClocks } from './clocks'
import { worldStep } from './world'
import { travelSystems } from './trip'

/**
 * A system with two clocks (one that starts over once full, one plain) and the world's
 * reaction to the first filling: words, a table rolled, effects.
 */
const PACK = [
  { path: 'marks/pack.yaml', content: 'id: marks\nversion: 0.1.0\nlocale: en\nformat: 10\n' },
  {
    path: 'marks/system.yaml',
    content: 'kind: system\nname: Marks\nclocks: clocks.default\nworld: world.default\n',
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
    then: reset
  the-siege:
    name: The siege
    segments: 8
---
kind: table
id: raid
roll: 1d1
entries:
  - range: 1
    result: 'Farms burn ({{world.clocks.the-siege}} of the siege)'
    effects: { world.clocks.the-siege: '{{1d1}}', factions.vale.values.strength: -1 }
---
kind: world
id: default
reactions:
  raids:
    on: world.clocks.raids.full
    do:
      - { id: down, say: 'The clans come down ({{world.clocks.the-siege}} of the siege).' }
      - roll: table.raid
      - { do: world.turn, when: { world.clocks.the-siege: { gte: 5 } } }
`,
  },
  {
    path: 'marks/locales/es/clocks.yaml',
    content:
      'clocks/default:\n  clocks:\n    the-siege: El asedio\nworld/default:\n  reactions:\n    raids:\n      do:\n        down:\n          say: Los clanes bajan ({{world.clocks.the-siege}} del asedio).\n',
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

  it('reports broken clocks, and unknown tables in the world’s rules', () => {
    const broken = [
      ...PACK.slice(0, 2),
      {
        path: 'marks/clocks.yaml',
        content: 'kind: clocks\nid: default\nclocks:\n  a: { segments: 2, filled: 3 }\n',
      },
    ]
    const { problems } = travelSystems(loadPacks(broken).registry)
    expect(problems.map((p) => p.message)).toContain('more than its 2 segments')
    const unknown = [
      ...PACK.slice(0, 2),
      {
        path: 'marks/clocks.yaml',
        content: `kind: clocks
id: default
clocks:
  b: { segments: 2 }
---
kind: world
id: default
reactions:
  b: { on: world.clocks.b.full, do: [{ roll: table.nowhere }] }
  c: { on: world.clocks.other.full, do: [{ say: Hm }] }
`,
      },
    ]
    expect(
      travelSystems(loadPacks(unknown).registry).problems.map((p) => [p.severity, p.message]),
    ).toEqual([
      ['error', 'Unknown table "table.nowhere"'],
      [
        'warning',
        'the system declares no clock "other": heard only if a clock made by hand has this name (it declares world.clocks.b.full)',
      ],
    ])
  })

  it('says what a step of the world does: its words, its roll, the effects of both', () => {
    const oracle = createOracleEngine({ registry, random: seeded(1) })
    const reading = {
      system: marks.world!,
      oracle,
      random: seeded(1),
      locale: 'es',
      fallback: 'en',
    }
    const [say, roll, turn] = marks.world!.def.reactions.raids.do
    const facts = { clocks: { 'the-siege': 3 } }
    expect(worldStep(reading, emptyState(), say, facts)?.line).toEqual({
      say: 'Los clanes bajan (3 del asedio).',
    })
    const rolled = worldStep(reading, emptyState(), roll, facts)!
    expect(rolled.line).toEqual({ table: 'marks/raid', text: 'Farms burn (3 of the siege)' })
    // The result's effects, the roll read.
    expect(rolled.effects).toEqual({
      'world.clocks.the-siege': 1,
      'factions.vale.values.strength': -1,
    })
    // A step whose condition doesn't hold does nothing; one that does, brings a turn.
    expect(worldStep(reading, emptyState(), turn, facts)).toBeUndefined()
    expect(worldStep(reading, emptyState(), turn, { clocks: { 'the-siege': 5 } })?.do).toBe(
      'world.turn',
    )
    // What becomes of a clock once full: its own say, else it stays full.
    expect(clockThen(marks.clocks, 'raids')).toBe('reset')
    expect(clockThen(marks.clocks, 'the-siege')).toBe('keep')
    expect(clockThen(marks.clocks, undefined)).toBe('keep')
  })
})
