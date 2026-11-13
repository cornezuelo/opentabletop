import { createOracleEngine, loadPacks } from '@open-tabletop/oracle-engine'
import { seeded } from '@open-tabletop/random'
import { createCharacter } from '@open-tabletop/character-engine'
import type { TravelWorld } from '@open-tabletop/travel-engine'
import { describe, expect, it } from 'vitest'
import { startTrip, stepTrip, travelSystems } from './trip'

/**
 * A made-up system (docs/advancement.md): knacks are items in a place of their own, each
 * of a tier a character's level must reach (`needs:`); a level gained is a choice of a
 * knack the one rising may learn now (`from: items.knacks`, `where:` on the entry).
 */
const PACK = [
  { path: 'rise/pack.yaml', content: 'id: rise\nversion: 0.1.0\nlocale: en\nformat: 15\n' },
  {
    path: 'rise/system.yaml',
    content:
      'kind: system\nname: Rise\ntravel: travel-rules.default\nsheet: sheet.hero\nitems: [items.knacks]\n',
  },
  {
    path: 'rise/rules.yaml',
    content: `
kind: sheet
id: hero
values:
  level: { default: 1, min: 1 }
items:
  fields:
    tier: { min: 1 }
  places:
    knacks: { tags: [knack], takes: { item.tags: knack }, carried: false, display: cards }
---
kind: items
id: knacks
items:
  quick: { name: Quick, tags: [knack], tier: 1, fits: { place.tags: knack } }
  sure: { name: Sure-footed, tags: [knack], tier: 2, fits: { place.tags: knack }, needs: { self.values.level: { gte: 2 } } }
  grim: { name: Grim, tags: [knack], tier: 3, fits: { place.tags: knack }, needs: { self.values.level: { gte: 3 } } }
  lucky: { name: Lucky, tags: [knack, rare], tier: 1, fits: { place.tags: knack } }
---
kind: travel-rules
travel: { hoursPerDay: 8, start: '07:00' }
terrains: { plains: { multiplier: 1 } }
modes: { walk: { kmPerDay: 24 } }
actions:
  march: { do: [{ travel.move: destination }] }
  train: { do: [{ effects: { acting.items.grim: 1 } }] }
  # Whom to send: only one of the party of level 2 or more (each listed one as candidate).
  send:
    params:
      who: { from: party.members, where: { 'characters[candidate].values.level': { gte: 2 } } }
    do: [{ ask: params.who }]
  rise:
    params:
      knack: { name: Which knack?, from: items.knacks, where: { not: { item.tags: rare } } }
    do:
      - { effects: { acting.values.level: 1 } }
      - { ask: params.knack }
      - { effects: { 'acting.items[params.knack]': 1 } }
`,
  },
]

const world: TravelWorld = {
  km: () => 24,
  place: () => ({ terrain: 'plains' }),
  neighbors: () => [],
  distance: () => 0,
  connections: () => [],
}

function begin() {
  const { registry, diagnostics } = loadPacks(PACK)
  expect(diagnostics).toEqual([])
  const { systems, problems } = travelSystems(registry)
  expect(problems).toEqual([])
  const system = systems.find((s) => s.id === 'rise')!
  const sheet = system.sheet!
  const members = [createCharacter(sheet.def, sheet.id, { id: 'ana', name: 'Ana' })]
  const { session } = startTrip({ system, location: 'a', time: 8 * 60, seed: 'r', members })
  const options = { system, world, oracle: createOracleEngine({ registry, random: seeded(1) }) }
  return { system, options, session: { ...session, acting: 'ana' } }
}

describe('advancement: a choice listed from a catalogue', () => {
  it('offers the entries its where and their needs allow, read with the level just gained', () => {
    const { options, session } = begin()
    // Level 1 → 2: Quick and Sure-footed (tier 2 needs level 2, met by the step before);
    // Grim needs 3; Lucky is rare, left out by where.
    let done = stepTrip(options, session, { type: 'action', id: 'rise' })
    expect(done.state.travel.waiting).toMatchObject({ ask: 'knack', choices: ['quick', 'sure'] })
    done = stepTrip(options, done.state, { type: 'resume', choice: 'sure' })
    const ana = done.state.members![0]
    expect(ana.values.level).toBe(2)
    expect(ana.items!.map((i) => [i.id, i.place])).toEqual([['sure', 'knacks']])
    // The next level offers Grim too.
    done = stepTrip(options, done.state, { type: 'action', id: 'rise' })
    expect(done.state.travel.waiting?.choices).toEqual(['quick', 'sure', 'grim'])
  })

  it('given by an effect without what it needs, it is given all the same, and said', () => {
    const { options, session } = begin()
    const done = stepTrip(options, session, { type: 'action', id: 'train' })
    expect(done.state.members![0].items!.map((i) => i.id)).toEqual(['grim'])
    expect(done.entries.find((e) => e.code === 'ITEM_NEEDS_UNMET')?.data).toEqual({
      path: 'characters.ana.items.grim',
    })
  })

  it('where: keeps the listed ones of the trip it holds for, each read as candidate', () => {
    const { options, session } = begin()
    // Ana is level 1: nobody to send, nothing asked.
    let done = stepTrip(options, session, { type: 'action', id: 'send' })
    expect(done.state.travel.waiting).toBeUndefined()
    done = stepTrip(options, done.state, { type: 'action', id: 'rise' })
    done = stepTrip(options, done.state, { type: 'resume', choice: 'quick' })
    done = stepTrip(options, done.state, { type: 'action', id: 'send' })
    expect(done.state.travel.waiting).toMatchObject({ ask: 'who', choices: ['ana'] })
  })
})
