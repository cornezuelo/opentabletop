import { loadPacks, PACK_FORMAT } from '@open-tabletop/oracle-engine'
import { localize } from '@open-tabletop/session'
import { corePack } from '../../session/src/core.testing'
import { describe, expect, it } from 'vitest'
import { createMap, CURRENT_VERSION } from './defaults'
import { migrate } from './migrations'
import { serializeMap, deserializeMap } from './serialize'
import {
  applyStyle,
  connectionLook,
  mapStyles,
  parseStyle,
  SCHEMATIC_STYLE,
  styleImages,
  styleOf,
  type NamedStyle,
} from './style'

const core = () => loadPacks(corePack())

const pack = (yaml: string) =>
  loadPacks([
    { path: 'p/pack.yaml', content: 'id: p\nversion: 0.1.0\nformat: 15\nlocale: en\n' },
    { path: 'p/styles.yaml', content: yaml },
  ])

describe('map styles', () => {
  it("Core's Schematic style is today's look, translated", () => {
    const { styles, problems } = mapStyles(core().registry)
    expect(problems).toEqual([])
    const schematic = styles.find((s) => s.ref === 'core/schematic')!.style
    const { name, description, ...look } = schematic
    // The Schematic style in code has no texts: those are the pack's.
    expect(look).toEqual(SCHEMATIC_STYLE)
    expect(localize(name, 'es', 'en')).toBe('Esquemático')
    expect(localize(description, 'es', 'en')).toContain('Enseña')
  })

  it('takes what a style leaves out from the Schematic one', () => {
    const { style, errors } = parseStyle({
      kind: 'style',
      id: 'ink',
      grid: { coords: false },
      captions: { regionNames: { font: 'cinzel', color: '#3a2a1a' } },
      regions: { fill: 0 },
    })
    expect(errors).toEqual([])
    expect(style!.grid).toEqual({ ...SCHEMATIC_STYLE.grid, coords: false })
    expect(style!.glyphs).toBe(SCHEMATIC_STYLE.glyphs)
    expect(style!.captions.regionNames).toEqual({
      ...SCHEMATIC_STYLE.captions.regionNames,
      font: 'cinzel',
      color: '#3a2a1a',
    })
    expect(style!.captions.hexNames).toEqual(SCHEMATIC_STYLE.captions.hexNames)
    expect(style!.regions).toEqual({ ...SCHEMATIC_STYLE.regions, fill: 0 })
  })

  it('says what is wrong in a broken style, where it is', () => {
    const { registry } = pack(
      [
        'kind: style',
        'id: broken',
        'grid: { color: red, opacity: 2, lines: 1 }',
        'glyphs: yes',
        'captions: { hexNames: { font: comic }, cellNames: {} }',
        'paper: white',
        'shade: 1',
        'art: { mode: oil, terrains: { forest: trees, hills: { painter: hills, size: 9 } } }',
        'floors: { color: white, tiles: 1 }',
        'walls: { outside: moss, width: 2 }',
      ].join('\n'),
    )
    const { styles, problems } = mapStyles(registry)
    expect(styles).toEqual([])
    expect(problems.map((p) => `${p.at}: ${p.message}`).sort()).toEqual(
      [
        '@style/broken.shade: unknown key in a style',
        "@style/broken.grid.lines: unknown key in a style's grid",
        "@style/broken.captions.cellNames: unknown key in a style's names (hexNames, regionNames, tokenNames)",
        '@style/broken.grid.color: expected a colour (#rrggbb)',
        '@style/broken.grid.opacity: expected a number from 0 to 1',
        '@style/broken.glyphs: expected a number from 0 to 1',
        '@style/broken.art.mode: expected one of ink, painted',
        '@style/broken.art.terrains.forest.painter: expected one of grass, farmland, conifers, broadleaf, forest, reeds, hills, mountains, peaks, volcano, dunes, rocks, waves, cobbles, dots, or images',
        '@style/broken.art.terrains.hills.size: expected a number from 0 to 3',
        '@style/broken.captions.hexNames.font: expected one of fell, cinzel, sans',
        '@style/broken.paper: expected a colour (#rrggbb)',
        '@style/broken.floors.color: expected a colour (#rrggbb)',
        "@style/broken.floors.tiles: unknown key in a style's floors",
        '@style/broken.walls.outside: expected one of none, hatch, shadow, stipple',
        '@style/broken.walls.width: expected a number from 0 to 0.5',
      ].sort(),
    )
    expect(problems.every((p) => p.pack === 'p' && p.file === 'p/styles.yaml')).toBe(true)
  })

  it('draws terrains with images of the packs and lays a texture over the map, and says when one is missing', () => {
    const { registry } = loadPacks([
      {
        path: 'art/pack.yaml',
        content: `id: art\nversion: 0.1.0\nlocale: en\nformat: ${PACK_FORMAT}\n`,
      },
      { path: 'art/relief/hill.svg', content: '<svg xmlns="http://www.w3.org/2000/svg"/>' },
      { path: 'art/paper.webp', content: 'data:image/webp;base64,UklGRg==' },
      {
        path: 'art/styles.yaml',
        content: [
          'kind: style',
          'id: atlas',
          'art:',
          '  terrains:',
          '    hills: { images: [art/relief/hill.svg, art/relief/hill-2.svg], count: 2, size: 1.5 }',
          '    forest: { images: art/relief/hill.svg, color: "#336633" }',
          '    swamp: reeds',
          'texture: { image: art/paper.webp, opacity: 0.3 }',
        ].join('\n'),
      },
    ])
    const { styles, problems } = mapStyles(registry)
    const atlas = styles[0].style
    expect(atlas.art.terrains.hills).toEqual({
      images: ['art/relief/hill.svg', 'art/relief/hill-2.svg'],
      count: 2,
      density: 1,
      size: 1.5,
    })
    expect(atlas.art.terrains.forest.images).toEqual(['art/relief/hill.svg'])
    expect(atlas.art.terrains.swamp.painter).toBe('reeds')
    expect(atlas.texture).toEqual({ image: 'art/paper.webp', opacity: 0.3, scale: 4 })
    expect(styleImages(atlas)).toEqual([
      'art/relief/hill.svg',
      'art/relief/hill-2.svg',
      'art/paper.webp',
    ])
    expect(problems.map((p) => p.message)).toEqual([
      'No image "art/relief/hill-2.svg" in the loaded packs (the style draws nothing in its place)',
    ])
    const broken = parseStyle({
      kind: 'style',
      id: 'x',
      art: {
        terrains: {
          a: { painter: 'hills', images: ['art/h.svg'] },
          b: { images: ['hill.svg'] },
          c: { images: ['art/h.svg'], count: 0 },
          d: { painter: 'hills', count: 2 },
        },
      },
      texture: { image: 'paper', scale: 0 },
    })
    expect(broken.errors.sort()).toEqual(
      [
        'art.terrains.a: either a painter or images, not both',
        "art.terrains.b.images: expected images by full name (a pack's id, then the image's path in it: my-art/relief/hill.svg)",
        'art.terrains.c.count: expected a whole number from 1 to 12',
        'art.terrains.d.count: only for images (a painter has density)',
        "texture.image: expected an image by full name (a pack's id, then its path in it: my-art/paper.webp)",
        'texture.scale: expected a number of cells above 0, up to 40',
      ].sort(),
    )
  })

  it("reads a dungeon's floors and walls, the rest the Schematic one's", () => {
    const { style, errors } = parseStyle({
      kind: 'style',
      id: 'crypt',
      floors: { color: '#fafafa', wash: 1, grid: 0.3 },
      walls: { outside: 'hatch', band: 0.5 },
    })
    expect(errors).toEqual([])
    expect(style!.floors).toEqual({ color: '#fafafa', wash: 1, grid: 0.3 })
    expect(style!.walls).toEqual({ ...SCHEMATIC_STYLE.walls, outside: 'hatch', band: 0.5 })
    // The Schematic style draws floor and walls as before: the terrain's colour, no band.
    expect(SCHEMATIC_STYLE.floors.wash).toBe(0)
    expect(SCHEMATIC_STYLE.walls.outside).toBe('none')
  })

  it('reads how each kind of connection and way is drawn, the usual look for the rest', () => {
    const { style, errors } = parseStyle({
      kind: 'style',
      id: 'dungeon',
      connections: {
        door: 'door',
        ford: { symbol: 'ford', line: 'dashed', color: '#3366aa' },
        'way-in': { symbol: 'stair' },
      },
    })
    expect(errors).toEqual([])
    // A symbol alone, or on its own place, has no line unless the style gives it one.
    expect(connectionLook(style!, 'door')).toEqual({ symbol: 'door', line: 'none' })
    expect(connectionLook(style!, 'ford')).toEqual({
      symbol: 'ford',
      line: 'dashed',
      color: '#3366aa',
    })
    expect(connectionLook(style!, 'way-in', true)).toEqual({ symbol: 'stair', line: 'none' })
    // Kinds the style doesn't name: a dashed line with a diamond, a way a badge.
    expect(connectionLook(style!, 'gate')).toEqual({ symbol: 'diamond', line: 'dashed' })
    expect(connectionLook(style!, undefined, true)).toEqual({ symbol: 'badge', line: 'none' })
    expect(SCHEMATIC_STYLE.connections).toEqual({})
    expect(
      parseStyle({
        kind: 'style',
        id: 'x',
        connections: { door: 'portal', gate: { symbol: 'door', line: 'wavy', size: 2 } },
      }).errors,
    ).toEqual([
      'connections.door.symbol: expected one of diamond, door, arch, bridge, ford, stair, ladder, mouth, badge, none',
      "connections.gate.size: unknown key in a connection's look",
      'connections.gate.line: expected one of dashed, solid, none',
    ])
  })

  it("draws a map in its style, or in the Schematic one when it has none or it isn't loaded", () => {
    const ink = parseStyle({ kind: 'style', id: 'ink', glyphs: 0.2 }).style!
    const styles: NamedStyle[] = [{ ref: 'p/ink', style: ink }]
    const map = createMap('m')
    expect(styleOf(map, styles)).toBe(SCHEMATIC_STYLE)
    expect(styleOf({ meta: { ...map.meta, style: 'p/ink' } }, styles)).toBe(ink)
    expect(styleOf({ meta: { ...map.meta, style: 'gone/ink' } }, styles)).toBe(SCHEMATIC_STYLE)
  })

  it("copies a style's settings into the map, which keeps them as its own", () => {
    const ink = parseStyle({
      kind: 'style',
      id: 'ink',
      grid: { coords: false },
      glyphs: 0.2,
      captions: { hexNames: { show: false } },
      regions: { dashed: true },
    }).style!
    const map = createMap('m')
    const styled = applyStyle(map, 'p/ink', ink)
    expect(styled.meta.style).toBe('p/ink')
    expect(styled.grid).toEqual({ ...map.grid, showCoords: false, glyphs: 0.2 })
    expect(styled.captions.hexNames.show).toBe(false)
    expect(styled.regionStyle.dashed).toBe(true)
    expect(styled.terrains).toBe(map.terrains)
    // Saved and read back, the map keeps its style.
    expect(deserializeMap(serializeMap(styled)).meta.style).toBe('p/ink')
  })

  it('older maps keep their look: no style is Core’s Schematic', () => {
    const old = { version: 35, meta: { id: 'm' } }
    expect(migrate(old)).toEqual({ ...old, version: CURRENT_VERSION })
  })
})
