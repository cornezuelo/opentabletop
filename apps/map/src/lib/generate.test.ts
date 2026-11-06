import { loadPacks } from '@open-tabletop/oracle-engine'
import { travelSystems } from '@open-tabletop/session'
import { describe, expect, it } from 'vitest'
import { emptyHexes, generateEmpty } from './generate'
import { exampleMaps } from './io/examples'
import { parseMapFile } from './io/otd'

const packFiles = import.meta.glob('../../../../packs/grey-marches/**/*.{yaml,json}', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>

describe('Generate', () => {
  const example = () => parseMapFile(exampleMaps().find((m) => m.id === 'greymarches1')!.json).map
  const { registry } = loadPacks(
    Object.entries(packFiles).map(([path, content]) => ({
      path: path.slice(path.indexOf('grey-marches/')),
      content,
    })),
  )
  const model = travelSystems(registry).systems.find((s) => s.id === 'grey-marches')!.land![
    'grey-marches/default'
  ]

  it("fills the Grey Marches' unmapped east with their land, never a painted hex", () => {
    const map = example()
    const painted = structuredClone(map.hexes)
    const empty = emptyHexes(map)
    expect(empty).toHaveLength(80)
    const done = generateEmpty(map, model, {}, 'east')
    expect(done.keys.sort()).toEqual([...empty].sort())
    for (const [key, hex] of Object.entries(painted))
      expect(map.hexes[key as keyof typeof map.hexes]).toEqual(hex)
    // Every terrain it drew is one of the model's, and one the map's palette has.
    const palette = map.terrains.map((t) => t.id)
    for (const terrain of done.terrains) {
      expect(Object.keys(model.next)).toContain(terrain)
      expect(palette).toContain(terrain)
    }
    // Next to the Hollow Hills' ranges, the land goes on as highland more often than not.
    const highland = ['hills', 'mountains', 'peaks', 'heath']
    const nextToHills = ['19,10', '19,11', '19,12', '19,13', '19,14']
    expect(
      nextToHills.filter((k) => highland.includes(map.hexes[k as keyof typeof map.hexes]!.terrain!))
        .length,
    ).toBeGreaterThan(2)
    // One undo step takes it all back.
    done.command!.revert(map)
    expect(map.hexes).toEqual(painted)
  })

  it("grows the clans' galleries round the old mine's squares: floor in rock, what's drawn kept", () => {
    const mine = parseMapFile(exampleMaps().find((m) => m.id === 'oldmine1')!.json).map
    expect(mine.grid.kind).toBe('square')
    const drawn = structuredClone(mine.hexes)
    const galleries = travelSystems(registry).systems.find((s) => s.id === 'grey-marches')!.land![
      'grey-marches/galleries'
    ]
    const done = generateEmpty(mine, galleries, {}, 'side-workings')
    expect(done.keys.length).toBe(emptyHexes(structuredClone({ ...mine, hexes: drawn })).length)
    for (const [key, hex] of Object.entries(drawn))
      expect(mine.hexes[key as keyof typeof mine.hexes]).toEqual(hex)
    expect(done.terrains).toEqual(expect.arrayContaining(['rock', 'mine-gallery']))
    // Corridors, not noise: most gallery cells have gallery next to them.
    const cells = Object.entries(mine.hexes).filter(([, h]) => h.terrain === 'mine-gallery')
    const joined = cells.filter(([key]) => {
      const [c, r] = key.split(',').map(Number)
      return [
        [c - 1, r],
        [c + 1, r],
        [c, r - 1],
        [c, r + 1],
      ].some(
        ([x, y]) => mine.hexes[`${x},${y}` as keyof typeof mine.hexes]?.terrain === 'mine-gallery',
      )
    })
    expect(joined.length / cells.length).toBeGreaterThan(0.6)
  })

  it('draws the same land from the same seed, and fills only a region when asked', () => {
    const a = example()
    const b = example()
    generateEmpty(a, model, {}, 'same')
    generateEmpty(b, model, {}, 'same')
    expect(a.hexes).toEqual(b.hexes)
    // A region with empty hexes: two of the east's, given to the Hollow Hills.
    const map = example()
    for (const key of ['20,9', '20,10'] as const) map.hexes[key] = { region: 'hollowhills' }
    expect(emptyHexes(map, { region: 'hollowhills' })).toEqual(['20,9', '20,10'])
    const done = generateEmpty(map, model, { region: 'hollowhills' }, 'hills')
    expect(done.keys.sort()).toEqual(['20,10', '20,9'])
    expect(map.hexes['20,9']).toMatchObject({ region: 'hollowhills' })
    expect(map.hexes['21,9']).toBeUndefined()
    // Nothing left to fill: no command.
    expect(generateEmpty(map, model, { region: 'hollowhills' }, 'hills').command).toBeNull()
  })
})
