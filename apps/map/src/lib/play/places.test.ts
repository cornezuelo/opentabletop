import { describe, expect, it } from 'vitest'
import { createOracleEngine } from '@open-tabletop/oracle-engine'
import { seeded } from '@open-tabletop/random'
import { startTrip, stepTrip, tripAvailability } from '@open-tabletop/session'
import { exampleMaps } from '../io/examples'
import { bundleToMap, mapToBundle, parseMapFile } from '../io/otd'
import { editor } from '../store/editor.svelte'
import { library } from './packs'
import { activeSystem } from './systems'
import { mapWorld } from './world'

/**
 * Places from results on the map: the Grey Marches' discovery makes ruins from their
 * template in the unmapped east, written into the map as a point of interest that remembers
 * its template, with the tag the rules read (a ruin can be delved), kept through OTD.
 */
const greyMarches = () => parseMapFile(exampleMaps().find((m) => m.id === 'greymarches1')!.json)

describe('places made in play', () => {
  it('discovery’s ruins are written into the map, delved, and kept in the file', () => {
    editor.open(greyMarches())
    const system = activeSystem()
    let found: [string, NonNullable<ReturnType<typeof stepTrip>['discovered'][string]>] | undefined
    for (let seed = 1; seed < 200 && !found; seed++) {
      const options = {
        system,
        world: mapWorld(editor.map),
        oracle: createOracleEngine({ registry: library.registry, random: seeded(seed) }),
        random: seeded(seed),
        locale: 'en',
        discover: 'entered' as const,
      }
      // From the Hollow Hills' edge into the unmapped east.
      const { session } = startTrip({ system, location: '18,9', season: 'summer' })
      const planned = stepTrip(options, session, { type: 'setDestination', hex: '19,9' })
      const marched = stepTrip(options, planned.state, {
        type: 'action',
        id: 'march',
        with: { until: 'destination' },
      })
      found = Object.entries(marched.discovered).find(([, d]) =>
        d.places?.some((p) => p.template === 'grey-marches/default/ruins'),
      )
    }
    expect(found).toBeDefined()
    const [hex, discovered] = found!
    editor.applyDiscovery({ [hex]: discovered } as never)
    const poi = editor.map.hexes[hex as keyof typeof editor.map.hexes]!.pois!.at(-1)!
    expect(poi).toMatchObject({
      name: 'Ruins',
      icon: 'game:castle-ruins',
      template: 'grey-marches/default/ruins',
      description: expect.stringMatching(/^Ruins: /),
    })
    expect(editor.map.hexes[hex as keyof typeof editor.map.hexes]!.tags).toContain('ruins')
    // A ruin of the map now: the Company can delve it by day.
    const { session } = startTrip({ system, location: hex, season: 'summer' })
    expect(tripAvailability({ system, world: mapWorld(editor.map) }, session).delve).toBeUndefined()
    // Through OTD: the template is a reference of the POI's (`place:<template>`).
    const bundle = mapToBundle(editor.map, editor.campaign)
    expect(bundle.pois.find((p) => p.id === poi.id)?.refs).toEqual([
      'place:grey-marches/default/ruins',
    ])
    const back = bundleToMap(bundle).map.hexes[hex as keyof typeof editor.map.hexes]!.pois!
    expect(back.find((p) => p.id === poi.id)?.template).toBe('grey-marches/default/ruins')
  })
})
