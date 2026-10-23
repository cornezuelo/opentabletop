import { loadPacks } from '@open-tabletop/oracle-engine'
import type { TravelWorld } from '@open-tabletop/travel-engine'
import { itemFromCatalogue, lookupItems } from '@open-tabletop/character-engine'
import { describe, expect, it } from 'vitest'
import { characterFromOtd, characterToOtd, newMember } from './party'
import { partyOf, startTrip, stepTrip, travelSystems, tripAvailability, tripFacts } from './trip'

/** A system whose companions carry items from its catalogue: torches burn, packs fill. */
const PACK = [
  { path: 'delve/pack.yaml', content: 'id: delve\nversion: 0.1.0\nlocale: en\nformat: 8\n' },
  {
    path: 'delve/system.yaml',
    content:
      'kind: system\nname: Delve\ntravel: travel-rules.default\nsheet: sheet.delver\nitems: [items.gear]\n',
  },
  {
    path: 'delve/sheet.yaml',
    content: `
kind: sheet
id: delver
values:
  load: { from: { sum: items.slots } }
conditions:
  laden: { when: { self.values.load: { gt: 3 } }, blocks: [travel.move] }
items:
  fields:
    slots: { default: 1, min: 0 }
    uses: { min: 0, spent: true }
  places:
    hands: { tags: [hand], room: 2 }
    pack: { tags: [pack], room: 6 }
  size: slots
`,
  },
  {
    path: 'delve/gear.yaml',
    content: `
kind: items
id: gear
items:
  torch: { name: Torch, uses: 2, tags: [light] }
  rope: { name: Rope, tags: [climbing] }
  anvil: { name: Anvil, slots: 4, weight: 9 }
`,
  },
  {
    path: 'delve/travel.yaml',
    content: `
kind: travel-rules
travel:
  hoursPerDay: 8
  start: '07:00'
  onward: { do: actions.march, with: { until: destination } }
  halt: { at: '19:00', do: actions.camp }
terrains: { plains: { multiplier: 1 } }
modes: { walk: { kmPerDay: 24 } }
actions:
  march:
    params: { until: { choices: [destination, hex] } }
    do: [{ travel.move: '{{params.until}}' }]
  camp: { do: [{ time: '07:00' }] }
  light:
    when: { characters.kael.items.tags: light }
    do: [{ effects: { party.members.items.torch.uses: -1 } }]
  scavenge: { do: [{ effects: { characters.kael.items.rope: 2, characters.kael.items.wand: 1 } }] }
  haul: { do: [{ effects: { characters.kael.items.anvil: 1 } }] }
`,
  },
]

const { registry, diagnostics } = loadPacks(PACK)
const { systems, problems } = travelSystems(registry)
const delve = systems.find((s) => s.id === 'delve')!
const world: TravelWorld = {
  hexKm: 24,
  cell: () => ({ terrain: 'plains' }),
  neighbors: (h) => (h === 'a' ? ['b'] : ['a']),
  distance: (x, y) => (x === y ? 0 : 1),
  edges: () => [],
}
const lookup = lookupItems(delve.items!)
const kael = () => {
  const m = newMember(partyOf(delve), { id: 'kael', name: 'Kael' })
  m.items = [
    {
      ...itemFromCatalogue(delve.sheet!.def.items, 'delve/gear', 'torch', lookup('torch')!.item),
      key: 'torch',
      place: 'hands',
    },
  ]
  return m
}

describe('items in a trip', () => {
  it("a system names its catalogues; a field its sheet doesn't declare is a warning", () => {
    expect(diagnostics.filter((d) => d.severity === 'error')).toEqual([])
    expect(delve.items?.map((c) => c.id)).toEqual(['delve/gear'])
    expect(problems.map((p) => [p.severity, p.message])).toEqual([
      ['warning', 'the sheet declares no item field "weight" (items.fields in the sheet)'],
    ])
  })

  it("effects give, spend and take a member's items, and the journal says so", () => {
    const { session } = startTrip({ system: delve, location: 'a', time: 8 * 60, members: [kael()] })
    let done = stepTrip({ system: delve, world }, session, { type: 'action', id: 'light' })
    expect(done.state.members![0].items![0]).toMatchObject({ count: 1, fields: { uses: 1 } })
    done = stepTrip({ system: delve, world }, done.state, { type: 'action', id: 'light' })
    expect(done.state.members![0].items).toEqual([])
    expect(done.entries.map((e) => e.code)).toContain('ITEM_SPENT')
    // Nothing tagged light left: the action isn't open.
    expect(tripAvailability({ system: delve, world }, done.state)).toHaveProperty('light')
    done = stepTrip({ system: delve, world }, done.state, { type: 'action', id: 'scavenge' })
    expect(done.state.members![0].items).toEqual([
      expect.objectContaining({ id: 'rope', count: 2, place: 'hands', from: 'delve/gear' }),
    ])
    expect(done.entries.find((e) => e.code === 'UNKNOWN_ITEM')?.data).toEqual({
      path: 'characters.kael.items.wand',
    })
    expect(
      done.entries.find(
        (e) => e.code === 'CHANGED' && e.data?.path === 'characters.kael.items.rope',
      )?.data,
    ).toMatchObject({ from: 0, to: 2 })
  })

  it('conditions read them, with their places; what holds by itself follows them', () => {
    const { session } = startTrip({ system: delve, location: 'a', time: 8 * 60, members: [kael()] })
    expect(tripFacts({ system: delve, world }, session)).toMatchObject({
      characters: {
        kael: {
          items: { torch: { count: 1, uses: 2, tags: ['light'] }, tags: ['light'] },
          places: { hands: { room: 2, used: 1, items: ['torch'] }, pack: { used: 0 } },
        },
      },
    })
    const hauled = stepTrip({ system: delve, world }, session, { type: 'action', id: 'haul' }).state
    expect(hauled.members![0].values.load).toBe(5)
    expect(hauled.members![0].conditions).toHaveProperty('laden')
    expect(tripAvailability({ system: delve, world }, hauled).travel).toMatchObject({
      value: 'laden',
      who: 'kael',
    })
  })

  it('go with a character as OTD, and back', () => {
    const m = kael()
    m.places = { tail: { name: 'Tail', tags: ['hand'] } }
    expect(characterFromOtd(characterToOtd(m))).toEqual(m)
  })
})
