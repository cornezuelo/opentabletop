import { createOracleEngine, loadPacks } from '@open-tabletop/oracle-engine'
import { seeded } from '@open-tabletop/random'
import type { TravelWorld } from '@open-tabletop/travel-engine'
import { describe, expect, it } from 'vitest'
import { corePack, greyMarchesPack } from './core.testing'
import { createDiscovery } from './discovery'
import { lookupPlaces, makePlace, parsePlaces } from './places'
import { partyOf, startTrip, stepTrip, travelSystems, withPlacesMade } from './trip'

const { registry } = loadPacks([...corePack(), ...greyMarchesPack()])
const { systems, problems } = travelSystems(registry)
const core = systems.find((s) => s.id === 'core')!
const marches = systems.find((s) => s.id === 'grey-marches')!
const plain: TravelWorld = {
  km: () => 10,
  place: () => ({ terrain: 'plains' }),
  neighbors: () => [],
  distance: () => 0,
  connections: () => [],
}

describe('catalogues of places', () => {
  it('are read, and their problems said', () => {
    expect(
      parsePlaces({
        kind: 'places',
        id: 'p',
        places: { 'a.b': { name: 'A' }, c: { icon: 3, colour: 'red' } },
      }).errors,
    ).toEqual([
      'places.a.b: an id without dots',
      'places.c.colour: unknown key in a place',
      'places.c.name: expected a text',
      "places.c.icon: expected an icon's id",
    ])
    const { places } = parsePlaces({
      kind: 'places',
      id: 'p',
      places: {
        camp: { name: { en: 'Camp', es: 'Campamento' }, tags: 'camp', fields: { fires: 2 } },
      },
    })
    expect(places?.places.camp).toEqual({
      name: { en: 'Camp', es: 'Campamento' },
      tags: ['camp'],
      fields: { fires: 2 },
    })
  })

  it('make a place in a language, its texts filled from the result and rolled', () => {
    const { places } = parsePlaces({
      kind: 'places',
      id: 'p',
      places: {
        camp: {
          name: { en: 'Camp of {{who}}', es: 'Campamento de {{who}}' },
          fields: { fires: '{{1d6}}', size: 3 },
        },
      },
    })
    const lookup = lookupPlaces([{ id: 'x/p', def: places! }])
    expect(makePlace('camp', lookup, { who: 'Ana' }, 'es', () => 4)).toEqual({
      template: 'x/p/camp',
      name: 'Campamento de Ana',
      fields: [
        { key: 'fires', value: '4' },
        { key: 'size', value: '3' },
      ],
    })
    expect(makePlace('tower', lookup, {}, 'en')).toBeUndefined()
  })

  it('the bundled packs read without problems', () => {
    expect(problems.filter((p) => p.at?.startsWith('@places'))).toEqual([])
    expect(core.places?.map((c) => c.id)).toEqual(['core/default'])
    expect(marches.places?.map((c) => c.id)).toEqual(['grey-marches/default'])
  })
})

describe('results that make places', () => {
  it('Core: exploring may find a landmark, made on the party’s hex for the host to write', () => {
    let found
    for (let seed = 1; seed < 100 && !found; seed++) {
      const { session } = startTrip({ system: core, location: 'h1', seed: 'x' })
      const oracle = createOracleEngine({ registry, random: seeded(seed) })
      const done = stepTrip({ system: core, world: plain, oracle, locale: 'es' }, session, {
        type: 'action',
        id: 'explore',
      })
      if (done.entries.some((e) => e.code === 'PLACE_MADE')) found = done
    }
    expect(found).toBeDefined()
    const made = found!.entries.find((e) => e.code === 'PLACE_MADE')!
    expect(made.data).toEqual({
      hex: 'h1',
      template: 'core/default/landmark',
      name: 'Hito',
      description: 'Algo que merece la pena volver a encontrar.',
      icon: 'game:obelisk',
      tags: ['landmark'],
    })
    const place = { ...made.data! }
    delete place.hex
    expect(found!.discovered).toEqual({ h1: { places: [place], tags: ['landmark'] } })
  })

  it('a template nobody has is said in the journal, and makes nothing', () => {
    const { session } = startTrip({ system: core, location: 'h1', seed: 'x' })
    const rules = {
      ...core.rules,
      actions: { ...core.rules.actions, build: { do: [{ effects: { 'place.pois.tower': 1 } }] } },
    }
    const done = stepTrip({ system: { ...core, rules }, world: plain }, session, {
      type: 'action',
      id: 'build',
    })
    expect(done.entries.find((e) => e.code === 'UNKNOWN_PLACE')?.data).toEqual({
      template: 'tower',
    })
    expect(done.discovered).toEqual({})
  })

  it('the Grey Marches: discovery’s ruins and shrine are made from their templates, its camp from its text', () => {
    const made: Record<string, unknown> = {}
    for (let seed = 1; seed < 300 && Object.keys(made).length < 3; seed++) {
      const discovery = createDiscovery({
        world: { ...plain, place: () => ({}) },
        oracle: createOracleEngine({ registry, random: seeded(seed) }),
        discover: marches.bindings!.discover!,
        reveal: 'entered',
        locale: 'en',
        random: seeded(seed),
        places: partyOf(marches).places,
      })
      const state = { oracle: { decks: {}, used: {} } as never }
      const out = discovery.arrive(state, {}, 'h')
      const d = out.discovered
      if (d?.places?.[0]) made[d.places[0].template] ??= d
      else if (d?.poi?.startsWith('A camp')) made.camp ??= d
    }
    expect(made['grey-marches/default/ruins']).toMatchObject({
      tags: ['ruins'],
      places: [
        {
          name: 'Ruins',
          icon: 'game:castle-ruins',
          description: expect.stringMatching(/^Ruins: /),
        },
      ],
    })
    expect(made['grey-marches/default/ruins']).not.toHaveProperty('poi')
    expect(made['grey-marches/default/shrine']).toMatchObject({ tags: ['shrine'] })
    expect(made.camp).toMatchObject({
      tags: ['camp'],
      poi: expect.stringMatching(/^A camp of \d+ travellers$/),
    })
  })

  it('places made by results join what discovery found, by hex', () => {
    const place = { template: 'x/p/camp', name: 'Camp', tags: ['camp'] }
    expect(
      withPlacesMade({ h: { terrain: 'forest', tags: ['wood'] } }, [
        {
          id: 'j1',
          at: '',
          time: 0,
          source: 'travel',
          code: 'PLACE_MADE',
          data: { hex: 'h', ...place },
        },
      ]),
    ).toEqual({ h: { terrain: 'forest', tags: ['wood', 'camp'], places: [place] } })
  })
})
