import { describe, expect, it } from 'vitest'
import { validateBundle } from '@open-tabletop/schema'
import { createMap } from '../model/defaults'
import { serializeMap } from '../model/serialize'
import { bundleToMap, mapToBundle, parseMapFile } from './otd'

function sampleMap() {
  const map = createMap('Kal-Arath')
  map.scale.hexKm = 30
  map.hexes['1,2'] = {
    terrain: 'forest',
    name: 'Bosque viejo',
    notes: 'Corto',
    note: 'Kal-Arath/Hexes/0203',
    tags: ['ruins'],
    fields: [{ key: 'danger', value: '3' }],
    icon: { id: 'game:castle', scale: 1.5 },
    pois: [{ id: 'poi000000001', name: 'Altar', description: 'Sangre', note: 'Lugares/Altar' }],
  }
  map.hexes['2,2'] = { icon: { id: 'game:tipi' } }
  map.paths = [{ id: 'road00000001', kind: 'road', hexes: ['1,2', '2,2', '3,2'], nodes: [0, 2] }]
  map.labels = [
    {
      id: 'label0000001',
      text: 'Kyrg',
      x: 1,
      y: 2,
      style: {
        font: 'fell',
        size: 1,
        color: '#000000',
        rotation: 0,
        italic: false,
        halo: true,
        haloColor: '#ffffff',
        haloWidth: 0.2,
      },
    },
  ]
  return map
}

describe('OTD conversion', () => {
  it('produces a valid bundle with POIs as entities and editor data in ext.hexmapper', () => {
    const bundle = mapToBundle(sampleMap())
    expect(validateBundle(bundle).errors).toEqual([])
    const map = bundle.maps[0]
    expect(map.scale).toEqual({ hexKm: 30 })
    expect(map.hexes['1,2']).toEqual({
      terrain: 'forest',
      name: 'Bosque viejo',
      notes: 'Corto',
      noteRef: 'Kal-Arath/Hexes/0203',
      tags: ['ruins'],
      stats: [{ key: 'danger', value: '3' }],
    })
    expect(map.hexes['2,2']).toBeUndefined() // only an icon: editor data
    expect(bundle.pois).toEqual([
      {
        id: 'poi000000001',
        type: 'poi',
        name: 'Altar',
        description: 'Sangre',
        noteRef: 'Lugares/Altar',
        location: { map: map.id, hex: '1,2' },
      },
    ])
    expect((map.ext as { hexmapper: { icons: object } }).hexmapper.icons).toEqual({
      '1,2': { id: 'game:castle', scale: 1.5 },
      '2,2': { id: 'game:tipi' },
    })
  })

  it('round-trips through the bundle without losing editor data', () => {
    const original = sampleMap()
    const back = bundleToMap(JSON.parse(JSON.stringify(mapToBundle(original))))
    expect(back.hexes).toEqual(original.hexes)
    expect(back.paths).toEqual(original.paths)
    expect(back.labels).toEqual(original.labels)
    expect(back.scale).toEqual(original.scale)
    expect(back.meta).toEqual(original.meta)
    expect(back.grid).toEqual(original.grid)
    expect(back.print).toEqual(original.print)
  })

  it("keeps other tools' data intact across a load/save cycle", () => {
    const bundle = mapToBundle(sampleMap()) as Record<string, unknown>
    const maps = bundle.maps as Record<string, unknown>[]
    maps[0].ext = { ...(maps[0].ext as object), travelTool: { fog: [1, 2] } }
    bundle.parties = [{ id: 'party0000001', type: 'party', name: 'Los de siempre' }]
    bundle.log = [
      { id: 'l1', time: 0, at: '2026-10-06T00:00:00Z', source: 'oracle', code: 'TABLE_RESOLVED' },
    ]
    const resaved = mapToBundle(bundleToMap(JSON.parse(JSON.stringify(bundle))))
    expect(resaved.maps[0].ext).toMatchObject({ travelTool: { fog: [1, 2] } })
    expect(resaved.parties).toEqual(bundle.parties)
    expect(resaved.log).toEqual(bundle.log)
  })

  it('opens both OTD bundles and legacy files', () => {
    const map = sampleMap()
    expect(parseMapFile(JSON.stringify(mapToBundle(map))).meta.id).toBe(map.meta.id)
    expect(parseMapFile(serializeMap(map)).meta.id).toBe(map.meta.id)
    expect(() => parseMapFile('{"otd":"9.0.0","maps":[]}')).toThrowError(
      expect.objectContaining({ code: 'newerVersion' }),
    )
  })
})

describe('play state in OTD', () => {
  it('writes the party, journal and oracle state, and reads them back', () => {
    const map = sampleMap()
    map.play = {
      mode: 'rules',
      token: { iconId: 'game:mounted-knight', color: '#8b1e1e' },
      location: '2,2',
      trail: ['1,2', '2,2'],
      showTrail: true,
      rules: {
        system: 'generic',
        startDay: 181,
        session: {
          travel: {
            time: 1000,
            location: '2,2',
            mode: 'foot',
            resources: { food: 4 },
            fatigue: 0,
            progress: 0,
            day: 181,
            travelledToday: 0,
            dayChecksDone: true,
            lostToday: false,
            pendingChecks: [],
            nextCheckId: 4,
          },
          oracle: { decks: {}, occurrences: { 'x/y#z': 1 }, vars: {} },
          stats: { pre: 2 },
          dayVars: { weather: 'clear' },
          journal: [
            {
              id: 'j1',
              time: 1000,
              at: 'T',
              source: 'oracle',
              code: 'ORACLE_RESULT',
              text: 'Despejado',
            },
          ],
          nextEntry: 2,
        },
      },
    }
    const bundle = mapToBundle(map)
    expect(validateBundle(bundle).errors).toEqual([])
    expect(bundle.parties[0]).toMatchObject({
      type: 'party',
      location: { map: map.meta.id, hex: '2,2' },
      stats: { pre: 2 },
    })
    expect(bundle.log).toHaveLength(1)
    expect(bundle.state.oracle).toEqual({ decks: {}, occurrences: { 'x/y#z': 1 }, vars: {} })

    const back = bundleToMap(JSON.parse(JSON.stringify(bundle)))
    expect(back.play).toEqual(map.play)
    // Saving again doesn't duplicate the party or the journal.
    const again = mapToBundle(back)
    expect(again.parties).toHaveLength(1)
    expect(again.log).toHaveLength(1)
  })
})
