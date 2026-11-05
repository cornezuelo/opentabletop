import { loadPacks } from '@open-tabletop/oracle-engine'
import { localize } from '@open-tabletop/session'
import { corePack } from '../../session/src/core.testing'
import { describe, expect, it } from 'vitest'
import { createMap } from './defaults'
import { migrate } from './migrations'
import { serializeMap, deserializeMap } from './serialize'
import {
  applyStyle,
  mapStyles,
  parseStyle,
  SCHEMATIC_STYLE,
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
      ].join('\n'),
    )
    const { styles, problems } = mapStyles(registry)
    expect(styles).toEqual([])
    expect(problems.map((p) => `${p.at}: ${p.message}`)).toEqual([
      '@style/broken.paper: unknown key in a style',
      "@style/broken.grid.lines: unknown key in a style's grid",
      "@style/broken.captions.cellNames: unknown key in a style's names (hexNames, regionNames, tokenNames)",
      '@style/broken.grid.color: expected a colour (#rrggbb)',
      '@style/broken.grid.opacity: expected a number from 0 to 1',
      '@style/broken.glyphs: expected a number from 0 to 1',
      '@style/broken.captions.hexNames.font: expected one of fell, cinzel, sans',
    ])
    expect(problems.every((p) => p.pack === 'p' && p.file === 'p/styles.yaml')).toBe(true)
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
    expect(migrate(old)).toEqual({ ...old, version: 36 })
  })
})
